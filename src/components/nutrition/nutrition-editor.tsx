"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Apple, CircleAlert, Coffee, Copy, CopyPlus, Eraser, FileDown, Leaf, MoreHorizontal, Moon, Plus, Save, Send, Settings2, Share, Soup, Trash2, Undo2, UtensilsCrossed, CheckCircle2, ChevronDown, ImageDown } from "lucide-react";
import type { ClientOption, Food, MealEntry, NutritionPlan, NutritionTargets } from "@/lib/domain/types";
import { MEAL_SLOTS, MEAL_SLOT_LABELS, WEEKDAY_LABELS, WEEKDAY_SHORT, type MealSlot } from "@/lib/domain/constants";
import { cellEntries, daySummary } from "@/lib/domain/nutrition";
import { deleteNutritionPlanAction, duplicateNutritionPlanAction, saveNutritionPlanAction } from "@/lib/actions/nutrition";
import { uuid } from "@/lib/id";
import { cn, parseDecimal } from "@/lib/utils";
import { addDaysToKey, startOfWeekKey, todayKey } from "@/lib/datetime";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { Topbar, PageContainer } from "@/components/shell/topbar";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger, Sheet, SheetBody, SheetContent, SheetTitle } from "@/components/ui/overlays";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/components/ui/menus";
import { ClientPicker } from "@/components/common/client-picker";
import { PlanStatusBadge, Thumb } from "@/components/common/basics";
import { useConfirm } from "@/components/common/confirm";
import { ExportMenu, downloadFile, exportUrl, safeFilename, withExtension, type ExportFormat, useUnsavedChangesGuard } from "@/components/editor/shared";
import { MealEditor } from "./meal-editor";
import { DailySummary } from "./daily-summary";
import { toNutritionInput, useNutritionEditor } from "./use-nutrition-editor";
import { useI18n } from "@/lib/i18n/client";
import { msg } from "@/lib/i18n/core";

const SLOT_ICONS: Record<MealSlot, typeof Coffee> = {
  breakfast: Coffee,
  morning_snack: Apple,
  lunch: UtensilsCrossed,
  afternoon_snack: Leaf,
  dinner: Soup,
  pre_bed: Moon,
};

type Editing = { id: string; isNew: boolean; day: number; slot: MealSlot } | null;
type Busy = null | "draft" | "published" | "export" | "other";

interface Props {
  initialPlan: NutritionPlan;
  isNew: boolean;
  foods: Food[];
  clients: ClientOption[];
}

export function NutritionEditor({ initialPlan, isNew, foods, clients }: Props) {
  const { tn, fmt, t } = useI18n();
  const router = useRouter();
  const confirm = useConfirm();
  const { plan, dispatch, dirty } = useNutritionEditor(initialPlan, isNew);
  const [busy, setBusy] = React.useState<Busy>(null);
  const [editing, setEditing] = React.useState<Editing>(null);
  const [summaryDay, setSummaryDay] = React.useState<number | "avg">(0);
  const [errors, setErrors] = React.useState<{ name?: string; client?: string }>({});
  const isMobile = useMediaQuery("(max-width: 767px)", false);
  const { dialog } = useUnsavedChangesGuard(dirty);
  const client = clients.find((c) => c.id === plan.clientId) ?? null;
  const clientName = client ? `${client.firstName} ${client.lastName}` : null;
  const published = plan.status === "published";

  const blankEntry = (day: number, slot: MealSlot, id: string): MealEntry => ({
    id,
    day,
    slot,
    position: 0,
    foodId: null,
    name: "",
    imageUrl: null,
    amount: null,
    unit: null,
    kcal: null,
    protein: null,
    carbs: null,
    fat: null,
    nutritionSource: null,
    notes: null,
  });
  const editingEntry = editing ? (editing.isNew ? blankEntry(editing.day, editing.slot, editing.id) : plan.meals.find((m) => m.id === editing.id) ?? null) : null;

  /* --------------------------------- persistence -------------------------------- */
  const persist = async (status: "draft" | "published", opts: { silent?: boolean; busy?: Busy } = {}) => {
    if (!plan.name.trim()) {
      setErrors({ name: msg("Dai un nome al piano") });
      toast.error(t("Dai un nome al piano"));
      return null;
    }
    setBusy(opts.busy ?? status);
    const res = await saveNutritionPlanAction(toNutritionInput(plan, status));
    setBusy(null);
    if (!res.ok) {
      setErrors({ client: res.fieldErrors?.clientId });
      toast.error(res.error);
      return null;
    }
    setErrors({});
    dispatch({ type: "saved", plan: res.data });
    if (!opts.silent) toast.success(status === "published" ? (published ? t("Piano aggiornato e pubblicato") : t("Piano pubblicato")) : published ? t("Piano riportato in bozza") : t("Piano salvato come bozza"));
    if (isNew) router.replace(`/nutrition/${res.data.id}`, { scroll: false });
    return res.data;
  };

  const exportAs = async (format: ExportFormat) => {
    if (isNew || dirty) {
      const saved = await persist(published ? "published" : "draft", { silent: true, busy: "export" });
      if (!saved) return;
    }
    setBusy("export");
    try {
      // Send the plan as shown in the editor: the PDF never depends on reading it back from storage.
      await downloadFile(exportUrl("nutrition", plan.id, format), withExtension(safeFilename(t("Piano alimentare"), clientName, plan.name), format), {
        plan: toNutritionInput(plan, published ? "published" : "draft"),
        clientName,
      });
      toast.success(format === "pdf" ? t("PDF esportato") : t("Immagine esportata"));
    } catch {
      toast.error(format === "pdf" ? t("Esportazione PDF non riuscita") : t("Esportazione immagine non riuscita"));
    } finally {
      setBusy(null);
    }
  };

  const duplicatePlan = async () => {
    if (dirty && !(await persist(published ? "published" : "draft", { silent: true, busy: "other" }))) return;
    const res = await duplicateNutritionPlanAction(plan.id);
    if (!res.ok) return void toast.error(res.error);
    toast.success(t("Piano duplicato"));
    router.push(`/nutrition/${res.data.id}`);
  };

  const deletePlan = async () => {
    if (!(await confirm({ title: t("Eliminare “{name}”?", { name: plan.name }), description: t("Il piano verrà eliminato definitivamente."), confirmLabel: t("Elimina piano"), destructive: true }))) return;
    const res = await deleteNutritionPlanAction(plan.id);
    if (!res.ok) return void toast.error(res.error);
    dispatch({ type: "saved", plan });
    toast.success(t("Piano eliminato"));
    router.push("/nutrition");
  };

  /* ------------------------------------ meals ----------------------------------- */
  const removeMeal = (entry: MealEntry) => {
    dispatch({ type: "remove", id: entry.id });
    setEditing(null);
    toast(`${entry.name} rimosso`, { action: { label: t("Annulla"), onClick: () => dispatch({ type: "restore", entries: [entry] }) } });
  };

  const clearDay = async (day: number) => {
    const removed = plan.meals.filter((m) => m.day === day);
    if (!removed.length) return;
    if (!(await confirm({ title: t("Svuotare {value}?", { value: t(WEEKDAY_LABELS[day]).toLowerCase() }), description: t("{n} pasti verranno rimossi.", { n: removed.length }), confirmLabel: t("Svuota"), destructive: true }))) return;
    dispatch({ type: "clear-day", day });
    toast(t("{day} svuotato", { day: t(WEEKDAY_LABELS[day]) }), { action: { label: t("Annulla"), onClick: () => dispatch({ type: "restore", entries: removed }) } });
  };

  const copyDay = async (from: number, to: number[]) => {
    const overwrite = to.filter((d) => plan.meals.some((m) => m.day === d));
    if (overwrite.length && !(await confirm({ title: t("Sostituire i pasti esistenti?"), description: tn("{days} contiene già dei pasti che verranno sostituiti.", "{days} contengono già dei pasti che verranno sostituiti.", overwrite.length, { days: overwrite.map((d) => t(WEEKDAY_LABELS[d])).join(", ") }), confirmLabel: t("Sostituisci") })))
      return;
    dispatch({ type: "copy-day", from, to });
    toast.success(to.length === 1 ? t("{from} copiato su {to}", { from: t(WEEKDAY_LABELS[from]), to: t(WEEKDAY_LABELS[to[0]]).toLowerCase() }) : t("{from} copiato su {n} giorni", { from: t(WEEKDAY_LABELS[from]), n: to.length }));
  };

  const saveEntry = (entry: MealEntry) => {
    dispatch({ type: "upsert", entry });
    setEditing(null);
  };

  const editorFor = (entry: MealEntry, isNewEntry: boolean) => (
    <MealEditor
      key={entry.id}
      entry={entry}
      isNew={isNewEntry}
      foods={foods}
      onSave={saveEntry}
      onCancel={() => setEditing(null)}
      onDelete={isNewEntry ? undefined : () => removeMeal(entry)}
      extraActions={
        !isNewEntry && isMobile ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="subtle"
              size="sm"
              onClick={() => {
                dispatch({ type: "duplicate", id: entry.id });
                setEditing(null);
              }}
            >
              <CopyPlus /> {t("Duplica")}
            </Button>
            <Button
              type="button"
              variant="subtle"
              size="sm"
              onClick={() => {
                dispatch({ type: "copy-to-days", id: entry.id, days: [0, 1, 2, 3, 4, 5, 6] });
                setEditing(null);
                toast.success(t("Copiato su tutti gli altri giorni"));
              }}
            >
              <Copy /> {t("Copia su tutta la settimana")}
            </Button>
          </div>
        ) : null
      }
    />
  );

  /* ----------------------------------- actions ---------------------------------- */
  const desktopActions = (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={t("Altre azioni")}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuItem onSelect={duplicatePlan} disabled={isNew}>
            <Copy /> {t("Duplica piano")}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => exportAs("pdf")}>
            <FileDown /> {t("Esporta PDF")}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => exportAs("png")}>
            <ImageDown /> {t("Esporta PNG")}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => exportAs("jpg")}>
            <ImageDown /> {t("Esporta JPG")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem destructive onSelect={deletePlan} disabled={isNew}>
            <Trash2 /> {t("Elimina piano")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button variant="outline" onClick={() => persist("draft")} loading={busy === "draft"} disabled={busy !== null || (!dirty && !isNew && !published)}>
        {published ? <Undo2 /> : <Save />}
        <span className="max-xl:hidden">{published ? t("Riporta in bozza") : t("Salva bozza")}</span>
      </Button>
      <ExportMenu onExport={exportAs}>
        <Button variant="outline" loading={busy === "export"} disabled={busy !== null} className="max-lg:hidden">
          <FileDown /> <span className="max-xl:hidden">{t("Esporta")}</span> <ChevronDown className="max-xl:hidden" />
        </Button>
      </ExportMenu>
      <Button
        variant={published && !dirty ? "forest" : "default"}
        onClick={() => persist("published")}
        loading={busy === "published"}
        disabled={busy !== null || (published && !dirty)}
        className={cn(published && !dirty && "disabled:opacity-100")}
      >
        {published && !dirty ? <CheckCircle2 /> : <Send />} {published ? (dirty ? t("Aggiorna piano") : t("Pubblicato")) : t("Pubblica piano")}
      </Button>
    </>
  );

  const week = plan.weekStart;
  const mobileDay = typeof summaryDay === "number" ? summaryDay : 0;
  const dayDate = (d: number) => (week ? fmt.dayKey(addDaysToKey(week, d), { day: "numeric", month: "numeric" }) : null);

  return (
    <>
      <Topbar
        title={t("Piano Alimentare")}
        breadcrumbs={[{ label: t("Piani alimentari"), href: "/nutrition" }, { label: isNew ? t("Nuovo piano") : plan.name }]}
        backHref="/nutrition"
        compactSearch
        actions={desktopActions}
        mobileActions={
          <ExportMenu onExport={exportAs}>
            <Button size="sm" loading={busy === "export"} className="h-9 rounded-xl px-3 min-[420px]:px-3.5" aria-label={t("Esporta")}>
              <Share /> <span className="max-[419px]:sr-only">{t("Esporta")}</span>
            </Button>
          </ExportMenu>
        }
      />
      <PageContainer className="pb-36 md:pb-12">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)_auto]">
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
            <span className="text-[12.5px] font-medium text-muted-foreground">{t("Nome piano")}</span>
            <input
              value={plan.name}
              maxLength={100}
              onChange={(e) => {
                dispatch({ type: "meta", patch: { name: e.target.value } });
                if (errors.name) setErrors((x) => ({ ...x, name: undefined }));
              }}
              placeholder={t("Es. Piano ipocalorico")}
              aria-invalid={Boolean(errors.name)}
              className="h-7 w-full bg-transparent text-[16px] font-semibold outline-none placeholder:font-medium placeholder:text-muted-foreground/70"
            />
          </label>
          <label className="flex flex-col justify-center rounded-2xl border bg-card px-4 py-2.5 shadow-card focus-within:border-primary/40 focus-within:ring-[3px] focus-within:ring-ring/15 md:col-span-2 xl:col-span-1">
            <span className="text-[12.5px] font-medium text-muted-foreground">{t("Note (opzionale)")}</span>
            <input
              value={plan.notes ?? ""}
              maxLength={500}
              onChange={(e) => dispatch({ type: "meta", patch: { notes: e.target.value || null } })}
              placeholder={t("Es. Piano ipocalorico mantenimento")}
              className="h-7 w-full bg-transparent text-[14.5px] font-medium outline-none placeholder:text-muted-foreground/70"
            />
          </label>
          <PlanSettings targets={plan.targets} weekStart={plan.weekStart} onTargets={(t) => dispatch({ type: "targets", targets: t })} onWeekStart={(w) => dispatch({ type: "meta", patch: { weekStart: w } })} />
        </div>
        {errors.client && <p className="mt-2 text-[12.5px] font-medium text-destructive">{errors.client}</p>}

        <DailySummary meals={plan.meals} targets={plan.targets} selected={summaryDay} onSelect={setSummaryDay} className="mt-4 max-md:order-last max-md:hidden" />

        {/* Mobile: one day at a time (the weekly grid is too wide for a phone) */}
        <div className="mt-4 md:hidden">
          <div className="scrollbar-none -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1" role="tablist" aria-label={t("Giorni")}>
            {WEEKDAY_SHORT.map((x, d) => {
              const s = daySummary(plan.meals, d);
              const active = mobileDay === d;
              return (
                <button
                  key={x}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-label={t(WEEKDAY_LABELS[d])}
                  onClick={() => setSummaryDay(d)}
                  className={cn(
                    "flex min-w-[54px] shrink-0 flex-col items-center rounded-2xl border px-2.5 py-1.5 transition-colors",
                    active ? "border-primary bg-primary text-primary-foreground" : "bg-card",
                  )}
                >
                  <span className="text-[13px] font-semibold">{t(x)}</span>
                  <span className={cn("text-[10.5px] tabular", active ? "text-primary-foreground/80" : "text-muted-foreground")}>{s.entries ? fmt.number(s.kcal) : "—"}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <h2 className="text-[17px] font-bold tracking-tight">{t(WEEKDAY_LABELS[mobileDay])}</h2>
              <p className="text-[12.5px] text-muted-foreground tabular">
                {[dayDate(mobileDay), daySummary(plan.meals, mobileDay).entries ? `${fmt.number(daySummary(plan.meals, mobileDay).kcal)} kcal` : null, plan.targets.kcal ? t("obiettivo {kcal} kcal", { kcal: fmt.number(plan.targets.kcal) }) : null]
                  .filter(Boolean)
                  .join(" · ") || t("Nessun pasto")}
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon-sm" aria-label={t("Opzioni {day}", { day: t(WEEKDAY_LABELS[mobileDay]) })}>
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel>{t("Copia giornata su…")}</DropdownMenuLabel>
                {WEEKDAY_LABELS.map((x, i) =>
                  i === mobileDay ? null : (
                    <DropdownMenuItem key={x} disabled={!daySummary(plan.meals, mobileDay).entries} onSelect={() => copyDay(mobileDay, [i])}>
                      <Copy /> {t(x)}
                    </DropdownMenuItem>
                  ),
                )}
                <DropdownMenuItem disabled={!daySummary(plan.meals, mobileDay).entries} onSelect={() => copyDay(mobileDay, [0, 1, 2, 3, 4, 5, 6].filter((i) => i !== mobileDay))}>
                  <CopyPlus /> {t("Tutti gli altri giorni")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem destructive disabled={!daySummary(plan.meals, mobileDay).entries} onSelect={() => clearDay(mobileDay)}>
                  <Eraser /> {t("Svuota giornata")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="mt-3 flex flex-col gap-2.5">
            {MEAL_SLOTS.map((slot) => {
              const Icon = SLOT_ICONS[slot];
              const list = cellEntries(plan.meals, mobileDay, slot);
              const kcal = list.reduce((sum, m) => sum + (m.kcal ?? 0), 0);
              const label = t(MEAL_SLOT_LABELS[slot]);
              return (
                <section key={slot} className="rounded-2xl border bg-card shadow-card">
                  <header className="flex items-center gap-2.5 py-2 pr-2 pl-3.5">
                    <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-pale text-forest">
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">{label}</span>
                    {list.length > 0 && <span className="text-[12.5px] text-muted-foreground tabular">{fmt.number(kcal)} kcal</span>}
                    <Button
                      variant={list.length ? "ghost" : "secondary"}
                      size="sm"
                      className="h-8 rounded-xl px-2.5"
                      onClick={() => setEditing({ id: uuid(), isNew: true, day: mobileDay, slot })}
                      aria-label={t("Aggiungi a {meal} di {day}", { meal: label, day: t(WEEKDAY_LABELS[mobileDay]) })}
                    >
                      <Plus /> {!list.length && t("Aggiungi")}
                    </Button>
                  </header>
                  {list.length > 0 && (
                    <ul className="divide-y border-t">
                      {list.map((m) => (
                        <li key={m.id}>
                          <button
                            type="button"
                            onClick={() => setEditing({ id: m.id, isNew: false, day: mobileDay, slot })}
                            className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors active:bg-muted"
                            aria-label={t("Modifica {name}", { name: m.name })}
                          >
                            <Thumb src={m.imageUrl} className="size-10 rounded-lg" contain sizes="40px" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[14px] font-semibold">{m.name}</span>
                              {m.amount !== null && <span className="block text-[12px] text-muted-foreground tabular">{`${fmt.number(m.amount)} ${m.unit ?? ""}`.trim()}</span>}
                            </span>
                            <span className={cn("shrink-0 text-[12.5px] tabular", m.kcal === null ? "text-warning" : "text-muted-foreground")}>
                              {m.kcal !== null ? `${fmt.number(m.kcal)} kcal` : t("kcal n/d")}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        </div>

        {/* Weekly grid */}
        <div className="mt-4 rounded-3xl border bg-card shadow-card max-md:hidden">
          <div className="scrollbar-thin overflow-x-auto overscroll-x-contain rounded-3xl">
            <div
              role="grid"
              aria-label={t("Pianificazione settimanale dei pasti")}
              className="grid min-w-max [--col:84px] [--slot:68px] md:min-w-[1060px] md:[--col:minmax(128px,1fr)] md:[--slot:132px]"
              style={{ gridTemplateColumns: "var(--slot) repeat(7, var(--col))" }}
            >
              {/* header */}
              <div role="columnheader" className="sticky left-0 z-10 flex items-end bg-card px-2.5 pt-3 pb-2 text-[11.5px] font-semibold text-muted-foreground md:px-4 md:text-[12px]">
                
                {t("Pasto")}
              </div>
              {WEEKDAY_SHORT.map((x) => t(x)).map((label, d) => {
                const s = daySummary(plan.meals, d);
                const over = plan.targets.kcal && s.kcal ? s.kcal / plan.targets.kcal : null;
                return (
                  <div key={label} role="columnheader" className={cn("group/day relative px-1 pt-2.5 pb-1.5 md:px-2", summaryDay === d && "md:bg-pale/50")}>
                    <button
                      onClick={() => setSummaryDay(d)}
                      className={cn("flex w-full flex-col items-center rounded-xl py-1 transition-colors hover:bg-muted md:items-start md:px-2", summaryDay === d && "max-md:bg-pale")}
                    >
                      <span className="text-[13px] font-semibold md:text-[14px]">
                        <span className="md:hidden">{label}</span>
                        <span className="max-md:hidden">{t(WEEKDAY_LABELS[d])}</span>
                      </span>
                      <span className="text-[10.5px] text-muted-foreground tabular md:text-[11.5px]">
                        {dayDate(d) ?? (s.entries ? `${fmt.number(s.kcal)} kcal` : "—")}
                      </span>
                      {dayDate(d) && s.entries > 0 && <span className="text-[11px] text-muted-foreground tabular max-md:hidden">{fmt.number(s.kcal)} kcal</span>}
                      {over !== null && (over < 0.9 || over > 1.1) && <span className="mt-0.5 h-1 w-6 rounded-full bg-warning max-md:hidden" title={t("Fuori obiettivo di oltre il 10%")} />}
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-xs" className="absolute top-2.5 right-1.5 opacity-0 transition-opacity group-hover/day:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100 max-md:hidden" aria-label={t("Opzioni {day}", { day: t(WEEKDAY_LABELS[d]) })}>
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-60">
                        <DropdownMenuLabel>{t(WEEKDAY_LABELS[d])}</DropdownMenuLabel>
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger disabled={!s.entries}>
                            <Copy /> {t("Copia giornata su…")}
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            {WEEKDAY_LABELS.map((x) => t(x)).map((l, i) => (i === d ? null : <DropdownMenuItem key={l} onSelect={() => copyDay(d, [i])}>{l}</DropdownMenuItem>))}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => copyDay(d, [0, 1, 2, 3, 4, 5, 6].filter((i) => i !== d))}>{t("Tutti gli altri giorni")}</DropdownMenuItem>
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        <DropdownMenuItem destructive disabled={!s.entries} onSelect={() => clearDay(d)}>
                          <Eraser /> {t("Svuota giornata")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}

              {/* rows */}
              {MEAL_SLOTS.map((slot) => {
                const Icon = SLOT_ICONS[slot];
                return (
                  <React.Fragment key={slot}>
                    <div role="rowheader" className="sticky left-0 z-10 flex flex-col items-center justify-center gap-1 border-t bg-card px-1.5 py-2 text-center md:flex-row md:justify-start md:gap-2.5 md:px-4 md:text-left">
                      <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-pale text-forest md:size-9">
                        <Icon className="size-4" />
                      </span>
                      <span className="text-[10.5px] leading-tight font-semibold md:text-[13px]">{t(MEAL_SLOT_LABELS[slot])}</span>
                    </div>
                    {WEEKDAY_SHORT.map((_, d) => {
                      const list = cellEntries(plan.meals, d, slot);
                      const addOpen = editing?.isNew && editing.day === d && editing.slot === slot;
                      return (
                        <div key={d} role="gridcell" className={cn("group/cell flex min-h-[104px] flex-col gap-1 border-t border-l border-border/70 p-1 md:min-h-[96px] md:gap-1.5 md:p-1.5", summaryDay === d && "md:bg-pale/30")}>
                          {list.map((m) => (
                            <MealChip
                              key={m.id}
                              entry={m}
                              open={!isMobile && editing?.id === m.id && !editing.isNew}
                              onOpen={() => setEditing({ id: m.id, isNew: false, day: d, slot })}
                              onClose={() => setEditing(null)}
                              editor={editingEntry && editing?.id === m.id ? editorFor(editingEntry, false) : null}
                              onDuplicate={() => dispatch({ type: "duplicate", id: m.id })}
                              onCopy={(days) => {
                                dispatch({ type: "copy-to-days", id: m.id, days });
                                toast.success(days.length > 1 ? t("Copiato sugli altri giorni") : t("Copiato su {value}", { value: t(WEEKDAY_LABELS[days[0]]).toLowerCase() }));
                              }}
                              onRemove={() => removeMeal(m)}
                            />
                          ))}
                          <Popover open={Boolean(!isMobile && addOpen)} onOpenChange={(o) => !o && setEditing(null)}>
                            <PopoverAnchor asChild>
                              <button
                                onClick={() => setEditing({ id: uuid(), isNew: true, day: d, slot })}
                                className={cn(
                                  "flex items-center justify-center gap-1 rounded-xl text-[12px] font-semibold text-primary transition-[opacity,background-color,color] hover:bg-primary hover:text-white focus-visible:opacity-100",
                                  list.length ? "h-7 opacity-0 group-hover/cell:opacity-100 max-md:opacity-100 max-md:h-6" : "flex-1 border border-dashed border-primary/60",
                                  addOpen && "bg-primary text-white opacity-100",
                                )}
                                aria-label={t("Aggiungi a {meal} di {day}", { meal: t(MEAL_SLOT_LABELS[slot]), day: t(WEEKDAY_LABELS[d]) })}
                              >
                                <Plus className="size-3.5" />
                                <span className="max-md:hidden">{list.length ? t("Aggiungi") : t("Aggiungi pasto")}</span>
                              </button>
                            </PopoverAnchor>
                            <PopoverContent className="w-[400px] p-4" side="bottom" align="start" collisionPadding={16}>
                              {addOpen && editingEntry ? editorFor(editingEntry, true) : null}
                            </PopoverContent>
                          </Popover>
                        </div>
                      );
                    })}
                  </React.Fragment>
                );
              })}

              {/* totals */}
              <div className="sticky left-0 z-10 flex items-center border-t bg-tile px-2.5 py-2.5 text-[11px] font-semibold md:px-4 md:text-[12.5px]">{t("Totale")}</div>
              {WEEKDAY_SHORT.map((x) => t(x)).map((label, d) => {
                const s = daySummary(plan.meals, d);
                return (
                  <div key={label} className="border-t border-l border-border/70 bg-tile px-1.5 py-2 md:px-3">
                    <div className="text-[12px] font-semibold tabular md:text-[13.5px]">{s.entries ? `${fmt.number(s.kcal)} kcal` : "—"}</div>
                    {s.entries > 0 && (
                      <div className="text-[10.5px] text-muted-foreground tabular max-md:hidden md:text-[11.5px]">
                        
                        {t("P {protein} · C {carbs} · G {fat}", { protein: fmt.number(s.protein), carbs: fmt.number(s.carbs), fat: fmt.number(s.fat) })}
                      </div>
                    )}
                    {s.unknown > 0 && (
                      <div className="mt-0.5 inline-flex items-center gap-1 text-[10.5px] font-medium text-warning md:text-[11px]" title={t("Pasti senza valori nutrizionali: esclusi dal totale")}>
                        <CircleAlert className="size-3" /> {s.unknown} n/d
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <p className="mt-2 text-[12px] text-muted-foreground max-md:mt-3">
          {t("I totali usano solo valori della libreria o inseriti da te: i pasti senza dati sono esclusi e segnalati come n/d.")}
        </p>

        <DailySummary meals={plan.meals} targets={plan.targets} selected={summaryDay} onSelect={setSummaryDay} className="mt-4 md:hidden" />
      </PageContainer>

      {/* Mobile bottom bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)] backdrop-blur-xl md:hidden">
        <div className="flex items-center gap-2">
          <Button className="h-12 flex-1 rounded-2xl text-[15px]" variant="secondary" onClick={() => persist(published ? "published" : "draft")} loading={busy === "draft" || busy === "published"}>
            <Save className="size-5" /> {dirty || isNew ? t("Salva modifiche") : t("Salvato")}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="size-12 rounded-2xl" aria-label={t("Altre azioni")}>
                <MoreHorizontal className="size-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" className="w-60">
              <DropdownMenuLabel>
                <PlanStatusBadge status={plan.status} kind="nutrition" size="sm" />
              </DropdownMenuLabel>
              {(!published || dirty) && (
                <DropdownMenuItem onSelect={() => persist("published")}>
                  <Send /> {published ? t("Aggiorna piano") : t("Pubblica piano")}
                </DropdownMenuItem>
              )}
              {published && (
                <DropdownMenuItem onSelect={() => persist("draft")}>
                  <Undo2 /> {t("Riporta in bozza")}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onSelect={duplicatePlan} disabled={isNew}>
                <Copy /> {t("Duplica piano")}
              </DropdownMenuItem>
              <DropdownMenuItem destructive onSelect={deletePlan} disabled={isNew}>
                <Trash2 /> {t("Elimina piano")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Sheet open={isMobile && editing !== null && editingEntry !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <SheetContent side="bottom">
          <SheetTitle className="px-5 pt-3 text-[16px]">{editing?.isNew ? t("Aggiungi pasto") : t("Modifica pasto")}</SheetTitle>
          <SheetBody className="pt-3">{editingEntry && editing ? editorFor(editingEntry, editing.isNew) : null}</SheetBody>
        </SheetContent>
      </Sheet>

      {dialog}
    </>
  );
}

function MealChip({
  entry,
  open,
  onOpen,
  onClose,
  editor,
  onDuplicate,
  onCopy,
  onRemove,
}: {
  entry: MealEntry;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  editor: React.ReactNode;
  onDuplicate: () => void;
  onCopy: (days: number[]) => void;
  onRemove: () => void;
}) {
  const { fmt, t } = useI18n();
  const portion = entry.amount !== null ? `${fmt.number(entry.amount)} ${entry.unit ?? ""}`.trim() : null;
  return (
    <Popover open={open} onOpenChange={(o) => !o && onClose()}>
      <PopoverAnchor asChild>
        <div
          className={cn(
            "group/chip relative flex flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-center transition-colors md:items-stretch md:gap-1.5 md:bg-tile md:p-2 md:text-left",
            open ? "bg-pale ring-2 ring-primary/30" : "hover:bg-muted md:hover:bg-[#ebf0eb]",
          )}
        >
          <button onClick={onOpen} className="absolute inset-0 z-0 rounded-xl" aria-label={t("Modifica {name}", { name: entry.name })} />
          <div className="pointer-events-none line-clamp-2 text-[10.5px] leading-snug font-medium md:pr-5 md:text-[12.5px] md:font-semibold">{entry.name}</div>
          <div className="pointer-events-none flex items-center gap-2">
            <Thumb src={entry.imageUrl} className="size-9 rounded-lg bg-transparent md:size-8 md:bg-card" contain sizes="36px" />
            <div className="min-w-0 text-[11px] leading-tight text-muted-foreground tabular max-md:hidden">
              {portion && <div className="truncate">{portion}</div>}
              <div className={cn("truncate", entry.kcal === null && "text-warning")}>{entry.kcal !== null ? `${fmt.number(entry.kcal)} kcal` : t("kcal n/d")}</div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-xs" className="absolute top-1 right-1 z-[1] text-muted-foreground opacity-0 group-hover/chip:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100 max-md:hidden" aria-label={t("Opzioni {name}", { name: entry.name })}>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuItem onSelect={onOpen}>{t("Modifica")}</DropdownMenuItem>
              <DropdownMenuItem onSelect={onDuplicate}>
                <CopyPlus /> {t("Duplica")}
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Copy /> {t("Copia in…")}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {WEEKDAY_LABELS.map((x) => t(x)).map((l, i) => (i === entry.day ? null : <DropdownMenuItem key={l} onSelect={() => onCopy([i])}>{l}</DropdownMenuItem>))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => onCopy([0, 1, 2, 3, 4, 5, 6].filter((i) => i !== entry.day))}>{t("Tutti gli altri giorni")}</DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem destructive onSelect={onRemove}>
                <Trash2 /> {t("Rimuovi")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </PopoverAnchor>
      <PopoverContent className="w-[400px] p-4" side="bottom" align="start" collisionPadding={16}>
        {editor}
      </PopoverContent>
    </Popover>
  );
}

function PlanSettings({
  targets,
  weekStart,
  onTargets,
  onWeekStart,
}: {
  targets: NutritionTargets;
  weekStart: string | null;
  onTargets: (t: NutritionTargets) => void;
  onWeekStart: (w: string | null) => void;
}) {
  const { fmt, t } = useI18n();
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState({ kcal: "", protein: "", carbs: "", fat: "", week: "" });
  const [error, setError] = React.useState<string | null>(null);

  const [prevOpen, setPrevOpen] = React.useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      const f = (n: number | null) => (n === null ? "" : String(n));
      setDraft({ kcal: f(targets.kcal), protein: f(targets.protein), carbs: f(targets.carbs), fat: f(targets.fat), week: weekStart ?? "" });
      setError(null);
    }
  }

  const apply = () => {
    const ranges = { kcal: [600, 8000], protein: [0, 500], carbs: [0, 1000], fat: [0, 400] } as const;
    const next = {} as NutritionTargets;
    for (const k of ["kcal", "protein", "carbs", "fat"] as const) {
      const n = parseDecimal(draft[k]);
      if (n !== null && (Number.isNaN(n) || n < ranges[k][0] || n > ranges[k][1])) return setError(t("Valore non valido per {field}", { field: t(k === "kcal" ? "calorie" : k === "protein" ? "proteine" : k === "carbs" ? "carboidrati" : "grassi") }));
      next[k] = n === null ? null : Math.round(n);
    }
    onTargets(next);
    onWeekStart(draft.week ? startOfWeekKey(draft.week) : null);
    setOpen(false);
  };

  const summary = targets.kcal ? `${fmt.number(targets.kcal)} kcal` : t("Nessun obiettivo");
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-3 rounded-2xl border bg-card px-4 py-2.5 text-left shadow-card transition-colors hover:border-border-strong md:col-span-2 xl:col-span-1">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-pale text-forest">
            <Settings2 className="size-4" />
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block text-[12.5px] font-medium text-muted-foreground">{t("Obiettivi giornalieri")}</span>
            <span className="block truncate text-[14px] font-semibold tabular">{summary}</span>
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[340px] p-4">
        <div className="text-[15px] font-semibold">{t("Obiettivi del piano")}</div>
        <p className="mb-3 text-[12.5px] text-muted-foreground">{t("Usati per confrontare i totali di ogni giorno. Lascia vuoto ciò che non serve.")}</p>
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              ["kcal", msg("Calorie (kcal)")],
              ["protein", msg("Proteine (g)")],
              ["carbs", msg("Carboidrati (g)")],
              ["fat", msg("Grassi (g)")],
            ] as const
          ).map(([k, l]) => (
            <Field key={k} label={t(l)} htmlFor={`t-${k}`}>
              <Input id={`t-${k}`} inputMode="numeric" value={draft[k]} onChange={(e) => setDraft((d) => ({ ...d, [k]: e.target.value }))} placeholder="—" />
            </Field>
          ))}
          <Field label={t("Settimana dal (opzionale)")} htmlFor="t-week" className="col-span-2" hint={t("Mostra le date nelle colonne; viene allineata al lunedì.")}>
            <div className="flex gap-2">
              <Input id="t-week" type="date" value={draft.week} onChange={(e) => setDraft((d) => ({ ...d, week: e.target.value }))} />
              <Button type="button" variant="outline" onClick={() => setDraft((d) => ({ ...d, week: startOfWeekKey(addDaysToKey(todayKey(), 7)) }))}>
                
                {t("Prossima")}
              </Button>
            </div>
          </Field>
        </div>
        {error && <p className="mt-2 text-[12.5px] font-medium text-destructive">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
            
            {t("Annulla")}
          </Button>
          <Button size="sm" onClick={apply}>
            
            {t("Applica")}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
