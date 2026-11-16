"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import type { Exercise } from "@/lib/domain/types";
import { DIFFICULTIES, DIFFICULTY_LABELS, EQUIPMENT, EQUIPMENT_LABELS, MUSCLE_GROUPS, MUSCLE_LABELS, type Difficulty, type Equipment, type MuscleGroup } from "@/lib/domain/constants";
import { deleteExerciseAction } from "@/lib/actions/library";
import { Topbar, PageContainer } from "@/components/shell/topbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/menus";
import { Switch } from "@/components/ui/misc";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/overlays";
import { EmptyState, Panel, Thumb } from "@/components/common/basics";
import { useConfirm } from "@/components/common/confirm";
import { ExerciseFormSheet } from "./exercise-form-sheet";
import { cn, matches } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/client";

const difficultyVariant: Record<Difficulty, "success" | "warning" | "danger"> = { beginner: "success", intermediate: "warning", advanced: "danger" };

export function ExerciseLibraryView({ exercises }: { exercises: Exercise[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const confirm = useConfirm();
  const [query, setQuery] = React.useState("");
  const [muscle, setMuscle] = React.useState<MuscleGroup | "all">("all");
  const [equipment, setEquipment] = React.useState<Equipment | "all">("all");
  const [difficulty, setDifficulty] = React.useState<Difficulty | "all">("all");
  const [customOnly, setCustomOnly] = React.useState(false);
  const [detailId, setDetailId] = React.useState<string | null>(params.get("open"));
  const [form, setForm] = React.useState<{ open: boolean; exercise: Exercise | null }>({ open: false, exercise: null });

  // ?open=<id> (from global search) opens the detail sheet once, then the URL is cleaned up.
  const openParam = params.get("open");
  const [prevOpenParam, setPrevOpenParam] = React.useState(openParam);
  if (openParam !== prevOpenParam) {
    setPrevOpenParam(openParam);
    if (openParam) setDetailId(openParam);
  }
  React.useEffect(() => {
    if (openParam) router.replace("/exercises", { scroll: false });
  }, [openParam, router]);

  const detail = exercises.find((e) => e.id === detailId) ?? null;
  const muscles = MUSCLE_GROUPS.filter((m) => exercises.some((e) => e.primaryMuscles.includes(m)));
  const visible = exercises.filter(
    (e) =>
      (muscle === "all" || e.primaryMuscles.includes(muscle) || e.secondaryMuscles.includes(muscle)) &&
      (equipment === "all" || e.equipment === equipment) &&
      (difficulty === "all" || e.difficulty === difficulty) &&
      (!customOnly || e.isCustom) &&
      matches(`${e.name} ${e.primaryMuscles.map((m) => t(MUSCLE_LABELS[m])).join(" ")}`, query),
  );

  const remove = async (e: Exercise) => {
    if (!(await confirm({ title: t("Eliminare “{name}”?", { name: e.name }), description: t("L'esercizio verrà rimosso dalla libreria. Se è usato in una scheda l'eliminazione verrà bloccata."), confirmLabel: t("Elimina"), destructive: true })))
      return;
    const res = await deleteExerciseAction(e.id);
    if (!res.ok) return void toast.error(res.error);
    toast.success(t("Esercizio eliminato"));
    setDetailId(null);
  };

  const reset = () => {
    setQuery("");
    setMuscle("all");
    setEquipment("all");
    setDifficulty("all");
    setCustomOnly(false);
  };

  return (
    <>
      <Topbar
        title={t("Libreria esercizi")}
        breadcrumbs={[{ label: t("Libreria esercizi") }]}
        actions={
          <Button onClick={() => setForm({ open: true, exercise: null })}>
            <Plus /> <span className="max-sm:hidden">{t("Nuovo esercizio")}</span>
          </Button>
        }
      />
      <PageContainer>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <div className="relative md:w-80">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("Cerca per nome o muscolo…")} className="pl-9" aria-label={t("Cerca esercizi")} />
            </div>
            <div className="grid grid-cols-2 gap-2 md:flex">
              <Select aria-label={t("Attrezzatura")} value={equipment} onValueChange={setEquipment} className="md:w-52" options={[{ value: "all", label: t("Tutta l'attrezzatura") }, ...EQUIPMENT.map((e) => ({ value: e, label: t(EQUIPMENT_LABELS[e]) }))]} />
              <Select aria-label={t("Difficoltà")} value={difficulty} onValueChange={setDifficulty} className="md:w-48" options={[{ value: "all", label: t("Ogni livello") }, ...DIFFICULTIES.map((d) => ({ value: d, label: t(DIFFICULTY_LABELS[d]) }))]} />
            </div>
            <label className="flex items-center gap-2 text-[13.5px] font-medium md:ml-auto">
              <Switch checked={customOnly} onCheckedChange={setCustomOnly} /> {t("Solo personalizzati")}
            </label>
          </div>
          <div className="scrollbar-none -mx-4 flex gap-1.5 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0" role="group" aria-label={t("Gruppo muscolare")}>
            {(["all", ...muscles] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMuscle(m)}
                aria-pressed={muscle === m}
                className={cn(
                  "h-8 shrink-0 rounded-full border px-3.5 text-[13px] font-medium transition-colors",
                  muscle === m ? "border-forest bg-forest text-white" : "bg-card text-muted-foreground hover:border-border-strong hover:text-foreground",
                )}
              >
                {m === "all" ? t("Tutti ({n})", { n: exercises.length }) : t(MUSCLE_LABELS[m])}
              </button>
            ))}
          </div>
        </div>

        {visible.length === 0 ? (
          <Panel className="mt-4">
            <EmptyState
              emoji="magnifying-glass-tilted-left"
              title={t("Nessun esercizio trovato")}
              description={t("Modifica i filtri oppure crea un esercizio personalizzato.")}
              action={
                <>
                  <Button variant="outline" onClick={reset}>
                    
                    {t("Azzera filtri")}
                  </Button>
                  <Button onClick={() => setForm({ open: true, exercise: null })}>
                    <Plus /> {t("Nuovo esercizio")}
                  </Button>
                </>
              }
            />
          </Panel>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-3 2xl:grid-cols-4">
            {visible.map((e) => (
              <button
                key={e.id}
                onClick={() => setDetailId(e.id)}
                className="group flex flex-col overflow-hidden rounded-3xl border bg-card text-left shadow-card outline-none transition-[transform,box-shadow,border-color] duration-200 ease-[var(--ease-soft)] hover:-translate-y-0.5 hover:border-border-strong hover:shadow-raised focus-visible:ring-[3px] focus-visible:ring-ring/30"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                  <Thumb src={e.imageUrls[0]} alt={e.name} className="absolute inset-0 size-full rounded-none transition-transform duration-500 group-hover:scale-[1.04]" sizes="(min-width: 1536px) 22vw, (min-width: 1024px) 30vw, 50vw" />
                  {e.isCustom && (
                    <Badge variant="forest" size="sm" className="absolute top-3 left-3">
                      
                      {t("Personalizzato")}
                    </Badge>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-2 p-3.5 md:p-4">
                  <h3 className="line-clamp-2 text-[14.5px] leading-snug font-semibold md:text-[15px]">{e.name}</h3>
                  <div className="flex flex-wrap gap-1">
                    {e.primaryMuscles.slice(0, 2).map((m) => (
                      <Badge key={m} variant="success" size="sm">
                        {t(MUSCLE_LABELS[m])}
                      </Badge>
                    ))}
                  </div>
                  <div className="mt-auto flex items-center justify-between gap-2 pt-1 text-[12px] text-muted-foreground">
                    <span className="truncate">{t(EQUIPMENT_LABELS[e.equipment])}</span>
                    <Badge variant={difficultyVariant[e.difficulty]} size="sm" className="max-sm:hidden">
                      {t(DIFFICULTY_LABELS[e.difficulty])}
                    </Badge>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </PageContainer>

      <Sheet open={detail !== null} onOpenChange={(o) => !o && setDetailId(null)}>
        <SheetContent>
          {detail && (
            <>
              <SheetHeader>
                <SheetTitle>{detail.name}</SheetTitle>
                <SheetDescription>
                  {t(EQUIPMENT_LABELS[detail.equipment])} · {t(DIFFICULTY_LABELS[detail.difficulty])}
                  {detail.isCustom ? t(" · Personalizzato") : ""}
                </SheetDescription>
              </SheetHeader>
              <SheetBody className="flex flex-col gap-5">
                {detail.imageUrls.length > 0 && (
                  <div className={cn("grid gap-2", detail.imageUrls.length > 1 && "grid-cols-2")}>
                    {detail.imageUrls.map((src, i) => (
                      <figure key={src} className="flex flex-col gap-1">
                        <Thumb src={src} alt={`${detail.name} — ${i === 0 ? "inizio" : "fine"}`} className="aspect-[4/3] w-full rounded-2xl" sizes="260px" />
                        {detail.imageUrls.length > 1 && <figcaption className="text-center text-[12px] text-muted-foreground">{i === 0 ? t("Posizione iniziale") : t("Posizione finale")}</figcaption>}
                      </figure>
                    ))}
                  </div>
                )}
                <div>
                  <h3 className="mb-2 text-[13px] font-semibold">{t("Muscoli")}</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {detail.primaryMuscles.map((m) => (
                      <Badge key={m} variant="success">
                        {t(MUSCLE_LABELS[m])}
                      </Badge>
                    ))}
                    {detail.secondaryMuscles.map((m) => (
                      <Badge key={m} variant="outline">
                        {t(MUSCLE_LABELS[m])}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="mb-2 text-[13px] font-semibold">{t("Esecuzione")}</h3>
                  {detail.instructions.length ? (
                    <ol className="flex flex-col gap-2.5">
                      {detail.instructions.map((step, i) => (
                        <li key={i} className="flex gap-3 text-[14px] leading-relaxed">
                          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-pale text-[12px] font-semibold text-forest">{i + 1}</span>
                          {step}
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="text-[13.5px] text-muted-foreground">{t("Nessuna istruzione inserita.")}</p>
                  )}
                </div>
              </SheetBody>
              <SheetFooter className="justify-between">
                <Button variant="destructive-ghost" onClick={() => remove(detail)}>
                  <Trash2 /> {t("Elimina")}
                </Button>
                <Button
                  onClick={() => {
                    setForm({ open: true, exercise: detail });
                    setDetailId(null);
                  }}
                >
                  <Pencil /> {t("Modifica")}
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      <ExerciseFormSheet open={form.open} exercise={form.exercise} onOpenChange={(open) => setForm((f) => ({ ...f, open }))} onSaved={(e) => setDetailId(e.id)} />
    </>
  );
}
