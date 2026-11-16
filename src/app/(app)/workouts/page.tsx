import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { getRepository } from "@/lib/data";
import { PlansListView } from "@/components/plans/plans-list-view";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("Schede di allenamento") };
}

export default async function WorkoutsPage() {
  const repo = getRepository();
  const [plans, clients] = await Promise.all([repo.listWorkoutPlans(), repo.listClients()]);
  return (
    <PlansListView
      kind="workout"
      plans={plans}
      clients={clients.map((c) => ({ id: c.id, name: `${c.firstName} ${c.lastName}`, avatarUrl: c.avatarUrl }))}
    />
  );
}
