import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { getRepository } from "@/lib/data";
import { ExerciseLibraryView } from "@/components/library/exercise-library-view";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("Libreria esercizi") };
}

export default async function ExercisesPage() {
  const exercises = await getRepository().listExercises();
  return <ExerciseLibraryView exercises={exercises} />;
}
