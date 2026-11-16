"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import type { NutritionPlanSummary, WorkoutPlanSummary } from "@/lib/domain/types";
import type { PlanStatus } from "@/lib/domain/constants";
import { Topbar, PageContainer } from "@/components/shell/topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/menus";
import { Segmented } from "@/components/ui/misc";
import { EmptyState, Panel } from "@/components/common/basics";
import { NutritionPlanCard, WorkoutPlanCard } from "./plan-cards";
import { matches } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/client";

type Props =
  | { kind: "workout"; plans: WorkoutPlanSummary[]; clients: ClientLite[] }
  | { kind: "nutrition"; plans: NutritionPlanSummary[]; clients: ClientLite[] };
interface ClientLite {
  id: string;
  name: string;
  avatarUrl: string | null;
}
type Filter = "active" | PlanStatus;

export function PlansListView(props: Props) {
  const { t } = useI18n();
  const { kind, clients } = props;
  const fem = kind === "workout";
  const [status, setStatus] = React.useState<Filter>("active");
  const [clientId, setClientId] = React.useState<string>("all");
  const [query, setQuery] = React.useState("");
  const byId = React.useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);
  const plans = props.plans as (WorkoutPlanSummary | NutritionPlanSummary)[];

  const counts = React.useMemo(() => {
    const c: Record<Filter, number> = { active: 0, draft: 0, published: 0, archived: 0 };
    for (const p of plans) {
      c[p.status]++;
      if (p.status !== "archived") c.active++;
    }
    return c;
  }, [plans]);

  const visible = plans.filter(
    (p) =>
      (status === "active" ? p.status !== "archived" : p.status === status) &&
      (clientId === "all" || (clientId === "none" ? !p.clientId : p.clientId === clientId)) &&
      matches(`${p.name} ${p.clientId ? (byId.get(p.clientId)?.name ?? "") : ""}`, query),
  );
  const withPlans = clients.filter((c) => plans.some((p) => p.clientId === c.id));
  const newHref = fem ? "/workouts/new" : "/nutrition/new";

  return (
    <>
      <Topbar
        title={fem ? t("Schede di allenamento") : t("Piani alimentari")}
        breadcrumbs={[{ label: fem ? t("Schede di allenamento") : t("Piani alimentari") }]}
        actions={
          <Button asChild>
            <Link href={newHref}>
              <Plus /> <span className="max-sm:hidden">{fem ? t("Nuova scheda") : t("Nuovo piano")}</span>
            </Link>
          </Button>
        }
      />
      <PageContainer>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Segmented
            aria-label={t("Filtra per stato")}
            value={status}
            onValueChange={setStatus}
            options={(["active", "published", "draft", "archived"] as const).map((s) => ({
              value: s,
              label: s === "active" ? (fem ? t("Tutte") : t("Tutti")) : s === "published" ? (fem ? t("Pubblicate") : t("Pubblicati")) : s === "draft" ? t("Bozze") : fem ? t("Archiviate") : t("Archiviati"),
              badge: <span className="text-[11.5px] font-semibold text-muted-foreground/80 tabular">{counts[s]}</span>,
            }))}
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative sm:w-64">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={fem ? t("Cerca schede…") : t("Cerca piani…")} className="pl-9" aria-label={t("Cerca")} />
            </div>
            <Select
              aria-label={t("Filtra per cliente")}
              value={clientId}
              onValueChange={setClientId}
              className="sm:w-56"
              options={[{ value: "all", label: t("Tutti i clienti") }, { value: "none", label: t("Senza cliente") }, ...withPlans.map((c) => ({ value: c.id, label: c.name }))]}
            />
          </div>
        </div>

        {visible.length === 0 ? (
          <Panel className="mt-4">
            <EmptyState
              emoji={fem ? "person-lifting-weights" : "fork-and-knife-with-plate"}
              title={plans.length === 0 ? (fem ? t("Nessuna scheda ancora") : t("Nessun piano ancora")) : t("Nessun risultato con questi filtri")}
              description={plans.length === 0 ? (fem ? t("Crea la prima scheda di allenamento per un cliente.") : t("Crea il primo piano alimentare settimanale.")) : t("Modifica i filtri o la ricerca.")}
              action={
                plans.length === 0 ? (
                  <Button asChild>
                    <Link href={newHref}>
                      <Plus /> {fem ? t("Nuova scheda") : t("Nuovo piano")}
                    </Link>
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setStatus("active");
                      setClientId("all");
                      setQuery("");
                    }}
                  >
                    
                    {t("Azzera filtri")}
                  </Button>
                )
              }
            />
          </Panel>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((p) => {
              const c = p.clientId ? byId.get(p.clientId) : undefined;
              const info = c ? { name: c.name, avatarUrl: c.avatarUrl } : null;
              return kind === "workout" ? (
                <WorkoutPlanCard key={p.id} plan={p as WorkoutPlanSummary} client={info} />
              ) : (
                <NutritionPlanCard key={p.id} plan={p as NutritionPlanSummary} client={info} />
              );
            })}
          </div>
        )}
      </PageContainer>
    </>
  );
}
