"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Archive, ArchiveRestore, Copy, Dumbbell, FileDown, MoreHorizontal, Pencil, Salad, Send, Trash2, Undo2 } from "lucide-react";
import type { NutritionPlanSummary, WorkoutPlanSummary } from "@/lib/domain/types";
import type { PlanStatus } from "@/lib/domain/constants";
import { WEEKDAY_SHORT } from "@/lib/domain/constants";
import { deleteWorkoutPlanAction, duplicateWorkoutPlanAction, setWorkoutStatusAction } from "@/lib/actions/workouts";
import { deleteNutritionPlanAction, duplicateNutritionPlanAction, setNutritionStatusAction } from "@/lib/actions/nutrition";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/misc";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/menus";
import { PlanStatusBadge } from "@/components/common/basics";
import { RelativeTime } from "@/components/common/relative-time";
import { useConfirm } from "@/components/common/confirm";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/client";

type Kind = "workout" | "nutrition";
interface ClientInfo {
  name: string;
  avatarUrl: string | null;
}

const ops = {
  workout: { dup: duplicateWorkoutPlanAction, status: setWorkoutStatusAction, del: deleteWorkoutPlanAction, base: "/workouts", pdf: "/api/pdf/workout" },
  nutrition: { dup: duplicateNutritionPlanAction, status: setNutritionStatusAction, del: deleteNutritionPlanAction, base: "/nutrition", pdf: "/api/pdf/nutrition" },
} as const;

export function PlanActionsMenu({ kind, id, name, status, className }: { kind: Kind; id: string; name: string; status: PlanStatus; className?: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const confirm = useConfirm();
  const op = ops[kind];
  const fem = kind === "workout";

  const setStatus = async (next: PlanStatus) => {
    const res = await op.status(id, next);
    if (!res.ok) return void toast.error(res.error);
    toast.success(
      next === "published" ? (fem ? t("Scheda pubblicata") : t("Piano pubblicato")) : next === "archived" ? (fem ? t("Scheda archiviata") : t("Piano archiviato")) : t("Spostato nelle bozze"),
    );
  };

  const duplicate = async () => {
    const res = await op.dup(id);
    if (!res.ok) return void toast.error(res.error);
    toast.success(fem ? t("Scheda duplicata: puoi modificarla ora") : t("Piano duplicato: puoi modificarlo ora"));
    router.push(`${op.base}/${res.data.id}`);
  };

  const remove = async () => {
    const ok = await confirm({
      title: t("Eliminare “{name}”?", { name }),
      description: fem ? t("La scheda verrà eliminata definitivamente. L'operazione non può essere annullata.") : t("Il piano verrà eliminato definitivamente. L'operazione non può essere annullata."),
      confirmLabel: t("Elimina"),
      destructive: true,
    });
    if (!ok) return;
    const res = await op.del(id);
    if (!res.ok) return void toast.error(res.error);
    toast.success(fem ? t("Scheda eliminata") : t("Piano eliminato"));
    router.refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" className={className} aria-label={t("Azioni per {name}", { name })} onClick={(e) => e.stopPropagation()}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem asChild>
          <Link href={`${op.base}/${id}`}>
            <Pencil /> {t("Apri e modifica")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={duplicate}>
          <Copy /> {t("Duplica")}
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={`${op.pdf}/${id}`} target="_blank" rel="noopener">
            <FileDown /> {t("Esporta PDF")}
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {status === "draft" && (
          <DropdownMenuItem onSelect={() => setStatus("published")}>
            <Send /> {t("Pubblica")}
          </DropdownMenuItem>
        )}
        {status === "published" && (
          <DropdownMenuItem onSelect={() => setStatus("draft")}>
            <Undo2 /> {t("Riporta in bozza")}
          </DropdownMenuItem>
        )}
        {status !== "archived" ? (
          <DropdownMenuItem onSelect={() => setStatus("archived")}>
            <Archive /> {t("Archivia")}
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={() => setStatus("draft")}>
            <ArchiveRestore /> {t("Ripristina come bozza")}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem destructive onSelect={remove}>
          <Trash2 /> {t("Elimina")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CardShell({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  const router = useRouter();
  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => router.push(href)}
      onKeyDown={(e) => {
        if (e.key === "Enter") router.push(href);
      }}
      className={cn(
        "group flex cursor-pointer flex-col gap-4 rounded-3xl border bg-card p-5 shadow-card outline-none transition-[transform,box-shadow,border-color] duration-200 ease-[var(--ease-soft)] hover:-translate-y-0.5 hover:border-border-strong hover:shadow-raised focus-visible:ring-[3px] focus-visible:ring-ring/30",
        className,
      )}
    >
      {children}
    </div>
  );
}

function ClientLine({ client }: { client: ClientInfo | null }) {
  const { t } = useI18n();
  return client ? (
    <div className="flex min-w-0 items-center gap-2 text-[13px] text-muted-foreground">
      <Avatar src={client.avatarUrl} name={client.name} size={22} />
      <span className="truncate">{client.name}</span>
    </div>
  ) : (
    <div className="text-[13px] text-muted-foreground">{t("Senza cliente")}</div>
  );
}

export function WorkoutPlanCard({ plan, client }: { plan: WorkoutPlanSummary; client: ClientInfo | null }) {
  const { tn, t } = useI18n();
  return (
    <CardShell href={`/workouts/${plan.id}`}>
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-forest text-white">
          <Dumbbell className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15.5px] font-semibold tracking-tight">{plan.name}</h3>
          <ClientLine client={client} />
        </div>
        <PlanActionsMenu kind="workout" id={plan.id} name={plan.name} status={plan.status} className="-mt-1 -mr-2" />
      </div>
      <div className="flex gap-1">
        {WEEKDAY_SHORT.map((x) => t(x)).map((d, i) => (
          <span
            key={d}
            className={cn(
              "grid h-7 flex-1 place-items-center rounded-lg text-[11.5px] font-semibold",
              plan.weekdays.includes(i) ? "bg-pale text-forest" : "bg-muted/70 text-muted-foreground/50",
            )}
          >
            {d}
          </span>
        ))}
      </div>
      <div className="flex items-center justify-between gap-2 text-[12.5px] text-muted-foreground">
        <span className="tabular">
          
          {tn("{n} esercizio", "{n} esercizi", plan.exerciseCount)} · {tn("one|{n} serie", "{n} serie", plan.totalSets)}
        </span>
        <div className="flex items-center gap-2">
          <PlanStatusBadge status={plan.status} kind="workout" size="sm" />
          <RelativeTime date={plan.updatedAt} />
        </div>
      </div>
    </CardShell>
  );
}

export function NutritionPlanCard({ plan, client }: { plan: NutritionPlanSummary; client: ClientInfo | null }) {
  const { fmt, t } = useI18n();
  const pct = plan.avgKcal && plan.targetKcal ? Math.min(100, Math.round((plan.avgKcal / plan.targetKcal) * 100)) : null;
  return (
    <CardShell href={`/nutrition/${plan.id}`}>
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-pale text-primary">
          <Salad className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15.5px] font-semibold tracking-tight">{plan.name}</h3>
          <ClientLine client={client} />
        </div>
        <PlanActionsMenu kind="nutrition" id={plan.id} name={plan.name} status={plan.status} className="-mt-1 -mr-2" />
      </div>
      <div>
        <div className="flex items-baseline justify-between text-[12.5px]">
          <span className="text-muted-foreground">{t("Media giornaliera")}</span>
          <span className="font-semibold tabular">
            {plan.avgKcal ? `${fmt.number(plan.avgKcal)} kcal` : "n/d"}
            {plan.targetKcal && <span className="font-normal text-muted-foreground"> / {fmt.number(plan.targetKcal)}</span>}
          </span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary" style={{ width: `${pct ?? 0}%` }} />
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 text-[12.5px] text-muted-foreground">
        <span className="tabular">
          {plan.daysWithMeals.length}/7 giorni · {plan.mealCount} pasti
        </span>
        <div className="flex items-center gap-2">
          <PlanStatusBadge status={plan.status} kind="nutrition" size="sm" />
          <RelativeTime date={plan.updatedAt} />
        </div>
      </div>
    </CardShell>
  );
}
