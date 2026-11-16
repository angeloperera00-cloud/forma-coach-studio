import { NextResponse } from "next/server";
import { getRepository } from "@/lib/data";
import { getSession } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";
import { idSchema } from "@/lib/domain/schemas";
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
