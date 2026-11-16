import { NextResponse } from "next/server";
import { readWorkoutExport } from "@/lib/pdf/requests";
import { renderWorkoutImage, type ImageFormat } from "@/lib/pdf/image";
import { imageResponse } from "@/lib/pdf/shared";

/** PNG/JPG of a workout plan, sent from the editor (?format=png|jpg). */
export async function POST(request: Request, ctx: RouteContext<"/api/image/workout/[id]">) {
  const format: ImageFormat = new URL(request.url).searchParams.get("format") === "jpg" ? "jpg" : "png";
  const data = await readWorkoutExport(request, (await ctx.params).id);
  if (data instanceof Response) return data;
  try {
    return imageResponse(await renderWorkoutImage(data, format), format, [data.i18n.t("Scheda"), data.clientName, data.plan.name]);
  } catch (error) {
    console.error("[image:workout]", error);
    return NextResponse.json({ error: data.i18n.t("Esportazione immagine non riuscita") }, { status: 500 });
  }
}
