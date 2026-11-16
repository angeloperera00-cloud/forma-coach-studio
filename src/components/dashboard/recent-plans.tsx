"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronRight, Dumbbell, Salad } from "lucide-react";
import type { RecentPlan } from "@/lib/data/queries";
import { Panel, PanelHeader, PlanStatusBadge, EmptyState } from "@/components/common/basics";
import { Segmented } from "@/components/ui/misc";
import { Avatar } from "@/components/ui/misc";
import { RelativeTime } from "@/components/common/relative-time";
import { WEEKDAY_SHORT } from "@/lib/domain/constants";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/client";

type Filter = "all" | "workout" | "nutrition";

export function RecentPlans({ plans, className }: { plans: RecentPlan[]; className?: string }) {
  const { tn, fmt, t } = useI18n();
  const [filter, setFilter] = React.useState<Filter>("all");
  const visible = plans.filter((p) => filter === "all" || p.kind === filter);

  return (
    <Panel className={cn("flex flex-col lg:self-start", className)}>
      <PanelHeader
        title={t("Piani recenti")}
        description={t("Le ultime schede e i piani alimentari modificati")}
        actions={
          <Segmented
            aria-label={t("Filtra piani")}
            size="sm"
            value={filter}
            onValueChange={setFilter}
            options={[
              { value: "all", label: t("Tutti") },
              { value: "workout", label: t("Allenamento") },
              { value: "nutrition", label: t("Alimentazione") },
            ]}
            className="max-sm:hidden"
          />
        }
      />
      {visible.length === 0 ? (
        <EmptyState compact emoji="clipboard" title={t("Ancora nessun piano")} description={t("Le schede e i piani che crei compariranno qui.")} />
      ) : (
        <ul className="flex flex-col px-2 pb-2 md:px-3">
          {visible.map((p) => (
            <li key={`${p.kind}-${p.id}`}>
              <Link
                href={p.kind === "workout" ? `/workouts/${p.id}` : `/nutrition/${p.id}`}
                className="group flex items-center gap-3.5 rounded-2xl px-3 py-3 outline-none transition-colors hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/25"
              >
                <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl", p.kind === "workout" ? "bg-forest text-white" : "bg-pale text-primary")}>
                  {p.kind === "workout" ? <Dumbbell className="size-5" /> : <Salad className="size-5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[14.5px] font-semibold">{p.name}</span>
                  </div>
                  <div className="mt-0.5 flex min-w-0 items-center gap-2 text-[12.5px] text-muted-foreground">
                    {p.clientName ? (
                      <span className="flex min-w-0 items-center gap-1.5">
                        <Avatar src={p.clientAvatar} name={p.clientName} size={18} />
                        <span className="truncate">{p.clientName}</span>
                      </span>
                    ) : (
                      <span>{t("Senza cliente")}</span>
                    )}
                    <span aria-hidden>·</span>
                    <span className="truncate max-sm:hidden">
                      {p.kind === "workout"
                        ? `${p.weekdays.map((d) => t(WEEKDAY_SHORT[d])).join(" · ") || t("Nessun giorno")} · ${tn("{n} esercizio", "{n} esercizi", p.exerciseCount)}`
                        : `${tn("{n} giorno", "{n} giorni", p.daysWithMeals.length)} · ${p.avgKcal ? t("{kcal} kcal/die", { kcal: fmt.number(p.avgKcal) }) : t("valori n/d")}`}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <PlanStatusBadge status={p.status} kind={p.kind} size="sm" />
                  <RelativeTime date={p.updatedAt} className="text-[11.5px] text-muted-foreground" />
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5 max-sm:hidden" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-auto flex flex-wrap gap-x-2 gap-y-1 border-t px-3 py-3 sm:px-5 md:px-6">
        <Button asChild variant="ghost" size="sm">
          <Link href="/workouts">{t("Tutte le schede")}</Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href="/nutrition">{t("Tutti i piani alimentari")}</Link>
        </Button>
      </div>
    </Panel>
  );
}
