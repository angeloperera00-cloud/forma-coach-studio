import "server-only";
import { getRepository } from "./index";
import type { Client, ClientOption, NutritionPlanSummary, WorkoutPlanSummary } from "@/lib/domain/types";
import { addDaysToKey, todayKey, zonedToUtc } from "@/lib/datetime";

/** The plan that represents a client "right now": latest published, else latest draft. */
function currentPlan<T extends { clientId: string | null; status: string; publishedAt: string | null; updatedAt: string }>(plans: T[], clientId: string): T | null {
  const own = plans.filter((p) => p.clientId === clientId && p.status !== "archived");
  const published = own.filter((p) => p.status === "published").sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
  if (published[0]) return published[0];
  return own.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null;
}

export function toClientOptions(clients: Client[], workouts: WorkoutPlanSummary[], nutrition: NutritionPlanSummary[]): ClientOption[] {
  return clients.map((c) => {
    const w = currentPlan(workouts, c.id);
    const n = currentPlan(nutrition, c.id);
    return {
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      avatarUrl: c.avatarUrl,
      goal: c.goal,
      status: c.status,
      workout: w ? { id: w.id, name: w.name, status: w.status } : null,
      nutrition: n ? { id: n.id, name: n.name, status: n.status } : null,
    };
  });
}

export async function getClientOptions(): Promise<ClientOption[]> {
  const repo = getRepository();
  const [clients, workouts, nutrition] = await Promise.all([repo.listClients(), repo.listWorkoutPlans(), repo.listNutritionPlans()]);
  return toClientOptions(clients, workouts, nutrition);
}

export type RecentPlan =
  | ({ kind: "workout" } & WorkoutPlanSummary & { clientName: string | null; clientAvatar: string | null })
  | ({ kind: "nutrition" } & NutritionPlanSummary & { clientName: string | null; clientAvatar: string | null });

export async function getDashboardData(selectedId: string | undefined) {
  const repo = getRepository();
  const today = todayKey();
  const nowIso = new Date().toISOString();
  const weekEnd = zonedToUtc(addDaysToKey(today, 7)).toISOString();
  const [clients, workouts, nutrition, activity, upcoming] = await Promise.all([
    repo.listClients(),
    repo.listWorkoutPlans(),
    repo.listNutritionPlans(),
    repo.listActivity({ limit: 30 }),
    repo.listAppointments({ from: nowIso }),
  ]);

  const options = toClientOptions(clients, workouts, nutrition);
  const active = clients.filter((c) => c.status === "active");
  const byLastActivity = [...active].sort((a, b) => (b.lastActivityAt ?? "").localeCompare(a.lastActivityAt ?? ""));
  const selected = clients.find((c) => c.id === selectedId) ?? byLastActivity[0] ?? clients[0] ?? null;

  const clientById = new Map(clients.map((c) => [c.id, c]));
  const decorate = (clientId: string | null) => {
    const c = clientId ? clientById.get(clientId) : undefined;
    return { clientName: c ? `${c.firstName} ${c.lastName}` : null, clientAvatar: c?.avatarUrl ?? null };
  };
  const recentPlans: RecentPlan[] = [
    ...workouts.filter((p) => p.status !== "archived").map((p) => ({ kind: "workout" as const, ...p, ...decorate(p.clientId) })),
    ...nutrition.filter((p) => p.status !== "archived").map((p) => ({ kind: "nutrition" as const, ...p, ...decorate(p.clientId) })),
  ]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 6);

  const scheduled = upcoming.filter((a) => a.status === "scheduled");
  const nextWeek = scheduled.filter((a) => a.startsAt < weekEnd);

  let context = null;
  if (selected) {
    const [progress] = await Promise.all([repo.listProgress(selected.id)]);
    const withWeight = progress.filter((p) => p.weightKg !== null);
    const last = withWeight.at(-1) ?? null;
    const prev = withWeight.at(-2) ?? null;
    const option = options.find((o) => o.id === selected.id)!;
    context = {
      client: selected,
      workout: option.workout,
      nutrition: option.nutrition,
      nextAppointment: scheduled.find((a) => a.clientId === selected.id) ?? null,
      lastWeight: last ? { value: last.weightKg!, date: last.date, delta: prev ? last.weightKg! - prev.weightKg! : null } : null,
    };
  }

  return {
    options,
    selectedId: selected?.id ?? null,
    context,
    stats: {
      activeClients: active.length,
      totalClients: clients.length,
      workoutPlans: workouts.filter((p) => p.status !== "archived").length,
      workoutPublished: workouts.filter((p) => p.status === "published").length,
      nutritionPlans: nutrition.filter((p) => p.status !== "archived").length,
      nutritionPublished: nutrition.filter((p) => p.status === "published").length,
      upcomingWeek: nextWeek.length,
      upcomingToday: nextWeek.filter((a) => a.startsAt < zonedToUtc(addDaysToKey(today, 1)).toISOString()).length,
    },
    recentPlans,
    // Reminders live in the bell/notifications; the dashboard shows what happened.
    activity: activity.filter((a) => a.type !== "reminder").slice(0, 6),
    upcoming: nextWeek.slice(0, 4).map((a) => ({ ...a, ...decorate(a.clientId) })),
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
