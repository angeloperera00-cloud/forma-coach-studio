import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { getRepository } from "@/lib/data";
import { getClientOptions } from "@/lib/data/queries";
import { WorkoutEditor } from "@/components/workouts/workout-editor";
import type { WorkoutPlan } from "@/lib/domain/types";
import { emptyDay } from "@/lib/domain/workout";
import { uuid } from "@/lib/id";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("Nuova scheda") };
}

export default async function NewWorkoutPage({ searchParams }: PageProps<"/workouts/new">) {
  const { t } = await getI18n();
  const sp = await searchParams;
  const repo = getRepository();
  const [exercises, clients, coach] = await Promise.all([repo.listExercises(), getClientOptions(), repo.getCoach()]);
  const requested = typeof sp.client === "string" ? clients.find((c) => c.id === sp.client) : undefined;
  const now = new Date().toISOString();

  const plan: WorkoutPlan = {
    id: uuid(),
    clientId: requested?.id ?? null,
    name: requested ? t("Scheda {name}", { name: requested.firstName }) : t("Nuova scheda"),
    status: "draft",
    notes: null,
    publishedAt: null,
    createdAt: now,
    updatedAt: now,
    days: [emptyDay(0)],
  };

  return (
    <WorkoutEditor
      key={plan.id}
      initialPlan={plan}
      isNew
      exercises={exercises}
      clients={clients}
      defaults={{ defaultSets: coach.defaultSets, defaultReps: coach.defaultReps, defaultRestSeconds: coach.defaultRestSeconds }}
    />
  );
}
