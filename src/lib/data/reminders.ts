import "server-only";
import type { Repository } from "./repository";
import { dayKeyOf, diffInDays, startOfWeekKey, todayKey } from "@/lib/datetime";
import { APPOINTMENT_TYPE_LABELS } from "@/lib/domain/constants";
import { msg } from "@/lib/i18n/core";

/**
 * Clients have no accounts, so notifications are reminders the platform derives from the coach's data:
 * upcoming appointments, overdue check-ins, stale drafts and clients without a plan.
 * Texts are Italian templates + params, rendered in the coach's language at display time.
 * Each reminder has a stable dedupe key, so it is created once. Throttled per server instance.
 */
const THROTTLE_MS = 5 * 60_000;
const g = globalThis as unknown as { __formaReminders?: number };

export async function syncReminders(repo: Repository, force = false) {
  const nowMs = Date.now();
  if (!force && g.__formaReminders && nowMs - g.__formaReminders < THROTTLE_MS) return;
  g.__formaReminders = nowMs;

  try {
    const today = todayKey();
    const in24h = new Date(nowMs + 24 * 3600_000).toISOString();
    const [clients, appointments, progress, workouts, nutrition] = await Promise.all([
      repo.listClients(),
      repo.listAppointments({ from: new Date(nowMs).toISOString(), to: in24h }),
      repo.listProgress(),
      repo.listWorkoutPlans(),
      repo.listNutritionPlans(),
    ]);
    const nameOf = new Map(clients.map((c) => [c.id, `${c.firstName} ${c.lastName}`]));
    const tasks: Promise<void>[] = [];

    for (const a of appointments) {
      if (a.status !== "scheduled") continue;
      const client = a.clientId ? nameOf.get(a.clientId) : undefined;
      tasks.push(
        repo.createActivity({
          type: "reminder",
          clientId: a.clientId,
          title: "{typeLabel} in arrivo",
          description: client ? "{when} alle {time} · {title} con {client}" : "{when} alle {time} · {title}",
          params: { typeLabel: APPOINTMENT_TYPE_LABELS[a.type], startsAt: a.startsAt, title: a.title, ...(client ? { client } : {}) },
          href: `/calendar?date=${dayKeyOf(a.startsAt)}`,
          dedupeKey: `appointment:${a.id}:${a.startsAt}`,
        }),
      );
    }

    const lastCheckIn = new Map<string, string>();
    for (const p of progress) if ((lastCheckIn.get(p.clientId) ?? "") < p.date) lastCheckIn.set(p.clientId, p.date);
    const week = startOfWeekKey(today);
    for (const c of clients) {
      if (c.status !== "active") continue;
      const client = nameOf.get(c.id)!;
      const last = lastCheckIn.get(c.id);
      const since = diffInDays(today, last ?? c.startDate);
      if (since >= 14) {
        tasks.push(
          repo.createActivity({
            type: "reminder",
            clientId: c.id,
            title: msg("Check-in da programmare"),
            description: last ? "Nessuna misurazione di {client} da {days} giorni" : "{client} non ha ancora misurazioni registrate",
            params: { client, days: since },
            href: `/clients/${c.id}?tab=progressi`,
            dedupeKey: `checkin:${c.id}:${week}`,
          }),
        );
      }
      if (!workouts.some((w) => w.clientId === c.id && w.status !== "archived")) {
        tasks.push(
          repo.createActivity({
            type: "reminder",
            clientId: c.id,
            title: msg("Scheda di allenamento mancante"),
            description: "{client} non ha ancora una scheda di allenamento",
            params: { client },
            href: `/workouts/new?client=${c.id}`,
            dedupeKey: `missing-workout:${c.id}`,
          }),
        );
      }
    }

    const stale = (updatedAt: string) => diffInDays(today, dayKeyOf(updatedAt)) >= 3;
    for (const w of workouts) {
      if (w.status !== "draft" || !stale(w.updatedAt)) continue;
      const client = w.clientId ? nameOf.get(w.clientId) : undefined;
      tasks.push(
        repo.createActivity({
          type: "reminder",
          clientId: w.clientId,
          title: msg("Bozza in sospeso"),
          description: client ? "La scheda “{plan}” per {client} non è ancora pubblicata" : "La scheda “{plan}” non è ancora pubblicata",
          params: { plan: w.name, ...(client ? { client } : {}) },
          href: `/workouts/${w.id}`,
          dedupeKey: `draft:${w.id}:${w.updatedAt}`,
        }),
      );
    }
    for (const n of nutrition) {
      if (n.status !== "draft" || !stale(n.updatedAt)) continue;
      const client = n.clientId ? nameOf.get(n.clientId) : undefined;
      tasks.push(
        repo.createActivity({
          type: "reminder",
          clientId: n.clientId,
          title: msg("Bozza in sospeso"),
          description: client ? "Il piano “{plan}” per {client} non è ancora pubblicato" : "Il piano “{plan}” non è ancora pubblicato",
          params: { plan: n.name, ...(client ? { client } : {}) },
          href: `/nutrition/${n.id}`,
          dedupeKey: `draft:${n.id}:${n.updatedAt}`,
        }),
      );
    }
    await Promise.all(tasks);
  } catch (error) {
    // Reminders are best-effort and must never break page rendering.
    console.error("[reminders]", error);
  }
}
