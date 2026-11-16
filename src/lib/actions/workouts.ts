"use server";

import { z } from "zod";
import { getRepository, NotFoundError } from "@/lib/data";
import { idSchema, workoutPlanInput } from "@/lib/domain/schemas";
import { PLAN_STATUSES } from "@/lib/domain/constants";
import type { WorkoutPlan } from "@/lib/domain/types";
import { uuid } from "@/lib/id";
import { handle, logActivity, refreshAll, touch, type ActionResult } from "./utils";
import { msg } from "@/lib/i18n/core";

export async function saveWorkoutPlanAction(raw: unknown): Promise<ActionResult<WorkoutPlan>> {
  return handle(async () => {
    const input = workoutPlanInput.parse(raw);
    const repo = getRepository();
    const client = input.clientId ? await repo.getClient(input.clientId) : null;
    if (input.clientId && !client) throw new NotFoundError(msg("Il cliente selezionato non esiste più"));

    const exerciseIds = new Set((await repo.listExercises()).map((e) => e.id));
    const unknown = input.days.flatMap((d) => d.exercises).find((e) => !exerciseIds.has(e.exerciseId));
    if (unknown) throw new NotFoundError(msg("Uno degli esercizi non è più presente nella libreria"));

    const previous = await repo.getWorkoutPlan(input.id);
    const plan = await repo.saveWorkoutPlan(input);
    const who = client ? ` · ${client.firstName} ${client.lastName}` : "";

    if (input.status === "published" && previous?.status !== "published") {
      await logActivity({ type: "workout_published", clientId: input.clientId, title: msg("Scheda pubblicata"), description: "{plan}{who}", params: { plan: plan.name, who }, href: `/workouts/${plan.id}` });
    } else if (!previous) {
      await logActivity({ type: "workout_created", clientId: input.clientId, title: msg("Nuova scheda"), description: "{plan}{who} (bozza)", params: { plan: plan.name, who }, href: `/workouts/${plan.id}` });
    }
    await touch(input.clientId);
    refreshAll();
    return plan;
  });
}

export async function setWorkoutStatusAction(id: unknown, status: unknown): Promise<ActionResult> {
  return handle(async () => {
    const planId = idSchema.parse(id);
    const next = z.enum(PLAN_STATUSES).parse(status);
    const repo = getRepository();
    const plan = await repo.getWorkoutPlan(planId);
    if (!plan) throw new NotFoundError(msg("Scheda non trovata"));
    if (next === "published") workoutPlanInput.parse({ ...plan, status: "published" });
    await repo.setWorkoutPlanStatus(planId, next);
    if (next === "published" && plan.status !== "published") {
      await logActivity({ type: "workout_published", clientId: plan.clientId, title: msg("Scheda pubblicata"), description: "{plan}", params: { plan: plan.name }, href: `/workouts/${plan.id}` });
    }
    refreshAll();
    return null;
  });
}

export async function duplicateWorkoutPlanAction(id: unknown, clientId?: unknown): Promise<ActionResult<{ id: string }>> {
  return handle(async () => {
    const repo = getRepository();
    const source = await repo.getWorkoutPlan(idSchema.parse(id));
    if (!source) throw new NotFoundError(msg("Scheda non trovata"));
    const target = clientId === undefined ? source.clientId : idSchema.nullable().parse(clientId);
    const copy = await repo.saveWorkoutPlan(
      workoutPlanInput.parse({
        id: uuid(),
        clientId: target,
        name: `${source.name} (copia)`.slice(0, 100),
        status: "draft",
        notes: source.notes,
        days: source.days.map((d) => {
          const supersets = new Map<string, string>();
          return {
            ...d,
            id: uuid(),
            exercises: d.exercises.map((e) => {
              let supersetId: string | null = null;
              if (e.supersetId) {
                if (!supersets.has(e.supersetId)) supersets.set(e.supersetId, uuid());
                supersetId = supersets.get(e.supersetId)!;
              }
              return { ...e, id: uuid(), supersetId };
            }),
          };
        }),
      }),
    );
    refreshAll();
    return { id: copy.id };
  });
}

export async function deleteWorkoutPlanAction(id: unknown): Promise<ActionResult> {
  return handle(async () => {
    await getRepository().deleteWorkoutPlan(idSchema.parse(id));
    refreshAll();
    return null;
  });
}
