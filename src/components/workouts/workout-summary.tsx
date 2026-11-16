"use client";

import * as React from "react";
import { Clock3, Dumbbell, Layers, Target } from "lucide-react";
import type { Exercise, WorkoutDay, WorkoutPlan } from "@/lib/domain/types";
import { MUSCLE_LABELS, WEEKDAY_LABELS, WEEKDAY_SHORT } from "@/lib/domain/constants";
import { dayStats, planStats } from "@/lib/domain/workout";
import { PlanStatusBadge } from "@/components/common/basics";
import { RelativeTime } from "@/components/common/relative-time";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/client";

interface Props {
  plan: WorkoutPlan;
  day: WorkoutDay | null;
  activeDay: number;
  byId: Map<string, Exercise>;
  dirty: boolean;
  isNew: boolean;
  onSelectDay: (weekday: number) => void;
  className?: string;
}

/** Compact live summary for the desktop side panel. */
export function WorkoutSummary({ plan, day, activeDay, byId, dirty, isNew, onSelectDay, className }: Props) {
  const { tn, fmt, t } = useI18n();
  const stats = day ? dayStats(day, byId) : null;
  const totals = planStats(plan, byId);
  const maxSets = Math.max(1, ...(stats?.muscles.map((m) => m.sets) ?? [1]));

  return (
    <section aria-label={t("Riepilogo allenamento")} className={cn("rounded-3xl border bg-card p-4 shadow-card", className)}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[15px] font-semibold">{t("Riepilogo · {day}", { day: t(WEEKDAY_LABELS[activeDay]) })}</h2>
        <PlanStatusBadge status={plan.status} kind="workout" size="sm" />
      </div>
      <p className="text-[12px] text-muted-foreground" aria-live="polite">
        {isNew ? t("Non ancora salvata") : dirty ? t("Modifiche non salvate") : <>{t("Salvata")}{" "}<RelativeTime date={plan.updatedAt} /></>}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Metric icon={<Clock3 />} label={day?.durationMinutes ? t("Durata") : t("Durata stimata")} value={stats ? `${stats.minutes} min` : "—"} />
        <Metric icon={<Dumbbell />} label={t("Esercizi")} value={stats ? String(stats.exerciseCount) : "—"} />
        <Metric icon={<Layers />} label={t("Serie totali")} value={stats ? String(stats.totalSets) : "—"} />
        <Metric icon={<Target />} label={t("Gruppi muscolari")} value={stats ? String(stats.muscles.length) : "—"} />
      </div>

      <h3 className="mt-4 text-[12px] font-semibold text-muted-foreground">{t("Muscoli coinvolti")}</h3>
      {stats && stats.muscles.length ? (
        <ul className="mt-1.5 flex flex-col gap-1">
          {stats.muscles.slice(0, 4).map((m) => (
            <li key={m.muscle} className="grid grid-cols-[88px_1fr_auto] items-center gap-2 text-[12.5px]">
              <span className="truncate">{t(MUSCLE_LABELS[m.muscle])}</span>
              <span className="h-1.5 overflow-hidden rounded-full bg-muted">
                <span className="block h-full rounded-full bg-primary" style={{ width: `${(m.sets / maxSets) * 100}%` }} />
              </span>
              <span className="w-[52px] text-right text-muted-foreground tabular">{tn("one|{n} serie", "{n} serie", m.sets, { n: fmt.number(m.sets, 1) })}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1.5 text-[12.5px] text-muted-foreground">{t("Aggiungi esercizi per vedere i muscoli allenati.")}</p>
      )}

      <div className="mt-4 border-t pt-3">
        <div className="flex items-baseline justify-between">
          <h3 className="text-[12px] font-semibold text-muted-foreground">{t("Settimana")}</h3>
          <span className="text-[11.5px] text-muted-foreground tabular">
            
            {t("{days} giorni · {totalSets} serie · {weeklyMinutes} min", { days: totals.days, totalSets: totals.totalSets, weeklyMinutes: totals.weeklyMinutes })}
          </span>
        </div>
        <div className="mt-2 grid grid-cols-7 gap-1">
          {WEEKDAY_SHORT.map((x) => t(x)).map((label, weekday) => {
            const d = plan.days.find((x) => x.weekday === weekday);
            const active = weekday === activeDay;
            return (
              <button
                key={label}
                onClick={() => onSelectDay(weekday)}
                title={d ? t("{day}: {title}", { day: t(WEEKDAY_LABELS[weekday]), title: d.title || t("Allenamento") }) : t("{day}: riposo", { day: t(WEEKDAY_LABELS[weekday]) })}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "flex flex-col items-center rounded-lg py-1.5 transition-colors",
                  active ? "bg-forest text-white" : d?.exercises.length ? "bg-pale text-forest hover:bg-sage" : "bg-muted/70 text-muted-foreground/60 hover:bg-muted",
                )}
              >
                <span className="text-[11px] font-semibold">{label}</span>
                <span className="text-[12px] font-semibold tabular">{d?.exercises.length || "–"}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-tile px-3 py-2">
      <div className="flex items-center gap-1.5 text-[11.5px] font-medium text-muted-foreground [&_svg]:size-3.5">
        {icon}
        {label}
      </div>
      <div className="text-[17px] font-semibold tracking-tight tabular">{value}</div>
    </div>
  );
}

/** Compact horizontal version for screens without the side panel. */
export function WorkoutSummaryStrip({ day, byId }: { day: WorkoutDay | null; byId: Map<string, Exercise> }) {
  const { t } = useI18n();
  if (!day || day.exercises.length === 0) return null;
  const s = dayStats(day, byId);
  return (
    <div className="scrollbar-none flex gap-2 overflow-x-auto xl:hidden">
      {[
        [day.durationMinutes ? t("Durata") : t("Durata stimata"), `${s.minutes} min`],
        [t("Esercizi"), String(s.exerciseCount)],
        [t("Serie"), String(s.totalSets)],
        [t("Muscoli"), s.muscles.slice(0, 3).map((m) => t(MUSCLE_LABELS[m.muscle])).join(", ")],
      ].map(([label, value]) => (
        <div key={label} className="shrink-0 rounded-xl border bg-card px-3 py-2 shadow-card">
          <div className="text-[11px] font-medium text-muted-foreground">{label}</div>
          <div className="text-[13.5px] font-semibold whitespace-nowrap tabular">{value}</div>
        </div>
      ))}
    </div>
  );
}
