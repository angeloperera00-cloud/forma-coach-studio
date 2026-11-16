import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getRepository } from "@/lib/data";
import { getSession } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";
import { idSchema, nutritionPlanInput, workoutPlanInput } from "@/lib/domain/schemas";
import type { CoachProfile, Exercise, NutritionPlan, WorkoutPlan } from "@/lib/domain/types";
import type { I18n } from "@/lib/i18n/core";

/*
 * Exports started from the editors send the plan in the request body, so PDF/PNG/JPG never depend
 * on reading the saved copy back (demo mode on serverless hosting keeps data per instance).
 */

const workoutBody = z.object({
  plan: z.unknown(),
  clientName: z.string().max(140).nullable(),
  exercises: z
    .array(z.object({ id: idSchema, name: z.string().max(120), primaryMuscles: z.array(z.string().max(40)).max(12), imageUrls: z.array(z.string().max(500)).max(2) }))
    .max(300),
});
const nutritionBody = z.object({ plan: z.unknown(), clientName: z.string().max(140).nullable() });

interface Base {
  clientName: string | null;
  coach: CoachProfile;
  i18n: I18n;
}
export type WorkoutExport = Base & { plan: WorkoutPlan; exercises: Exercise[] };
export type NutritionExport = Base & { plan: NutritionPlan };

const stamp = () => {
  const now = new Date().toISOString();
  return { publishedAt: null, createdAt: now, updatedAt: now };
};

export async function readWorkoutExport(request: Request, id: string): Promise<WorkoutExport | Response> {
  if (!(await getSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const i18n = await getI18n();
  const body = workoutBody.safeParse(await request.json().catch(() => null));
  const input = body.success ? workoutPlanInput.safeParse(body.data.plan) : null;
  if (!body.success || !input?.success || input.data.id !== id) return NextResponse.json({ error: i18n.t("Dati non validi") }, { status: 400 });

  const repo = getRepository();
  const [coach, library] = await Promise.all([repo.getCoach(), repo.listExercises()]);
  const known = new Map(library.map((e) => [e.id, e]));
  // Library data wins; exercises this instance doesn't know come from the editor (local images only).
  const sent = body.data.exercises
    .filter((e) => !known.has(e.id))
    .map((e) => ({ ...e, imageUrls: e.imageUrls.filter((u) => u.startsWith("/")) }) as unknown as Exercise);
  return { plan: { ...input.data, ...stamp() } as WorkoutPlan, clientName: body.data.clientName, coach, exercises: [...library, ...sent], i18n };
}

export async function readNutritionExport(request: Request, id: string): Promise<NutritionExport | Response> {
  if (!(await getSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const i18n = await getI18n();
  const body = nutritionBody.safeParse(await request.json().catch(() => null));
  const input = body.success ? nutritionPlanInput.safeParse(body.data.plan) : null;
  if (!body.success || !input?.success || input.data.id !== id) return NextResponse.json({ error: i18n.t("Dati non validi") }, { status: 400 });
  const coach = await getRepository().getCoach();
  return { plan: { ...input.data, ...stamp() } as NutritionPlan, clientName: body.data.clientName, coach, i18n };
}
