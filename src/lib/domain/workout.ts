import type { Exercise, WorkoutDay, WorkoutExercise, WorkoutPlan } from "./types";
import type { MuscleGroup } from "./constants";
import { uuid } from "@/lib/id";

/** 90 → 90" · 120 → 2' · 150 → 2'30" */
export function formatRest(seconds: number): string {
  if (seconds <= 0) return "0\"";
  if (seconds < 120) return `${seconds}"`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s === 0 ? `${m}'` : `${m}'${String(s).padStart(2, "0")}"`;
}

/** Accepts 90 · 90s · 90" · 1:30 · 1'30 · 1'30" · 2' · 2m */
export function parseRest(input: string): number | null {
  const v = input.trim().toLowerCase().replace(/\s+/g, "");
  if (!v) return null;
  let m = v.match(/^(\d{1,2})[:'m](\d{1,2})?(?:"|s)?$/);
  if (m) {
    const total = Number(m[1]) * 60 + Number(m[2] ?? 0);
    return total <= 900 ? total : null;
  }
  m = v.match(/^(\d{1,3})(?:"|s|sec)?$/);
  if (m) {
    const total = Number(m[1]);
    return total <= 900 ? total : null;
  }
  return null;
}

export function isValidReps(value: string): boolean {
  const v = value.trim();
  return v.length > 0 && v.length <= 12;
}

/** Seconds of work for one set, from the reps string ("10", "8-12", "30s", "AMRAP"). */
function workSecondsFor(reps: string): number {
  const v = reps.trim().toLowerCase();
  const time = v.match(/(\d+)\s*(s|sec|")/);
  if (time) return Number(time[1]);
  const minutes = v.match(/(\d+)\s*(min|')/);
  if (minutes) return Number(minutes[1]) * 60;
  const nums = v.match(/\d+/g);
  if (nums) {
    const avg = nums.map(Number).reduce((a, b) => a + b, 0) / nums.length;
    return Math.min(120, Math.max(15, avg * 4));
  }
  return 40;
}

/** Heuristic session length: warm-up + work + rest + transitions. Supersets rest once per round. */
export function estimateDayMinutes(exercises: WorkoutExercise[]): number {
  if (exercises.length === 0) return 0;
  let seconds = 10 * 60; // warm-up
  exercises.forEach((ex, i) => {
    const next = exercises[i + 1];
    const chainedToNext = ex.supersetId !== null && next?.supersetId === ex.supersetId;
    const rest = chainedToNext ? 15 : ex.restSeconds;
    seconds += ex.sets * (workSecondsFor(ex.reps) + rest);
    if (!chainedToNext) seconds += 120; // set-up / transition
  });
  return Math.max(10, Math.round(seconds / 60 / 5) * 5);
}

export interface MuscleLoad {
  muscle: MuscleGroup;
  sets: number;
}

export function muscleLoad(exercises: WorkoutExercise[], byId: Map<string, Exercise>): MuscleLoad[] {
  const map = new Map<MuscleGroup, number>();
  for (const ex of exercises) {
    const def = byId.get(ex.exerciseId);
    if (!def) continue;
    for (const m of def.primaryMuscles) map.set(m, (map.get(m) ?? 0) + ex.sets);
    for (const m of def.secondaryMuscles) map.set(m, (map.get(m) ?? 0) + ex.sets * 0.5);
  }
  return [...map.entries()]
    .map(([muscle, sets]) => ({ muscle, sets: Math.round(sets * 10) / 10 }))
    .sort((a, b) => b.sets - a.sets);
}

export function dayStats(day: Pick<WorkoutDay, "exercises" | "durationMinutes">, byId: Map<string, Exercise>) {
  const totalSets = day.exercises.reduce((sum, e) => sum + e.sets, 0);
  const estimated = estimateDayMinutes(day.exercises);
  return {
    exerciseCount: day.exercises.length,
    totalSets,
    estimatedMinutes: estimated,
    minutes: day.durationMinutes ?? estimated,
    muscles: muscleLoad(day.exercises, byId),
  };
}

export function planStats(plan: Pick<WorkoutPlan, "days">, byId: Map<string, Exercise>) {
  const all = plan.days.flatMap((d) => d.exercises);
  return {
    days: plan.days.filter((d) => d.exercises.length > 0).length,
    exerciseCount: all.length,
    totalSets: all.reduce((s, e) => s + e.sets, 0),
    weeklyMinutes: plan.days.reduce((s, d) => s + (d.durationMinutes ?? estimateDayMinutes(d.exercises)), 0),
    muscles: muscleLoad(all, byId),
  };
}

/**
 * A superset must be a contiguous run of ≥2 exercises. After reorders/removals,
 * split non-contiguous runs and dissolve singletons.
 */
export function normalizeSupersets(list: WorkoutExercise[]): WorkoutExercise[] {
  const out = list.map((e) => ({ ...e }));
  const seenRuns = new Set<string>();
  let i = 0;
  while (i < out.length) {
    const sid = out[i].supersetId;
    if (!sid) {
      i++;
      continue;
    }
    let j = i;
    while (j + 1 < out.length && out[j + 1].supersetId === sid) j++;
    const runLength = j - i + 1;
    if (runLength < 2) {
      out[i].supersetId = null;
    } else if (seenRuns.has(sid)) {
      const fresh = uuid();
      for (let k = i; k <= j; k++) out[k].supersetId = fresh;
      seenRuns.add(fresh);
    } else {
      seenRuns.add(sid);
    }
    i = j + 1;
  }
  return out;
}

export interface SupersetInfo {
  label: string;
  /** 1-based index inside the superset, e.g. A1, A2 */
  index: number;
  size: number;
  isFirst: boolean;
  isLast: boolean;
}

export function supersetInfo(list: WorkoutExercise[]): Map<string, SupersetInfo> {
  const map = new Map<string, SupersetInfo>();
  let groupIndex = 0;
  let i = 0;
  while (i < list.length) {
    const sid = list[i].supersetId;
    let j = i;
    if (sid) while (j + 1 < list.length && list[j + 1].supersetId === sid) j++;
    if (sid && j > i) {
      const label = String.fromCharCode(65 + (groupIndex % 26));
      for (let k = i; k <= j; k++) {
        map.set(list[k].id, { label, index: k - i + 1, size: j - i + 1, isFirst: k === i, isLast: k === j });
      }
      groupIndex++;
    }
    i = j + 1;
  }
  return map;
}

export function emptyDay(weekday: number): WorkoutDay {
  return { id: uuid(), weekday, title: null, category: null, goal: null, durationMinutes: null, notes: null, exercises: [] };
}

export function sortDays<T extends { weekday: number }>(days: T[]): T[] {
  return [...days].sort((a, b) => a.weekday - b.weekday);
}
