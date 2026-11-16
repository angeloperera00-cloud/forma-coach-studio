import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { notFound } from "next/navigation";
import { getRepository } from "@/lib/data";
import { getClientOptions } from "@/lib/data/queries";
import { idSchema } from "@/lib/domain/schemas";
import { NutritionEditor } from "@/components/nutrition/nutrition-editor";

export async function generateMetadata({ params }: PageProps<"/nutrition/[id]">): Promise<Metadata> {
  const { t } = await getI18n();
  const { id } = await params;
  if (!idSchema.safeParse(id).success) return { title: t("Piano alimentare") };
  const plan = await getRepository().getNutritionPlan(id);
  return { title: plan?.name ?? t("Piano alimentare") };
}

export default async function NutritionPlanPage({ params }: PageProps<"/nutrition/[id]">) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  const repo = getRepository();
  const [plan, foods, clients] = await Promise.all([repo.getNutritionPlan(id), repo.listFoods(), getClientOptions()]);
  if (!plan) notFound();
  return <NutritionEditor key={plan.id} initialPlan={plan} isNew={false} foods={foods} clients={clients} />;
}
