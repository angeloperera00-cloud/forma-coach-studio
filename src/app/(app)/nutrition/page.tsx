import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { getRepository } from "@/lib/data";
import { PlansListView } from "@/components/plans/plans-list-view";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("Piani alimentari") };
}

export default async function NutritionPage() {
  const repo = getRepository();
  const [plans, clients] = await Promise.all([repo.listNutritionPlans(), repo.listClients()]);
  return (
    <PlansListView
      kind="nutrition"
      plans={plans}
      clients={clients.map((c) => ({ id: c.id, name: `${c.firstName} ${c.lastName}`, avatarUrl: c.avatarUrl }))}
    />
  );
}
