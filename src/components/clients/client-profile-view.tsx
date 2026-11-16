"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CalendarClock,
  CalendarPlus,
  Dumbbell,
  LayoutGrid,
  Mail,
  MoreHorizontal,
  NotebookPen,
  Pencil,
  Phone,
  Plus,
  Salad,
  Send,
  Target,
  Trash2,
  TrendingUp,
} from "lucide-react";
import type { Activity, Appointment, Client, ClientNote, ClientOption, NutritionPlanSummary, ProgressRecord, WorkoutPlanSummary } from "@/lib/domain/types";
import { APPOINTMENT_STATUS_LABELS, APPOINTMENT_TYPE_LABELS, GENDER_LABELS, GOAL_LABELS } from "@/lib/domain/constants";
import { addClientNoteAction, deleteClientNoteAction } from "@/lib/actions/clients";
import { Topbar, PageContainer } from "@/components/shell/topbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/input";
import { Avatar, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/misc";
import { ClientStatusBadge, EmptyState, Panel, PanelHeader } from "@/components/common/basics";
import { ActivityIcon } from "@/components/common/activity-icon";
import { RelativeTime } from "@/components/common/relative-time";
import { useConfirm } from "@/components/common/confirm";
import { ClientFormSheet } from "./client-form-sheet";
import { ClientActionsMenu } from "./client-actions-menu";
import { NutritionPlanCard, WorkoutPlanCard } from "@/components/plans/plan-cards";
import { ProgressPanel } from "@/components/progress/progress-panel";
import { ClientAccessPanel, type ClientAccessInfo } from "./client-access-panel";
import { AppointmentFormSheet } from "@/components/calendar/appointment-form-sheet";
import { cn } from "@/lib/utils";
import { ageFromBirthDate, dayKeyOf, timeOf } from "@/lib/datetime";
import { useI18n } from "@/lib/i18n/client";
import { activityText } from "@/lib/i18n/activity";
import { msg } from "@/lib/i18n/core";

const TABS = [
  { value: "panoramica", label: msg("Panoramica"), icon: LayoutGrid },
  { value: "allenamenti", label: msg("Allenamenti"), icon: Dumbbell },
  { value: "nutrizione", label: msg("Nutrizione"), icon: Salad },
  { value: "progressi", label: msg("Progressi"), icon: TrendingUp },
  { value: "appuntamenti", label: msg("Appuntamenti"), icon: CalendarClock },
  { value: "note", label: msg("Note coach"), icon: NotebookPen },
] as const;
type Tab = (typeof TABS)[number]["value"];

interface Props {
  client: Client;
  notes: ClientNote[];
  workouts: WorkoutPlanSummary[];
  nutrition: NutritionPlanSummary[];
  progress: ProgressRecord[];
  appointments: Appointment[];
  activity: Activity[];
  options: ClientOption[];
  access: ClientAccessInfo;
  initialTab: string;
}

export function ClientProfileView(props: Props) {
  const i18n = useI18n();
  const { tn, fmt, t } = i18n;
  const { client, notes, workouts, nutrition, progress, appointments, activity, options } = props;
  const router = useRouter();
  const [tab, setTab] = React.useState<Tab>(TABS.some((t) => t.value === props.initialTab) ? (props.initialTab as Tab) : "panoramica");
  const [editOpen, setEditOpen] = React.useState(false);
  const [apptOpen, setApptOpen] = React.useState<Appointment | "new" | null>(null);
  const name = `${client.firstName} ${client.lastName}`;
  const info = { name, avatarUrl: client.avatarUrl };

  const changeTab = (value: string) => {
    setTab(value as Tab);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", value);
    window.history.replaceState(null, "", url);
  };

  const age = ageFromBirthDate(client.birthDate);
  const weights = progress.filter((p) => p.weightKg !== null);
  const now = new Date().toISOString();
  const upcoming = appointments.filter((a) => a.startsAt >= now && a.status === "scheduled");
  const past = appointments.filter((a) => a.startsAt < now || a.status !== "scheduled").reverse();
  const lowerIsBetter = client.goal !== "muscle_gain";

  return (
    <>
      <Topbar
        title={name}
        breadcrumbs={[{ label: t("Clienti"), href: "/clients" }, { label: name }]}
        backHref="/clients"
        actions={
          <>
            <Button variant="outline" onClick={() => setEditOpen(true)} className="max-lg:hidden">
              <Pencil /> {t("Modifica")}
            </Button>
            <Button asChild>
              <Link href={`/workouts/new?client=${client.id}`}>
                <Plus /> <span className="max-sm:hidden">{t("Nuova scheda")}</span>
              </Link>
            </Button>
          </>
        }
      />
      <PageContainer>
        <Panel className="overflow-hidden">
          <div className="flex flex-col gap-5 p-5 md:flex-row md:items-center md:p-6">
            <Avatar src={client.avatarUrl} name={name} size={84} className="ring-4 ring-pale" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[24px] font-bold tracking-tight md:text-[26px]">{name}</h2>
                <ClientStatusBadge status={client.status} />
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13.5px] text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 font-medium text-forest">
                  <Target className="size-4" /> {t(GOAL_LABELS[client.goal])}
                </span>
                {age !== null && <span>{tn("{n} anno", "{n} anni", age)}</span>}
                {client.heightCm && <span>{fmt.number(client.heightCm)} cm</span>}
                <span>{t("Cliente dal")}{" "}{fmt.dayKey(client.startDate, { month: "long", year: "numeric" })}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {client.email && (
                  <Button asChild variant="subtle" size="sm">
                    <a href={`mailto:${client.email}`}>
                      <Mail /> {client.email}
                    </a>
                  </Button>
                )}
                {client.phone && (
                  <Button asChild variant="subtle" size="sm">
                    <a href={`tel:${client.phone.replace(/\s/g, "")}`}>
                      <Phone /> {client.phone}
                    </a>
                  </Button>
                )}
              </div>
            </div>
            <div className="flex gap-2 md:self-start">
              <Button asChild variant="secondary">
                <Link href={`/nutrition/new?client=${client.id}`}>
                  <Salad /> {t("Nuovo piano")}
                </Link>
              </Button>
              <ClientActionsMenu
                client={client}
                showOpen={false}
                onEdit={() => setEditOpen(true)}
                afterDelete={() => router.push("/clients")}
                trigger={
                  <Button variant="outline" size="icon" aria-label={t("Altre azioni")}>
                    <MoreHorizontal />
                  </Button>
                }
              />
            </div>
          </div>
        </Panel>

        <Tabs value={tab} onValueChange={changeTab} className="mt-5">
          <TabsList aria-label={t("Sezioni profilo")}>
            {TABS.map((item) => (
              <TabsTrigger key={item.value} value={item.value}>
                <item.icon /> {t(item.label)}
                {item.value === "note" && notes.length > 0 && <span className="text-[11.5px] text-muted-foreground tabular">{notes.length}</span>}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="panoramica" className="mt-5">
            <div className="grid gap-5 lg:grid-cols-3">
              <div className="flex flex-col gap-5 lg:col-span-2">
                <div className="grid gap-5 md:grid-cols-2">
                  <CurrentPlan kind="workout" plan={workouts.find((w) => w.status === "published") ?? workouts.find((w) => w.status === "draft") ?? null} clientId={client.id} />
                  <CurrentPlan kind="nutrition" plan={nutrition.find((n) => n.status === "published") ?? nutrition.find((n) => n.status === "draft") ?? null} clientId={client.id} />
                </div>
                <Panel>
                  <PanelHeader
                    title={t("Peso")}
                    description={weights.length ? t("Ultima misura {date}", { date: fmt.dayKey(weights.at(-1)!.date, { day: "numeric", month: "long" }) }) : t("Nessuna misura")}
                    actions={
                      <Button variant="ghost" size="sm" onClick={() => changeTab("progressi")}>
                        
                        {t("Dettagli")}
                      </Button>
                    }
                  />
                  {weights.length ? (
                    <div className="flex flex-wrap items-end gap-8 px-5 pb-5 md:px-6">
                      <div>
                        <div className="text-[34px] leading-none font-semibold tracking-tight tabular">
                          {fmt.number(weights.at(-1)!.weightKg, 1)}
                          <span className="ml-1 text-[15px] font-medium text-muted-foreground">kg</span>
                        </div>
                        {weights.length > 1 && (
                          <div className="mt-1.5 text-[13px] text-muted-foreground">
                            <span className={cn("font-semibold", (weights.at(-1)!.weightKg! - weights[0].weightKg!) * (lowerIsBetter ? 1 : -1) < 0 ? "text-primary" : "text-warning")}>
                              {fmt.signed(weights.at(-1)!.weightKg! - weights[0].weightKg!)} kg
                            </span>{" "}
                            {t("dall'inizio")}
                          </div>
                        )}
                      </div>
                      <Sparkline values={weights.map((w) => w.weightKg!)} className="h-16 min-w-40 flex-1" />
                    </div>
                  ) : (
                    <EmptyState compact emoji="chart-increasing" title={t("Nessuna misurazione")} action={<Button size="sm" onClick={() => changeTab("progressi")}>{t("Registra progresso")}</Button>} />
                  )}
                </Panel>
                <Panel>
                  <PanelHeader title={t("Attività recente")} />
                  {activity.length === 0 ? (
                    <EmptyState compact emoji="sparkles" title={t("Ancora nessuna attività")} />
                  ) : (
                    <ul className="flex flex-col gap-3 px-5 pb-5 md:px-6">
                      {activity.slice(0, 6).map((a) => {
                        const text = activityText(a, i18n);
                        return (
                          <li key={a.id} className="flex items-start gap-3">
                            <ActivityIcon type={a.type} />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-baseline justify-between gap-2">
                                <span className="truncate text-[13.5px] font-semibold">{text.title}</span>
                                <RelativeTime date={a.createdAt} className="shrink-0 text-[12px] text-muted-foreground" />
                              </div>
                              {text.description && <p className="truncate text-[12.5px] text-muted-foreground">{text.description}</p>}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </Panel>
              </div>
              <div className="flex flex-col gap-5">
                <ClientAccessPanel client={client} access={props.access} />
                <Panel>
                  <PanelHeader
                    title={t("Informazioni personali")}
                    actions={
                      <Button variant="ghost" size="icon-sm" onClick={() => setEditOpen(true)} aria-label={t("Modifica informazioni")}>
                        <Pencil />
                      </Button>
                    }
                  />
                  <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 px-5 pb-5 text-[13.5px] md:px-6">
                    <InfoRow label={t("Data di nascita")} value={client.birthDate ? `${fmt.dayKey(client.birthDate)}${age !== null ? ` · ${tn("{n} anno", "{n} anni", age)}` : ""}` : null} />
                    <InfoRow label={t("Sesso")} value={client.gender ? t(GENDER_LABELS[client.gender]) : null} />
                    <InfoRow label={t("Altezza")} value={client.heightCm ? `${fmt.number(client.heightCm)} cm` : null} />
                    <InfoRow label={t("Email")} value={client.email} />
                    <InfoRow label={t("Telefono")} value={client.phone} />
                    <InfoRow label={t("Inizio percorso")} value={fmt.dayKey(client.startDate)} />
                  </dl>
                </Panel>
                <Panel>
                  <PanelHeader title={t("Obiettivi")} />
                  <div className="px-5 pb-5 md:px-6">
                    <Badge variant="success" className="mb-2">
                      <Target /> {t(GOAL_LABELS[client.goal])}
                    </Badge>
                    <p className="text-[13.5px] leading-relaxed text-muted-foreground">{client.goalDetails ?? t("Aggiungi i dettagli dell'obiettivo dalla modifica del profilo.")}</p>
                  </div>
                </Panel>
                <Panel>
                  <PanelHeader
                    title={t("Prossimo appuntamento")}
                    actions={
                      <Button variant="ghost" size="icon-sm" onClick={() => setApptOpen("new")} aria-label={t("Nuovo appuntamento")}>
                        <CalendarPlus />
                      </Button>
                    }
                  />
                  <div className="px-5 pb-5 md:px-6">
                    {upcoming[0] ? (
                      <AppointmentRow a={upcoming[0]} onClick={() => setApptOpen(upcoming[0])} />
                    ) : (
                      <p className="text-[13.5px] text-muted-foreground">{t("Nessun appuntamento in programma.")}</p>
                    )}
                  </div>
                </Panel>
                {notes[0] && (
                  <Panel>
                    <PanelHeader
                      title={t("Ultima nota")}
                      actions={
                        <Button variant="ghost" size="sm" onClick={() => changeTab("note")}>
                          
                          {t("Tutte")}
                        </Button>
                      }
                    />
                    <p className="px-5 pb-5 text-[13.5px] leading-relaxed md:px-6">{notes[0].body}</p>
                  </Panel>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="allenamenti" className="mt-5">
            <PlanList
              empty={t("Nessuna scheda per questo cliente")}
              cta={
                <Button asChild>
                  <Link href={`/workouts/new?client=${client.id}`}>
                    <Plus /> {t("Nuova scheda")}
                  </Link>
                </Button>
              }
            >
              {workouts.map((w) => (
                <WorkoutPlanCard key={w.id} plan={w} client={info} />
              ))}
            </PlanList>
          </TabsContent>

          <TabsContent value="nutrizione" className="mt-5">
            <PlanList
              empty={t("Nessun piano alimentare per questo cliente")}
              cta={
                <Button asChild>
                  <Link href={`/nutrition/new?client=${client.id}`}>
                    <Plus /> {t("Nuovo piano alimentare")}
                  </Link>
                </Button>
              }
            >
              {nutrition.map((n) => (
                <NutritionPlanCard key={n.id} plan={n} client={info} />
              ))}
            </PlanList>
          </TabsContent>

          <TabsContent value="progressi" className="mt-5">
            <ProgressPanel clientId={client.id} clientName={name} records={progress} lowerIsBetter={lowerIsBetter} />
          </TabsContent>

          <TabsContent value="appuntamenti" className="mt-5">
            <div className="grid gap-5 lg:grid-cols-2">
              <Panel>
                <PanelHeader
                  title={t("In programma")}
                  actions={
                    <Button size="sm" onClick={() => setApptOpen("new")}>
                      <CalendarPlus /> {t("Nuovo")}
                    </Button>
                  }
                />
                <div className="flex flex-col gap-1 px-3 pb-3">
                  {upcoming.length ? upcoming.map((a) => <AppointmentRow key={a.id} a={a} onClick={() => setApptOpen(a)} />) : <EmptyState compact emoji="spiral-calendar" title={t("Nessun appuntamento in programma")} />}
                </div>
              </Panel>
              <Panel>
                <PanelHeader title={t("Storico")} />
                <div className="flex flex-col gap-1 px-3 pb-3">
                  {past.length ? past.map((a) => <AppointmentRow key={a.id} a={a} onClick={() => setApptOpen(a)} />) : <EmptyState compact emoji="calendar" title={t("Nessun appuntamento passato")} />}
                </div>
              </Panel>
            </div>
          </TabsContent>

          <TabsContent value="note" className="mt-5">
            <NotesPanel clientId={client.id} notes={notes} />
          </TabsContent>
        </Tabs>
      </PageContainer>

      <ClientFormSheet open={editOpen} onOpenChange={setEditOpen} client={client} onSaved={() => setEditOpen(false)} />
      <AppointmentFormSheet
        open={apptOpen !== null}
        onOpenChange={(o) => !o && setApptOpen(null)}
        appointment={apptOpen === "new" ? null : apptOpen}
        clients={options}
        defaultClientId={client.id}
      />
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="truncate text-right font-medium">{value ?? <span className="font-normal text-muted-foreground/70">—</span>}</dd>
    </>
  );
}

function CurrentPlan({ kind, plan, clientId }: { kind: "workout" | "nutrition"; plan: WorkoutPlanSummary | NutritionPlanSummary | null; clientId: string }) {
  const { tn, fmt, t } = useI18n();
  const isWorkout = kind === "workout";
  return (
    <Panel className={cn("flex flex-col gap-3 p-5", isWorkout ? "bg-forest text-white" : "bg-[#eef3ec]")}>
      <div className="flex items-center gap-3">
        <span className={cn("grid size-10 place-items-center rounded-xl", isWorkout ? "bg-white/12" : "bg-card text-primary")}>
          {isWorkout ? <Dumbbell className="size-5" /> : <Salad className="size-5" />}
        </span>
        <div className={cn("text-[12.5px] font-medium", isWorkout ? "text-white/70" : "text-muted-foreground")}>{isWorkout ? t("Scheda attuale") : t("Piano alimentare attuale")}</div>
      </div>
      {plan ? (
        <>
          <div>
            <div className="truncate text-[18px] font-semibold tracking-tight">{plan.name}</div>
            <div className={cn("text-[13px]", isWorkout ? "text-white/70" : "text-muted-foreground")}>
              {"weekdays" in plan
                ? `${tn("{n} giorno", "{n} giorni", plan.weekdays.length)} · ${tn("{n} esercizio", "{n} esercizi", plan.exerciseCount)} · ${plan.status === "published" ? t("pubblicata") : t("bozza")}`
                : `${tn("{n} giorno", "{n} giorni", plan.daysWithMeals.length)} · ${plan.avgKcal ? t("{kcal} kcal/die", { kcal: fmt.number(plan.avgKcal) }) : t("valori n/d")} · ${plan.status === "published" ? t("pubblicato") : t("bozza")}`}
            </div>
          </div>
          <div className="mt-auto flex gap-2">
            <Button asChild size="sm" variant={isWorkout ? "secondary" : "default"}>
              <Link href={`/${isWorkout ? "workouts" : "nutrition"}/${plan.id}`}>{t("Apri")}</Link>
            </Button>
            <Button asChild size="sm" variant="ghost" className={isWorkout ? "text-white hover:bg-white/10" : ""}>
              <a href={`/api/pdf/${kind}/${plan.id}`} target="_blank" rel="noopener">
                PDF
              </a>
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className={cn("text-[13.5px]", isWorkout ? "text-white/75" : "text-muted-foreground")}>{isWorkout ? t("Nessuna scheda assegnata.") : t("Nessun piano assegnato.")}</p>
          <Button asChild size="sm" variant={isWorkout ? "secondary" : "default"} className="mt-auto self-start">
            <Link href={`/${isWorkout ? "workouts" : "nutrition"}/new?client=${clientId}`}>
              <Plus /> {t("Crea")}
            </Link>
          </Button>
        </>
      )}
    </Panel>
  );
}

function PlanList({ children, empty, cta }: { children: React.ReactNode[]; empty: string; cta: React.ReactNode }) {
  if (children.length === 0)
    return (
      <Panel>
        <EmptyState emoji="clipboard" title={empty} action={cta} />
      </Panel>
    );
  return (
    <div className="flex flex-col gap-4">
      <div className="self-end">{cta}</div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{children}</div>
    </div>
  );
}

function AppointmentRow({ a, onClick }: { a: Appointment; onClick: () => void }) {
  const { fmt, t } = useI18n();
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors hover:bg-muted">
      <div className="flex w-12 shrink-0 flex-col items-center rounded-xl bg-pale py-1.5 text-forest">
        <span className="text-[10.5px] font-semibold uppercase">{fmt.instant(a.startsAt, { month: "short" })}</span>
        <span className="text-[17px] leading-tight font-bold tabular">{fmt.instant(a.startsAt, { day: "numeric" })}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13.5px] font-semibold">{a.title}</div>
        <div className="truncate text-[12.5px] text-muted-foreground">
          {fmt.instant(a.startsAt, { weekday: "long" }, true)} · {timeOf(a.startsAt)} · {t(APPOINTMENT_TYPE_LABELS[a.type])}
        </div>
      </div>
      {a.status !== "scheduled" && (
        <Badge variant={a.status === "completed" ? "success" : "neutral"} size="sm">
          {t(APPOINTMENT_STATUS_LABELS[a.status])}
        </Badge>
      )}
      <span className="sr-only">{dayKeyOf(a.startsAt)}</span>
    </button>
  );
}

function NotesPanel({ clientId, notes }: { clientId: string; notes: ClientNote[] }) {
  const { t } = useI18n();
  const confirm = useConfirm();
  const [body, setBody] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  const add = () =>
    startTransition(async () => {
      const res = await addClientNoteAction({ clientId, body });
      if (!res.ok) return void toast.error(res.error);
      setBody("");
      toast.success(t("Nota salvata"));
    });

  const remove = async (n: ClientNote) => {
    if (!(await confirm({ title: t("Eliminare la nota?"), description: n.body.slice(0, 140), confirmLabel: t("Elimina"), destructive: true }))) return;
    const res = await deleteClientNoteAction(n.id);
    if (res.ok) toast.success(t("Nota eliminata"));
    else toast.error(res.error);
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,420px)_1fr]">
      <Panel className="self-start p-5">
        <label htmlFor="note-body" className="text-[14px] font-semibold">
          
          {t("Nuova nota")}
        </label>
        <p className="mb-3 text-[12.5px] text-muted-foreground">{t("Visibile solo a te. Utile per infortuni, preferenze e osservazioni.")}</p>
        <Textarea
          id="note-body"
          rows={5}
          value={body}
          maxLength={4000}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && body.trim()) add();
          }}
          placeholder={t("Scrivi una nota…")}
        />
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[12px] text-muted-foreground tabular">{body.length}/4000</span>
          <Button onClick={add} disabled={!body.trim()} loading={pending}>
            <Send /> {t("Salva nota")}
          </Button>
        </div>
      </Panel>
      <Panel>
        <PanelHeader title={t("Note del coach")} description={`${notes.length} ${notes.length === 1 ? "nota" : "note"}`} />
        {notes.length === 0 ? (
          <EmptyState compact emoji="memo" title={t("Nessuna nota")} description={t("Le note che scrivi compariranno qui, dalla più recente.")} />
        ) : (
          <ul className="flex flex-col divide-y px-5 pb-2 md:px-6">
            {notes.map((n) => (
              <li key={n.id} className="group flex items-start gap-3 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{n.body}</p>
                  <RelativeTime date={n.createdAt} className="text-[12px] text-muted-foreground" />
                </div>
                <Button variant="ghost" size="icon-sm" onClick={() => remove(n)} aria-label={t("Elimina nota")} className="opacity-60 group-hover:opacity-100">
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

/** Tiny dependency-free sparkline (single series, so no legend). */
function Sparkline({ values, className }: { values: number[]; className?: string }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * 100, 100 - ((v - min) / span) * 84 - 8] as const);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className={className} aria-hidden>
      <path d={`${d} L100,100 L0,100 Z`} fill="var(--primary)" opacity="0.08" />
      <path d={d} fill="none" stroke="var(--primary)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
