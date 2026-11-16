import { NextResponse } from "next/server";
import { getRepository } from "@/lib/data";
import { getSession } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";
import { z } from "zod";
import { idSchema, workoutPlanInput } from "@/lib/domain/schemas";
import type { Exercise, WorkoutPlan } from "@/lib/domain/types";
import { renderWorkoutPdf } from "@/lib/pdf/workout-pdf";
import { pdfFilename, pdfResponse } from "@/lib/pdf/shared";

export async function GET(_request: Request, ctx: RouteContext<"/api/pdf/workout/[id]">) {
  if (!(await getSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  if (!idSchema.safeParse(id).success) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const repo = getRepository();
  const plan = await repo.getWorkoutPlan(id);
  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const [coach, exercises, client, i18n] = await Promise.all([repo.getCoach(), repo.listExercises(), plan.clientId ? repo.getClient(plan.clientId) : null, getI18n()]);
  const clientName = client ? `${client.firstName} ${client.lastName}` : null;
  try {
    const pdf = await renderWorkoutPdf({ plan, clientName, coach, exercises, i18n });
    return pdfResponse(pdf, pdfFilename(i18n.t("Scheda"), clientName, plan.name));
  } catch (error) {
    console.error("[pdf:workout]", error);
    return NextResponse.json({ error: i18n.t("Esportazione PDF non riuscita") }, { status: 500 });
  }
}

const postBody = z.object({
  plan: z.unknown(),
  clientName: z.string().max(140).nullable(),
  exercises: z
    .array(z.object({ id: idSchema, name: z.string().max(120), primaryMuscles: z.array(z.string().max(40)).max(12), imageUrls: z.array(z.string().max(500)).max(2) }))
    .max(300),
});

/**
 * Export from the editor: the plan travels in the request body, so the PDF works even when the
 * server instance can't read the saved copy (e.g. demo mode on serverless hosting).
 */
export async function POST(request: Request, ctx: RouteContext<"/api/pdf/workout/[id]">) {
  if (!(await getSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const i18n = await getI18n();
  const body = postBody.safeParse(await request.json().catch(() => null));
  const input = body.success ? workoutPlanInput.safeParse(body.data.plan) : null;
  if (!body.success || !input?.success || input.data.id !== id) return NextResponse.json({ error: i18n.t("Dati non validi") }, { status: 400 });

  const repo = getRepository();
  const [coach, library] = await Promise.all([repo.getCoach(), repo.listExercises()]);
  const known = new Map(library.map((e) => [e.id, e]));
  // Library data wins; exercises this instance doesn't know come from the editor (local images only).
  const sent = body.data.exercises.map(
    (e) => known.get(e.id) ?? ({ ...e, imageUrls: e.imageUrls.filter((u) => u.startsWith("/")) } as unknown as Exercise),
  );
  const now = new Date().toISOString();
  const plan: WorkoutPlan = { ...input.data, publishedAt: null, createdAt: now, updatedAt: now } as WorkoutPlan;
  try {
    const pdf = await renderWorkoutPdf({ plan, clientName: body.data.clientName, coach, exercises: [...library, ...sent], i18n });
    return pdfResponse(pdf, pdfFilename(i18n.t("Scheda"), body.data.clientName, plan.name));
  } catch (error) {
    console.error("[pdf:workout]", error);
    return NextResponse.json({ error: i18n.t("Esportazione PDF non riuscita") }, { status: 500 });
  }
}
