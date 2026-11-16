"use client";

import * as React from "react";
import { Check, Plus, Search } from "lucide-react";
import type { Exercise } from "@/lib/domain/types";
import { EQUIPMENT, EQUIPMENT_LABELS, MUSCLE_GROUPS, MUSCLE_LABELS, type Equipment, type MuscleGroup } from "@/lib/domain/constants";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/menus";
import { Thumb } from "@/components/common/basics";
import { cn, matches } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/client";

interface Props {
  exercises: Exercise[];
  onPick: (exercise: Exercise) => void;
  /** Exercise ids already in the current day */
  usedIds?: Set<string>;
  title?: string;
  autoFocus?: boolean;
  className?: string;
  replaceMode?: boolean;
}

/** Searchable exercise list with muscle-group filter — used inline in the editor (desktop) and in a sheet (mobile). */
export function ExerciseLibraryPanel({ exercises, onPick, usedIds, title, autoFocus, className, replaceMode }: Props) {
  const { tn, t } = useI18n();
  const [query, setQuery] = React.useState("");
  const [muscle, setMuscle] = React.useState<MuscleGroup | "all">("all");
  const [equipment, setEquipment] = React.useState<Equipment | "all">("all");
  const [flash, setFlash] = React.useState<string | null>(null);

  const muscles = React.useMemo(() => MUSCLE_GROUPS.filter((m) => exercises.some((e) => e.primaryMuscles.includes(m))), [exercises]);
  const list = React.useMemo(
    () =>
      exercises.filter(
        (e) =>
          (muscle === "all" || e.primaryMuscles.includes(muscle) || e.secondaryMuscles.includes(muscle)) &&
          (equipment === "all" || e.equipment === equipment) &&
          matches(`${e.name} ${e.primaryMuscles.map((m) => t(MUSCLE_LABELS[m])).join(" ")} ${t(EQUIPMENT_LABELS[e.equipment])}`, query),
      ),
    [exercises, muscle, equipment, query, t],
  );

  const pick = (e: Exercise) => {
    onPick(e);
    setFlash(e.id);
    window.setTimeout(() => setFlash((f) => (f === e.id ? null : f)), 900);
  };

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div className="flex flex-col gap-2.5 px-4 pt-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[15px] font-semibold">{title ?? t("Libreria esercizi")}</h2>
          <span className="text-[12px] text-muted-foreground tabular">{tn("{n} esercizio", "{n} esercizi", list.length)}</span>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input autoFocus={autoFocus} value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("Cerca esercizio…")} className="h-9 pl-9" aria-label={t("Cerca nella libreria esercizi")} />
        </div>
        <div className="scrollbar-none mask-fade-x -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-0.5" role="group" aria-label={t("Filtra per gruppo muscolare")}>
          {(["all", ...muscles] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMuscle(m)}
              aria-pressed={muscle === m}
              className={cn(
                "h-7 shrink-0 rounded-full border px-3 text-[12.5px] font-medium transition-colors",
                muscle === m ? "border-forest bg-forest text-white" : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {m === "all" ? t("Tutti") : t(MUSCLE_LABELS[m])}
            </button>
          ))}
        </div>
        <Select
          aria-label={t("Filtra per attrezzatura")}
          value={equipment}
          onValueChange={setEquipment}
          className="h-9 text-[13px]"
          options={[{ value: "all", label: t("Tutta l'attrezzatura") }, ...EQUIPMENT.map((e) => ({ value: e, label: t(EQUIPMENT_LABELS[e]) }))]}
        />
      </div>
      <ul className="scrollbar-thin mt-2 min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {list.length === 0 && <li className="px-3 py-8 text-center text-[13px] text-muted-foreground">{t("Nessun esercizio trovato")}</li>}
        {list.map((e) => {
          const used = usedIds?.has(e.id);
          const justAdded = flash === e.id;
          return (
            <li key={e.id}>
              <button
                onClick={() => pick(e)}
                className={cn("group flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-muted", justAdded && "bg-pale")}
              >
                <Thumb src={e.imageUrls[0]} className="size-12 rounded-lg" sizes="48px" />
                <div className="min-w-0 flex-1 leading-tight">
                  <div className="truncate text-[13.5px] font-semibold">{e.name}</div>
                  <div className="truncate text-[12px] text-muted-foreground">
                    {e.primaryMuscles.map((m) => t(MUSCLE_LABELS[m])).join(", ")}
                    {used && !replaceMode && t(" · già nel giorno")}
                  </div>
                </div>
                <span
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-full transition-colors",
                    justAdded ? "bg-primary text-white" : "bg-pale text-primary group-hover:bg-primary group-hover:text-white",
                  )}
                  aria-hidden
                >
                  {justAdded ? <Check className="size-4" /> : <Plus className="size-4" />}
                </span>
                <span className="sr-only">{replaceMode ? t("Sostituisci con") : t("Aggiungi")} {e.name}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
