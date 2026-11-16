import "server-only";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Repository, FoodRecord, ActivityInput, MediaUpload } from "../repository";
import { ConflictError, NotFoundError } from "../repository";
import { createDemoData, DEMO_DB_VERSION, type DemoDb } from "../seed/demo";
import type {
  Activity,
  Appointment,
  Client,
  ClientNote,
  Exercise,
  Food,
  NutritionPlan,
  NutritionPlanSummary,
  ProgressRecord,
  WorkoutPlan,
  WorkoutPlanSummary,
} from "@/lib/domain/types";
import type { MediaFolder, PlanStatus } from "@/lib/domain/constants";
import { uuid } from "@/lib/id";
import { msg } from "@/lib/i18n/core";
import { weeklyAverage } from "@/lib/domain/nutrition";

/* ----------------------------------------------------------------------------
 * JSON file store (.demo-data/db.json). Writes are serialized and atomic.
 * -------------------------------------------------------------------------- */
type StoreState = {
  db: DemoDb | null;
  dir: Promise<string> | null;
  mtimeMs: number;
  queue: Promise<unknown>;
  loading: Promise<DemoDb> | null;
};
const g = globalThis as unknown as { __formaDemoStore?: StoreState };
const state: StoreState = (g.__formaDemoStore ??= { db: null, dir: null, mtimeMs: 0, queue: Promise.resolve(), loading: null });

const unique = () => `${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}`;

/** Resolved once and shared, so concurrent requests never race on directory probing. */
export function demoDataDir(): Promise<string> {
  if (!state.dir) {
    state.dir = (async () => {
      const candidates = [process.env.DEMO_DATA_DIR, path.join(process.cwd(), ".demo-data"), path.join(os.tmpdir(), "forma-demo")].filter(
        (d): d is string => Boolean(d),
      );
      for (const dir of candidates) {
        try {
          await fs.mkdir(path.join(dir, "media"), { recursive: true });
          const probe = path.join(dir, `.probe-${unique()}`);
          await fs.writeFile(probe, "ok");
          await fs.unlink(probe);
          return dir;
        } catch {
          // read-only location (e.g. serverless bundle): try the next one
        }
      }
      throw new Error("Nessuna cartella scrivibile disponibile per la modalità demo.");
    })();
    state.dir.catch(() => {
      state.dir = null;
    });
  }
  return state.dir;
}

async function dbFile() {
  return path.join(await demoDataDir(), "db.json");
}

async function persist(db: DemoDb) {
  const file = await dbFile();
  const tmp = `${file}.${unique()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db));
  await fs.rename(tmp, file);
  const stat = await fs.stat(file);
  state.db = db;
  state.mtimeMs = stat.mtimeMs;
}

async function loadFromDisk(): Promise<DemoDb> {
  const file = await dbFile();
  try {
    const stat = await fs.stat(file);
    if (state.db && stat.mtimeMs === state.mtimeMs) return state.db;
    const parsed = JSON.parse(await fs.readFile(file, "utf8")) as DemoDb;
    if (parsed.version !== DEMO_DB_VERSION) throw new Error("outdated demo data");
    state.db = parsed;
    state.mtimeMs = stat.mtimeMs;
    return parsed;
  } catch {
    const fresh = createDemoData();
    await persist(fresh);
    return fresh;
  }
}

/** Concurrent callers share one in-flight load (prevents double seeding). */
function load(): Promise<DemoDb> {
  if (!state.loading) {
    state.loading = loadFromDisk().finally(() => {
      state.loading = null;
    });
  }
  return state.loading;
}

async function read<T>(fn: (db: DemoDb) => T): Promise<T> {
  await state.queue;
  return structuredClone(fn(await load()));
}

function write<T>(fn: (db: DemoDb) => T): Promise<T> {
  const run = state.queue.then(async () => {
    const db = await load();
    const result = fn(db);
    await persist(db);
    return structuredClone(result);
  });
  state.queue = run.catch(() => undefined);
  return run;
}

const now = () => new Date().toISOString();

function find<T extends { id: string }>(list: T[], id: string, message: string): T {
  const item = list.find((x) => x.id === id);
  if (!item) throw new NotFoundError(message);
  return item;
}

function workoutSummary(p: WorkoutPlan): WorkoutPlanSummary {
  const all = p.days.flatMap((d) => d.exercises);
  return {
    id: p.id,
    clientId: p.clientId,
    name: p.name,
    status: p.status,
    publishedAt: p.publishedAt,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    weekdays: p.days.filter((d) => d.exercises.length > 0).map((d) => d.weekday).sort(),
    exerciseCount: all.length,
    totalSets: all.reduce((s, e) => s + e.sets, 0),
  };
}

function nutritionSummary(p: NutritionPlan): NutritionPlanSummary {
  return {
    id: p.id,
    clientId: p.clientId,
    name: p.name,
    notes: p.notes,
    status: p.status,
    publishedAt: p.publishedAt,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    mealCount: p.meals.length,
    daysWithMeals: [...new Set(p.meals.map((m) => m.day))].sort(),
    avgKcal: weeklyAverage(p.meals)?.kcal ?? null,
    targetKcal: p.targets.kcal,
  };
}

function nextPublishedAt(prev: { status: PlanStatus; publishedAt: string | null } | undefined, status: PlanStatus): string | null {
  if (status !== "published") return status === "archived" ? (prev?.publishedAt ?? null) : null;
  if (prev?.status === "published" && prev.publishedAt) return prev.publishedAt;
  return now();
}

const byUpdatedDesc = (a: { updatedAt: string }, b: { updatedAt: string }) => b.updatedAt.localeCompare(a.updatedAt);

/* ----------------------------------------------------------------------------
 * Repository
 * -------------------------------------------------------------------------- */
export function createDemoRepository(): Repository {
  return {
    mode: "demo",

    getCoach: () => read((db) => db.coach),
    updateCoach: (input) =>
      write((db) => {
        db.coach = { ...db.coach, ...input, updatedAt: now() };
        return db.coach;
      }),

    listClients: () => read((db) => [...db.clients].sort((a, b) => a.firstName.localeCompare(b.firstName, "it"))),
    getClient: (id) => read((db) => db.clients.find((c) => c.id === id) ?? null),
    createClient: (input) =>
      write((db) => {
        const t = now();
        const client: Client = { id: uuid(), ...input, lastActivityAt: t, createdAt: t, updatedAt: t };
        db.clients.push(client);
        return client;
      }),
    updateClient: (id, input) =>
      write((db) => {
        const c = find(db.clients, id, "Cliente non trovato");
        Object.assign(c, input, { updatedAt: now() });
        return c;
      }),
    deleteClient: (id) =>
      write((db) => {
        find(db.clients, id, "Cliente non trovato");
        db.clients = db.clients.filter((c) => c.id !== id);
        db.clientNotes = db.clientNotes.filter((n) => n.clientId !== id);
        db.workoutPlans = db.workoutPlans.filter((p) => p.clientId !== id);
        db.nutritionPlans = db.nutritionPlans.filter((p) => p.clientId !== id);
        db.progress = db.progress.filter((p) => p.clientId !== id);
        db.appointments = db.appointments.filter((a) => a.clientId !== id);
        db.activity = db.activity.filter((a) => a.clientId !== id);
      }),
    touchClient: (id) =>
      write((db) => {
        const c = db.clients.find((x) => x.id === id);
        if (c) c.lastActivityAt = now();
      }),

    listClientNotes: (clientId) =>
      read((db) => db.clientNotes.filter((n) => n.clientId === clientId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))),
    createClientNote: (clientId, body) =>
      write((db) => {
        find(db.clients, clientId, "Cliente non trovato");
        const note: ClientNote = { id: uuid(), clientId, body, createdAt: now() };
        db.clientNotes.push(note);
        return note;
      }),
    deleteClientNote: (id) =>
      write((db) => {
        db.clientNotes = db.clientNotes.filter((n) => n.id !== id);
      }),

    listExercises: () => read((db) => [...db.exercises].sort((a, b) => a.name.localeCompare(b.name, "it"))),
    getExercise: (id) => read((db) => db.exercises.find((e) => e.id === id) ?? null),
    createExercise: (input) =>
      write((db) => {
        const t = now();
        const ex: Exercise = { id: uuid(), ...input, isCustom: true, createdAt: t, updatedAt: t };
        db.exercises.push(ex);
        return ex;
      }),
    updateExercise: (id, input) =>
      write((db) => {
        const ex = find(db.exercises, id, "Esercizio non trovato");
        Object.assign(ex, input, { updatedAt: now() });
        return ex;
      }),
    countExerciseUsage: (id) =>
      read((db) => db.workoutPlans.reduce((n, p) => n + (p.days.some((d) => d.exercises.some((e) => e.exerciseId === id)) ? 1 : 0), 0)),
    deleteExercise: (id) =>
      write((db) => {
        find(db.exercises, id, "Esercizio non trovato");
        const used = db.workoutPlans.filter((p) => p.days.some((d) => d.exercises.some((e) => e.exerciseId === id))).length;
        if (used > 0)
          throw new ConflictError(used === 1 ? msg("Esercizio usato in {n} scheda: rimuovilo prima di eliminarlo.") : msg("Esercizio usato in {n} schede: rimuovilo prima di eliminarlo."), { n: used });
        db.exercises = db.exercises.filter((e) => e.id !== id);
      }),

    listWorkoutPlans: (filter) =>
      read((db) =>
        db.workoutPlans
          .filter((p) => !filter?.clientId || p.clientId === filter.clientId)
          .sort(byUpdatedDesc)
          .map(workoutSummary),
      ),
    getWorkoutPlan: (id) => read((db) => db.workoutPlans.find((p) => p.id === id) ?? null),
    saveWorkoutPlan: (input) =>
      write((db) => {
        const prev = db.workoutPlans.find((p) => p.id === input.id);
        const t = now();
        const plan: WorkoutPlan = {
          id: input.id,
          clientId: input.clientId,
          name: input.name,
          status: input.status,
          notes: input.notes,
          publishedAt: nextPublishedAt(prev, input.status),
          createdAt: prev?.createdAt ?? t,
          updatedAt: t,
          days: [...input.days].sort((a, b) => a.weekday - b.weekday),
        };
        db.workoutPlans = prev ? db.workoutPlans.map((p) => (p.id === plan.id ? plan : p)) : [...db.workoutPlans, plan];
        return plan;
      }),
    setWorkoutPlanStatus: (id, status) =>
      write((db) => {
        const p = find(db.workoutPlans, id, "Scheda non trovata");
        p.publishedAt = nextPublishedAt(p, status);
        p.status = status;
        p.updatedAt = now();
      }),
    deleteWorkoutPlan: (id) =>
      write((db) => {
        db.workoutPlans = db.workoutPlans.filter((p) => p.id !== id);
      }),

    listFoods: () => read((db) => [...db.foods].sort((a, b) => a.name.localeCompare(b.name, "it"))),
    getFood: (id) => read((db) => db.foods.find((f) => f.id === id) ?? null),
    createFood: (record: FoodRecord) =>
      write((db) => {
        const t = now();
        const food: Food = { id: uuid(), ...record, createdAt: t, updatedAt: t };
        db.foods.push(food);
        return food;
      }),
    updateFood: (id, record) =>
      write((db) => {
        const f = find(db.foods, id, "Alimento non trovato");
        Object.assign(f, record, { updatedAt: now() });
        return f;
      }),
    countFoodUsage: (id) => read((db) => db.foods.filter((f) => f.ingredients.some((i) => i.foodId === id)).length),
    deleteFood: (id) =>
      write((db) => {
        find(db.foods, id, "Alimento non trovato");
        const recipes = db.foods.filter((f) => f.ingredients.some((i) => i.foodId === id));
        if (recipes.length)
          throw new ConflictError(
            recipes.length === 1 ? msg("Ingrediente usato nella ricetta “{name}”: modifica prima la ricetta.") : msg("Ingrediente usato in {n} ricette: modifica prima le ricette."),
            { n: recipes.length, name: recipes[0].name },
          );
        db.foods = db.foods.filter((f) => f.id !== id);
        for (const plan of db.nutritionPlans) for (const m of plan.meals) if (m.foodId === id) m.foodId = null;
      }),

    listNutritionPlans: (filter) =>
      read((db) =>
        db.nutritionPlans
          .filter((p) => !filter?.clientId || p.clientId === filter.clientId)
          .sort(byUpdatedDesc)
          .map(nutritionSummary),
      ),
    getNutritionPlan: (id) => read((db) => db.nutritionPlans.find((p) => p.id === id) ?? null),
    saveNutritionPlan: (input) =>
      write((db) => {
        const prev = db.nutritionPlans.find((p) => p.id === input.id);
        const t = now();
        const plan: NutritionPlan = {
          id: input.id,
          clientId: input.clientId,
          name: input.name,
          notes: input.notes,
          status: input.status,
          weekStart: input.weekStart,
          targets: input.targets,
          publishedAt: nextPublishedAt(prev, input.status),
          createdAt: prev?.createdAt ?? t,
          updatedAt: t,
          meals: input.meals,
        };
        db.nutritionPlans = prev ? db.nutritionPlans.map((p) => (p.id === plan.id ? plan : p)) : [...db.nutritionPlans, plan];
        return plan;
      }),
    setNutritionPlanStatus: (id, status) =>
      write((db) => {
        const p = find(db.nutritionPlans, id, "Piano non trovato");
        p.publishedAt = nextPublishedAt(p, status);
        p.status = status;
        p.updatedAt = now();
      }),
    deleteNutritionPlan: (id) =>
      write((db) => {
        db.nutritionPlans = db.nutritionPlans.filter((p) => p.id !== id);
      }),

    listProgress: (clientId) =>
      read((db) =>
        db.progress.filter((p) => !clientId || p.clientId === clientId).sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt)),
      ),
    createProgress: (input) =>
      write((db) => {
        find(db.clients, input.clientId, "Cliente non trovato");
        const rec: ProgressRecord = { id: uuid(), ...input, createdAt: now() };
        db.progress.push(rec);
        return rec;
      }),
    deleteProgress: (id) =>
      write((db) => {
        db.progress = db.progress.filter((p) => p.id !== id);
      }),

    listAppointments: (filter) =>
      read((db) =>
        db.appointments
          .filter((a) => (!filter?.from || a.startsAt >= filter.from) && (!filter?.to || a.startsAt < filter.to) && (!filter?.clientId || a.clientId === filter.clientId))
          .sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
      ),
    createAppointment: (input) =>
      write((db) => {
        const t = now();
        const a: Appointment = { id: uuid(), ...input, createdAt: t, updatedAt: t };
        db.appointments.push(a);
        return a;
      }),
    updateAppointment: (id, input) =>
      write((db) => {
        const a = find(db.appointments, id, "Appuntamento non trovato");
        Object.assign(a, input, { updatedAt: now() });
        return a;
      }),
    deleteAppointment: (id) =>
      write((db) => {
        db.appointments = db.appointments.filter((a) => a.id !== id);
      }),

    listActivity: (opts) =>
      read((db) => {
        const list = db.activity
          .filter((a) => (!opts?.unreadOnly || a.readAt === null) && (!opts?.clientId || a.clientId === opts.clientId))
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        return opts?.limit ? list.slice(0, opts.limit) : list;
      }),
    countUnreadActivity: () => read((db) => db.activity.filter((a) => a.readAt === null).length),
    createActivity: (input: ActivityInput) =>
      write((db) => {
        if (input.dedupeKey && db.activity.some((x) => x.dedupeKey === input.dedupeKey)) return;
        const t = now();
        const a: Activity = {
          id: uuid(),
          type: input.type,
          clientId: input.clientId,
          title: input.title,
          description: input.description ?? null,
          href: input.href ?? null,
          params: input.params ?? null,
          dedupeKey: input.dedupeKey ?? null,
          createdAt: t,
          readAt: input.read ? t : null,
        };
        db.activity.push(a);
        if (db.activity.length > 500) db.activity = db.activity.sort((x, y) => y.createdAt.localeCompare(x.createdAt)).slice(0, 500);
      }),
    markActivity: (ids, isRead) =>
      write((db) => {
        const t = now();
        for (const a of db.activity) if (ids === "all" || ids.includes(a.id)) a.readAt = isRead ? (a.readAt ?? t) : null;
      }),
    deleteActivity: (ids) =>
      write((db) => {
        db.activity = db.activity.filter((a) => (ids === "read" ? a.readAt === null : !ids.includes(a.id)));
      }),

    async uploadMedia(file: MediaUpload, folder: MediaFolder) {
      const dir = path.join(await demoDataDir(), "media", folder);
      await fs.mkdir(dir, { recursive: true });
      const name = `${uuid()}.${file.extension}`;
      await fs.writeFile(path.join(dir, name), file.bytes);
      return `/api/media/${folder}/${name}`;
    },

    async resetDemoData() {
      await write((db) => {
        Object.assign(db, createDemoData());
      });
    },
  };
}
