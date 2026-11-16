import "server-only";
import { createClient, type PostgrestError } from "@supabase/supabase-js";
import type { Repository, FoodRecord, MediaUpload } from "../repository";
import { AppError, ConflictError, NotFoundError } from "../repository";
import type {
  Activity,
  Appointment,
  Client,
  ClientNote,
  CoachProfile,
  Exercise,
  Food,
  MealEntry,
  NutritionPlan,
  NutritionPlanSummary,
  ProgressRecord,
  WorkoutDay,
  WorkoutExercise,
  WorkoutPlan,
  WorkoutPlanSummary,
} from "@/lib/domain/types";
import type { ClientInput } from "@/lib/domain/schemas";
import type { MediaFolder } from "@/lib/domain/constants";
import { weeklyAverage } from "@/lib/domain/nutrition";
import { uuid } from "@/lib/id";
import { msg } from "@/lib/i18n/core";

/* eslint-disable @typescript-eslint/no-explicit-any -- rows come untyped from PostgREST and are mapped explicitly below */
type Row = Record<string, any>;

const num = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));

function fail(error: PostgrestError | null, context: string): never {
  if (error?.code === "23503" || error?.code === "23001") throw new ConflictError("Elemento collegato ad altri dati: rimuovi prima i riferimenti.");
  if (error?.code === "23505") throw new ConflictError("Elemento già esistente.");
  console.error(`[supabase] ${context}`, error);
  throw new AppError("Errore del database. Riprova tra qualche istante.");
}

async function run<T = Row[]>(promise: PromiseLike<{ data: unknown; error: PostgrestError | null }>, context: string): Promise<T> {
  const { data, error } = await promise;
  if (error) fail(error, context);
  return data as T;
}

/** Drop undefined keys so partial updates never null out columns. */
function defined(obj: Row): Row {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

/* --------------------------------- mappers -------------------------------- */
const toCoach = (r: Row): CoachProfile => ({
  fullName: r.full_name,
  email: r.email,
  phone: r.phone,
  studioName: r.studio_name,
  bio: r.bio,
  avatarUrl: r.avatar_url,
  defaultSets: r.default_sets,
  defaultReps: r.default_reps,
  defaultRestSeconds: r.default_rest_seconds,
  pdfFooter: r.pdf_footer,
  updatedAt: r.updated_at,
});

const toClient = (r: Row): Client => ({
  id: r.id,
  firstName: r.first_name,
  lastName: r.last_name,
  email: r.email,
  phone: r.phone,
  birthDate: r.birth_date,
  gender: r.gender,
  heightCm: num(r.height_cm),
  goal: r.goal,
  goalDetails: r.goal_details,
  status: r.status,
  avatarUrl: r.avatar_url,
  startDate: r.start_date,
  lastActivityAt: r.last_activity_at,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const fromClient = (i: Partial<ClientInput>): Row =>
  defined({
    first_name: i.firstName,
    last_name: i.lastName,
    email: i.email,
    phone: i.phone,
    birth_date: i.birthDate,
    gender: i.gender,
    height_cm: i.heightCm,
    goal: i.goal,
    goal_details: i.goalDetails,
    status: i.status,
    avatar_url: i.avatarUrl,
    start_date: i.startDate,
  });

const toExercise = (r: Row): Exercise => ({
  id: r.id,
  name: r.name,
  primaryMuscles: r.primary_muscles ?? [],
  secondaryMuscles: r.secondary_muscles ?? [],
  equipment: r.equipment,
  difficulty: r.difficulty,
  instructions: r.instructions ?? [],
  imageUrls: r.image_urls ?? [],
  isCustom: r.is_custom,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const toWorkoutExercise = (r: Row): WorkoutExercise => ({
  id: r.id,
  exerciseId: r.exercise_id,
  sets: r.sets,
  reps: r.reps,
  restSeconds: r.rest_seconds,
  weightKg: num(r.weight_kg),
  tempo: r.tempo,
  notes: r.notes,
  supersetId: r.superset_id,
});

const toWorkoutDay = (r: Row): WorkoutDay => ({
  id: r.id,
  weekday: r.weekday,
  title: r.title,
  category: r.category,
  goal: r.goal,
  durationMinutes: r.duration_minutes,
  notes: r.notes,
  exercises: [...(r.workout_exercises ?? [])].sort((a: Row, b: Row) => a.position - b.position).map(toWorkoutExercise),
});

const toWorkoutPlan = (r: Row): WorkoutPlan => ({
  id: r.id,
  clientId: r.client_id,
  name: r.name,
  status: r.status,
  notes: r.notes,
  publishedAt: r.published_at,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  days: [...(r.workout_days ?? [])].sort((a: Row, b: Row) => a.weekday - b.weekday).map(toWorkoutDay),
});

const toFood = (r: Row): Food => ({
  id: r.id,
  name: r.name,
  category: r.category,
  kind: r.kind,
  imageUrl: r.image_url,
  unit: r.unit,
  servingSize: Number(r.serving_size),
  servingLabel: r.serving_label,
  per100: { kcal: Number(r.kcal_100), protein: Number(r.protein_100), carbs: Number(r.carbs_100), fat: Number(r.fat_100) },
  servings: num(r.servings),
  ingredients: [...(r.recipe_ingredients ?? [])]
    .sort((a: Row, b: Row) => a.position - b.position)
    .map((i: Row) => ({ foodId: i.food_id, amount: Number(i.amount) })),
  source: r.source,
  sourceRef: r.source_ref,
  isCustom: r.is_custom,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const fromFood = (f: FoodRecord): Row => ({
  name: f.name,
  category: f.category,
  kind: f.kind,
  image_url: f.imageUrl,
  unit: f.unit,
  serving_size: f.servingSize,
  serving_label: f.servingLabel,
  kcal_100: f.per100.kcal,
  protein_100: f.per100.protein,
  carbs_100: f.per100.carbs,
  fat_100: f.per100.fat,
  servings: f.servings,
  source: f.source,
  source_ref: f.sourceRef,
  is_custom: f.isCustom,
});

const toMeal = (r: Row): MealEntry => ({
  id: r.id,
  day: r.day,
  slot: r.slot,
  position: r.position,
  foodId: r.food_id,
  name: r.name,
  imageUrl: r.image_url,
  amount: num(r.amount),
  unit: r.unit,
  kcal: num(r.kcal),
  protein: num(r.protein),
  carbs: num(r.carbs),
  fat: num(r.fat),
  nutritionSource: r.nutrition_source,
  notes: r.notes,
});

const toNutritionPlan = (r: Row): NutritionPlan => ({
  id: r.id,
  clientId: r.client_id,
  name: r.name,
  notes: r.notes,
  status: r.status,
  weekStart: r.week_start,
  targets: { kcal: num(r.target_kcal), protein: num(r.target_protein), carbs: num(r.target_carbs), fat: num(r.target_fat) },
  publishedAt: r.published_at,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  meals: [...(r.meal_entries ?? [])].map(toMeal).sort((a, b) => a.day - b.day || a.position - b.position),
});

const toProgress = (r: Row): ProgressRecord => ({
  id: r.id,
  clientId: r.client_id,
  date: r.date,
  weightKg: num(r.weight_kg),
  bodyFatPct: num(r.body_fat_pct),
  waistCm: num(r.waist_cm),
  hipsCm: num(r.hips_cm),
  chestCm: num(r.chest_cm),
  armCm: num(r.arm_cm),
  thighCm: num(r.thigh_cm),
  notes: r.notes,
  createdAt: r.created_at,
});

const toAppointment = (r: Row): Appointment => ({
  id: r.id,
  clientId: r.client_id,
  title: r.title,
  type: r.type,
  startsAt: r.starts_at,
  durationMinutes: r.duration_minutes,
  location: r.location,
  notes: r.notes,
  status: r.status,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const toActivity = (r: Row): Activity => ({
  id: r.id,
  type: r.type,
  clientId: r.client_id,
  title: r.title,
  description: r.description,
  href: r.href,
  params: r.params ?? null,
  dedupeKey: r.dedupe_key,
  createdAt: r.created_at,
  readAt: r.read_at,
});

const FOOD_SELECT = "*, recipe_ingredients!recipe_ingredients_recipe_fk(food_id, amount, position)";

/* ------------------------------- repository ------------------------------- */
export function createSupabaseRepository(url: string, serviceRoleKey: string): Repository {
  const sb = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { "x-application-name": "forma-coach" } },
  });

  async function getWorkoutPlan(id: string) {
    const row = await run<Row | null>(
      sb.from("workout_plans").select("*, workout_days(*, workout_exercises(*))").eq("id", id).maybeSingle(),
      "getWorkoutPlan",
    );
    return row ? toWorkoutPlan(row) : null;
  }

  async function getNutritionPlan(id: string) {
    const row = await run<Row | null>(sb.from("nutrition_plans").select("*, meal_entries(*)").eq("id", id).maybeSingle(), "getNutritionPlan");
    return row ? toNutritionPlan(row) : null;
  }

  async function getFood(id: string) {
    const row = await run<Row | null>(sb.from("foods").select(FOOD_SELECT).eq("id", id).maybeSingle(), "getFood");
    return row ? toFood(row) : null;
  }

  async function replaceIngredients(foodId: string, record: FoodRecord) {
    await run(sb.from("recipe_ingredients").delete().eq("recipe_id", foodId), "replaceIngredients.delete");
    if (record.kind === "recipe" && record.ingredients.length) {
      await run(
        sb.from("recipe_ingredients").insert(
          record.ingredients.map((ing, position) => ({ id: uuid(), recipe_id: foodId, food_id: ing.foodId, amount: ing.amount, position })),
        ),
        "replaceIngredients.insert",
      );
    }
  }

  return {
    mode: "supabase",

    async getCoach() {
      const row = await run<Row | null>(sb.from("coach_profile").select("*").eq("id", 1).maybeSingle(), "getCoach");
      if (row) return toCoach(row);
      const created = await run<Row>(sb.from("coach_profile").upsert({ id: 1 }).select("*").single(), "getCoach.init");
      return toCoach(created);
    },
    async updateCoach(i) {
      const row = await run<Row>(
        sb
          .from("coach_profile")
          .upsert({
            id: 1,
            full_name: i.fullName,
            email: i.email,
            phone: i.phone,
            studio_name: i.studioName,
            bio: i.bio,
            avatar_url: i.avatarUrl,
            default_sets: i.defaultSets,
            default_reps: i.defaultReps,
            default_rest_seconds: i.defaultRestSeconds,
            pdf_footer: i.pdfFooter,
          })
          .select("*")
          .single(),
        "updateCoach",
      );
      return toCoach(row);
    },

    async listClients() {
      const rows = await run(sb.from("clients").select("*").order("first_name").order("last_name"), "listClients");
      return rows.map(toClient);
    },
    async getClient(id) {
      const row = await run<Row | null>(sb.from("clients").select("*").eq("id", id).maybeSingle(), "getClient");
      return row ? toClient(row) : null;
    },
    async createClient(input) {
      const row = await run<Row>(
        sb.from("clients").insert({ ...fromClient(input), last_activity_at: new Date().toISOString() }).select("*").single(),
        "createClient",
      );
      return toClient(row);
    },
    async updateClient(id, input) {
      const row = await run<Row | null>(sb.from("clients").update(fromClient(input)).eq("id", id).select("*").maybeSingle(), "updateClient");
      if (!row) throw new NotFoundError("Cliente non trovato");
      return toClient(row);
    },
    async deleteClient(id) {
      await run(sb.from("clients").delete().eq("id", id), "deleteClient");
    },
    async touchClient(id) {
      await run(sb.from("clients").update({ last_activity_at: new Date().toISOString() }).eq("id", id), "touchClient");
    },

    async listClientNotes(clientId) {
      const rows = await run(sb.from("client_notes").select("*").eq("client_id", clientId).order("created_at", { ascending: false }), "listClientNotes");
      return rows.map((r): ClientNote => ({ id: r.id, clientId: r.client_id, body: r.body, createdAt: r.created_at }));
    },
    async createClientNote(clientId, body) {
      const r = await run<Row>(sb.from("client_notes").insert({ client_id: clientId, body }).select("*").single(), "createClientNote");
      return { id: r.id, clientId: r.client_id, body: r.body, createdAt: r.created_at };
    },
    async deleteClientNote(id) {
      await run(sb.from("client_notes").delete().eq("id", id), "deleteClientNote");
    },

    async listExercises() {
      const rows = await run(sb.from("exercises").select("*").order("name"), "listExercises");
      return rows.map(toExercise);
    },
    async getExercise(id) {
      const row = await run<Row | null>(sb.from("exercises").select("*").eq("id", id).maybeSingle(), "getExercise");
      return row ? toExercise(row) : null;
    },
    async createExercise(i) {
      const row = await run<Row>(
        sb
          .from("exercises")
          .insert({
            name: i.name,
            primary_muscles: i.primaryMuscles,
            secondary_muscles: i.secondaryMuscles,
            equipment: i.equipment,
            difficulty: i.difficulty,
            instructions: i.instructions,
            image_urls: i.imageUrls,
            is_custom: true,
          })
          .select("*")
          .single(),
        "createExercise",
      );
      return toExercise(row);
    },
    async updateExercise(id, i) {
      const row = await run<Row | null>(
        sb
          .from("exercises")
          .update({
            name: i.name,
            primary_muscles: i.primaryMuscles,
            secondary_muscles: i.secondaryMuscles,
            equipment: i.equipment,
            difficulty: i.difficulty,
            instructions: i.instructions,
            image_urls: i.imageUrls,
          })
          .eq("id", id)
          .select("*")
          .maybeSingle(),
        "updateExercise",
      );
      if (!row) throw new NotFoundError("Esercizio non trovato");
      return toExercise(row);
    },
    async countExerciseUsage(id) {
      const rows = await run(sb.from("workout_exercises").select("workout_days(plan_id)").eq("exercise_id", id), "countExerciseUsage");
      return new Set(rows.map((r) => r.workout_days?.plan_id)).size;
    },
    async deleteExercise(id) {
      const used = await this.countExerciseUsage(id);
      if (used > 0)
        throw new ConflictError(used === 1 ? msg("Esercizio usato in {n} scheda: rimuovilo prima di eliminarlo.") : msg("Esercizio usato in {n} schede: rimuovilo prima di eliminarlo."), { n: used });
      await run(sb.from("exercises").delete().eq("id", id), "deleteExercise");
    },

    async listWorkoutPlans(filter) {
      let query = sb
        .from("workout_plans")
        .select("id, client_id, name, status, published_at, created_at, updated_at, workout_days(weekday, workout_exercises(sets))")
        .order("updated_at", { ascending: false });
      if (filter?.clientId) query = query.eq("client_id", filter.clientId);
      const rows = await run(query, "listWorkoutPlans");
      return rows.map((r): WorkoutPlanSummary => {
        const days: Row[] = r.workout_days ?? [];
        const all: Row[] = days.flatMap((d) => d.workout_exercises ?? []);
        return {
          id: r.id,
          clientId: r.client_id,
          name: r.name,
          status: r.status,
          publishedAt: r.published_at,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
          weekdays: days.filter((d) => (d.workout_exercises ?? []).length > 0).map((d) => d.weekday).sort(),
          exerciseCount: all.length,
          totalSets: all.reduce((s, e) => s + e.sets, 0),
        };
      });
    },
    getWorkoutPlan,
    async saveWorkoutPlan(input) {
      await run(sb.rpc("save_workout_plan", { p: input }), "saveWorkoutPlan");
      const plan = await getWorkoutPlan(input.id);
      if (!plan) throw new AppError("Salvataggio non riuscito");
      return plan;
    },
    async setWorkoutPlanStatus(id, status) {
      const current = await run<Row | null>(sb.from("workout_plans").select("status, published_at").eq("id", id).maybeSingle(), "setWorkoutPlanStatus.read");
      if (!current) throw new NotFoundError("Scheda non trovata");
      const publishedAt =
        status === "published" ? (current.status === "published" ? current.published_at : new Date().toISOString()) : status === "archived" ? current.published_at : null;
      await run(sb.from("workout_plans").update({ status, published_at: publishedAt }).eq("id", id), "setWorkoutPlanStatus");
    },
    async deleteWorkoutPlan(id) {
      await run(sb.from("workout_plans").delete().eq("id", id), "deleteWorkoutPlan");
    },

    async listFoods() {
      const rows = await run(sb.from("foods").select(FOOD_SELECT).order("name"), "listFoods");
      return rows.map(toFood);
    },
    getFood,
    async createFood(record) {
      const row = await run<Row>(sb.from("foods").insert(fromFood(record)).select("id").single(), "createFood");
      await replaceIngredients(row.id, record);
      return (await getFood(row.id))!;
    },
    async updateFood(id, record) {
      const row = await run<Row | null>(sb.from("foods").update(fromFood(record)).eq("id", id).select("id").maybeSingle(), "updateFood");
      if (!row) throw new NotFoundError("Alimento non trovato");
      await replaceIngredients(id, record);
      return (await getFood(id))!;
    },
    async countFoodUsage(id) {
      const { count, error } = await sb.from("recipe_ingredients").select("id", { count: "exact", head: true }).eq("food_id", id);
      if (error) fail(error, "countFoodUsage");
      return count ?? 0;
    },
    async deleteFood(id) {
      const used = await this.countFoodUsage(id);
      if (used > 0)
        throw new ConflictError(used === 1 ? msg("Ingrediente usato in {n} ricetta: modifica prima la ricetta.") : msg("Ingrediente usato in {n} ricette: modifica prima le ricette."), { n: used });
      await run(sb.from("foods").delete().eq("id", id), "deleteFood");
    },

    async listNutritionPlans(filter) {
      let query = sb
        .from("nutrition_plans")
        .select("id, client_id, name, notes, status, published_at, created_at, updated_at, target_kcal, meal_entries(day, kcal, protein, carbs, fat)")
        .order("updated_at", { ascending: false });
      if (filter?.clientId) query = query.eq("client_id", filter.clientId);
      const rows = await run(query, "listNutritionPlans");
      return rows.map((r): NutritionPlanSummary => {
        const meals = (r.meal_entries ?? []).map((m: Row) => toMeal({ ...m, slot: "lunch", position: 0 }));
        return {
          id: r.id,
          clientId: r.client_id,
          name: r.name,
          notes: r.notes,
          status: r.status,
          publishedAt: r.published_at,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
          mealCount: meals.length,
          daysWithMeals: [...new Set<number>(meals.map((m: MealEntry) => m.day))].sort(),
          avgKcal: weeklyAverage(meals)?.kcal ?? null,
          targetKcal: num(r.target_kcal),
        };
      });
    },
    getNutritionPlan,
    async saveNutritionPlan(input) {
      await run(sb.rpc("save_nutrition_plan", { p: input }), "saveNutritionPlan");
      const plan = await getNutritionPlan(input.id);
      if (!plan) throw new AppError("Salvataggio non riuscito");
      return plan;
    },
    async setNutritionPlanStatus(id, status) {
      const current = await run<Row | null>(sb.from("nutrition_plans").select("status, published_at").eq("id", id).maybeSingle(), "setNutritionPlanStatus.read");
      if (!current) throw new NotFoundError("Piano non trovato");
      const publishedAt =
        status === "published" ? (current.status === "published" ? current.published_at : new Date().toISOString()) : status === "archived" ? current.published_at : null;
      await run(sb.from("nutrition_plans").update({ status, published_at: publishedAt }).eq("id", id), "setNutritionPlanStatus");
    },
    async deleteNutritionPlan(id) {
      await run(sb.from("nutrition_plans").delete().eq("id", id), "deleteNutritionPlan");
    },

    async listProgress(clientId) {
      let query = sb.from("progress_records").select("*").order("date").order("created_at");
      if (clientId) query = query.eq("client_id", clientId);
      return (await run(query, "listProgress")).map(toProgress);
    },
    async createProgress(i) {
      const row = await run<Row>(
        sb
          .from("progress_records")
          .insert({
            client_id: i.clientId,
            date: i.date,
            weight_kg: i.weightKg,
            body_fat_pct: i.bodyFatPct,
            waist_cm: i.waistCm,
            hips_cm: i.hipsCm,
            chest_cm: i.chestCm,
            arm_cm: i.armCm,
            thigh_cm: i.thighCm,
            notes: i.notes,
          })
          .select("*")
          .single(),
        "createProgress",
      );
      return toProgress(row);
    },
    async deleteProgress(id) {
      await run(sb.from("progress_records").delete().eq("id", id), "deleteProgress");
    },

    async listAppointments(filter) {
      let query = sb.from("appointments").select("*").order("starts_at");
      if (filter?.from) query = query.gte("starts_at", filter.from);
      if (filter?.to) query = query.lt("starts_at", filter.to);
      if (filter?.clientId) query = query.eq("client_id", filter.clientId);
      return (await run(query, "listAppointments")).map(toAppointment);
    },
    async createAppointment(i) {
      const row = await run<Row>(
        sb
          .from("appointments")
          .insert({
            client_id: i.clientId,
            title: i.title,
            type: i.type,
            starts_at: i.startsAt,
            duration_minutes: i.durationMinutes,
            location: i.location,
            notes: i.notes,
            status: i.status,
          })
          .select("*")
          .single(),
        "createAppointment",
      );
      return toAppointment(row);
    },
    async updateAppointment(id, i) {
      const row = await run<Row | null>(
        sb
          .from("appointments")
          .update({
            client_id: i.clientId,
            title: i.title,
            type: i.type,
            starts_at: i.startsAt,
            duration_minutes: i.durationMinutes,
            location: i.location,
            notes: i.notes,
            status: i.status,
          })
          .eq("id", id)
          .select("*")
          .maybeSingle(),
        "updateAppointment",
      );
      if (!row) throw new NotFoundError("Appuntamento non trovato");
      return toAppointment(row);
    },
    async deleteAppointment(id) {
      await run(sb.from("appointments").delete().eq("id", id), "deleteAppointment");
    },

    async listActivity(opts) {
      let query = sb.from("activity").select("*").order("created_at", { ascending: false });
      if (opts?.unreadOnly) query = query.is("read_at", null);
      if (opts?.clientId) query = query.eq("client_id", opts.clientId);
      if (opts?.limit) query = query.limit(opts.limit);
      return (await run(query, "listActivity")).map(toActivity);
    },
    async countUnreadActivity() {
      const { count, error } = await sb.from("activity").select("id", { count: "exact", head: true }).is("read_at", null);
      if (error) fail(error, "countUnreadActivity");
      return count ?? 0;
    },
    async createActivity(i) {
      const row = {
        type: i.type,
        client_id: i.clientId,
        title: i.title,
        description: i.description ?? null,
        href: i.href ?? null,
        params: i.params ?? null,
        dedupe_key: i.dedupeKey ?? null,
        read_at: i.read ? new Date().toISOString() : null,
      };
      const query = i.dedupeKey
        ? sb.from("activity").upsert(row, { onConflict: "dedupe_key", ignoreDuplicates: true })
        : sb.from("activity").insert(row);
      await run(query, "createActivity");
    },
    async markActivity(ids, isRead) {
      let query = sb.from("activity").update({ read_at: isRead ? new Date().toISOString() : null });
      query = ids === "all" ? (isRead ? query.is("read_at", null) : query.not("read_at", "is", null)) : query.in("id", ids);
      await run(query, "markActivity");
    },
    async deleteActivity(ids) {
      const query = ids === "read" ? sb.from("activity").delete().not("read_at", "is", null) : sb.from("activity").delete().in("id", ids);
      await run(query, "deleteActivity");
    },

    async uploadMedia(file: MediaUpload, folder: MediaFolder) {
      const objectPath = `${folder}/${uuid()}.${file.extension}`;
      const { error } = await sb.storage.from("media").upload(objectPath, file.bytes, {
        contentType: file.contentType,
        cacheControl: "31536000",
        upsert: false,
      });
      if (error) {
        console.error("[supabase] uploadMedia", error);
        throw new AppError("Caricamento immagine non riuscito. Verifica che il bucket 'media' esista.");
      }
      return sb.storage.from("media").getPublicUrl(objectPath).data.publicUrl;
    },
  };
}
