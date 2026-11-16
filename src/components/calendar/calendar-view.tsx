"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { CalendarDays, CalendarPlus, Check, ChevronLeft, ChevronRight, Clock, MapPin, MoreHorizontal, Pencil, RotateCcw, Trash2, X } from "lucide-react";
import type { Appointment, ClientOption } from "@/lib/domain/types";
import { APPOINTMENT_STATUS_LABELS, APPOINTMENT_TYPE_LABELS, type AppointmentStatus, type AppointmentType } from "@/lib/domain/constants";
import { deleteAppointmentAction, setAppointmentStatusAction } from "@/lib/actions/schedule";
import { useI18n } from "@/lib/i18n/client";
import { dayKeyOf, timeOf } from "@/lib/datetime";
import { cn, groupBy } from "@/lib/utils";
import { Topbar, PageContainer } from "@/components/shell/topbar";
import { EmptyState, Panel, PanelHeader } from "@/components/common/basics";
import { Avatar } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/menus";
import { useConfirm } from "@/components/common/confirm";
import { AppointmentFormSheet } from "./appointment-form-sheet";

export type CalendarAppointment = Appointment & { clientName: string | null; clientAvatar: string | null };

const TYPE_STYLE: Record<AppointmentType, { chip: string; dot: string }> = {
  training: { chip: "bg-pale text-forest", dot: "bg-primary" },
  check_in: { chip: "bg-warning-soft text-warning", dot: "bg-warning" },
  video_call: { chip: "bg-info-soft text-info", dot: "bg-info" },
  assessment: { chip: "bg-sage text-forest", dot: "bg-forest" },
};

function shiftMonth(month: string, delta: number): string {
  const y = Number(month.slice(0, 4));
  const m = Number(month.slice(5, 7)) - 1 + delta;
  const date = new Date(Date.UTC(y, m, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function endTime(a: Appointment): string {
  return timeOf(new Date(new Date(a.startsAt).getTime() + a.durationMinutes * 60_000));
}

interface Props {
  month: string;
  grid: string[];
  today: string;
  initialSelected: string;
  appointments: CalendarAppointment[];
  upcoming: CalendarAppointment[];
  clients: ClientOption[];
}

export function CalendarView({ month, grid, today, initialSelected, appointments, upcoming, clients }: Props) {
  const { t, tn, fmt } = useI18n();
  const [selected, setSelected] = React.useState(initialSelected);
  const [sheet, setSheet] = React.useState<{ open: boolean; appointment: Appointment | null; date: string }>({ open: false, appointment: null, date: initialSelected });
  const byDay = React.useMemo(() => groupBy(appointments, (a) => dayKeyOf(a.startsAt)), [appointments]);
  const dayItems = byDay.get(selected) ?? [];
  const monthLabel = fmt.dayKey(`${month}-01`, { month: "long", year: "numeric" }, true);
  const weekdays = grid.slice(0, 7).map((k) => ({ short: fmt.dayKey(k, { weekday: "short" }, true), long: fmt.dayKey(k, { weekday: "long" }, true) }));
  const monthCount = appointments.filter((a) => a.startsAt.length > 0 && dayKeyOf(a.startsAt).startsWith(month) && a.status !== "cancelled").length;

  const select = (key: string) => {
    setSelected(key);
    // Keep the URL shareable without a server round-trip (all days of the grid are loaded).
    window.history.replaceState(null, "", `/calendar?month=${month}&date=${key}`);
  };
  const openNew = (date: string) => setSheet({ open: true, appointment: null, date });
  const openEdit = (a: Appointment) => setSheet({ open: true, appointment: a, date: dayKeyOf(a.startsAt) });

  const onGridKey = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const moves: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (!(event.key in moves)) return;
    const index = grid.indexOf(selected) + moves[event.key];
    if (index < 0 || index >= grid.length) return;
    event.preventDefault();
    select(grid[index]);
    event.currentTarget.querySelector<HTMLButtonElement>(`[data-day="${grid[index]}"]`)?.focus();
  };

  return (
    <>
      <Topbar
        title={t("Calendario")}
        breadcrumbs={[{ label: t("Monitoraggio") }]}
        actions={
          <Button onClick={() => openNew(selected)} className="max-sm:hidden">
            <CalendarPlus /> {t("Nuovo appuntamento")}
          </Button>
        }
        mobileActions={
          <Button size="icon" onClick={() => openNew(selected)} aria-label={t("Nuovo appuntamento")}>
            <CalendarPlus />
          </Button>
        }
      />
      <PageContainer>
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          {/* ------------------------------ month grid ------------------------------ */}
          <Panel className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4 pb-3 md:px-6 md:pt-5">
              <div>
                <h2 className="text-[20px] font-semibold tracking-tight md:text-[22px]" aria-live="polite">
                  {monthLabel}
                </h2>
                <p className="text-[12.5px] text-muted-foreground">{tn("{n} appuntamento nel mese", "{n} appuntamenti nel mese", monthCount)}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/calendar?date=${today}`} scroll={false}>
                    {t("Oggi")}
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="icon-sm" aria-label={t("Mese precedente")}>
                  <Link href={`/calendar?month=${shiftMonth(month, -1)}`} scroll={false}>
                    <ChevronLeft />
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="icon-sm" aria-label={t("Mese successivo")}>
                  <Link href={`/calendar?month=${shiftMonth(month, 1)}`} scroll={false}>
                    <ChevronRight />
                  </Link>
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-7 border-y bg-muted/50 text-center text-[11.5px] font-semibold tracking-wide text-muted-foreground uppercase" aria-hidden>
              {weekdays.map((w) => (
                <div key={w.long} className="py-2">
                  {w.short}
                </div>
              ))}
            </div>

            <div role="grid" aria-label={monthLabel} onKeyDown={onGridKey} className="grid grid-cols-7">
              {grid.map((key, i) => {
                const items = byDay.get(key) ?? [];
                const inMonth = key.startsWith(month);
                const isToday = key === today;
                const isSelected = key === selected;
                const active = items.filter((a) => a.status !== "cancelled");
                return (
                  <button
                    key={key}
                    type="button"
                    data-day={key}
                    role="gridcell"
                    aria-selected={isSelected}
                    tabIndex={isSelected ? 0 : -1}
                    aria-label={`${fmt.dayKey(key, { weekday: "long", day: "numeric", month: "long" }, true)}${active.length ? ` · ${tn("{n} appuntamento", "{n} appuntamenti", active.length)}` : ""}`}
                    onClick={() => select(key)}
                    onDoubleClick={() => openNew(key)}
                    className={cn(
                      "group relative flex min-h-[64px] flex-col items-stretch gap-1 p-1.5 text-left outline-none transition-colors md:min-h-[112px] md:p-2",
                      i % 7 !== 6 && "border-r",
                      i < grid.length - 7 && "border-b",
                      !inMonth && "bg-muted/35",
                      isSelected ? "bg-pale/80" : "hover:bg-muted/50",
                      "focus-visible:ring-[3px] focus-visible:ring-ring/30 focus-visible:ring-inset",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-7 place-items-center self-center rounded-full text-[13px] font-semibold tabular md:self-start",
                        !inMonth && "text-muted-foreground/60",
                        isToday && "bg-primary text-primary-foreground",
                        isSelected && !isToday && "bg-forest text-white",
                      )}
                    >
                      {Number(key.slice(8))}
                    </span>
                    {/* phones: dots */}
                    {items.length > 0 && (
                      <span className="flex justify-center gap-0.5 md:hidden" aria-hidden>
                        {items.slice(0, 3).map((a) => (
                          <span key={a.id} className={cn("size-1.5 rounded-full", a.status === "cancelled" ? "bg-muted-foreground/40" : TYPE_STYLE[a.type].dot)} />
                        ))}
                      </span>
                    )}
                    {/* tablet/desktop: chips */}
                    <span className="flex min-w-0 flex-col gap-0.5 max-md:hidden" aria-hidden>
                      {items.slice(0, 2).map((a) => (
                        <span
                          key={a.id}
                          className={cn(
                            "truncate rounded-md px-1.5 py-0.5 text-[11.5px] font-medium",
                            a.status === "cancelled" ? "bg-muted text-muted-foreground line-through" : TYPE_STYLE[a.type].chip,
                          )}
                        >
                          <span className="tabular">{timeOf(a.startsAt)}</span> {a.title}
                        </span>
                      ))}
                      {items.length > 2 && <span className="px-1.5 text-[11px] font-medium text-muted-foreground">{t("+{n} altri", { n: items.length - 2 })}</span>}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t px-4 py-3 text-[12px] text-muted-foreground md:px-6">
              {(Object.keys(TYPE_STYLE) as AppointmentType[]).map((type) => (
                <span key={type} className="flex items-center gap-1.5">
                  <span className={cn("size-2 rounded-full", TYPE_STYLE[type].dot)} />
                  {t(APPOINTMENT_TYPE_LABELS[type])}
                </span>
              ))}
              <span className="ml-auto max-md:hidden">{t("Doppio clic su un giorno per aggiungere un appuntamento")}</span>
            </div>
          </Panel>

          {/* -------------------------------- agenda -------------------------------- */}
          <div className="flex flex-col gap-5 xl:sticky xl:top-[84px]">
            <Panel>
              <PanelHeader
                title={fmt.dayKey(selected, { weekday: "long", day: "numeric", month: "long" }, true)}
                description={selected === today ? t("Oggi") : dayItems.length ? tn("{n} appuntamento", "{n} appuntamenti", dayItems.length) : t("Nessun appuntamento")}
                actions={
                  <Button variant="secondary" size="sm" onClick={() => openNew(selected)}>
                    <CalendarPlus /> {t("Aggiungi")}
                  </Button>
                }
              />
              {dayItems.length === 0 ? (
                <EmptyState compact emoji="spiral-calendar" title={t("Giornata libera")} description={t("Programma un allenamento, un check-in o una videochiamata.")} />
              ) : (
                <ul className="flex flex-col gap-2 px-3 pb-3 md:px-4 md:pb-4">
                  {dayItems.map((a) => (
                    <AgendaItem key={a.id} appointment={a} onEdit={() => openEdit(a)} />
                  ))}
                </ul>
              )}
            </Panel>

            <Panel>
              <PanelHeader title={t("Prossimi appuntamenti")} description={t("Prossimi 14 giorni")} />
              {upcoming.length === 0 ? (
                <EmptyState compact emoji="calendar" title={t("Agenda libera")} description={t("Nessun appuntamento in programma.")} />
              ) : (
                <ul className="flex flex-col gap-0.5 px-2 pb-3 md:px-3">
                  {upcoming.map((a) => {
                    const key = dayKeyOf(a.startsAt);
                    return (
                      <li key={a.id}>
                        <Link
                          href={`/calendar?month=${key.slice(0, 7)}&date=${key}`}
                          scroll={false}
                          className="flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors hover:bg-muted"
                        >
                          <div className="flex w-12 shrink-0 flex-col items-center rounded-xl bg-pale py-1.5 text-forest">
                            <span className="text-[10.5px] font-semibold uppercase">{fmt.dayKey(key, { weekday: "short" })}</span>
                            <span className="text-[17px] leading-tight font-bold tabular">{Number(key.slice(8))}</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[13.5px] font-semibold">{a.title}</div>
                            <div className="truncate text-[12.5px] text-muted-foreground">
                              <span className="tabular">{timeOf(a.startsAt)}</span> · {t(APPOINTMENT_TYPE_LABELS[a.type])}
                            </div>
                          </div>
                          {a.clientName && <Avatar src={a.clientAvatar} name={a.clientName} size={30} />}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      </PageContainer>

      <AppointmentFormSheet
        open={sheet.open}
        onOpenChange={(open) => setSheet((s) => ({ ...s, open }))}
        appointment={sheet.appointment}
        clients={clients}
        defaultDate={sheet.date}
      />
    </>
  );
}

function AgendaItem({ appointment: a, onEdit }: { appointment: CalendarAppointment; onEdit: () => void }) {
  const { t } = useI18n();
  const confirm = useConfirm();
  const [pending, startTransition] = React.useTransition();

  const setStatus = (status: AppointmentStatus) =>
    startTransition(async () => {
      const res = await setAppointmentStatusAction(a.id, status);
      if (!res.ok) toast.error(res.error);
      else toast.success(status === "completed" ? t("Appuntamento completato") : status === "cancelled" ? t("Appuntamento annullato") : t("Appuntamento ripristinato"));
    });

  const remove = async () => {
    const ok = await confirm({
      title: t("Eliminare l'appuntamento?"),
      description: t("“{title}” verrà rimosso dal calendario.", { title: a.title }),
      confirmLabel: t("Elimina"),
      destructive: true,
    });
    if (!ok) return;
    startTransition(async () => {
      const res = await deleteAppointmentAction(a.id);
      if (!res.ok) toast.error(res.error);
      else toast.success(t("Appuntamento eliminato"));
    });
  };

  const cancelled = a.status === "cancelled";
  return (
    <li className={cn("flex gap-3 rounded-2xl border bg-card p-3 transition-opacity", pending && "opacity-60")}>
      <div className={cn("w-1 shrink-0 rounded-full", cancelled ? "bg-muted-foreground/30" : TYPE_STYLE[a.type].dot)} aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <button type="button" onClick={onEdit} className={cn("min-w-0 text-left text-[14.5px] font-semibold hover:underline", cancelled && "text-muted-foreground line-through")}>
            {a.title}
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-xs" className="-mt-0.5 -mr-1" aria-label={t("Azioni appuntamento")}>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onSelect={onEdit}>
                <Pencil /> {t("Modifica")}
              </DropdownMenuItem>
              {a.status !== "completed" && (
                <DropdownMenuItem onSelect={() => setStatus("completed")}>
                  <Check /> {t("Segna come completato")}
                </DropdownMenuItem>
              )}
              {a.status !== "scheduled" && (
                <DropdownMenuItem onSelect={() => setStatus("scheduled")}>
                  <RotateCcw /> {t("Ripristina")}
                </DropdownMenuItem>
              )}
              {a.status !== "cancelled" && (
                <DropdownMenuItem onSelect={() => setStatus("cancelled")}>
                  <X /> {t("Annulla appuntamento")}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem destructive onSelect={remove}>
                <Trash2 /> {t("Elimina")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-muted-foreground">
          <span className="flex items-center gap-1 tabular">
            <Clock className="size-3.5" />
            {timeOf(a.startsAt)}–{endTime(a)}
          </span>
          <span className="flex items-center gap-1">
            <CalendarDays className="size-3.5" />
            {t(APPOINTMENT_TYPE_LABELS[a.type])}
          </span>
          {a.location && (
            <span className="flex min-w-0 items-center gap-1">
              <MapPin className="size-3.5 shrink-0" />
              <span className="truncate">{a.location}</span>
            </span>
          )}
        </div>
        {a.notes && <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-snug text-muted-foreground">{a.notes}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {a.clientName ? (
            <Link href={a.clientId ? `/clients/${a.clientId}` : "#"} className="flex items-center gap-1.5 rounded-full bg-muted py-0.5 pr-2.5 pl-0.5 text-[12.5px] font-medium hover:bg-sage">
              <Avatar src={a.clientAvatar} name={a.clientName} size={22} />
              {a.clientName}
            </Link>
          ) : (
            <span className="text-[12.5px] text-muted-foreground">{t("Senza cliente")}</span>
          )}
          {a.status !== "scheduled" && (
            <Badge size="sm" variant={a.status === "completed" ? "success" : "neutral"} dot>
              {t(APPOINTMENT_STATUS_LABELS[a.status])}
            </Badge>
          )}
        </div>
      </div>
    </li>
  );
}
