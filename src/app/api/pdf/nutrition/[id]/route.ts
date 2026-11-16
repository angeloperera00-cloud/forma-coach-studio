import { NextResponse } from "next/server";
import { getRepository } from "@/lib/data";
import { getSession } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";
import { idSchema } from "@/lib/domain/schemas";
import { renderNutritionPdf } from "@/lib/pdf/nutrition-pdf";
import { pdfFilename, pdfResponse } from "@/lib/pdf/shared";
import { readNutritionExport } from "@/lib/pdf/requests";

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

/** Export from the editor: the plan travels in the request body (see lib/pdf/requests). */
export async function POST(request: Request, ctx: RouteContext<"/api/pdf/nutrition/[id]">) {
  const data = await readNutritionExport(request, (await ctx.params).id);
  if (data instanceof Response) return data;
  const { plan, clientName, coach, i18n } = data;
  try {
    const pdf = await renderNutritionPdf({ plan, clientName, coach, i18n });
    return pdfResponse(pdf, pdfFilename(i18n.t("Piano alimentare"), clientName, plan.name));
  } catch (error) {
    console.error("[pdf:nutrition]", error);
    return NextResponse.json({ error: i18n.t("Esportazione PDF non riuscita") }, { status: 500 });
  }
}
