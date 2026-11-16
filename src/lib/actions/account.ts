"use server";

import { z } from "zod";
import { AppError, getRepository } from "@/lib/data";
import { syncReminders } from "@/lib/data/reminders";
import { coachProfileInput, idSchema } from "@/lib/domain/schemas";
import type { Activity, CoachProfile, SearchItem } from "@/lib/domain/types";
import { GOAL_LABELS, MUSCLE_LABELS } from "@/lib/domain/constants";
import { handle, refreshAll, type ActionResult } from "./utils";
import { msg } from "@/lib/i18n/core";
import { getI18n } from "@/lib/i18n/server";

export async function updateCoachAction(raw: unknown): Promise<ActionResult<CoachProfile>> {
  return handle(async () => {
    const coach = await getRepository().updateCoach(coachProfileInput.parse(raw));
    refreshAll();
    return coach;
  });
}

export async function resetDemoDataAction(): Promise<ActionResult> {
  return handle(async () => {
    const repo = getRepository();
    if (repo.mode !== "demo" || !repo.resetDemoData) throw new AppError(msg("Disponibile solo in modalità demo"));
    await repo.resetDemoData();
    await syncReminders(repo, true);
    refreshAll();
    return null;
  });
}

/* ------------------------------ notifications ------------------------------ */
const ids = z.union([z.literal("all"), z.array(idSchema).min(1).max(500)]);

export async function markActivityAction(target: unknown, read: unknown): Promise<ActionResult> {
  return handle(async () => {
    await getRepository().markActivity(ids.parse(target), z.boolean().parse(read));
    refreshAll();
    return null;
  });
}

export async function deleteActivityAction(target: unknown): Promise<ActionResult> {
  return handle(async () => {
    await getRepository().deleteActivity(z.union([z.literal("read"), z.array(idSchema).min(1).max(500)]).parse(target));
    refreshAll();
    return null;
  });
}

export async function getRecentActivityAction(): Promise<ActionResult<{ items: Activity[]; unread: number }>> {
  return handle(async () => {
    const repo = getRepository();
    const [items, unread] = await Promise.all([repo.listActivity({ limit: 8 }), repo.countUnreadActivity()]);
    return { items, unread };
  });
}

/* --------------------------------- search ---------------------------------- */
export async function getSearchIndexAction(): Promise<ActionResult<SearchItem[]>> {
  return handle(async () => {
    const { t } = await getI18n();
    const repo = getRepository();
    const [clients, workouts, nutrition, exercises, foods] = await Promise.all([
      repo.listClients(),
      repo.listWorkoutPlans(),
      repo.listNutritionPlans(),
      repo.listExercises(),
      repo.listFoods(),
    ]);
    const name = new Map(clients.map((c) => [c.id, `${c.firstName} ${c.lastName}`]));
    return [
      ...clients.map((c): SearchItem => ({ id: c.id, group: "clients", title: `${c.firstName} ${c.lastName}`, subtitle: t(GOAL_LABELS[c.goal]), href: `/clients/${c.id}`, image: c.avatarUrl })),
      ...workouts.map((w): SearchItem => ({ id: w.id, group: "workouts", title: w.name, subtitle: w.clientId ? (name.get(w.clientId) ?? "") : t("Senza cliente"), href: `/workouts/${w.id}`, image: null })),
      ...nutrition.map((n): SearchItem => ({ id: n.id, group: "nutrition", title: n.name, subtitle: n.clientId ? (name.get(n.clientId) ?? "") : t("Senza cliente"), href: `/nutrition/${n.id}`, image: null })),
      ...exercises.map((e): SearchItem => ({ id: e.id, group: "exercises", title: e.name, subtitle: e.primaryMuscles.map((m) => t(MUSCLE_LABELS[m])).join(", "), href: `/exercises?open=${e.id}`, image: e.imageUrls[0] ?? null })),
      ...foods.map((f): SearchItem => ({ id: f.id, group: "foods", title: f.name, subtitle: f.kind === "recipe" ? t("Ricetta") : t("Alimento"), href: `/foods?open=${f.id}`, image: f.imageUrl })),
    ];
  });
}

export async function getClientNotesAction(clientId: unknown) {
  return handle(async () => getRepository().listClientNotes(idSchema.parse(clientId)));
}
