"use client";

import * as React from "react";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import type { Exercise } from "@/lib/domain/types";
import { DIFFICULTIES, DIFFICULTY_LABELS, EQUIPMENT, EQUIPMENT_LABELS, MUSCLE_GROUPS, MUSCLE_LABELS, type Difficulty, type Equipment, type MuscleGroup } from "@/lib/domain/constants";
import { exerciseInput } from "@/lib/domain/schemas";
import { createExerciseAction, updateExerciseAction } from "@/lib/actions/library";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/overlays";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/menus";
import { Segmented } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/common/image-upload";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/client";

interface Values {
  name: string;
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
  equipment: Equipment;
  difficulty: Difficulty;
  instructions: string[];
  images: (string | null)[];
}

const defaults = (e?: Exercise | null): Values => ({
  name: e?.name ?? "",
  primaryMuscles: e?.primaryMuscles ?? [],
  secondaryMuscles: e?.secondaryMuscles ?? [],
  equipment: e?.equipment ?? "dumbbell",
  difficulty: e?.difficulty ?? "beginner",
  instructions: e?.instructions.length ? e.instructions : [""],
  images: [e?.imageUrls[0] ?? null, e?.imageUrls[1] ?? null],
});

export function ExerciseFormSheet({
  open,
  exercise,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  exercise: Exercise | null;
  onOpenChange: (open: boolean) => void;
  onSaved?: (e: Exercise) => void;
}) {
  const { t } = useI18n();
  const [v, setV] = React.useState<Values>(defaults(exercise));
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);

  // Fresh form every time the sheet opens.
  const [prevOpen, setPrevOpen] = React.useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setV(defaults(exercise));
      setErrors({});
    }
  }

  const toggle = (key: "primaryMuscles" | "secondaryMuscles", m: MuscleGroup) =>
    setV((x) => {
      const other = key === "primaryMuscles" ? "secondaryMuscles" : "primaryMuscles";
      const has = x[key].includes(m);
      return { ...x, [key]: has ? x[key].filter((y) => y !== m) : [...x[key], m], [other]: x[other].filter((y) => y !== m) };
    });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: v.name,
      primaryMuscles: v.primaryMuscles,
      secondaryMuscles: v.secondaryMuscles,
      equipment: v.equipment,
      difficulty: v.difficulty,
      instructions: v.instructions.map((s) => s.trim()).filter(Boolean),
      imageUrls: v.images.filter((x): x is string => Boolean(x)),
    };
    const parsed = exerciseInput.safeParse(payload);
    if (!parsed.success) {
      const out: Record<string, string> = {};
      for (const i of parsed.error.issues) out[String(i.path[0])] ??= i.message;
      setErrors(out);
      return;
    }
    setSaving(true);
    const res = exercise ? await updateExerciseAction(exercise.id, parsed.data) : await createExerciseAction(parsed.data);
    setSaving(false);
    if (!res.ok) return void toast.error(res.error);
    toast.success(exercise ? t("Esercizio aggiornato") : t("Esercizio aggiunto alla libreria"));
    onOpenChange(false);
    onSaved?.(res.data);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="max-w-[560px]">
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col" noValidate>
          <SheetHeader>
            <SheetTitle>{exercise ? t("Modifica esercizio") : t("Nuovo esercizio")}</SheetTitle>
            <SheetDescription>{t("Gli esercizi personalizzati sono disponibili in tutte le schede.")}</SheetDescription>
          </SheetHeader>
          <SheetBody className="flex flex-col gap-5">
            <Field label={t("Nome")} htmlFor="ex-name" error={errors.name}>
              <Input id="ex-name" value={v.name} maxLength={80} onChange={(e) => setV({ ...v, name: e.target.value })} aria-invalid={!!errors.name} placeholder={t("Es. Hip thrust monopodalico")} />
            </Field>
            <Field label={t("Muscoli principali")} error={errors.primaryMuscles}>
              <MuscleChips selected={v.primaryMuscles} onToggle={(m) => toggle("primaryMuscles", m)} tone="primary" />
            </Field>
            <Field label={t("Muscoli secondari")} optional>
              <MuscleChips selected={v.secondaryMuscles} onToggle={(m) => toggle("secondaryMuscles", m)} tone="secondary" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("Attrezzatura")}>
                <Select aria-label={t("Attrezzatura")} value={v.equipment} onValueChange={(x) => setV({ ...v, equipment: x })} options={EQUIPMENT.map((e) => ({ value: e, label: t(EQUIPMENT_LABELS[e]) }))} />
              </Field>
              <Field label={t("Difficoltà")}>
                <Segmented aria-label={t("Difficoltà")} value={v.difficulty} onValueChange={(x) => setV({ ...v, difficulty: x })} options={DIFFICULTIES.map((d) => ({ value: d, label: t(DIFFICULTY_LABELS[d]) }))} size="sm" />
              </Field>
            </div>
            <Field label={t("Istruzioni passo passo")} error={errors.instructions}>
              <ol className="flex flex-col gap-2">
                {v.instructions.map((step, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-2 grid size-6 shrink-0 place-items-center rounded-full bg-pale text-[12px] font-semibold text-forest">{i + 1}</span>
                    <Textarea
                      rows={2}
                      value={step}
                      maxLength={400}
                      aria-label={t("Passaggio {value}", { value: i + 1 })}
                      onChange={(e) => setV({ ...v, instructions: v.instructions.map((s, k) => (k === i ? e.target.value : s)) })}
                      className="min-h-0"
                    />
                    <Button type="button" variant="ghost" size="icon-sm" className="mt-1" aria-label={t("Rimuovi passaggio {value}", { value: i + 1 })} onClick={() => setV({ ...v, instructions: v.instructions.filter((_, k) => k !== i) })}>
                      <X />
                    </Button>
                  </li>
                ))}
              </ol>
              {v.instructions.length < 12 && (
                <Button type="button" variant="ghost" size="sm" className="self-start" onClick={() => setV({ ...v, instructions: [...v.instructions, ""] })}>
                  <Plus /> {t("Aggiungi passaggio")}
                </Button>
              )}
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              {[0, 1].map((i) => (
                <Field key={i} label={i === 0 ? t("Foto posizione iniziale") : t("Foto posizione finale")} optional>
                  <ImageUpload value={v.images[i]} onChange={(url) => setV({ ...v, images: v.images.map((x, k) => (k === i ? url : x)) })} folder="exercises" shape="wide" label={t("Carica")} />
                </Field>
              ))}
            </div>
          </SheetBody>
          <SheetFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              
              {t("Annulla")}
            </Button>
            <Button type="submit" loading={saving}>
              {exercise ? t("Salva modifiche") : t("Crea esercizio")}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function MuscleChips({ selected, onToggle, tone }: { selected: MuscleGroup[]; onToggle: (m: MuscleGroup) => void; tone: "primary" | "secondary" }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap gap-1.5">
      {MUSCLE_GROUPS.map((m) => {
        const on = selected.includes(m);
        return (
          <button
            key={m}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(m)}
            className={cn(
              "h-8 rounded-full border px-3 text-[13px] font-medium transition-colors",
              on ? (tone === "primary" ? "border-forest bg-forest text-white" : "border-primary/40 bg-pale text-forest") : "bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {t(MUSCLE_LABELS[m])}
          </button>
        );
      })}
    </div>
  );
}
