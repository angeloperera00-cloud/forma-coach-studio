import { NextResponse } from "next/server";
import { readNutritionExport } from "@/lib/pdf/requests";
import { renderNutritionImage, type ImageFormat } from "@/lib/pdf/image";
import { imageResponse } from "@/lib/pdf/shared";

/** PNG/JPG of a meal plan, sent from the editor (?format=png|jpg). */
export async function POST(request: Request, ctx: RouteContext<"/api/image/nutrition/[id]">) {
  const format: ImageFormat = new URL(request.url).searchParams.get("format") === "jpg" ? "jpg" : "png";
  const data = await readNutritionExport(request, (await ctx.params).id);
  if (data instanceof Response) return data;
  try {
    return imageResponse(await renderNutritionImage(data, format), format, [data.i18n.t("Piano alimentare"), data.clientName, data.plan.name]);
  } catch (error) {
    console.error("[image:nutrition]", error);
    return NextResponse.json({ error: data.i18n.t("Esportazione immagine non riuscita") }, { status: 500 });
  }
}
