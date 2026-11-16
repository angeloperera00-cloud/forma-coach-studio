import type { Food, MealEntry, Nutrients, NutritionTargets, RecipeIngredient } from "./types";
import type { MealSlot } from "./constants";
import { round } from "@/lib/utils";

export const ZERO: Nutrients = { kcal: 0, protein: 0, carbs: 0, fat: 0 };

export function scaleNutrients(per100: Nutrients, amount: number): Nutrients {
  const f = amount / 100;
  return {
    kcal: round(per100.kcal * f, 0),
    protein: round(per100.protein * f, 1),
    carbs: round(per100.carbs * f, 1),
    fat: round(per100.fat * f, 1),
  };
}

export function addNutrients(a: Nutrients, b: Nutrients): Nutrients {
  return { kcal: a.kcal + b.kcal, protein: a.protein + b.protein, carbs: a.carbs + b.carbs, fat: a.fat + b.fat };
}

/** Energy from macros (Atwater 4/4/9) — used for consistency hints, never to invent values. */
export function kcalFromMacros(n: Pick<Nutrients, "protein" | "carbs" | "fat">): number {
  return n.protein * 4 + n.carbs * 4 + n.fat * 9;
}

/**
 * Recipe nutrition is derived strictly from ingredient data in the library.
 * Missing ingredients are reported, never guessed.
 */
export function computeRecipe(ingredients: RecipeIngredient[], foodsById: Map<string, Food>, servings: number) {
  let totals = { ...ZERO };
  let totalWeight = 0;
  const missing: string[] = [];
  for (const ing of ingredients) {
    const food = foodsById.get(ing.foodId);
    if (!food) {
      missing.push(ing.foodId);
      continue;
    }
    totals = addNutrients(totals, scaleNutrients(food.per100, ing.amount));
    totalWeight += ing.amount;
  }
  const per100: Nutrients =
    totalWeight > 0
      ? {
          kcal: round((totals.kcal / totalWeight) * 100, 1),
          protein: round((totals.protein / totalWeight) * 100, 2),
          carbs: round((totals.carbs / totalWeight) * 100, 2),
          fat: round((totals.fat / totalWeight) * 100, 2),
        }
      : { ...ZERO };
  const safeServings = Math.max(1, servings);
  return {
    totals: { kcal: round(totals.kcal, 0), protein: round(totals.protein, 1), carbs: round(totals.carbs, 1), fat: round(totals.fat, 1) },
    totalWeight: round(totalWeight, 1),
    servingSize: round(totalWeight / safeServings, 1),
    perServing: scaleNutrients(per100, totalWeight / safeServings),
    per100,
    missing,
  };
}

/** Fields of a meal entry derived from a library food at a given amount. */
export function mealFieldsFromFood(food: Food, amount = food.servingSize) {
  const n = scaleNutrients(food.per100, amount);
  return {
    foodId: food.id,
    name: food.name,
    imageUrl: food.imageUrl,
    amount: round(amount, 1),
    unit: food.unit,
    kcal: n.kcal,
    protein: n.protein,
    carbs: n.carbs,
    fat: n.fat,
    nutritionSource: "food" as const,
  };
}

export interface NutritionSummary extends Nutrients {
  entries: number;
  /** entries without calorie data (excluded from totals) */
  unknown: number;
}

export function summarize(entries: MealEntry[]): NutritionSummary {
  const out: NutritionSummary = { ...ZERO, entries: entries.length, unknown: 0 };
  for (const e of entries) {
    if (e.kcal === null) {
      out.unknown++;
      continue;
    }
    out.kcal += e.kcal;
    out.protein += e.protein ?? 0;
    out.carbs += e.carbs ?? 0;
    out.fat += e.fat ?? 0;
  }
  out.kcal = round(out.kcal, 0);
  out.protein = round(out.protein, 1);
  out.carbs = round(out.carbs, 1);
  out.fat = round(out.fat, 1);
  return out;
}

export function daySummary(meals: MealEntry[], day: number): NutritionSummary {
  return summarize(meals.filter((m) => m.day === day));
}

/** Average over the days that contain at least one entry with known calories. */
export function weeklyAverage(meals: MealEntry[]): (Nutrients & { days: number }) | null {
  const days = [0, 1, 2, 3, 4, 5, 6].map((d) => daySummary(meals, d)).filter((s) => s.entries > 0 && s.entries > s.unknown);
  if (days.length === 0) return null;
  const sum = days.reduce<Nutrients>((acc, s) => addNutrients(acc, s), { ...ZERO });
  return {
    kcal: round(sum.kcal / days.length, 0),
    protein: round(sum.protein / days.length, 1),
    carbs: round(sum.carbs / days.length, 1),
    fat: round(sum.fat / days.length, 1),
    days: days.length,
  };
}

export function cellEntries(meals: MealEntry[], day: number, slot: MealSlot): MealEntry[] {
  return meals.filter((m) => m.day === day && m.slot === slot).sort((a, b) => a.position - b.position);
}

export function macroSplit(n: Pick<Nutrients, "protein" | "carbs" | "fat">) {
  const p = n.protein * 4;
  const c = n.carbs * 4;
  const f = n.fat * 9;
  const total = p + c + f;
  if (total <= 0) return { protein: 0, carbs: 0, fat: 0 };
  return { protein: Math.round((p / total) * 100), carbs: Math.round((c / total) * 100), fat: Math.round((f / total) * 100) };
}

export function hasTargets(t: NutritionTargets): boolean {
  return t.kcal !== null || t.protein !== null || t.carbs !== null || t.fat !== null;
}
