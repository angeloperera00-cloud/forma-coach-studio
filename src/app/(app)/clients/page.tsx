import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { getRepository } from "@/lib/data";
import { toClientOptions } from "@/lib/data/queries";
import { ClientsView, type ClientRow } from "@/components/clients/clients-view";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("Clienti") };
}

export default async function ClientsPage() {
  const repo = getRepository();
  const [clients, workouts, nutrition] = await Promise.all([repo.listClients(), repo.listWorkoutPlans(), repo.listNutritionPlans()]);
  const options = new Map(toClientOptions(clients, workouts, nutrition).map((o) => [o.id, o]));
  const rows: ClientRow[] = clients.map((c) => ({ ...c, workout: options.get(c.id)!.workout, nutrition: options.get(c.id)!.nutrition }));
  return <ClientsView rows={rows} />;
}
