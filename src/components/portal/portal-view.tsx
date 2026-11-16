"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Clock3, Download, Dumbbell, Eye, Flame, LogOut, Salad, Timer } from "lucide-react";
import { signOutAction } from "@/lib/actions/auth";
import { useI18n } from "@/lib/i18n/client";
import type { Locale } from "@/lib/i18n/core";
import type { PortalData, PortalExercise } from "@/lib/data/portal";
import type { MealEntry, NutritionPlan, WorkoutDay, WorkoutPlan } from "@/lib/domain/types";
import { MEAL_SLOTS, MEAL_SLOT_LABELS, WEEKDAY_LABELS, WEEKDAY_SHORT } from "@/lib/domain/constants";
import { BrandMark } from "@/components/shell/brand";
import { LanguageSwitcher } from "@/components/common/language-switcher";
import { EmptyState, Panel } from "@/components/common/basics";
import { ExportMenu, downloadFile, withExtension, type ExportFormat } from "@/components/editor/shared";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Read-only area for the person doing the workouts: their published workout and meal plans,
 * with PDF/PNG/JPG downloads. Also used by the coach as a preview (`preview`).
 */
export function PortalView({ data, locale, preview }: { data: PortalData; locale: Locale; preview?: { backHref: string } }) {
  const { t } = useI18n();
  const coachName = data.coach.studioName || data.coach.fullName;

  return (
    <div className={cn("relative flex flex-col", !preview && "min-h-dvh bg-background")}>
      {!preview && (
        <>
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(60rem_24rem_at_50%_-10%,rgb(22_131_75/0.12),transparent_70%)]" />
          <header className="relative mx-auto flex w-full max-w-[1040px] items-center justify-between gap-3 px-5 py-5 sm:px-8">
            <div className="flex min-w-0 items-center gap-2.5">
              <BrandMark size={36} />
              <span className="min-w-0 leading-tight">
                <span className="block truncate text-[16px] font-semibold text-forest">{coachName || "Forma"}</span>
                <span className="block text-[12px] text-muted-foreground">{t("Area cliente")}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <LanguageSwitcher locale={locale} />
              <form action={signOutAction}>
                <Button type="submit" variant="outline" size="sm" className="rounded-full">
                  <LogOut /> <span className="max-sm:sr-only">{t("Esci")}</span>
                </Button>
              </form>
            </div>
          </header>
        </>
      )}

      <main className={cn("relative mx-auto flex w-full flex-col gap-6", !preview && "max-w-[1040px] px-5 pb-16 sm:px-8")}>
        {preview && (
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-primary/25 bg-pale px-4 py-3 text-[13.5px] text-forest">
            <Eye className="size-4 shrink-0" />
            <span className="flex-1">{t("Anteprima: è ciò che vede il cliente quando accede. Mostra solo schede e piani pubblicati.")}</span>
            <Button asChild variant="outline" size="sm">
              <Link href={preview.backHref}>{t("Torna al profilo")}</Link>
            </Button>
          </div>
        )}

        <section className="pt-2">
          <h1 className="text-[28px] leading-tight font-bold tracking-tight sm:text-[34px]">{t("Ciao {name}!", { name: data.client.firstName })}</h1>
          <p className="mt-1.5 text-[15px] text-muted-foreground">
            {coachName ? t("Ecco le schede e i piani alimentari preparati da {coach}.", { coach: coachName }) : t("Ecco le tue schede e i tuoi piani alimentari.")}
          </p>
        </section>

        <Tabs defaultValue={data.workouts.length || !data.nutrition.length ? "workouts" : "nutrition"}>
          <TabsList>
            <TabsTrigger value="workouts">
              <Dumbbell /> {t("Allenamento")}
            </TabsTrigger>
            <TabsTrigger value="nutrition">
              <Salad /> {t("Alimentazione")}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="workouts" className="mt-5 flex flex-col gap-5">
            {data.workouts.length === 0 ? (
              <EmptyState icon={<Dumbbell />} title={t("Nessuna scheda pubblicata")} description={t("Quando il tuo coach pubblica una scheda la trovi qui.")} />
            ) : (
              data.workouts.map((plan) => <WorkoutCard key={plan.id} plan={plan} exercises={data.exercises} clientName={data.client.firstName} />)
            )}
          </TabsContent>
          <TabsContent value="nutrition" className="mt-5 flex flex-col gap-5">
            {data.nutrition.length === 0 ? (
              <EmptyState icon={<Salad />} title={t("Nessun piano alimentare pubblicato")} description={t("Quando il tuo coach pubblica un piano lo trovi qui.")} />
            ) : (
              data.nutrition.map((plan) => <NutritionCard key={plan.id} plan={plan} clientName={data.client.firstName} />)
            )}
          </TabsContent>
        </Tabs>

        {(data.coach.email || data.coach.phone) && (
          <p className="text-center text-[13px] text-muted-foreground">
            {t("Domande sul programma? Contatta il tuo coach:")}{" "}
            {data.coach.email && (
              <a className="font-semibold text-forest underline-offset-2 hover:underline" href={`mailto:${data.coach.email}`}>
                {data.coach.email}
              </a>
            )}
            {data.coach.email && data.coach.phone && " · "}
            {data.coach.phone && (
              <a className="font-semibold text-forest underline-offset-2 hover:underline" href={`tel:${data.coach.phone.replace(/\s/g, "")}`}>
                {data.coach.phone}
              </a>
            )}
          </p>
        )}
      </main>
    </div>
  );
}

/* --------------------------------- downloads --------------------------------- */
function DownloadButton({ kind, id, filename }: { kind: "workout" | "nutrition"; id: string; filename: string }) {
  const { t } = useI18n();
  const [busy, setBusy] = React.useState(false);
  const run = async (format: ExportFormat) => {
    setBusy(true);
    try {
      await downloadFile(`/api/portale/${kind}/${id}?format=${format}`, withExtension(`${filename}.pdf`, format));
    } catch {
      toast.error(t("Download non riuscito. Riprova."));
    } finally {
      setBusy(false);
    }
  };
  return (
    <ExportMenu onExport={run}>
      <Button size="sm" loading={busy}>
        {!busy && <Download />} {t("Scarica")}
      </Button>
    </ExportMenu>
  );
}

function PlanHeader({ title, meta, notes, actions }: { title: string; meta: React.ReactNode; notes: string | null; actions: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start gap-3 border-b px-5 py-4 md:px-6">
      <div className="min-w-0 flex-1">
        <h2 className="text-[18px] font-bold tracking-tight">{title}</h2>
        <div className="mt-0.5 text-[13px] text-muted-foreground">{meta}</div>
        {notes && <p className="mt-2 text-[13.5px] leading-relaxed whitespace-pre-line">{notes}</p>}
      </div>
      {actions}
    </div>
  );
}

/* ---------------------------------- workouts --------------------------------- */
function WorkoutCard({ plan, exercises, clientName }: { plan: WorkoutPlan; exercises: PortalExercise[]; clientName: string }) {
  const { t, tn, fmt } = useI18n();
  const byId = React.useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);
  const days = [...plan.days].sort((a, b) => a.weekday - b.weekday);
  const today = (new Date().getDay() + 6) % 7;
  const [active, setActive] = React.useState(days.some((d) => d.weekday === today) ? today : (days[0]?.weekday ?? 0));
  const day = days.find((d) => d.weekday === active) ?? days[0];

  return (
    <Panel className="overflow-hidden">
      <PlanHeader
        title={plan.name}
        meta={
          <>
            {tn("{n} giorno di allenamento", "{n} giorni di allenamento", days.length)}
            {plan.publishedAt && ` · ${t("pubblicata il {date}", { date: fmt.instant(plan.publishedAt, { day: "numeric", month: "long" }) })}`}
          </>
        }
        notes={plan.notes}
        actions={<DownloadButton kind="workout" id={plan.id} filename={`${t("Scheda")} ${clientName} ${plan.name}`} />}
      />
      {days.length === 0 ? (
        <p className="px-5 py-6 text-[13.5px] text-muted-foreground md:px-6">{t("Questa scheda non contiene ancora esercizi.")}</p>
      ) : (
        <>
          <div className="scrollbar-none flex gap-1.5 overflow-x-auto px-5 pt-4 md:px-6" role="tablist" aria-label={t("Giorni")}>
            {days.map((d) => (
              <button
                key={d.weekday}
                type="button"
                role="tab"
                aria-selected={d.weekday === day?.weekday}
                onClick={() => setActive(d.weekday)}
                className={cn(
                  "shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors",
                  d.weekday === day?.weekday ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary/50",
                )}
              >
                {t(WEEKDAY_SHORT[d.weekday])}
                {d.weekday === today && <span className="ml-1.5 inline-block size-1.5 rounded-full bg-current align-middle" />}
              </button>
            ))}
          </div>
          {day && <WorkoutDayView day={day} byId={byId} />}
        </>
      )}
    </Panel>
  );
}

function WorkoutDayView({ day, byId }: { day: WorkoutDay; byId: Map<string, PortalExercise> }) {
  const { t, tn, fmt } = useI18n();
  return (
    <div className="px-5 pt-4 pb-5 md:px-6">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h3 className="text-[16px] font-bold">
          {t(WEEKDAY_LABELS[day.weekday])}
          {day.title && <span className="font-semibold text-muted-foreground"> · {day.title}</span>}
        </h3>
        {day.durationMinutes && (
          <Badge size="sm" variant="neutral">
            <Clock3 /> {t("{n} min", { n: day.durationMinutes })}
          </Badge>
        )}
      </div>
      {day.notes && <p className="mb-3 rounded-2xl bg-muted/60 px-4 py-2.5 text-[13.5px] leading-relaxed whitespace-pre-line">{day.notes}</p>}
      <ol className="flex flex-col gap-2.5">
        {day.exercises.map((ex, i) => {
          const info = byId.get(ex.exerciseId);
          const superset = ex.supersetId && (day.exercises[i - 1]?.supersetId === ex.supersetId || day.exercises[i + 1]?.supersetId === ex.supersetId);
          return (
            <li key={ex.id} className={cn("flex gap-3 rounded-2xl border bg-card p-3", superset && "border-l-4 border-l-primary")}>
              <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-muted sm:size-[72px]">
                {info?.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- library images (local or Supabase storage)
                  <img src={info.imageUrl} alt="" className="size-full object-cover" loading="lazy" />
                ) : (
                  <Dumbbell className="absolute inset-0 m-auto size-6 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start gap-2">
                  <span className="text-[12px] font-bold text-muted-foreground tabular-nums">{i + 1}.</span>
                  <span className="text-[14.5px] leading-snug font-semibold">{info?.name ?? t("Esercizio")}</span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <Badge size="sm" variant="success">
                    {t("{sets} × {reps}", { sets: ex.sets, reps: ex.reps })}
                  </Badge>
                  {ex.weightKg !== null && (
                    <Badge size="sm" variant="neutral">
                      {fmt.number(ex.weightKg)} kg
                    </Badge>
                  )}
                  <Badge size="sm" variant="neutral">
                    <Timer /> {t("Recupero {time}", { time: restLabel(ex.restSeconds) })}
                  </Badge>
                  {ex.tempo && (
                    <Badge size="sm" variant="neutral">
                      {t("Tempo {tempo}", { tempo: ex.tempo })}
                    </Badge>
                  )}
                  {superset && (
                    <Badge size="sm" variant="neutral">
                      {t("Superserie")}
                    </Badge>
                  )}
                </div>
                {ex.notes && <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{ex.notes}</p>}
              </div>
            </li>
          );
        })}
      </ol>
      {day.exercises.length > 0 && (
        <p className="mt-3 text-[12.5px] text-muted-foreground">
          {tn("{n} esercizio", "{n} esercizi", day.exercises.length)} · {tn("{n} serie", "{n} serie", day.exercises.reduce((s, e) => s + e.sets, 0))}
        </p>
      )}
    </div>
  );
}

function restLabel(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s ? `${m}'${String(s).padStart(2, "0")}"` : `${m}'`;
}

/* --------------------------------- nutrition --------------------------------- */
function NutritionCard({ plan, clientName }: { plan: NutritionPlan; clientName: string }) {
  const { t, fmt } = useI18n();
  const days = [...new Set(plan.meals.map((m) => m.day))].sort((a, b) => a - b);
  const today = (new Date().getDay() + 6) % 7;
  const [active, setActive] = React.useState(days.includes(today) ? today : (days[0] ?? 0));
  const meals = plan.meals.filter((m) => m.day === active);
  const total = sum(meals);
  const targets = plan.targets;

  return (
    <Panel className="overflow-hidden">
      <PlanHeader
        title={plan.name}
        meta={
          <>
            {targets.kcal ? t("Obiettivo {kcal} kcal al giorno", { kcal: fmt.number(targets.kcal) }) : t("Piano alimentare")}
            {plan.publishedAt && ` · ${t("pubblicato il {date}", { date: fmt.instant(plan.publishedAt, { day: "numeric", month: "long" }) })}`}
          </>
        }
        notes={plan.notes}
        actions={<DownloadButton kind="nutrition" id={plan.id} filename={`${t("Piano alimentare")} ${clientName} ${plan.name}`} />}
      />
      {days.length === 0 ? (
        <p className="px-5 py-6 text-[13.5px] text-muted-foreground md:px-6">{t("Questo piano non contiene ancora pasti.")}</p>
      ) : (
        <div className="px-5 pt-4 pb-5 md:px-6">
          <div className="scrollbar-none -mx-1 mb-4 flex gap-1.5 overflow-x-auto px-1" role="tablist" aria-label={t("Giorni")}>
            {days.map((d) => (
              <button
                key={d}
                type="button"
                role="tab"
                aria-selected={d === active}
                onClick={() => setActive(d)}
                className={cn(
                  "shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors",
                  d === active ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary/50",
                )}
              >
                {t(WEEKDAY_SHORT[d])}
                {d === today && <span className="ml-1.5 inline-block size-1.5 rounded-full bg-current align-middle" />}
              </button>
            ))}
          </div>

          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Macro icon={<Flame className="size-3.5" />} label={t("Calorie")} value={`${fmt.number(Math.round(total.kcal))}`} unit="kcal" target={targets.kcal} />
            <Macro label={t("Proteine")} value={fmt.number(Math.round(total.protein))} unit="g" target={targets.protein} />
            <Macro label={t("Carboidrati")} value={fmt.number(Math.round(total.carbs))} unit="g" target={targets.carbs} />
            <Macro label={t("Grassi")} value={fmt.number(Math.round(total.fat))} unit="g" target={targets.fat} />
          </div>

          <div className="flex flex-col gap-3">
            {MEAL_SLOTS.map((slot) => {
              const items = meals.filter((m) => m.slot === slot).sort((a, b) => a.position - b.position);
              if (!items.length) return null;
              const kcal = sum(items).kcal;
              return (
                <section key={slot} className="rounded-2xl border">
                  <header className="flex items-center justify-between border-b px-4 py-2.5">
                    <h3 className="text-[14px] font-bold">{t(MEAL_SLOT_LABELS[slot])}</h3>
                    {kcal > 0 && <span className="text-[12.5px] font-semibold text-muted-foreground tabular-nums">{fmt.number(Math.round(kcal))} kcal</span>}
                  </header>
                  <ul className="divide-y">
                    {items.map((m) => (
                      <li key={m.id} className="flex items-center gap-3 px-4 py-2.5">
                        {m.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element -- library images (local or Supabase storage)
                          <img src={m.imageUrl} alt="" className="size-10 shrink-0 rounded-lg bg-muted object-cover" loading="lazy" />
                        ) : (
                          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-muted">
                            <Salad className="size-4 text-muted-foreground" />
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="text-[14px] leading-snug font-semibold">{m.name}</div>
                          {m.notes && <div className="text-[12.5px] text-muted-foreground">{m.notes}</div>}
                        </div>
                        <div className="shrink-0 text-right text-[13px] tabular-nums">
                          {m.amount !== null && (
                            <div className="font-semibold">
                              {fmt.number(m.amount)} {m.unit === "pz" ? t("pz") : (m.unit ?? "g")}
                            </div>
                          )}
                          {m.kcal !== null && <div className="text-[12px] text-muted-foreground">{fmt.number(Math.round(m.kcal))} kcal</div>}
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        </div>
      )}
    </Panel>
  );
}

function Macro({ icon, label, value, unit, target }: { icon?: React.ReactNode; label: string; value: string; unit: string; target: number | null }) {
  const { fmt } = useI18n();
  return (
    <div className="rounded-2xl bg-muted/60 px-3.5 py-2.5">
      <div className="flex items-center gap-1 text-[12px] font-semibold text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-0.5 text-[17px] font-bold tabular-nums">
        {value} <span className="text-[12px] font-semibold text-muted-foreground">{unit}</span>
      </div>
      {target ? <div className="text-[11.5px] text-muted-foreground tabular-nums">/ {fmt.number(target)} {unit}</div> : null}
    </div>
  );
}

function sum(items: MealEntry[]) {
  return items.reduce(
    (acc, m) => ({ kcal: acc.kcal + (m.kcal ?? 0), protein: acc.protein + (m.protein ?? 0), carbs: acc.carbs + (m.carbs ?? 0), fat: acc.fat + (m.fat ?? 0) }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
}
