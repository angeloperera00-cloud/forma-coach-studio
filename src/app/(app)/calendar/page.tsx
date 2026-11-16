import type { Metadata } from "next";
import { getRepository } from "@/lib/data";
import { getClientOptions } from "@/lib/data/queries";
import { getI18n } from "@/lib/i18n/server";
import { addDaysToKey, monthGridKeys, todayKey, zonedToUtc } from "@/lib/datetime";
import { CalendarView, type CalendarAppointment } from "@/components/calendar/calendar-view";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("Calendario") };
}

/** Accepts only real calendar days ("2026-02-30" is rejected). */
function validDay(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return addDaysToKey(value, 0) === value ? value : null;
}
function validMonth(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return null;
  const year = Number(value.slice(0, 4));
  return year >= 2000 && year <= 2100 ? value : null;
}

export default async function CalendarPage({ searchParams }: PageProps<"/calendar">) {
  const sp = await searchParams;
  const today = todayKey();
  const date = validDay(sp.date);
  const monthParam = validMonth(sp.month);
  const month = monthParam ?? (date ?? today).slice(0, 7);
  const selected = date && date.startsWith(month) ? date : today.startsWith(month) ? today : `${month}-01`;

  const grid = monthGridKeys(Number(month.slice(0, 4)), Number(month.slice(5, 7)));
  const repo = getRepository();
  const [appointments, upcoming, clients, options] = await Promise.all([
    repo.listAppointments({ from: zonedToUtc(grid[0]).toISOString(), to: zonedToUtc(addDaysToKey(grid[grid.length - 1], 1)).toISOString() }),
    repo.listAppointments({ from: new Date().toISOString(), to: zonedToUtc(addDaysToKey(today, 15)).toISOString() }),
    repo.listClients(),
    getClientOptions(),
  ]);

  const byId = new Map(clients.map((c) => [c.id, c]));
  const enrich = (a: (typeof appointments)[number]): CalendarAppointment => {
    const c = a.clientId ? byId.get(a.clientId) : undefined;
    return { ...a, clientName: c ? `${c.firstName} ${c.lastName}` : null, clientAvatar: c?.avatarUrl ?? null };
  };

  return (
    <CalendarView
      key={`${month}:${selected}`}
      month={month}
      grid={grid}
      today={today}
      initialSelected={selected}
      appointments={appointments.map(enrich)}
      upcoming={upcoming.filter((a) => a.status === "scheduled").slice(0, 6).map(enrich)}
      clients={options}
    />
  );
}
