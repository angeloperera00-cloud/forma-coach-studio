import { NextResponse } from "next/server";
import { getRepository } from "@/lib/data";
import { portalRepository } from "@/lib/data/portal";
import { getClientLink } from "@/lib/auth/clients";
import { getSession } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";
import { idSchema } from "@/lib/domain/schemas";
import { renderWorkoutPdf } from "@/lib/pdf/workout-pdf";
import { renderNutritionPdf } from "@/lib/pdf/nutrition-pdf";
import { renderNutritionImage, renderWorkoutImage, type ImageFormat } from "@/lib/pdf/image";
import { imageResponse, pdfFilename, pdfResponse } from "@/lib/pdf/shared";

/**
 * Downloads from the clients' area: GET /api/portale/{workout|nutrition}/{id}?format=pdf|png|jpg.
 * A signed-in client gets only published plans of their own client record; a coach (preview)
 * only plans their own repository can read.
 */
export async function GET(request: Request, ctx: RouteContext<"/api/portale/[kind]/[id]">) {
  const { kind, id } = await ctx.params;
  const raw = new URL(request.url).searchParams.get("format");
  const format = raw === "png" || raw === "jpg" ? raw : "pdf";
  if ((kind !== "workout" && kind !== "nutrition") || !idSchema.safeParse(id).success) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const link = await getClientLink();
  const session = link ? null : await getSession();
  if (!link && !session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const repo = link ? portalRepository(link.coachId) : getRepository();
  const i18n = await getI18n();

  const plan = kind === "workout" ? await repo.getWorkoutPlan(id) : await repo.getNutritionPlan(id);
  if (!plan || plan.status !== "published" || !plan.clientId || (link && plan.clientId !== link.clientId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const [coach, client] = await Promise.all([repo.getCoach(), repo.getClient(plan.clientId)]);
  const clientName = client ? `${client.firstName} ${client.lastName}` : null;
  const label = kind === "workout" ? i18n.t("Scheda") : i18n.t("Piano alimentare");

  try {
    if (kind === "workout") {
      const exercises = await repo.listExercises();
      const data = { plan: plan as Parameters<typeof renderWorkoutPdf>[0]["plan"], clientName, coach, exercises, i18n };
      if (format === "pdf") return pdfResponse(await renderWorkoutPdf(data), pdfFilename(label, clientName, plan.name));
      return imageResponse(await renderWorkoutImage(data, format as ImageFormat), format as ImageFormat, [label, clientName, plan.name]);
    }
    const data = { plan: plan as Parameters<typeof renderNutritionPdf>[0]["plan"], clientName, coach, i18n };
    if (format === "pdf") return pdfResponse(await renderNutritionPdf(data), pdfFilename(label, clientName, plan.name));
    return imageResponse(await renderNutritionImage(data, format as ImageFormat), format as ImageFormat, [label, clientName, plan.name]);
  } catch (error) {
    console.error("[portale:export]", error);
    return NextResponse.json({ error: i18n.t("Esportazione non riuscita") }, { status: 500 });
  }
}
