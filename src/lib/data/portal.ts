import "server-only";
import type { Repository } from "./repository";
import { getRepository, supabaseConfig } from "./index";
import { createSupabaseRepository } from "./supabase/repository";
import { supabaseServiceClient } from "@/lib/auth/supabase";
import type { CoachProfile, Exercise, NutritionPlan, WorkoutPlan } from "@/lib/domain/types";

/*
 * Data for the clients' read-only area. The caller must already have verified who may see
 * `clientId` (a linked client via getClientLink, or the coach through their own scoped repository).
 * Only PUBLISHED plans of that one client are returned.
 */

export interface PortalExercise {
  id: string;
  name: string;
  primaryMuscles: Exercise["primaryMuscles"];
  imageUrl: string | null;
}

export interface PortalData {
  client: { id: string; firstName: string; lastName: string };
  coach: Pick<CoachProfile, "fullName" | "studioName" | "avatarUrl" | "email" | "phone">;
  workouts: WorkoutPlan[];
  nutrition: NutritionPlan[];
  exercises: PortalExercise[];
}

const cache = new Map<string, Repository>();

/** Repository acting for one coach with the service role (server-side reads for their clients). */
export function portalRepository(coachId: string | null): Repository {
  const cfg = supabaseConfig();
  const service = supabaseServiceClient();
  if (!cfg || !service) return getRepository();
  const key = coachId ?? "studio";
  let repo = cache.get(key);
  if (!repo) {
    repo = createSupabaseRepository(cfg.url, cfg.key, async () => ({ client: service, coachId }));
    cache.set(key, repo);
  }
  return repo;
}

const byNewest = (a: { publishedAt: string | null; updatedAt: string }, b: { publishedAt: string | null; updatedAt: string }) =>
  (b.publishedAt ?? b.updatedAt).localeCompare(a.publishedAt ?? a.updatedAt);

export async function loadPortal(repo: Repository, clientId: string): Promise<PortalData | null> {
  const client = await repo.getClient(clientId);
  if (!client) return null;
  const [workoutList, nutritionList, coach] = await Promise.all([repo.listWorkoutPlans({ clientId }), repo.listNutritionPlans({ clientId }), repo.getCoach()]);
  const [workouts, nutrition] = await Promise.all([
    Promise.all(workoutList.filter((p) => p.status === "published" && p.clientId === clientId).map((p) => repo.getWorkoutPlan(p.id))),
    Promise.all(nutritionList.filter((p) => p.status === "published" && p.clientId === clientId).map((p) => repo.getNutritionPlan(p.id))),
  ]);
  const plans = workouts.filter((p): p is WorkoutPlan => Boolean(p && p.clientId === clientId && p.status === "published")).sort(byNewest);
  const used = new Set(plans.flatMap((p) => p.days.flatMap((d) => d.exercises.map((e) => e.exerciseId))));
  const exercises = used.size ? (await repo.listExercises()).filter((e) => used.has(e.id)) : [];
  return {
    client: { id: client.id, firstName: client.firstName, lastName: client.lastName },
    coach: { fullName: coach.fullName, studioName: coach.studioName, avatarUrl: coach.avatarUrl, email: coach.email, phone: coach.phone },
    workouts: plans,
    nutrition: nutrition.filter((p): p is NutritionPlan => Boolean(p && p.clientId === clientId && p.status === "published")).sort(byNewest),
    exercises: exercises.map((e) => ({ id: e.id, name: e.name, primaryMuscles: e.primaryMuscles, imageUrl: e.imageUrls[0] ?? null })),
  };
}
