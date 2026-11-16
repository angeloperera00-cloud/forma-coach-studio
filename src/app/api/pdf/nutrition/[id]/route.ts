import { NextResponse } from "next/server";
import { getRepository } from "@/lib/data";
import { getSession } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";
import { z } from "zod";
import { idSchema, nutritionPlanInput } from "@/lib/domain/schemas";
import type { NutritionPlan } from "@/lib/domain/types";
import { renderNutritionPdf } from "@/lib/pdf/nutrition-pdf";
import { pdfFilename, pdfResponse } from "@/lib/pdf/shared";

export async function GET(_request: Request, ctx: RouteContext<"/api/pdf/nutrition/[id]">) {
  if (!(await getSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  if (!idSchema.safeParse(id).success) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const repo = getRepository();
  const plan = await repo.getNutritionPlan(id);
  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const [coach, client, i18n] = await Promise.all([repo.getCoach(), plan.clientId ? repo.getClient(plan.clientId) : null, getI18n()]);
  const clientName = client ? `${client.firstName} ${client.lastName}` : null;
  try {
    const pdf = await renderNutritionPdf({ plan, clientName, coach, i18n });
    return pdfResponse(pdf, pdfFilename(i18n.t("Piano alimentare"), clientName, plan.name));
  } catch (error) {
    console.error("[pdf:nutrition]", error);
    return NextResponse.json({ error: i18n.t("Esportazione PDF non riuscita") }, { status: 500 });
  }
}

const postBody = z.object({ plan: z.unknown(), clientName: z.string().max(140).nullable() });

/**
 * Export from the editor: the plan travels in the request body, so the PDF works even when the
 * server instance can't read the saved copy (e.g. demo mode on serverless hosting).
 */
export async function POST(request: Request, ctx: RouteContext<"/api/pdf/nutrition/[id]">) {
  if (!(await getSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const i18n = await getI18n();
  const body = postBody.safeParse(await request.json().catch(() => null));
  const input = body.success ? nutritionPlanInput.safeParse(body.data.plan) : null;
  if (!body.success || !input?.success || input.data.id !== id) return NextResponse.json({ error: i18n.t("Dati non validi") }, { status: 400 });

  const coach = await getRepository().getCoach();
  const now = new Date().toISOString();
  const plan = { ...input.data, publishedAt: null, createdAt: now, updatedAt: now } as NutritionPlan;
  try {
    const pdf = await renderNutritionPdf({ plan, clientName: body.data.clientName, coach, i18n });
    return pdfResponse(pdf, pdfFilename(i18n.t("Piano alimentare"), body.data.clientName, plan.name));
  } catch (error) {
    console.error("[pdf:nutrition]", error);
    return NextResponse.json({ error: i18n.t("Esportazione PDF non riuscita") }, { status: 500 });
  }
}
