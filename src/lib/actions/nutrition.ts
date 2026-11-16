"use server";

import { z } from "zod";
import { getRepository, NotFoundError } from "@/lib/data";
import { idSchema, nutritionPlanInput } from "@/lib/domain/schemas";
import { PLAN_STATUSES } from "@/lib/domain/constants";
import type { NutritionPlan } from "@/lib/domain/types";
import { uuid } from "@/lib/id";
import { handle, logActivity, refreshAll, touch, type ActionResult } from "./utils";
import { msg } from "@/lib/i18n/core";

export async function saveNutritionPlanAction(raw: unknown): Promise<ActionResult<NutritionPlan>> {
  return handle(async () => {
    const input = nutritionPlanInput.parse(raw);
    const repo = getRepository();
    const client = input.clientId ? await repo.getClient(input.clientId) : null;
    if (input.clientId && !client) throw new NotFoundError(msg("Il cliente selezionato non esiste più"));

    // Library references must exist; values themselves are the snapshot the coach saw.
    const foodIds = new Set((await repo.listFoods()).map((f) => f.id));
    const meals = input.meals.map((m) => (m.foodId && !foodIds.has(m.foodId) ? { ...m, foodId: null } : m));

    const previous = await repo.getNutritionPlan(input.id);
    const plan = await repo.saveNutritionPlan({ ...input, meals });
    const who = client ? ` · ${client.firstName} ${client.lastName}` : "";

    if (input.status === "published" && previous?.status !== "published") {
      await logActivity({ type: "nutrition_published", clientId: input.clientId, title: msg("Piano alimentare pubblicato"), description: "{plan}{who}", params: { plan: plan.name, who }, href: `/nutrition/${plan.id}` });
    } else if (!previous) {
      await logActivity({ type: "nutrition_created", clientId: input.clientId, title: msg("Nuovo piano alimentare"), description: "{plan}{who} (bozza)", params: { plan: plan.name, who }, href: `/nutrition/${plan.id}` });
    }
    await touch(input.clientId);
    refreshAll();
    return plan;
  });
}

export async function setNutritionStatusAction(id: unknown, status: unknown): Promise<ActionResult> {
  return handle(async () => {
    const planId = idSchema.parse(id);
    const next = z.enum(PLAN_STATUSES).parse(status);
    const repo = getRepository();
    const plan = await repo.getNutritionPlan(planId);
    if (!plan) throw new NotFoundError(msg("Piano non trovato"));
    if (next === "published") nutritionPlanInput.parse({ ...plan, status: "published" });
    await repo.setNutritionPlanStatus(planId, next);
    if (next === "published" && plan.status !== "published") {
      await logActivity({ type: "nutrition_published", clientId: plan.clientId, title: msg("Piano alimentare pubblicato"), description: "{plan}", params: { plan: plan.name }, href: `/nutrition/${plan.id}` });
    }
    refreshAll();
    return null;
  });
}

export async function duplicateNutritionPlanAction(id: unknown, clientId?: unknown): Promise<ActionResult<{ id: string }>> {
  return handle(async () => {
    const repo = getRepository();
    const source = await repo.getNutritionPlan(idSchema.parse(id));
    if (!source) throw new NotFoundError(msg("Piano non trovato"));
    const target = clientId === undefined ? source.clientId : idSchema.nullable().parse(clientId);
    const copy = await repo.saveNutritionPlan(
      nutritionPlanInput.parse({
        ...source,
        id: uuid(),
        clientId: target,
        name: `${source.name} (copia)`.slice(0, 100),
        status: "draft",
        meals: source.meals.map((m) => ({ ...m, id: uuid() })),
      }),
    );
    refreshAll();
    return { id: copy.id };
  });
}

export async function deleteNutritionPlanAction(id: unknown): Promise<ActionResult> {
  return handle(async () => {
    await getRepository().deleteNutritionPlan(idSchema.parse(id));
    refreshAll();
    return null;
  });
}
