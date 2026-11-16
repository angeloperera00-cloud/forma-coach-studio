"use client";

import * as React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, ChevronDown, Copy, GripVertical, Link2, Link2Off, MoreHorizontal, NotebookPen, Repeat, Trash2 } from "lucide-react";
import type { Exercise, WorkoutExercise } from "@/lib/domain/types";
import { EQUIPMENT_LABELS, MUSCLE_LABELS } from "@/lib/domain/constants";
import type { SupersetInfo } from "@/lib/domain/workout";
import { formatRest, parseRest, isValidReps } from "@/lib/domain/workout";
import { TileInput } from "@/components/editor/shared";
import { Thumb } from "@/components/common/basics";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/menus";
import { cn, parseDecimal } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/client";

interface Props {
  item: WorkoutExercise;
  exercise: Exercise | undefined;
  index: number;
  total: number;
  superset: SupersetInfo | undefined;
  highlighted: boolean;
  onChange: (patch: Partial<WorkoutExercise>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onMove: (to: number) => void;
  onLinkNext: () => void;
  onUnlink: () => void;
  onReplace: () => void;
}

export function ExerciseCard({ item, exercise, index, total, superset, highlighted, onChange, onRemove, onDuplicate, onMove, onLinkNext, onUnlink, onReplace }: Props) {
  const { fmt, t } = useI18n();
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const [expanded, setExpanded] = React.useState(Boolean(item.notes));
  const name = exercise?.name ?? t("Esercizio rimosso dalla libreria");
  const muscles = exercise ? exercise.primaryMuscles.map((m) => t(MUSCLE_LABELS[m])).join(" · ") : "";

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn("relative", isDragging && "z-20")}
      data-exercise-id={item.id}
    >
      {superset && !superset.isLast && <span className="absolute top-full left-[38px] z-0 h-3 w-0.5 bg-primary/40 md:left-[46px]" aria-hidden />}
      <article
        className={cn(
          "relative flex gap-3 rounded-2xl border bg-card p-3 shadow-card transition-[box-shadow,border-color,background-color] duration-200 md:gap-4 md:p-3.5",
          isDragging && "border-primary/40 shadow-pop",
          highlighted && "border-primary/50 bg-pale/60",
          superset && "border-l-[3px] border-l-primary",
        )}
        aria-label={`${index + 1}. ${name}`}
      >
        <button
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          className="-ml-1 flex w-5 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground/60 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 active:cursor-grabbing max-md:hidden"
          aria-label={t("Trascina per riordinare {name}", { name })}
        >
          <GripVertical className="size-4" />
        </button>

        <Thumb src={exercise?.imageUrls[0]} alt={name} className="size-[84px] rounded-xl md:size-[104px]" sizes="(min-width: 768px) 104px, 84px" />

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {superset && (
                  <span className="shrink-0 rounded-md bg-pale px-1.5 py-0.5 text-[11px] font-bold text-primary" title={t("Superset {label}", { label: superset.label })}>
                    {superset.label}
                    {superset.index}
                  </span>
                )}
                <h3 className="truncate text-[15px] font-semibold md:text-[15.5px]">{name}</h3>
              </div>
              <p className="truncate text-[12.5px] text-muted-foreground max-md:hidden">
                {muscles}
                {exercise && ` · ${t(EQUIPMENT_LABELS[exercise.equipment])}`}
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" className="-mt-1 -mr-1 shrink-0 text-muted-foreground" aria-label={t("Opzioni per {name}", { name })}>
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-60">
                <DropdownMenuItem onSelect={onDuplicate}>
                  <Copy /> {t("Duplica")}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={onReplace}>
                  <Repeat /> {t("Sostituisci esercizio")}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setExpanded((v) => !v)} className="md:hidden">
                  <NotebookPen /> {expanded ? t("Nascondi dettagli") : t("Carico, tempo e note")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {superset ? (
                  <DropdownMenuItem onSelect={onUnlink}>
                    <Link2Off /> {t("Rimuovi dal superset")}
                  </DropdownMenuItem>
                ) : null}
                {index < total - 1 && !(superset && !superset.isLast) && (
                  <DropdownMenuItem onSelect={onLinkNext}>
                    <Link2 /> {t("Superset con il successivo")}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onSelect={() => onMove(index - 1)} disabled={index === 0}>
                  <ArrowUp /> {t("Sposta su")}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onMove(index + 1)} disabled={index === total - 1}>
                  <ArrowDown /> {t("Sposta giù")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem destructive onSelect={onRemove}>
                  <Trash2 /> {t("Elimina")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="grid grid-cols-3 gap-1.5 md:grid-cols-5 md:gap-2">
            <TileInput
              label={t("Serie")}
              display={String(item.sets)}
              raw={String(item.sets)}
              inputMode="numeric"
              onCommit={(raw) => {
                const n = Number(raw.trim());
                if (!Number.isInteger(n) || n < 1 || n > 20) return false;
                onChange({ sets: n });
                return true;
              }}
              onStep={(d) => onChange({ sets: Math.min(20, Math.max(1, item.sets + d)) })}
              aria-label={t("Serie di {name}", { name })}
            />
            <TileInput
              label={t("Ripetizioni")}
              display={item.reps}
              raw={item.reps}
              onCommit={(raw) => {
                if (!isValidReps(raw)) return false;
                onChange({ reps: raw.trim() });
                return true;
              }}
              onStep={(d) => {
                const n = Number(item.reps);
                if (Number.isInteger(n)) onChange({ reps: String(Math.min(100, Math.max(1, n + d))) });
              }}
              aria-label={t("Ripetizioni di {name}", { name })}
            />
            <TileInput
              label={t("Recupero")}
              display={formatRest(item.restSeconds)}
              raw={String(item.restSeconds)}
              inputMode="numeric"
              onCommit={(raw) => {
                const s = parseRest(raw);
                if (s === null) return false;
                onChange({ restSeconds: s });
                return true;
              }}
              onStep={(d) => onChange({ restSeconds: Math.min(900, Math.max(0, item.restSeconds + d * 15)) })}
              aria-label={t("Recupero di {name} in secondi", { name })}
            />
            <TileInput
              label={t("Carico")}
              className={cn(!expanded && "max-md:hidden")}
              display={item.weightKg !== null ? `${fmt.number(item.weightKg, 1)} kg` : ""}
              raw={item.weightKg !== null ? String(item.weightKg).replace(".", ",") : ""}
              placeholder={t("— kg")}
              inputMode="decimal"
              muted={item.weightKg === null}
              onCommit={(raw) => {
                const n = parseDecimal(raw.replace(/kg/i, ""));
                if (n === null) {
                  onChange({ weightKg: null });
                  return true;
                }
                if (Number.isNaN(n) || n < 0 || n > 1000) return false;
                onChange({ weightKg: Math.round(n * 4) / 4 });
                return true;
              }}
              onStep={(d) => onChange({ weightKg: Math.max(0, (item.weightKg ?? 0) + d * 2.5) })}
              aria-label={t("Carico di {name} in kg", { name })}
            />
            <TileInput
              label={t("Tempo")}
              className={cn(!expanded && "max-md:hidden")}
              display={item.tempo ?? ""}
              raw={item.tempo ?? ""}
              placeholder={t("es. 3-1-1")}
              muted={!item.tempo}
              onCommit={(raw) => {
                const v = raw.trim();
                if (v.length > 16) return false;
                onChange({ tempo: v || null });
                return true;
              }}
              aria-label={t("Tempo di esecuzione di {name}", { name })}
            />
          </div>

          <div className={cn("flex items-center gap-2", !expanded && "max-md:hidden")}>
            <NotebookPen className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
            <input
              defaultValue={item.notes ?? ""}
              key={item.notes ?? ""}
              maxLength={300}
              placeholder={t("Aggiungi una nota per il cliente…")}
              aria-label={t("Note per {name}", { name })}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v !== (item.notes ?? "")) onChange({ notes: v || null });
              }}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              className="h-8 w-full min-w-0 rounded-lg border border-transparent bg-transparent px-2 text-[13px] outline-none transition-colors placeholder:text-muted-foreground/70 hover:border-input focus:border-primary/50 focus:bg-card"
            />
          </div>

          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="-mt-1 inline-flex items-center gap-1 self-start text-[12.5px] font-medium text-muted-foreground md:hidden"
            aria-expanded={expanded}
          >
            <ChevronDown className={cn("size-3.5 transition-transform", expanded && "rotate-180")} />
            {expanded ? t("Meno dettagli") : item.weightKg !== null || item.tempo || item.notes ? t("Carico, tempo e note ●") : t("Carico, tempo e note")}
          </button>
        </div>
      </article>
    </div>
  );
}
