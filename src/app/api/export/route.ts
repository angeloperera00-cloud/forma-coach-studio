import { NextResponse } from "next/server";
import { getRepository } from "@/lib/data";
import { getSession } from "@/lib/auth/session";
import { todayKey } from "@/lib/datetime";

/** Full JSON backup of the coach's data (coach-only). */
export async function GET() {
  if (!(await getSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const repo = getRepository();
  const [coach, clients, exercises, foods, workoutSummaries, nutritionSummaries, progress, appointments] = await Promise.all([
    repo.getCoach(),
    repo.listClients(),
    repo.listExercises(),
    repo.listFoods(),
    repo.listWorkoutPlans(),
    repo.listNutritionPlans(),
    repo.listProgress(),
    repo.listAppointments(),
  ]);
  const [workoutPlans, nutritionPlans, notes] = await Promise.all([
    Promise.all(workoutSummaries.map((p) => repo.getWorkoutPlan(p.id))),
    Promise.all(nutritionSummaries.map((p) => repo.getNutritionPlan(p.id))),
    Promise.all(clients.map((c) => repo.listClientNotes(c.id))),
  ]);
  const body = {
    app: "forma",
    version: 1,
    exportedAt: new Date().toISOString(),
    mode: repo.mode,
    coach,
    clients,
    clientNotes: notes.flat(),
    exercises,
    foods,
    workoutPlans: workoutPlans.filter(Boolean),
    nutritionPlans: nutritionPlans.filter(Boolean),
    progress,
    appointments,
  };
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="forma-backup-${todayKey()}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
