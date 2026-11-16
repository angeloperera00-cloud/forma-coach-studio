import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { getRepository } from "@/lib/data";
import { getClientOptions } from "@/lib/data/queries";
import { NutritionEditor } from "@/components/nutrition/nutrition-editor";
import type { NutritionPlan } from "@/lib/domain/types";
import { uuid } from "@/lib/id";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("Nuovo piano alimentare") };
}

export default async function NewNutritionPage({ searchParams }: PageProps<"/nutrition/new">) {
  const { t } = await getI18n();
  const sp = await searchParams;
  const repo = getRepository();
  const [foods, clients] = await Promise.all([repo.listFoods(), getClientOptions()]);
  const requested = typeof sp.client === "string" ? clients.find((c) => c.id === sp.client) : undefined;
  const now = new Date().toISOString();

  const plan: NutritionPlan = {
    id: uuid(),
    clientId: requested?.id ?? null,
    name: requested ? t("Piano {name}", { name: requested.firstName }) : t("Nuovo piano alimentare"),
    notes: null,
    status: "draft",
    weekStart: null,
    targets: { kcal: null, protein: null, carbs: null, fat: null },
    publishedAt: null,
    createdAt: now,
    updatedAt: now,
    meals: [],
  };

  return <NutritionEditor key={plan.id} initialPlan={plan} isNew foods={foods} clients={clients} />;
}
