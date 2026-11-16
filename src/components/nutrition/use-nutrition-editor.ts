"use client";

import * as React from "react";
import type { MealEntry, NutritionPlan, NutritionTargets } from "@/lib/domain/types";
import type { MealSlot } from "@/lib/domain/constants";
import type { NutritionPlanInput } from "@/lib/domain/schemas";
import { uuid } from "@/lib/id";
import { msg } from "@/lib/i18n/core";

interface State {
  plan: NutritionPlan;
  saved: string;
}

type Action =
  | { type: "meta"; patch: Partial<Pick<NutritionPlan, "name" | "clientId" | "notes" | "weekStart">> }
  | { type: "targets"; targets: NutritionTargets }
  | { type: "upsert"; entry: MealEntry }
  | { type: "remove"; id: string }
  | { type: "duplicate"; id: string }
  | { type: "copy-to-days"; id: string; days: number[] }
  | { type: "copy-day"; from: number; to: number[] }
  | { type: "clear-day"; day: number }
  | { type: "restore"; entries: MealEntry[] }
  | { type: "saved"; plan: NutritionPlan };

const cellKey = (m: Pick<MealEntry, "day" | "slot">) => `${m.day}:${m.slot}`;

/** Keep positions contiguous (0..n) inside every day/slot cell. */
function reindex(meals: MealEntry[]): MealEntry[] {
  const counters = new Map<string, number>();
  return [...meals]
    .sort((a, b) => a.day - b.day || a.slot.localeCompare(b.slot) || a.position - b.position)
    .map((m) => {
      const k = cellKey(m);
      const p = counters.get(k) ?? 0;
      counters.set(k, p + 1);
      return m.position === p ? m : { ...m, position: p };
    });
}

function nextPosition(meals: MealEntry[], day: number, slot: MealSlot) {
  return meals.filter((m) => m.day === day && m.slot === slot).length;
}

export function contentSnapshot(plan: NutritionPlan) {
  const meals = [...plan.meals].sort((a, b) => a.id.localeCompare(b.id));
  return JSON.stringify({ c: plan.clientId, n: plan.name, o: plan.notes, w: plan.weekStart, t: plan.targets, m: meals });
}

function reducer(state: State, action: Action): State {
  const setMeals = (meals: MealEntry[]) => ({ ...state, plan: { ...state.plan, meals: reindex(meals) } });
  const meals = state.plan.meals;
  switch (action.type) {
    case "meta":
      return { ...state, plan: { ...state.plan, ...action.patch } };
    case "targets":
      return { ...state, plan: { ...state.plan, targets: action.targets } };
    case "upsert": {
      const exists = meals.some((m) => m.id === action.entry.id);
      if (exists) return setMeals(meals.map((m) => (m.id === action.entry.id ? action.entry : m)));
      return setMeals([...meals, { ...action.entry, position: nextPosition(meals, action.entry.day, action.entry.slot) }]);
    }
    case "remove":
      return setMeals(meals.filter((m) => m.id !== action.id));
    case "duplicate": {
      const src = meals.find((m) => m.id === action.id);
      if (!src) return state;
      return setMeals([...meals, { ...src, id: uuid(), position: src.position + 0.5 }]);
    }
    case "copy-to-days": {
      const src = meals.find((m) => m.id === action.id);
      if (!src) return state;
      const copies = action.days
        .filter((d) => d !== src.day)
        .map((day) => ({ ...src, id: uuid(), day, position: nextPosition(meals, day, src.slot) }));
      return setMeals([...meals, ...copies]);
    }
    case "copy-day": {
      const source = meals.filter((m) => m.day === action.from);
      const kept = meals.filter((m) => !action.to.includes(m.day));
      const copies = action.to.flatMap((day) => source.map((m) => ({ ...m, id: uuid(), day })));
      return setMeals([...kept, ...copies]);
    }
    case "clear-day":
      return setMeals(meals.filter((m) => m.day !== action.day));
    case "restore": {
      const ids = new Set(meals.map((m) => m.id));
      return setMeals([...meals, ...action.entries.filter((e) => !ids.has(e.id))]);
    }
    case "saved":
      return { plan: action.plan, saved: contentSnapshot(action.plan) };
  }
}

export function useNutritionEditor(initial: NutritionPlan, isNew: boolean) {
  const [state, dispatch] = React.useReducer(reducer, undefined, () => ({ plan: { ...initial, meals: reindex(initial.meals) }, saved: contentSnapshot({ ...initial, meals: reindex(initial.meals) }) }));
  const changed = React.useMemo(() => contentSnapshot(state.plan) !== state.saved, [state.plan, state.saved]);
  return { plan: state.plan, dispatch, dirty: changed || (isNew && state.plan.meals.length > 0) };
}

export function toNutritionInput(plan: NutritionPlan, status: "draft" | "published"): NutritionPlanInput {
  return {
    id: plan.id,
    clientId: plan.clientId,
    name: plan.name.trim() || msg("Piano senza nome"),
    notes: plan.notes?.trim() || null,
    status,
    weekStart: plan.weekStart,
    targets: plan.targets,
    meals: reindex(plan.meals).map((m) => ({
      id: m.id,
      day: m.day,
      slot: m.slot,
      position: m.position,
      foodId: m.foodId,
      name: m.name.trim(),
      imageUrl: m.imageUrl,
      amount: m.amount,
      unit: m.unit,
      kcal: m.kcal,
      protein: m.protein,
      carbs: m.carbs,
      fat: m.fat,
      nutritionSource: m.nutritionSource,
      notes: m.notes?.trim() || null,
    })),
  };
}
