import type { Metadata } from "next";
import Link from "next/link";
import { Activity, ArrowRight, CalendarCheck2, Scale, TimerReset, TrendingDown, TrendingUp, UserRound } from "lucide-react";
import { getRepository } from "@/lib/data";
import { getClientOptions } from "@/lib/data/queries";
import { getI18n } from "@/lib/i18n/server";
import { GOAL_LABELS } from "@/lib/domain/constants";
import type { Client, ProgressRecord } from "@/lib/domain/types";
import { addDaysToKey, diffInDays, todayKey } from "@/lib/datetime";
import { cn, groupBy } from "@/lib/utils";
import { Topbar, PageContainer } from "@/components/shell/topbar";
import { EmptyState, Panel, StatTile } from "@/components/common/basics";
import { Avatar } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { ProgressPanel } from "@/components/progress/progress-panel";
import { ProgressClientSwitcher } from "@/components/progress/progress-client-switcher";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("Progressi clienti") };
}

/** Days without a check-in before a client is flagged as "da aggiornare". */
const STALE_DAYS = 14;

interface Row {
  client: Client;
  records: ProgressRecord[];
  lastDate: string | null;
  lastWeight: number | null;
  delta: number | null;
  lowerIsBetter: boolean;
}

export default async function ProgressPage({ searchParams }: PageProps<"/progress">) {
  const [sp, { t, tn, fmt }] = await Promise.all([searchParams, getI18n()]);
  const repo = getRepository();
  const [clients, records, options] = await Promise.all([repo.listClients(), repo.listProgress(), getClientOptions()]);
  const today = todayKey();
  const byClient = groupBy(records, (r) => r.clientId);

  const rows: Row[] = clients
    .filter((c) => c.status !== "archived")
    .map((client) => {
      const list = [...(byClient.get(client.id) ?? [])].sort((a, b) => a.date.localeCompare(b.date));
      const weights = list.filter((r) => r.weightKg !== null);
      const first = weights[0]?.weightKg ?? null;
      const last = weights.at(-1)?.weightKg ?? null;
      return {
        client,
        records: list,
        lastDate: list.at(-1)?.date ?? null,
        lastWeight: last,
        delta: weights.length > 1 && first !== null && last !== null ? last - first : null,
        lowerIsBetter: client.goal !== "muscle_gain",
      };
    })
    .sort((a, b) => (b.lastDate ?? "").localeCompare(a.lastDate ?? "") || a.client.firstName.localeCompare(b.client.firstName));

  const requested = typeof sp.client === "string" ? sp.client : null;
  const selected = rows.find((r) => r.client.id === requested) ?? rows.find((r) => r.records.length > 0) ?? rows[0] ?? null;
  const isStale = (r: Row) => !r.lastDate || diffInDays(today, r.lastDate) > STALE_DAYS;

  const monitored = rows.filter((r) => r.records.length > 0).length;
  const last30 = records.filter((r) => r.date >= addDaysToKey(today, -30)).length;
  const stale = rows.filter(isStale).length;
  const improving = rows.filter((r) => r.delta !== null && (r.lowerIsBetter ? r.delta < 0 : r.delta > 0)).length;
  const selectedName = selected ? `${selected.client.firstName} ${selected.client.lastName}` : "";

  return (
    <>
      <Topbar
        title={t("Progressi clienti")}
        breadcrumbs={[{ label: t("Monitoraggio") }]}
        actions={
          selected && (
            <Button asChild variant="secondary" className="max-sm:hidden">
              <Link href={`/clients/${selected.client.id}?tab=progressi`}>
                <UserRound /> {t("Apri profilo")}
              </Link>
            </Button>
          )
        }
      />
      <PageContainer>
        <section aria-label={t("Riepilogo")} className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
          <StatTile icon={<Activity />} label={t("Clienti monitorati")} value={monitored} hint={t("su {n} attivi", { n: rows.length })} />
          <StatTile icon={<CalendarCheck2 />} label={t("Check-in ultimi 30 giorni")} value={last30} hint={tn("{n} misurazione", "{n} misurazioni", records.length) + " " + t("in totale")} />
          <StatTile icon={<TrendingDown />} label={t("In linea con l'obiettivo")} value={improving} hint={t("peso verso l'obiettivo")} />
          <StatTile icon={<TimerReset />} label={t("Da aggiornare")} value={stale} hint={t("nessun check-in da {n}+ giorni", { n: STALE_DAYS })} />
        </section>

        {!selected ? (
          <Panel className="mt-6">
            <EmptyState
              emoji="chart-increasing"
              title={t("Nessun cliente da monitorare")}
              description={t("Aggiungi un cliente per iniziare a registrare peso, misure e check-in.")}
              action={
                <Button asChild>
                  <Link href="/clients?new=1">{t("Nuovo cliente")}</Link>
                </Button>
              }
            />
          </Panel>
        ) : (
          <div className="mt-6 grid items-start gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
            <Panel className="overflow-hidden max-lg:hidden lg:sticky lg:top-[84px]">
              <div className="flex items-center justify-between px-5 pt-4 pb-2">
                <h2 className="text-[15px] font-semibold">{t("Clienti")}</h2>
                <span className="text-[12px] text-muted-foreground">{t("Ultimo check-in")}</span>
              </div>
              <ul className="flex max-h-[calc(100dvh-220px)] flex-col gap-0.5 overflow-y-auto px-2 pb-2 scrollbar-none">
                {rows.map((r) => {
                  const active = r.client.id === selected.client.id;
                  const good = r.delta !== null && (r.lowerIsBetter ? r.delta < 0 : r.delta > 0);
                  const Trend = r.delta !== null && r.delta > 0 ? TrendingUp : TrendingDown;
                  return (
                    <li key={r.client.id}>
                      <Link
                        href={`/progress?client=${r.client.id}`}
                        scroll={false}
                        aria-current={active ? "true" : undefined}
                        className={cn(
                          "flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors",
                          active ? "bg-pale" : "hover:bg-muted/70",
                        )}
                      >
                        <Avatar src={r.client.avatarUrl} name={`${r.client.firstName} ${r.client.lastName}`} size={38} />
                        <div className="min-w-0 flex-1">
                          <div className={cn("truncate text-[14px]", active ? "font-semibold text-forest" : "font-medium")}>
                            {r.client.firstName} {r.client.lastName}
                          </div>
                          <div className="truncate text-[12px] text-muted-foreground">
                            {r.lastDate ? fmt.dayKey(r.lastDate, { day: "numeric", month: "short" }) : t("Nessuna misura")}
                            {r.lastWeight !== null && ` · ${fmt.number(r.lastWeight, 1)} kg`}
                          </div>
                        </div>
                        {r.delta !== null ? (
                          <span className={cn("flex items-center gap-0.5 text-[12px] font-semibold tabular", good ? "text-primary" : "text-warning")}>
                            <Trend className="size-3.5" />
                            {fmt.signed(r.delta)}
                          </span>
                        ) : (
                          isStale(r) && <span className="size-2 rounded-full bg-warning" aria-label={t("Da aggiornare")} />
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Panel>

            <div className="flex min-w-0 flex-col gap-4">
              <ProgressClientSwitcher clients={options.filter((o) => o.status !== "archived")} value={selected.client.id} className="lg:hidden" />

              <Panel className="flex flex-wrap items-center gap-4 p-4 md:px-6">
                <Avatar src={selected.client.avatarUrl} name={selectedName} size={52} />
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-[18px] font-semibold tracking-tight">{selectedName}</h2>
                  <p className="truncate text-[13px] text-muted-foreground">
                    {t(GOAL_LABELS[selected.client.goal])}
                    {selected.client.heightCm ? ` · ${fmt.number(selected.client.heightCm)} cm` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-6 max-sm:w-full max-sm:justify-between">
                  <Metric label={t("Peso attuale")} value={selected.lastWeight !== null ? `${fmt.number(selected.lastWeight, 1)} kg` : "—"} icon={<Scale className="size-4" />} />
                  <Metric
                    label={t("Dall'inizio")}
                    value={selected.delta !== null ? `${fmt.signed(selected.delta)} kg` : "—"}
                    tone={selected.delta === null ? undefined : (selected.lowerIsBetter ? selected.delta < 0 : selected.delta > 0) ? "good" : "warn"}
                  />
                  <Button asChild variant="ghost" size="icon" className="sm:hidden" aria-label={t("Apri profilo")}>
                    <Link href={`/clients/${selected.client.id}?tab=progressi`}>
                      <ArrowRight />
                    </Link>
                  </Button>
                </div>
              </Panel>

              <ProgressPanel key={selected.client.id} clientId={selected.client.id} clientName={selectedName} records={selected.records} lowerIsBetter={selected.lowerIsBetter} />
            </div>
          </div>
        )}
      </PageContainer>
    </>
  );
}

function Metric({ label, value, icon, tone }: { label: string; value: string; icon?: React.ReactNode; tone?: "good" | "warn" }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1 text-[12px] font-medium text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className={cn("text-[17px] font-semibold tabular", tone === "good" && "text-primary", tone === "warn" && "text-warning")}>{value}</div>
    </div>
  );
}
