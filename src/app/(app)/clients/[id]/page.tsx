import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { notFound } from "next/navigation";
import { getRepository } from "@/lib/data";
import { getClientOptions } from "@/lib/data/queries";
import { idSchema } from "@/lib/domain/schemas";
import { ClientProfileView } from "@/components/clients/client-profile-view";
import { supabaseAuthConfig } from "@/lib/auth/config";
import { loadClientAccess } from "@/lib/auth/clients";

export async function generateMetadata({ params }: PageProps<"/clients/[id]">): Promise<Metadata> {
  const { t } = await getI18n();
  const { id } = await params;
  if (!idSchema.safeParse(id).success) return { title: t("Cliente") };
  const client = await getRepository().getClient(id);
  return { title: client ? `${client.firstName} ${client.lastName}` : t("Cliente") };
}

export default async function ClientPage({ params, searchParams }: PageProps<"/clients/[id]">) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!idSchema.safeParse(id).success) notFound();
  const repo = getRepository();
  const client = await repo.getClient(id);
  if (!client) notFound();

  const [notes, workouts, nutrition, progress, appointments, activity, options] = await Promise.all([
    repo.listClientNotes(id),
    repo.listWorkoutPlans({ clientId: id }),
    repo.listNutritionPlans({ clientId: id }),
    repo.listProgress(id),
    repo.listAppointments({ clientId: id }),
    repo.listActivity({ clientId: id, limit: 12 }),
    getClientOptions(),
  ]);
  const available = Boolean(supabaseAuthConfig());
  const access = available ? await loadClientAccess(id) : null;

  return (
    <ClientProfileView
      client={client}
      notes={notes}
      workouts={workouts}
      nutrition={nutrition}
      progress={progress}
      appointments={appointments}
      activity={activity}
      options={options}
      access={{
        available,
        email: access?.email ?? null,
        phone: access?.phone ?? null,
        invitedAt: access?.invitedAt ?? null,
        acceptedAt: access?.acceptedAt ?? null,
        linked: access?.linked ?? false,
      }}
      initialTab={typeof sp.tab === "string" ? sp.tab : "panoramica"}
    />
  );
}
