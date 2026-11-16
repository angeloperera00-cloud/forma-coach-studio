"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDownRight, ArrowUpRight, CalendarClock, Dumbbell, Salad, Scale, Target } from "lucide-react";
import type { DashboardData } from "@/lib/data/queries";
import type { ClientOption } from "@/lib/domain/types";
import { GOAL_LABELS } from "@/lib/domain/constants";
import { ClientPicker } from "@/components/common/client-picker";
import { cn } from "@/lib/utils";
import { addDaysToKey, dayKeyOf, timeOf, todayKey } from "@/lib/datetime";
import { useI18n } from "@/lib/i18n/client";
import type { I18n } from "@/lib/i18n/core";

interface Props {
  options: ClientOption[];
  selectedId: string | null;
  context: DashboardData["context"];
  className?: string;
}

/** Client selector + the selected client's current state. Selection lives in the URL (?client=). */
export function ClientContextBar({ options, selectedId, context, className }: Props) {
  const { fmt, t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const select = (id: string) => startTransition(() => router.replace(`/?client=${id}`, { scroll: false }));

  return (
    <section
      aria-label={t("Cliente selezionato")}
      className={cn("grid overflow-hidden rounded-3xl border bg-card shadow-card lg:grid-cols-[minmax(300px,360px)_1fr]", className)}
    >
      <div className="p-2.5 lg:border-r">
        <ClientPicker clients={options} value={selectedId} onChange={select} label={t("Cliente selezionato")} className="border-transparent bg-muted/60 shadow-none hover:bg-muted" />
      </div>
      {context ? (
        <div className={cn("grid grid-cols-2 transition-opacity duration-150 max-lg:border-t sm:grid-cols-4", pending && "opacity-50")}>
          <Cell icon={<Target />} label={t("Obiettivo")} value={t(GOAL_LABELS[context.client.goal])} sub={context.client.goalDetails ?? undefined} href={`/clients/${context.client.id}`} />
          <Cell
            icon={<Dumbbell />}
            label={t("Scheda")}
            value={context.workout ? context.workout.name : "Nessuna scheda"}
            sub={context.workout ? (context.workout.status === "published" ? t("Pubblicata") : t("In bozza")) : t("Crea la prima →")}
            tone={context.workout?.status === "published" ? "ok" : context.workout ? "warn" : "muted"}
            href={context.workout ? `/workouts/${context.workout.id}` : `/workouts/new?client=${context.client.id}`}
          />
          <Cell
            icon={<Salad />}
            label={t("Piano alimentare")}
            value={context.nutrition ? context.nutrition.name : "Nessun piano"}
            sub={context.nutrition ? (context.nutrition.status === "published" ? t("Pubblicato") : t("In bozza")) : t("Crea il primo →")}
            tone={context.nutrition?.status === "published" ? "ok" : context.nutrition ? "warn" : "muted"}
            href={context.nutrition ? `/nutrition/${context.nutrition.id}` : `/nutrition/new?client=${context.client.id}`}
          />
          {context.nextAppointment ? (
            <Cell
              icon={<CalendarClock />}
              label={t("Prossimo incontro")}
              value={`${describeDay(context.nextAppointment.startsAt, { t, fmt })} · ${timeOf(context.nextAppointment.startsAt)}`}
              sub={context.nextAppointment.title}
              href={`/calendar?date=${dayKeyOf(context.nextAppointment.startsAt)}`}
            />
          ) : (
            <Cell
              icon={<Scale />}
              label={t("Ultimo peso")}
              value={context.lastWeight ? `${fmt.number(context.lastWeight.value, 1)} kg` : "Nessuna misura"}
              sub={
                context.lastWeight?.delta != null ? (
                  <span className="inline-flex items-center gap-0.5">
                    {context.lastWeight.delta < 0 ? <ArrowDownRight className="size-3.5" /> : <ArrowUpRight className="size-3.5" />}
                    
                    {t("{delta} kg dall'ultima misura", { delta: fmt.signed(context.lastWeight.delta) })}
                  </span>
                ) : context.lastWeight ? (
                  fmt.dayKey(context.lastWeight.date, { day: "numeric", month: "short" })
                ) : (
                  t("Registra un progresso →")
                )
              }
              href={`/clients/${context.client.id}?tab=progressi`}
            />
          )}
        </div>
      ) : (
        <div className="grid place-items-center p-5 text-sm text-muted-foreground max-lg:border-t">{t("Aggiungi il tuo primo cliente per iniziare.")}</div>
      )}
    </section>
  );
}

function describeDay(iso: string, { t, fmt }: Pick<I18n, "t" | "fmt">) {
  const day = dayKeyOf(iso);
  const today = todayKey();
  if (day === today) return t("Oggi");
  if (day === addDaysToKey(today, 1)) return t("Domani");
  return fmt.instant(iso, { weekday: "short", day: "numeric", month: "short" }, true);
}

function Cell({
  icon,
  label,
  value,
  sub,
  href,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: React.ReactNode;
  href: string;
  tone?: "default" | "ok" | "warn" | "muted";
}) {
  return (
    <Link
      href={href}
      className="group flex min-w-0 flex-col justify-center gap-0.5 border-border px-5 py-3.5 outline-none transition-colors hover:bg-muted/60 focus-visible:bg-muted max-sm:odd:border-r max-sm:[&:nth-child(-n+2)]:border-b sm:border-l sm:first:border-l-0"
    >
      <span className="flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground [&_svg]:size-3.5 [&_svg]:text-forest">
        {icon}
        {label}
      </span>
      <span className="truncate text-[14.5px] font-semibold">{value}</span>
      {sub && (
        <span className={cn("truncate text-[12.5px]", tone === "ok" ? "text-primary" : tone === "warn" ? "text-warning" : "text-muted-foreground")}>{sub}</span>
      )}
    </Link>
  );
}
