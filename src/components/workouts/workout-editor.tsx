"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { CalendarDays, ChevronDown, Copy, FileDown, MoreHorizontal, Plus, Save, Send, Share, Trash2, Undo2, CheckCircle2 } from "lucide-react";
import type { ClientOption, Exercise, WorkoutPlan } from "@/lib/domain/types";
import { GOALS, GOAL_LABELS, WEEKDAY_LABELS, WEEKDAY_SHORT, WORKOUT_CATEGORIES, WORKOUT_CATEGORY_LABELS } from "@/lib/domain/constants";
import { estimateDayMinutes, supersetInfo } from "@/lib/domain/workout";
import { deleteWorkoutPlanAction, duplicateWorkoutPlanAction, saveWorkoutPlanAction } from "@/lib/actions/workouts";
import { uuid } from "@/lib/id";
import { cn } from "@/lib/utils";
import { Topbar, PageContainer } from "@/components/shell/topbar";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger, Select } from "@/components/ui/menus";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/overlays";
import { ClientPicker } from "@/components/common/client-picker";
import { EmptyState, PlanStatusBadge } from "@/components/common/basics";
import { useConfirm } from "@/components/common/confirm";
import { downloadFile, safeFilename, useUnsavedChangesGuard } from "@/components/editor/shared";
import { ExerciseCard } from "./exercise-card";
import { ExerciseLibraryPanel } from "./exercise-library-panel";
import { WorkoutSummary, WorkoutSummaryStrip } from "./workout-summary";
import { toWorkoutInput, useWorkoutEditor, type Defaults } from "./use-workout-editor";
import { useI18n } from "@/lib/i18n/client";
import { msg } from "@/lib/i18n/core";

interface Props {
  initialPlan: WorkoutPlan;
  isNew: boolean;
  exercises: Exercise[];
  clients: ClientOption[];
  defaults: Defaults;
}

type Busy = null | "draft" | "published" | "export" | "other";

export function WorkoutEditor({ initialPlan, isNew, exercises, clients, defaults }: Props) {
  const { t } = useI18n();
  const router = useRouter();
  const confirm = useConfirm();
  const { state, dispatch, dirty, day } = useWorkoutEditor(initialPlan, isNew);
  const { plan, activeDay } = state;
  const byId = React.useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);
  const [busy, setBusy] = React.useState<Busy>(null);
  const [library, setLibrary] = React.useState<{ open: boolean; replace: string | null }>({ open: false, replace: null });
  const [highlight, setHighlight] = React.useState<string | null>(null);
  const [errors, setErrors] = React.useState<{ name?: string; client?: string }>({});
  const [dayEditorOpen, setDayEditorOpen] = React.useState(false);
  const nameRef = React.useRef<HTMLInputElement>(null);
  const searchRef = React.useRef<HTMLDivElement>(null);
  const { dialog } = useUnsavedChangesGuard(dirty);

  const client = clients.find((c) => c.id === plan.clientId) ?? null;
  const clientName = client ? `${client.firstName} ${client.lastName}` : null;
  const items = React.useMemo(() => day?.exercises ?? [], [day]);
  const supersets = React.useMemo(() => supersetInfo(items), [items]);
  const usedIds = React.useMemo(() => new Set(items.map((e) => e.exerciseId)), [items]);

  React.useEffect(() => {
    if (!highlight) return;
    document.querySelector(`[data-exercise-id="${highlight}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    const t = window.setTimeout(() => setHighlight(null), 1400);
    return () => window.clearTimeout(t);
  }, [highlight]);

  /* --------------------------------- persistence -------------------------------- */
  const persist = async (status: "draft" | "published", opts: { silent?: boolean; busy?: Busy } = {}) => {
    if (!plan.name.trim()) {
      setErrors({ name: msg("Dai un nome alla scheda") });
      nameRef.current?.focus();
      toast.error(t("Dai un nome alla scheda"));
      return null;
    }
    setBusy(opts.busy ?? status);
    const res = await saveWorkoutPlanAction(toWorkoutInput(plan, status));
    setBusy(null);
    if (!res.ok) {
      setErrors({ client: res.fieldErrors?.clientId });
      toast.error(res.error);
      return null;
    }
    setErrors({});
    dispatch({ type: "saved", plan: res.data });
    if (!opts.silent) {
      toast.success(status === "published" ? (initialPlan.status === "published" || plan.status === "published" ? t("Scheda aggiornata e pubblicata") : t("Scheda pubblicata")) : plan.status === "published" ? t("Scheda riportata in bozza") : t("Bozza salvata"));
    }
    if (isNew) router.replace(`/workouts/${res.data.id}`, { scroll: false });
    return res.data;
  };

  const exportPdf = async () => {
    if (isNew || dirty) {
      const saved = await persist(plan.status === "published" ? "published" : "draft", { silent: true, busy: "export" });
      if (!saved) return;
    }
    setBusy("export");
    try {
      await downloadFile(`/api/pdf/workout/${plan.id}`, safeFilename(t("Scheda"), clientName, plan.name));
      toast.success(t("PDF esportato"), { description: dirty || isNew ? t("Le modifiche sono state salvate prima dell'esportazione.") : undefined });
    } catch {
      toast.error(t("Esportazione PDF non riuscita"));
    } finally {
      setBusy(null);
    }
  };

  const duplicatePlan = async () => {
    if (dirty && !(await persist(plan.status === "published" ? "published" : "draft", { silent: true, busy: "other" }))) return;
    setBusy("other");
    const res = await duplicateWorkoutPlanAction(plan.id);
    setBusy(null);
    if (!res.ok) return void toast.error(res.error);
    toast.success(t("Scheda duplicata"));
    router.push(`/workouts/${res.data.id}`);
  };

  const deletePlan = async () => {
    if (!(await confirm({ title: t("Eliminare “{name}”?", { name: plan.name }), description: t("La scheda verrà eliminata definitivamente."), confirmLabel: t("Elimina scheda"), destructive: true }))) return;
    const res = await deleteWorkoutPlanAction(plan.id);
    if (!res.ok) return void toast.error(res.error);
    dispatch({ type: "saved", plan });
    toast.success(t("Scheda eliminata"));
    router.push("/workouts");
  };

  /* ---------------------------------- exercises --------------------------------- */
  const pickExercise = (e: Exercise) => {
    if (library.replace) {
      dispatch({ type: "update-exercise", id: library.replace, patch: { exerciseId: e.id } });
      setHighlight(library.replace);
      setLibrary({ open: false, replace: null });
      toast.success(t("Sostituito con {name}", { name: e.name }));
      return;
    }
    const newId = uuid();
    dispatch({ type: "add-exercise", exerciseId: e.id, defaults, newId });
    setHighlight(newId);
  };

  const removeExercise = (id: string) => {
    const index = items.findIndex((e) => e.id === id);
    const removed = items[index];
    if (!removed) return;
    dispatch({ type: "remove-exercise", id });
    toast(t("{name} rimosso", { name: byId.get(removed.exerciseId)?.name ?? t("Esercizio") }), {
      action: { label: t("Annulla"), onClick: () => dispatch({ type: "restore-exercise", exercise: removed, index, weekday: activeDay }) },
    });
  };

  const openAdd = () => {
    if (window.matchMedia("(min-width: 1280px)").matches && searchRef.current) {
      const input = searchRef.current.querySelector("input");
      input?.focus();
      searchRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } else setLibrary({ open: true, replace: null });
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const nameOf = (id: UniqueIdentifier) => byId.get(items.find((e) => e.id === id)?.exerciseId ?? "")?.name ?? t("Esercizio");
  const posOf = (id: UniqueIdentifier) => items.findIndex((e) => e.id === id) + 1;
  const announcements: Announcements = {
    onDragStart: ({ active }) => t("Hai preso {name}, posizione {pos} di {total}.", { name: nameOf(active.id), pos: posOf(active.id), total: items.length }),
    onDragOver: ({ active, over }) => (over ? t("{name} sopra la posizione {pos}.", { name: nameOf(active.id), pos: posOf(over.id) }) : t("{name} fuori dall'elenco.", { name: nameOf(active.id) })),
    onDragEnd: ({ active, over }) => (over ? t("{name} spostato in posizione {pos}.", { name: nameOf(active.id), pos: posOf(over.id) }) : t("{name} rilasciato.", { name: nameOf(active.id) })),
    onDragCancel: ({ active }) => t("Spostamento annullato: {name} è tornato al suo posto.", { name: nameOf(active.id) }),
  };
  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    dispatch({ type: "move-exercise", from: posOf(active.id) - 1, to: posOf(over.id) - 1 });
  };

  /* ----------------------------------- actions ---------------------------------- */
  const published = plan.status === "published";
  const moreMenu = (
    <DropdownMenuContent className="w-56">
      <DropdownMenuItem onSelect={duplicatePlan} disabled={isNew}>
        <Copy /> {t("Duplica scheda")}
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={exportPdf}>
        <FileDown /> {t("Esporta PDF")}
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem destructive onSelect={deletePlan} disabled={isNew}>
        <Trash2 /> {t("Elimina scheda")}
      </DropdownMenuItem>
    </DropdownMenuContent>
  );

  const desktopActions = (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={t("Altre azioni")}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        {moreMenu}
      </DropdownMenu>
      <Button variant="outline" onClick={() => persist("draft")} loading={busy === "draft"} disabled={busy !== null || (!dirty && !isNew && !published)}>
        {published ? <Undo2 /> : <Save />}
        <span className="max-xl:hidden">{published ? t("Riporta in bozza") : t("Salva bozza")}</span>
      </Button>
      <Button variant="outline" onClick={exportPdf} loading={busy === "export"} disabled={busy !== null} className="max-lg:hidden">
        <FileDown /> <span className="max-xl:hidden">{t("Esporta PDF")}</span>
      </Button>
      <Button
        variant={published && !dirty ? "forest" : "default"}
        onClick={() => persist("published")}
        loading={busy === "published"}
        disabled={busy !== null || (published && !dirty)}
        className={cn(published && !dirty && "disabled:opacity-100")}
      >
        {published && !dirty ? <CheckCircle2 /> : <Send />} {published ? (dirty ? t("Aggiorna scheda") : t("Pubblicata")) : t("Pubblica scheda")}
      </Button>
    </>
  );

  return (
    <>
      <Topbar
        title={t("Scheda di Allenamento")}
        breadcrumbs={[{ label: t("Schede di allenamento"), href: "/workouts" }, { label: isNew ? t("Nuova scheda") : plan.name }]}
        backHref="/workouts"
        compactSearch
        actions={desktopActions}
        mobileActions={
          <Button size="sm" onClick={exportPdf} loading={busy === "export"} className="h-9 rounded-xl px-3.5">
            <Share /> {t("Esporta")}
          </Button>
        }
      />
      <PageContainer className="pb-36 md:pb-12">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="flex min-w-0 flex-col gap-4">
            <div className="grid gap-3 md:grid-cols-2">
              <ClientPicker
                clients={clients}
                value={plan.clientId}
                invalid={Boolean(errors.client)}
                onChange={(id) => {
                  dispatch({ type: "meta", patch: { clientId: id } });
                  setErrors((e) => ({ ...e, client: undefined }));
                }}
              />
              <label className={cn("flex flex-col justify-center rounded-2xl border bg-card px-4 py-2.5 shadow-card focus-within:border-primary/40 focus-within:ring-[3px] focus-within:ring-ring/15", errors.name && "border-destructive/60")}>
                <span className="text-[12.5px] font-medium text-muted-foreground">{t("Nome scheda")}</span>
                <input
                  ref={nameRef}
                  value={plan.name}
                  maxLength={100}
                  onChange={(e) => {
                    dispatch({ type: "meta", patch: { name: e.target.value } });
                    if (errors.name) setErrors((x) => ({ ...x, name: undefined }));
                  }}
                  placeholder={t("Es. Forza & tonificazione")}
                  aria-invalid={Boolean(errors.name)}
                  className="h-7 w-full bg-transparent text-[16px] font-semibold outline-none placeholder:font-medium placeholder:text-muted-foreground/70"
                />
              </label>
            </div>
            {errors.client && <p className="-mt-2 text-[12.5px] font-medium text-destructive">{errors.client}</p>}

            {/* Day selection — desktop pills, mobile mirrors the iPhone reference */}
            <div className="flex items-center gap-2 max-md:hidden">
              <div role="tablist" aria-label={t("Giorno della settimana")} className="grid flex-1 grid-cols-7 gap-1 rounded-2xl bg-muted p-1">
                {WEEKDAY_SHORT.map((x) => t(x)).map((label, weekday) => {
                  const d = plan.days.find((x) => x.weekday === weekday);
                  const active = weekday === activeDay;
                  return (
                    <button
                      key={label}
                      role="tab"
                      aria-selected={active}
                      onClick={() => dispatch({ type: "select-day", weekday })}
                      className={cn(
                        "flex flex-col items-center justify-center rounded-xl py-1.5 transition-[background-color,color,box-shadow] duration-150",
                        active ? "bg-forest text-white shadow-[0_2px_6px_rgb(18_62_48/0.25)]" : "hover:bg-card",
                      )}
                    >
                      <span className={cn("text-[13.5px] font-semibold", !active && !d && "text-muted-foreground")}>{label}</span>
                      <span className={cn("text-[11px]", active ? "text-white/75" : d ? "text-primary" : "text-muted-foreground/60")}>
                        {d ? t("{n} es.", { n: d.exercises.length }) : t("riposo")}
                      </span>
                    </button>
                  );
                })}
              </div>
              <DayMenu plan={plan} activeDay={activeDay} dispatch={dispatch} hasDay={Boolean(day)} />
            </div>

            <div className="grid grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] gap-2.5 md:hidden">
              <div className="flex flex-col gap-1">
                <span className="px-1 text-[12.5px] font-medium text-muted-foreground">{t("Giorno")}</span>
                <Select
                  aria-label={t("Giorno")}
                  value={String(activeDay)}
                  onValueChange={(v) => dispatch({ type: "select-day", weekday: Number(v) })}
                  icon={<CalendarDays className="size-4 text-forest" />}
                  className="h-[52px] rounded-2xl border-border bg-card text-[15px] font-semibold shadow-card"
                  options={WEEKDAY_LABELS.map((x) => t(x)).map((l, i) => ({ value: String(i), label: plan.days.some((d) => d.weekday === i) ? `${l} ●` : l }))}
                />
              </div>
              <div className="flex min-w-0 flex-col gap-1">
                <span className="px-1 text-[12.5px] font-medium text-muted-foreground">{t("Note (opzionale)")}</span>
                <button
                  onClick={() => (day ? setDayEditorOpen(true) : dispatch({ type: "add-day", weekday: activeDay }))}
                  className="flex h-[52px] min-w-0 items-center gap-2.5 rounded-2xl border bg-card px-3 text-left shadow-card"
                >
                  <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-pale text-forest">
                    <ChevronDown className="size-4" />
                  </span>
                  <span className="min-w-0 leading-tight">
                    <span className="block truncate text-[13.5px] font-medium">{day ? day.title || t("Aggiungi titolo") : t("Crea allenamento")}</span>
                    {day?.notes && <span className="block truncate text-[12.5px] text-muted-foreground">{day.notes}</span>}
                  </span>
                </button>
              </div>
            </div>

            {day && (
              <div className="grid gap-3 rounded-3xl border bg-card p-4 shadow-card max-md:hidden md:grid-cols-2 xl:grid-cols-4">
                <DayFields plan={plan} activeDay={activeDay} dispatch={dispatch} />
              </div>
            )}

            <WorkoutSummaryStrip day={day} byId={byId} />

            <div className="flex items-end justify-between gap-3 pt-1">
              <div>
                <h2 className="text-[18px] font-semibold tracking-tight">{t("Esercizi")}</h2>
                <p className="text-[12.5px] text-muted-foreground">
                  {t(WEEKDAY_LABELS[activeDay])}
                  {day?.title ? ` · ${day.title}` : ""} {t("· trascina per riordinare")}
                </p>
              </div>
              {day && items.length > 0 && (
                <Button variant="secondary" size="sm" onClick={openAdd} className="max-md:hidden">
                  <Plus /> {t("Aggiungi")}
                </Button>
              )}
            </div>

            {!day ? (
              <div className="rounded-3xl border border-dashed bg-card/60">
                <EmptyState
                  emoji="person-lifting-weights"
                  title={t("Nessun allenamento {value}", { value: t(WEEKDAY_LABELS[activeDay]).toLowerCase() })}
                  description={t("Crea un allenamento per questo giorno oppure copialo da un altro giorno della scheda.")}
                  action={
                    <>
                      <Button onClick={() => dispatch({ type: "add-day", weekday: activeDay })}>
                        <Plus /> {t("Crea allenamento")}
                      </Button>
                      {plan.days.length > 0 && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline">
                              <Copy /> {t("Copia da…")}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="center">
                            {plan.days.map((d) => (
                              <DropdownMenuItem key={d.id} onSelect={() => dispatch({ type: "copy-day", from: d.weekday, to: activeDay })}>
                                {t(WEEKDAY_LABELS[d.weekday])} {d.title ? `· ${d.title}` : ""}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </>
                  }
                />
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-3xl border border-dashed bg-card/60">
                <EmptyState emoji="person-lifting-weights" title={t("Nessun esercizio")} description={t("Cerca nella libreria e aggiungi gli esercizi: potrai modificarli direttamente qui.")} compact />
              </div>
            ) : (
              <DndContext
                id="workout-exercises"
                sensors={sensors}
                collisionDetection={closestCenter}
                modifiers={[restrictToVerticalAxis]}
                onDragEnd={onDragEnd}
                accessibility={{
                  announcements,
                  screenReaderInstructions: {
                    draggable: t("Per spostare un esercizio premi spazio o invio, usa le frecce su e giù e premi di nuovo spazio o invio per rilasciarlo. Esc annulla."),
                  },
                }}
              >
                <SortableContext items={items.map((e) => e.id)} strategy={verticalListSortingStrategy}>
                  <div className="flex flex-col gap-3">
                    {items.map((item, index) => (
                      <ExerciseCard
                        key={item.id}
                        item={item}
                        exercise={byId.get(item.exerciseId)}
                        index={index}
                        total={items.length}
                        superset={supersets.get(item.id)}
                        highlighted={highlight === item.id}
                        onChange={(patch) => dispatch({ type: "update-exercise", id: item.id, patch })}
                        onRemove={() => removeExercise(item.id)}
                        onDuplicate={() => dispatch({ type: "duplicate-exercise", id: item.id })}
                        onMove={(to) => {
                          dispatch({ type: "move-exercise", from: index, to });
                          setHighlight(item.id);
                        }}
                        onLinkNext={() => dispatch({ type: "link-next", id: item.id })}
                        onUnlink={() => dispatch({ type: "unlink", id: item.id })}
                        onReplace={() => setLibrary({ open: true, replace: item.id })}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}

            {day && (
              <button
                onClick={openAdd}
                className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-primary text-[15px] font-semibold text-primary-foreground shadow-[0_1px_2px_rgb(18_62_48/0.18)] transition-colors hover:bg-primary-hover max-md:hidden"
              >
                <Plus className="size-5" /> {t("Aggiungi esercizio")}
              </button>
            )}

            <Field label={t("Note generali della scheda")} htmlFor="plan-notes" optional className="pt-2">
              <Textarea
                id="plan-notes"
                rows={2}
                maxLength={1000}
                value={plan.notes ?? ""}
                onChange={(e) => dispatch({ type: "meta", patch: { notes: e.target.value || null } })}
                placeholder={t("Indicazioni valide per tutta la settimana (riscaldamento, progressione, recupero…)")}
              />
            </Field>
          </div>

          <aside className="scrollbar-none sticky top-[80px] flex max-h-[calc(100dvh-96px)] flex-col gap-4 self-start overflow-y-auto max-xl:hidden">
            <WorkoutSummary
              plan={plan}
              day={day}
              activeDay={activeDay}
              byId={byId}
              dirty={dirty}
              isNew={isNew}
              onSelectDay={(weekday) => dispatch({ type: "select-day", weekday })}
              className="shrink-0"
            />
            <div ref={searchRef} className="flex min-h-[340px] flex-1 flex-col overflow-hidden rounded-3xl border bg-card shadow-card">
              <ExerciseLibraryPanel exercises={exercises} onPick={pickExercise} usedIds={usedIds} className="flex-1" />
            </div>
          </aside>
        </div>
      </PageContainer>

      {/* Mobile bottom bar (reference: "Aggiungi esercizio") */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)] backdrop-blur-xl md:hidden">
        <div className="flex items-center gap-2">
          <Button variant="secondary" className="h-12 flex-1 rounded-2xl text-[15px]" onClick={() => setLibrary({ open: true, replace: null })}>
            <Plus className="size-5" /> {t("Aggiungi esercizio")}
          </Button>
          <Button variant="outline" size="icon" className="size-12 rounded-2xl" onClick={() => persist(published ? "published" : "draft")} loading={busy === "draft"} aria-label={t("Salva")}>
            {busy !== "draft" && <Save className="size-5" />}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="size-12 rounded-2xl" aria-label={t("Altre azioni")}>
                <MoreHorizontal className="size-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" className="w-60">
              <DropdownMenuLabel>
                <PlanStatusBadge status={plan.status} kind="workout" size="sm" />
              </DropdownMenuLabel>
              {!published || dirty ? (
                <DropdownMenuItem onSelect={() => persist("published")}>
                  <Send /> {published ? t("Aggiorna scheda") : t("Pubblica scheda")}
                </DropdownMenuItem>
              ) : null}
              {published && (
                <DropdownMenuItem onSelect={() => persist("draft")}>
                  <Undo2 /> {t("Riporta in bozza")}
                </DropdownMenuItem>
              )}
              {day && (
                <DropdownMenuItem onSelect={() => setDayEditorOpen(true)}>
                  <CalendarDays /> {t("Dettagli del giorno")}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onSelect={duplicatePlan} disabled={isNew}>
                <Copy /> {t("Duplica scheda")}
              </DropdownMenuItem>
              <DropdownMenuItem destructive onSelect={deletePlan} disabled={isNew}>
                <Trash2 /> {t("Elimina scheda")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Sheet open={library.open} onOpenChange={(open) => setLibrary((l) => ({ open, replace: open ? l.replace : null }))}>
        <SheetContent side="bottom" className="h-[86dvh] md:inset-x-auto md:top-2 md:right-2 md:bottom-2 md:h-auto md:w-[460px] md:rounded-3xl">
          <SheetTitle className="sr-only">{library.replace ? t("Sostituisci esercizio") : t("Aggiungi esercizio")}</SheetTitle>
          <ExerciseLibraryPanel
            exercises={exercises}
            onPick={pickExercise}
            usedIds={usedIds}
            title={library.replace ? t("Sostituisci esercizio") : t("Aggiungi a {value}", { value: t(WEEKDAY_LABELS[activeDay]).toLowerCase() })}
            replaceMode={Boolean(library.replace)}
            className="min-h-0 flex-1"
          />
          <div className="border-t p-3">
            <Button className="w-full" variant="outline" onClick={() => setLibrary({ open: false, replace: null })}>
              
              {t("Fatto")}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={dayEditorOpen && Boolean(day)} onOpenChange={setDayEditorOpen}>
        <SheetContent side="bottom">
          <SheetHeader className="pt-3">
            <SheetTitle>{t(WEEKDAY_LABELS[activeDay])}</SheetTitle>
            <SheetDescription>{t("Titolo, categoria, obiettivo e note dell'allenamento.")}</SheetDescription>
          </SheetHeader>
          <SheetBody className="grid gap-4">
            <DayFields plan={plan} activeDay={activeDay} dispatch={dispatch} />
          </SheetBody>
          <SheetFooter className="justify-between">
            <DayMenu plan={plan} activeDay={activeDay} dispatch={dispatch} hasDay={Boolean(day)} />
            <Button onClick={() => setDayEditorOpen(false)}>{t("Fatto")}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {dialog}
    </>
  );
}

type Dispatch = ReturnType<typeof useWorkoutEditor>["dispatch"];

function DayFields({ plan, activeDay, dispatch }: { plan: WorkoutPlan; activeDay: number; dispatch: Dispatch }) {
  const { t } = useI18n();
  const day = plan.days.find((d) => d.weekday === activeDay)!;
  const estimate = estimateDayMinutes(day.exercises);
  const [duration, setDuration] = React.useState(day.durationMinutes ? String(day.durationMinutes) : "");
  // Keep the input in sync when another day is selected or the stored value changes.
  const syncKey = `${day.id}:${day.durationMinutes ?? ""}`;
  const [prevSyncKey, setPrevSyncKey] = React.useState(syncKey);
  if (prevSyncKey !== syncKey) {
    setPrevSyncKey(syncKey);
    setDuration(day.durationMinutes ? String(day.durationMinutes) : "");
  }

  return (
    <>
      <Field label={t("Titolo allenamento")} htmlFor={`title-${day.id}`}>
        <Input id={`title-${day.id}`} value={day.title ?? ""} maxLength={80} placeholder={t("Es. Gambe e glutei")} onChange={(e) => dispatch({ type: "update-day", patch: { title: e.target.value || null } })} />
      </Field>
      <Field label={t("Categoria")}>
        <Select
          aria-label={t("Categoria")}
          value={day.category ?? "none"}
          onValueChange={(v) => dispatch({ type: "update-day", patch: { category: v === "none" ? null : (v as (typeof WORKOUT_CATEGORIES)[number]) } })}
          options={[{ value: "none", label: t("Nessuna") }, ...WORKOUT_CATEGORIES.map((c) => ({ value: c, label: t(WORKOUT_CATEGORY_LABELS[c]) }))]}
        />
      </Field>
      <Field label={t("Obiettivo")}>
        <Select
          aria-label={t("Obiettivo")}
          value={day.goal ?? "none"}
          onValueChange={(v) => dispatch({ type: "update-day", patch: { goal: v === "none" ? null : (v as (typeof GOALS)[number]) } })}
          options={[{ value: "none", label: t("Nessuno") }, ...GOALS.map((g) => ({ value: g, label: t(GOAL_LABELS[g]) }))]}
        />
      </Field>
      <Field label={t("Durata stimata")} htmlFor={`dur-${day.id}`} hint={day.durationMinutes ? undefined : estimate ? t("Calcolata: ≈ {estimate} min", { estimate }) : undefined}>
        <div className="relative">
          <Input
            id={`dur-${day.id}`}
            inputMode="numeric"
            value={duration}
            placeholder={estimate ? `≈ ${estimate}` : t("Automatica")}
            onChange={(e) => setDuration(e.target.value.replace(/[^\d]/g, "").slice(0, 3))}
            onBlur={() => {
              const n = duration ? Number(duration) : null;
              if (n === null) return dispatch({ type: "update-day", patch: { durationMinutes: null } });
              if (n < 5 || n > 300) {
                toast.error(t("Durata tra 5 e 300 minuti"));
                return setDuration(day.durationMinutes ? String(day.durationMinutes) : "");
              }
              dispatch({ type: "update-day", patch: { durationMinutes: n } });
            }}
            className="pr-12"
          />
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[13px] text-muted-foreground">min</span>
        </div>
      </Field>
      <Field label={t("Note")} htmlFor={`notes-${day.id}`} optional className="md:col-span-2 xl:col-span-4">
        <Textarea
          id={`notes-${day.id}`}
          rows={2}
          maxLength={1000}
          value={day.notes ?? ""}
          placeholder={t("Es. Focus forza, riscaldamento specifico 10′")}
          onChange={(e) => dispatch({ type: "update-day", patch: { notes: e.target.value || null } })}
        />
      </Field>
    </>
  );
}

function DayMenu({ plan, activeDay, dispatch, hasDay }: { plan: WorkoutPlan; activeDay: number; dispatch: Dispatch; hasDay: boolean }) {
  const { t } = useI18n();
  const confirm = useConfirm();
  if (!hasDay) return <span />;
  const day = plan.days.find((d) => d.weekday === activeDay)!;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" aria-label={t("Opzioni per {day}", { day: t(WEEKDAY_LABELS[activeDay]) })}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-60">
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Copy /> {t("Copia allenamento su…")}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {WEEKDAY_LABELS.map((x) => t(x)).map((label, i) =>
              i === activeDay ? null : (
                <DropdownMenuItem
                  key={label}
                  onSelect={async () => {
                    const exists = plan.days.some((d) => d.weekday === i);
                    if (exists && !(await confirm({ title: t("Sostituire {label}?", { label }), description: t("L'allenamento di {label} verrà sostituito con una copia di {value}.", { label: label.toLowerCase(), value: t(WEEKDAY_LABELS[activeDay]).toLowerCase() }), confirmLabel: t("Sostituisci") })))
                      return;
                    dispatch({ type: "copy-day", from: activeDay, to: i });
                    toast.success(t("Copiato su {label}", { label: label.toLowerCase() }));
                  }}
                >
                  {label}
                  {plan.days.some((d) => d.weekday === i) && <span className="ml-auto text-[11.5px] text-muted-foreground">sostituisci</span>}
                </DropdownMenuItem>
              ),
            )}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          destructive
          onSelect={async () => {
            if (day.exercises.length && !(await confirm({ title: t("Rimuovere l'allenamento di {value}?", { value: t(WEEKDAY_LABELS[activeDay]).toLowerCase() }), description: t("{n} esercizi verranno rimossi da questa scheda.", { n: day.exercises.length }), confirmLabel: t("Rimuovi"), destructive: true })))
              return;
            dispatch({ type: "remove-day", weekday: activeDay });
          }}
        >
          <Trash2 /> {t("Rimuovi giorno")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
