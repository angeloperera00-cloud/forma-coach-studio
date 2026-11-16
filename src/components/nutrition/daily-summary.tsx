"use client";

import * as React from "react";
import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CircleAlert } from "lucide-react";
import type { MealEntry, NutritionTargets } from "@/lib/domain/types";
import { WEEKDAY_LABELS, WEEKDAY_SHORT } from "@/lib/domain/constants";
import { daySummary, macroSplit, weeklyAverage } from "@/lib/domain/nutrition";
import { Segmented } from "@/components/ui/misc";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/client";
import { msg } from "@/lib/i18n/core";

interface Props {
  meals: MealEntry[];
  targets: NutritionTargets;
  selected: number | "avg";
  onSelect: (day: number | "avg") => void;
  className?: string;
}

const MACROS = [
  { key: "protein", label: msg("Proteine"), color: "var(--chart-protein)", kcalPerG: 4 },
  { key: "carbs", label: msg("Carboidrati"), color: "var(--chart-carbs)", kcalPerG: 4 },
  { key: "fat", label: msg("Grassi"), color: "var(--chart-fat)", kcalPerG: 9 },
] as const;

export function DailySummary({ meals, targets, selected, onSelect, className }: Props) {
  const { fmt, t } = useI18n();
  const avg = weeklyAverage(meals);
  const day = selected === "avg" ? null : daySummary(meals, selected);
  const current = selected === "avg" ? (avg ? { ...avg, entries: 0, unknown: 0 } : null) : day;
  const split = current ? macroSplit(current) : null;
  const week = WEEKDAY_SHORT.map((x) => t(x)).map((label, i) => {
    const s = daySummary(meals, i);
    return { label, day: i, kcal: s.kcal, protein: s.protein, carbs: s.carbs, fat: s.fat, entries: s.entries };
  });
  const kcalPct = current && targets.kcal ? Math.round((current.kcal / targets.kcal) * 100) : null;

  return (
    <section aria-label={t("Riepilogo nutrizionale")} className={cn("rounded-3xl border bg-card p-4 shadow-card md:p-5", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[16px] font-semibold tracking-tight">{t("Riepilogo giornaliero")}</h2>
          <p className="text-[12.5px] text-muted-foreground">{selected === "avg" ? t("Media sui {value} giorni pianificati", { value: avg?.days ?? 0 }) : t(WEEKDAY_LABELS[selected])}</p>
        </div>
        <Segmented
          aria-label={t("Giorno del riepilogo")}
          size="sm"
          value={String(selected)}
          onValueChange={(v) => onSelect(v === "avg" ? "avg" : Number(v))}
          options={[...WEEKDAY_SHORT.map((l, i) => ({ value: String(i), label: t(l) })), { value: "avg", label: t("Media") }]}
        />
      </div>

      <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
          <div className="flex items-center gap-4">
            <Ring pct={kcalPct} />
            <div>
              <div className="text-[30px] leading-none font-semibold tracking-tight tabular">
                {current ? fmt.number(current.kcal) : "—"}
                <span className="ml-1 text-[14px] font-medium text-muted-foreground">kcal</span>
              </div>
              <div className="mt-1 text-[12.5px] text-muted-foreground tabular">
                {targets.kcal ? t("obiettivo {kcal} kcal", { kcal: fmt.number(targets.kcal) }) : t("nessun obiettivo impostato")}
              </div>
              {day && day.unknown > 0 && (
                <div className="mt-1 inline-flex items-center gap-1 text-[12px] font-medium text-warning">
                  <CircleAlert className="size-3.5" /> {day.unknown} {day.unknown === 1 ? t("pasto senza valori") : t("pasti senza valori")}
                </div>
              )}
            </div>
          </div>
          <ul className="flex flex-col gap-2.5">
            {MACROS.map((m) => {
              const grams = current ? current[m.key] : 0;
              const target = targets[m.key];
              const pct = target ? Math.min(100, (grams / target) * 100) : split ? split[m.key] : 0;
              return (
                <li key={m.key}>
                  <div className="flex items-baseline justify-between text-[12.5px]">
                    <span className="flex items-center gap-1.5 font-medium">
                      <span className="size-2 rounded-full" style={{ background: m.color }} aria-hidden />
                      {t(m.label)}
                    </span>
                    <span className="text-muted-foreground tabular">
                      <span className="font-semibold text-foreground">{current ? fmt.number(grams, 0) : "—"}</span>
                      {target ? ` / ${fmt.number(target)} g` : " g"}
                      {split && <span className="ml-1.5">· {split[m.key]}%</span>}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${pct}%`, background: m.color }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="h-[150px] min-w-0" aria-label={t("Calorie per giorno")}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={week} margin={{ top: 10, right: 6, bottom: 0, left: 0 }} barCategoryGap="22%">
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11.5, fill: "var(--muted-foreground)" }} />
              <YAxis hide domain={[0, (max: number) => Math.max(max, targets.kcal ?? 0) * 1.12]} />
              <Tooltip
                cursor={{ fill: "var(--muted)", radius: 8 }}
                content={({ active, payload }) => {
                  const p = active && payload?.[0] ? (payload[0].payload as (typeof week)[number]) : null;
                  if (!p) return null;
                  return (
                    <div className="rounded-xl border bg-card px-3 py-2 text-[12px] shadow-pop">
                      <div className="font-semibold">{t(WEEKDAY_LABELS[p.day])}</div>
                      {p.entries ? (
                        <>
                          <div className="tabular">{fmt.number(p.kcal)} kcal</div>
                          <div className="text-muted-foreground tabular">
                            
                            {t("P {protein} g · C {carbs} g · G {fat} g", { protein: fmt.number(p.protein), carbs: fmt.number(p.carbs), fat: fmt.number(p.fat) })}
                          </div>
                        </>
                      ) : (
                        <div className="text-muted-foreground">{t("Nessun pasto")}</div>
                      )}
                    </div>
                  );
                }}
              />
              {targets.kcal && <ReferenceLine y={targets.kcal} stroke="var(--muted-foreground)" strokeDasharray="4 4" strokeWidth={1} />}
              <Bar dataKey="kcal" radius={[6, 6, 0, 0]} onClick={(d) => onSelect((d as unknown as { day: number }).day)} className="cursor-pointer">
                {week.map((w) => (
                  <Cell key={w.day} fill={selected === w.day ? "var(--forest)" : "var(--primary)"} fillOpacity={selected === w.day || selected === "avg" ? 1 : 0.45} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}

function Ring({ pct }: { pct: number | null }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const value = pct === null ? 0 : Math.min(100, pct);
  const over = pct !== null && pct > 110;
  return (
    <div className="relative size-[68px] shrink-0">
      <svg viewBox="0 0 64 64" className="size-full -rotate-90" aria-hidden>
        <circle cx="32" cy="32" r={r} fill="none" stroke="var(--muted)" strokeWidth="7" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke={over ? "var(--warning)" : "var(--primary)"}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (value / 100) * c}
          className="transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-[13px] font-semibold tabular">{pct === null ? "—" : `${pct}%`}</span>
    </div>
  );
}
