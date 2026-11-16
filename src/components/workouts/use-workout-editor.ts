"use client";

import * as React from "react";
import type { CoachProfile, WorkoutDay, WorkoutExercise, WorkoutPlan } from "@/lib/domain/types";
import { emptyDay, normalizeSupersets, sortDays } from "@/lib/domain/workout";
import { uuid } from "@/lib/id";
import { moveItem } from "@/lib/utils";
import type { WorkoutPlanInput } from "@/lib/domain/schemas";
import { msg } from "@/lib/i18n/core";

export type Defaults = Pick<CoachProfile, "defaultSets" | "defaultReps" | "defaultRestSeconds">;

interface State {
  plan: WorkoutPlan;
  activeDay: number;
  saved: string;
}

type DayPatch = Partial<Pick<WorkoutDay, "title" | "category" | "goal" | "durationMinutes" | "notes">>;
type ExercisePatch = Partial<Omit<WorkoutExercise, "id">>;

type Action =
  | { type: "meta"; patch: Partial<Pick<WorkoutPlan, "name" | "clientId" | "notes">> }
  | { type: "select-day"; weekday: number }
  | { type: "add-day"; weekday: number }
  | { type: "remove-day"; weekday: number }
  | { type: "copy-day"; from: number; to: number }
  | { type: "update-day"; patch: DayPatch }
  | { type: "add-exercise"; exerciseId: string; defaults: Defaults; newId: string }
  | { type: "update-exercise"; id: string; patch: ExercisePatch }
  | { type: "remove-exercise"; id: string }
  | { type: "restore-exercise"; exercise: WorkoutExercise; index: number; weekday: number }
  | { type: "duplicate-exercise"; id: string }
  | { type: "move-exercise"; from: number; to: number }
  | { type: "link-next"; id: string }
  | { type: "unlink"; id: string }
  | { type: "saved"; plan: WorkoutPlan };

/** Only the content the coach edits counts towards "unsaved changes". */
export function contentSnapshot(plan: WorkoutPlan) {
  return JSON.stringify({ c: plan.clientId, n: plan.name, o: plan.notes, d: sortDays(plan.days) });
}

function withDay(state: State, fn: (day: WorkoutDay) => WorkoutDay): State {
  return {
    ...state,
    plan: { ...state.plan, days: state.plan.days.map((d) => (d.weekday === state.activeDay ? fn(d) : d)) },
  };
}

function withExercises(state: State, fn: (list: WorkoutExercise[]) => WorkoutExercise[]): State {
  return withDay(state, (d) => ({ ...d, exercises: normalizeSupersets(fn(d.exercises)) }));
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "meta":
      return { ...state, plan: { ...state.plan, ...action.patch } };
    case "select-day":
      return { ...state, activeDay: action.weekday };
    case "add-day": {
      if (state.plan.days.some((d) => d.weekday === action.weekday)) return { ...state, activeDay: action.weekday };
      return { ...state, activeDay: action.weekday, plan: { ...state.plan, days: sortDays([...state.plan.days, emptyDay(action.weekday)]) } };
    }
    case "remove-day":
      return { ...state, plan: { ...state.plan, days: state.plan.days.filter((d) => d.weekday !== action.weekday) } };
    case "copy-day": {
      const source = state.plan.days.find((d) => d.weekday === action.from);
      if (!source) return state;
      const supersets = new Map<string, string>();
      const copy: WorkoutDay = {
        ...source,
        id: state.plan.days.find((d) => d.weekday === action.to)?.id ?? uuid(),
        weekday: action.to,
        exercises: source.exercises.map((e) => {
          let supersetId: string | null = null;
          if (e.supersetId) {
            if (!supersets.has(e.supersetId)) supersets.set(e.supersetId, uuid());
            supersetId = supersets.get(e.supersetId)!;
          }
          return { ...e, id: uuid(), supersetId };
        }),
      };
      return {
        ...state,
        activeDay: action.to,
        plan: { ...state.plan, days: sortDays([...state.plan.days.filter((d) => d.weekday !== action.to), copy]) },
      };
    }
    case "update-day":
      return withDay(state, (d) => ({ ...d, ...action.patch }));
    case "add-exercise": {
      let next = state;
      if (!state.plan.days.some((d) => d.weekday === state.activeDay)) next = reducer(state, { type: "add-day", weekday: state.activeDay });
      const ex: WorkoutExercise = {
        id: action.newId,
        exerciseId: action.exerciseId,
        sets: action.defaults.defaultSets,
        reps: action.defaults.defaultReps,
        restSeconds: action.defaults.defaultRestSeconds,
        weightKg: null,
        tempo: null,
        notes: null,
        supersetId: null,
      };
      return withExercises(next, (list) => [...list, ex]);
    }
    case "update-exercise":
      return withExercises(state, (list) => list.map((e) => (e.id === action.id ? { ...e, ...action.patch } : e)));
    case "remove-exercise":
      return withExercises(state, (list) => list.filter((e) => e.id !== action.id));
    case "restore-exercise": {
      const target = { ...state, activeDay: action.weekday };
      const restored = withExercises(target, (list) => {
        const copy = list.slice();
        copy.splice(Math.min(action.index, copy.length), 0, action.exercise);
        return copy;
      });
      return { ...restored, activeDay: action.weekday };
    }
    case "duplicate-exercise":
      return withExercises(state, (list) => {
        const i = list.findIndex((e) => e.id === action.id);
        if (i < 0) return list;
        const copy = list.slice();
        copy.splice(i + 1, 0, { ...list[i], id: uuid(), supersetId: null });
        return copy;
      });
    case "move-exercise":
      return withExercises(state, (list) => moveItem(list, action.from, action.to));
    case "link-next":
      return withExercises(state, (list) => {
        const i = list.findIndex((e) => e.id === action.id);
        if (i < 0 || i === list.length - 1) return list;
        const group = list[i].supersetId ?? list[i + 1].supersetId ?? uuid();
        const nextGroup = list[i + 1].supersetId;
        return list.map((e, k) => (k === i || k === i + 1 || (nextGroup && e.supersetId === nextGroup) ? { ...e, supersetId: group } : e));
      });
    case "unlink":
      return withExercises(state, (list) => list.map((e) => (e.id === action.id ? { ...e, supersetId: null } : e)));
    case "saved":
      return { ...state, plan: action.plan, saved: contentSnapshot(action.plan) };
  }
}

export function useWorkoutEditor(initial: WorkoutPlan, isNew: boolean) {
  const [state, dispatch] = React.useReducer(reducer, undefined, () => ({
    plan: initial,
    activeDay: sortDays(initial.days)[0]?.weekday ?? 0,
    // A brand-new plan starts "clean" until the coach changes something.
    saved: contentSnapshot(initial),
  }));
  const dirty = React.useMemo(() => contentSnapshot(state.plan) !== state.saved, [state.plan, state.saved]);
  const day = state.plan.days.find((d) => d.weekday === state.activeDay) ?? null;
  return { state, dispatch, dirty: dirty || (isNew && state.plan.days.some((d) => d.exercises.length > 0)), day };
}

export function toWorkoutInput(plan: WorkoutPlan, status: "draft" | "published"): WorkoutPlanInput {
  return {
    id: plan.id,
    clientId: plan.clientId,
    name: plan.name.trim() || msg("Scheda senza nome"),
    status,
    notes: plan.notes,
    days: sortDays(plan.days).map((d) => ({
      id: d.id,
      weekday: d.weekday,
      title: d.title?.trim() || null,
      category: d.category,
      goal: d.goal,
      durationMinutes: d.durationMinutes,
      notes: d.notes?.trim() || null,
      exercises: d.exercises.map((e) => ({
        id: e.id,
        exerciseId: e.exerciseId,
        sets: e.sets,
        reps: e.reps.trim(),
        restSeconds: e.restSeconds,
        weightKg: e.weightKg,
        tempo: e.tempo?.trim() || null,
        notes: e.notes?.trim() || null,
        supersetId: e.supersetId,
      })),
    })),
  };
}
