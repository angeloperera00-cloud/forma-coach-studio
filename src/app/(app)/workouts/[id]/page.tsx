import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { notFound } from "next/navigation";
import { getRepository } from "@/lib/data";
import { getClientOptions } from "@/lib/data/queries";
import { idSchema } from "@/lib/domain/schemas";
import { WorkoutEditor } from "@/components/workouts/workout-editor";

export async function generateMetadata({ params }: PageProps<"/workouts/[id]">): Promise<Metadata> {
  const { t } = await getI18n();
  const { id } = await params;
  if (!idSchema.safeParse(id).success) return { title: t("Scheda") };
  const plan = await getRepository().getWorkoutPlan(id);
  return { title: plan?.name ?? t("Scheda") };
}

export default async function WorkoutPage({ params }: PageProps<"/workouts/[id]">) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  const repo = getRepository();
  const [plan, exercises, clients, coach] = await Promise.all([repo.getWorkoutPlan(id), repo.listExercises(), getClientOptions(), repo.getCoach()]);
  if (!plan) notFound();

  return (
    <WorkoutEditor
      key={plan.id}
      initialPlan={plan}
      isNew={false}
      exercises={exercises}
      clients={clients}
      defaults={{ defaultSets: coach.defaultSets, defaultReps: coach.defaultReps, defaultRestSeconds: coach.defaultRestSeconds }}
    />
  );
}
