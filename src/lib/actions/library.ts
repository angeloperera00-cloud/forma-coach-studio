"use server";

import { getRepository, NotFoundError } from "@/lib/data";
import type { FoodRecord } from "@/lib/data/repository";
import { exerciseInput, foodInput, idSchema, recipeInput } from "@/lib/domain/schemas";
import { computeRecipe } from "@/lib/domain/nutrition";
import type { Exercise, Food } from "@/lib/domain/types";
import { AppError } from "@/lib/data";
import { handle, refreshAll, type ActionResult } from "./utils";
import { msg } from "@/lib/i18n/core";

/* -------------------------------- exercises -------------------------------- */
export async function createExerciseAction(raw: unknown): Promise<ActionResult<Exercise>> {
  return handle(async () => {
    const exercise = await getRepository().createExercise(exerciseInput.parse(raw));
    refreshAll();
    return exercise;
  });
}

export async function updateExerciseAction(id: unknown, raw: unknown): Promise<ActionResult<Exercise>> {
  return handle(async () => {
    const exercise = await getRepository().updateExercise(idSchema.parse(id), exerciseInput.parse(raw));
    refreshAll();
    return exercise;
  });
}

export async function deleteExerciseAction(id: unknown): Promise<ActionResult> {
  return handle(async () => {
    await getRepository().deleteExercise(idSchema.parse(id));
    refreshAll();
    return null;
  });
}

/* ---------------------------------- foods ---------------------------------- */
export async function saveFoodAction(id: unknown, raw: unknown): Promise<ActionResult<Food>> {
  return handle(async () => {
    const input = foodInput.parse(raw);
    const repo = getRepository();
    const existing = id ? await repo.getFood(idSchema.parse(id)) : null;
    if (id && !existing) throw new NotFoundError(msg("Alimento non trovato"));
    const record: FoodRecord = {
      name: input.name,
      category: input.category,
      kind: "food",
      imageUrl: input.imageUrl,
      unit: input.unit,
      servingSize: input.servingSize,
      servingLabel: input.servingLabel,
      per100: input.per100,
      servings: null,
      ingredients: [],
      // Editing the values of a starter food makes them the coach's own data.
      source: input.sourceRef ? "external" : "custom",
      sourceRef: input.sourceRef,
      isCustom: existing ? existing.isCustom : true,
    };
    const food = existing ? await repo.updateFood(existing.id, record) : await repo.createFood(record);
    refreshAll();
    return food;
  });
}

/** Recipe nutrition is always derived from its ingredients in the library — never typed in. */
export async function saveRecipeAction(id: unknown, raw: unknown): Promise<ActionResult<Food>> {
  return handle(async () => {
    const input = recipeInput.parse(raw);
    const repo = getRepository();
    const existing = id ? await repo.getFood(idSchema.parse(id)) : null;
    if (id && !existing) throw new NotFoundError(msg("Ricetta non trovata"));
    const foods = await repo.listFoods();
    const byId = new Map(foods.map((f) => [f.id, f]));
    if (existing && input.ingredients.some((i) => i.foodId === existing.id)) throw new AppError(msg("Una ricetta non può contenere se stessa"));
    if (input.ingredients.some((i) => byId.get(i.foodId)?.kind === "recipe")) throw new AppError(msg("Usa solo alimenti semplici come ingredienti"));
    const computed = computeRecipe(input.ingredients, byId, input.servings);
    if (computed.missing.length) throw new NotFoundError(msg("Uno degli ingredienti non è più nella libreria"));

    const record: FoodRecord = {
      name: input.name,
      category: input.category,
      kind: "recipe",
      imageUrl: input.imageUrl,
      unit: "g",
      servingSize: computed.servingSize,
      servingLabel: input.servingLabel,
      per100: computed.per100,
      servings: input.servings,
      ingredients: input.ingredients,
      source: "custom",
      sourceRef: null,
      isCustom: existing ? existing.isCustom : true,
    };
    const food = existing ? await repo.updateFood(existing.id, record) : await repo.createFood(record);
    refreshAll();
    return food;
  });
}

export async function deleteFoodAction(id: unknown): Promise<ActionResult> {
  return handle(async () => {
    await getRepository().deleteFood(idSchema.parse(id));
    refreshAll();
    return null;
  });
}
