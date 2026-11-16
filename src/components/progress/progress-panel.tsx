"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { ArrowDownRight, ArrowUpRight, Minus, Plus, Trash2 } from "lucide-react";
import type { ProgressRecord } from "@/lib/domain/types";
import { PROGRESS_METRICS, PROGRESS_METRIC_LABELS, type ProgressMetric } from "@/lib/domain/constants";
import { deleteProgressAction } from "@/lib/actions/schedule";
import { Panel, PanelHeader, EmptyState } from "@/components/common/basics";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/misc";
import { useConfirm } from "@/components/common/confirm";
import { ProgressFormSheet } from "./progress-form-sheet";
import { cn } from "@/lib/utils";

import { useI18n } from "@/lib/i18n/client";

interface Props {
  clientId: string;
  clientName: string;
  records: ProgressRecord[];
  /** Lower is better for these (weight loss goals etc.) – only used for delta colour. */
  lowerIsBetter?: boolean;
  className?: string;
}

export function ProgressPanel({ clientId, clientName, records, lowerIsBetter = true, className }: Props) {
  const { fmt, t } = useI18n();
  const confirm = useConfirm();
  const [formOpen, setFormOpen] = React.useState(false);
  const available = PROGRESS_METRICS.filter((m) => records.some((r) => r[m] !== null));
  const [metric, setMetric] = React.useState<ProgressMetric>(available[0] ?? "weightKg");
  const active = available.includes(metric) ? metric : (available[0] ?? "weightKg");
  const sorted = React.useMemo(() => [...records].sort((a, b) => a.date.localeCompare(b.date)), [records]);

  const series = sorted.filter((r) => r[active] !== null).map((r) => ({ date: r.date, value: r[active] as number }));
  const meta = PROGRESS_METRIC_LABELS[active];

  const kpi = (m: ProgressMetric) => {
    const list = sorted.filter((r) => r[m] !== null);
    if (!list.length) return null;
    const first = list[0][m] as number;
    const last = list[list.length - 1][m] as number;
    return { last, delta: list.length > 1 ? last - first : null, since: list[0].date };
  };

  const remove = async (r: ProgressRecord) => {
    const ok = await confirm({
      title: t("Eliminare questa misurazione?"),
      description: t("Misurazione del {date}. L'operazione non può essere annullata.", { date: fmt.dayKey(r.date) }),
      confirmLabel: t("Elimina"),
      destructive: true,
    });
    if (!ok) return;
    const res = await deleteProgressAction(r.id);
    if (res.ok) toast.success(t("Misurazione eliminata"));
    else toast.error(res.error);
  };

  return (
    <div className={cn("flex flex-col gap-5", className)}>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {(["weightKg", "bodyFatPct", "waistCm", "hipsCm"] as const).map((m) => {
          const k = kpi(m);
          const info = PROGRESS_METRIC_LABELS[m];
          const good = k?.delta != null && (lowerIsBetter ? k.delta < 0 : k.delta > 0);
          return (
            <div key={m} className="rounded-2xl border bg-card p-4 shadow-card">
              <div className="text-[12.5px] font-medium text-muted-foreground">{t(info.label)}</div>
              <div className="mt-0.5 text-[22px] font-semibold tracking-tight tabular">
                {k ? fmt.number(k.last, info.digits) : "—"}
                {k && <span className="ml-1 text-[13px] font-medium text-muted-foreground">{info.unit}</span>}
              </div>
              {k?.delta != null ? (
                <div className={cn("mt-0.5 inline-flex items-center gap-1 text-[12.5px] font-medium", k.delta === 0 ? "text-muted-foreground" : good ? "text-primary" : "text-warning")}>
                  {k.delta < 0 ? <ArrowDownRight className="size-3.5" /> : k.delta > 0 ? <ArrowUpRight className="size-3.5" /> : <Minus className="size-3.5" />}
                  {fmt.signed(k.delta, info.digits === 0 ? 0 : 1)} {info.unit} dal {fmt.dayKey(k.since, { day: "numeric", month: "short" })}
                </div>
              ) : (
                <div className="mt-0.5 text-[12.5px] text-muted-foreground">{k ? t("Una sola misurazione") : t("Nessun dato")}</div>
              )}
            </div>
          );
        })}
      </div>

      <Panel>
        <PanelHeader
          title={t("Andamento · {label}", { label: meta.label })}
          description={series.length ? `${series.length} misurazioni` : t("Nessuna misurazione")}
          actions={
            <Button size="sm" onClick={() => setFormOpen(true)}>
              <Plus /> {t("Registra progresso")}
            </Button>
          }
        />
        {available.length > 1 && (
          <div className="px-5 md:px-6">
            <Segmented
              aria-label={t("Metrica")}
              size="sm"
              value={active}
              onValueChange={setMetric}
              options={available.map((m) => ({ value: m, label: t(PROGRESS_METRIC_LABELS[m].label) }))}
            />
          </div>
        )}
        {series.length >= 2 ? (
          <div className="h-[260px] px-2 pt-4 pb-3 md:h-[300px] md:px-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id={`fill-${clientId}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d: string) => fmt.dayKey(d, { day: "numeric", month: "short" })}
                  tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={24}
                />
                <YAxis
                  domain={["dataMin - 1", "dataMax + 1"]}
                  tickFormatter={(v: number) => fmt.number(v, meta.digits)}
                  allowDecimals={meta.digits > 0}
                  tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                />
                <Tooltip
                  cursor={{ stroke: "var(--border-strong)", strokeWidth: 1 }}
                  content={({ active: isActive, payload }) =>
                    isActive && payload?.[0] ? (
                      <div className="rounded-xl border bg-card px-3 py-2 shadow-pop">
                        <div className="text-[12px] text-muted-foreground">{fmt.dayKey(String(payload[0].payload.date), { weekday: "short", day: "numeric", month: "long" }, true)}</div>
                        <div className="text-[15px] font-semibold tabular">
                          {fmt.number(Number(payload[0].value), meta.digits)} {meta.unit}
                        </div>
                      </div>
                    ) : null
                  }
                />
                <Area type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={2} fill={`url(#fill-${clientId})`} dot={{ r: 3, fill: "var(--card)", stroke: "var(--primary)", strokeWidth: 2 }} activeDot={{ r: 5, stroke: "var(--card)", strokeWidth: 2, fill: "var(--primary)" }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState
            compact
            emoji="chart-increasing"
            title={series.length === 1 ? t("Serve almeno un'altra misurazione") : t("Nessuna misurazione")}
            description={t("Registra le misure a ogni check-in per vedere l'andamento nel tempo.")}
          />
        )}
      </Panel>

      <Panel>
        <PanelHeader title={t("Storico misurazioni")} description={t("Dalla più recente")} />
        {sorted.length === 0 ? (
          <EmptyState compact emoji="memo" title={t("Storico vuoto")} action={<Button size="sm" onClick={() => setFormOpen(true)}>{t("Registra la prima misurazione")}</Button>} />
        ) : (
          <div className="scrollbar-thin overflow-x-auto pb-2">
            <table className="w-full min-w-[640px] text-left text-[13.5px]">
              <thead>
                <tr className="border-y bg-muted/40 text-[12px] text-muted-foreground">
                  <th className="px-6 py-2.5 font-semibold">{t("Data")}</th>
                  {PROGRESS_METRICS.map((m) => (
                    <th key={m} className="px-3 py-2.5 text-right font-semibold">
                      {t(PROGRESS_METRIC_LABELS[m].label)} <span className="font-normal">({PROGRESS_METRIC_LABELS[m].unit})</span>
                    </th>
                  ))}
                  <th className="px-3 py-2.5 font-semibold">{t("Note")}</th>
                  <th className="w-12" />
                </tr>
              </thead>
              <tbody>
                {[...sorted].reverse().map((r) => (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="px-6 py-2.5 font-medium whitespace-nowrap">{fmt.dayKey(r.date, { day: "numeric", month: "short", year: "numeric" })}</td>
                    {PROGRESS_METRICS.map((m) => (
                      <td key={m} className="px-3 py-2.5 text-right tabular">
                        {r[m] !== null ? fmt.number(r[m], PROGRESS_METRIC_LABELS[m].digits) : <span className="text-muted-foreground/60">—</span>}
                      </td>
                    ))}
                    <td className="max-w-[220px] truncate px-3 py-2.5 text-muted-foreground" title={r.notes ?? undefined}>
                      {r.notes ?? ""}
                    </td>
                    <td className="pr-3">
                      <Button variant="ghost" size="icon-sm" onClick={() => remove(r)} aria-label={t("Elimina misurazione del {date}", { date: fmt.dayKey(r.date) })}>
                        <Trash2 className="text-muted-foreground" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <ProgressFormSheet open={formOpen} onOpenChange={setFormOpen} clientId={clientId} clientName={clientName} />
    </div>
  );
}
