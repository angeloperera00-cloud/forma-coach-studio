"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Dumbbell, Salad, Search, UserPlus } from "lucide-react";
import type { Client, ClientOption } from "@/lib/domain/types";
import { CLIENT_STATUS_LABELS, GOALS, GOAL_LABELS, type ClientStatus, type Goal } from "@/lib/domain/constants";
import { Topbar, PageContainer } from "@/components/shell/topbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/menus";
import { Avatar, Segmented } from "@/components/ui/misc";
import { ClientStatusBadge, EmptyState, Panel, PlanStatusBadge } from "@/components/common/basics";
import { RelativeTime } from "@/components/common/relative-time";
import { ClientFormSheet } from "./client-form-sheet";
import { ClientActionsMenu } from "./client-actions-menu";
import { cn, matches } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/client";

export type ClientRow = Client & { workout: ClientOption["workout"]; nutrition: ClientOption["nutrition"] };

type StatusFilter = "all" | ClientStatus;
const col = createColumnHelper<ClientRow>();
const PAGE_SIZE = 10;

export function ClientsView({ rows }: { rows: ClientRow[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const [createOpen, setCreateOpen] = React.useState(params.get("new") === "1");
  const [editing, setEditing] = React.useState<Client | null>(null);
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState<StatusFilter>("active");
  const [goal, setGoal] = React.useState<Goal | "all">("all");
  const [sorting, setSorting] = React.useState<SortingState>([{ id: "lastActivityAt", desc: true }]);

  React.useEffect(() => {
    if (params.get("new") === "1") {
      setCreateOpen(true);
      router.replace("/clients", { scroll: false });
    }
  }, [params, router]);

  const counts = React.useMemo(() => {
    const c = { all: rows.length, active: 0, paused: 0, archived: 0 } as Record<StatusFilter, number>;
    for (const r of rows) c[r.status]++;
    return c;
  }, [rows]);

  const data = React.useMemo(
    () =>
      rows.filter(
        (r) =>
          (status === "all" || r.status === status) &&
          (goal === "all" || r.goal === goal) &&
          matches(`${r.firstName} ${r.lastName} ${r.email ?? ""} ${r.phone ?? ""} ${r.workout?.name ?? ""}`, query),
      ),
    [rows, status, goal, query],
  );

  const columns = React.useMemo(
    () => [
      col.accessor((r) => `${r.firstName} ${r.lastName}`, {
        id: "name",
        header: t("Cliente"),
        sortingFn: (a, b) => a.getValue<string>("name").localeCompare(b.getValue<string>("name"), "it"),
        cell: ({ row }) => (
          <div className="flex min-w-0 items-center gap-3">
            <Avatar src={row.original.avatarUrl} name={`${row.original.firstName} ${row.original.lastName}`} size={38} />
            <div className="min-w-0 leading-tight">
              <Link href={`/clients/${row.original.id}`} className="block truncate text-[14px] font-semibold hover:underline" onClick={(e) => e.stopPropagation()}>
                {row.original.firstName} {row.original.lastName}
              </Link>
              <div className="truncate text-[12.5px] text-muted-foreground">{row.original.email ?? row.original.phone ?? "—"}</div>
            </div>
          </div>
        ),
      }),
      col.accessor("goal", {
        header: t("Obiettivo"),
        sortingFn: (a, b) => t(GOAL_LABELS[a.original.goal]).localeCompare(t(GOAL_LABELS[b.original.goal]), "it"),
        cell: ({ getValue }) => <span className="text-[13.5px]">{t(GOAL_LABELS[getValue()])}</span>,
      }),
      col.display({
        id: "workout",
        header: t("Scheda assegnata"),
        cell: ({ row }) => <PlanCell plan={row.original.workout} kind="workout" />,
      }),
      col.display({
        id: "nutrition",
        header: t("Piano alimentare"),
        cell: ({ row }) => <PlanCell plan={row.original.nutrition} kind="nutrition" />,
      }),
      col.accessor((r) => r.lastActivityAt ?? "", {
        id: "lastActivityAt",
        header: t("Ultima attività"),
        cell: ({ row }) =>
          row.original.lastActivityAt ? <RelativeTime date={row.original.lastActivityAt} className="text-[13px] text-muted-foreground" /> : <span className="text-muted-foreground">—</span>,
      }),
      col.accessor("status", {
        header: t("Stato"),
        sortingFn: (a, b) => t(CLIENT_STATUS_LABELS[a.original.status]).localeCompare(t(CLIENT_STATUS_LABELS[b.original.status])),
        cell: ({ getValue }) => <ClientStatusBadge status={getValue()} size="sm" />,
      }),
      col.display({
        id: "actions",
        header: () => <span className="sr-only">{t("Azioni")}</span>,
        cell: ({ row }) => (
          <div onClick={(e) => e.stopPropagation()} className="flex justify-end">
            <ClientActionsMenu client={row.original} onEdit={() => setEditing(row.original)} />
          </div>
        ),
      }),
    ],
    [t],
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: PAGE_SIZE } },
    autoResetPageIndex: true,
  });

  const pageRows = table.getRowModel().rows;
  const { pageIndex } = table.getState().pagination;
  const from = data.length === 0 ? 0 : pageIndex * PAGE_SIZE + 1;
  const to = Math.min(data.length, (pageIndex + 1) * PAGE_SIZE);

  return (
    <>
      <Topbar
        title={t("Clienti")}
        breadcrumbs={[{ label: t("Clienti") }]}
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <UserPlus /> <span className="max-sm:hidden">{t("Nuovo cliente")}</span>
          </Button>
        }
      />
      <PageContainer>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Segmented
            aria-label={t("Filtra per stato")}
            value={status}
            onValueChange={setStatus}
            options={(["active", "paused", "archived", "all"] as const).map((s) => ({
              value: s,
              label: s === "all" ? t("Tutti") : s === "active" ? t("Attivi") : s === "paused" ? t("In pausa") : t("Archiviati"),
              badge: <span className="text-[11.5px] font-semibold text-muted-foreground/80 tabular">{counts[s]}</span>,
            }))}
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative sm:w-72">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("Cerca per nome, email, scheda…")} className="pl-9" aria-label={t("Cerca clienti")} />
            </div>
            <Select
              aria-label={t("Filtra per obiettivo")}
              value={goal}
              onValueChange={setGoal}
              className="sm:w-56"
              options={[{ value: "all", label: t("Tutti gli obiettivi") }, ...GOALS.map((g) => ({ value: g, label: t(GOAL_LABELS[g]) }))]}
            />
          </div>
        </div>

        <Panel className="mt-4 overflow-hidden">
          {data.length === 0 ? (
            <EmptyState
              emoji="busts-in-silhouette"
              title={rows.length === 0 ? t("Nessun cliente") : t("Nessun cliente corrisponde ai filtri")}
              description={rows.length === 0 ? t("Aggiungi il primo cliente per iniziare a creare schede e piani.") : t("Prova a cambiare stato, obiettivo o testo di ricerca.")}
              action={
                rows.length === 0 ? (
                  <Button onClick={() => setCreateOpen(true)}>
                    <UserPlus /> {t("Nuovo cliente")}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setQuery("");
                      setGoal("all");
                      setStatus("all");
                    }}
                  >
                    
                    {t("Azzera filtri")}
                  </Button>
                )
              }
            />
          ) : (
            <>
              {/* Desktop table */}
              <div className="max-md:hidden">
                <table className="w-full table-fixed text-left">
                  <colgroup>
                    <col className="w-[26%]" />
                    <col className="w-[13%]" />
                    <col className="w-[17%]" />
                    <col className="w-[17%]" />
                    <col className="w-[11%]" />
                    <col className="w-[10%]" />
                    <col className="w-[56px]" />
                  </colgroup>
                  <thead>
                    {table.getHeaderGroups().map((hg) => (
                      <tr key={hg.id} className="border-b bg-muted/40">
                        {hg.headers.map((h) => {
                          const sortable = h.column.getCanSort() && h.column.id !== "workout" && h.column.id !== "nutrition" && h.column.id !== "actions";
                          const dir = h.column.getIsSorted();
                          return (
                            <th key={h.id} scope="col" className="px-4 py-3 text-[12px] font-semibold text-muted-foreground first:pl-6" aria-sort={dir ? (dir === "asc" ? "ascending" : "descending") : undefined}>
                              {sortable ? (
                                <button onClick={h.column.getToggleSortingHandler()} className="inline-flex items-center gap-1 rounded transition-colors hover:text-foreground">
                                  {flexRender(h.column.columnDef.header, h.getContext())}
                                  {dir === "asc" ? <ArrowUp className="size-3.5" /> : dir === "desc" ? <ArrowDown className="size-3.5" /> : <ArrowUpDown className="size-3.5 opacity-50" />}
                                </button>
                              ) : (
                                flexRender(h.column.columnDef.header, h.getContext())
                              )}
                            </th>
                          );
                        })}
                      </tr>
                    ))}
                  </thead>
                  <tbody>
                    {pageRows.map((row) => (
                      <tr
                        key={row.id}
                        onClick={() => router.push(`/clients/${row.original.id}`)}
                        className="cursor-pointer border-b transition-colors last:border-0 hover:bg-muted/50"
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} className="px-4 py-3 align-middle first:pl-6">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <ul className="divide-y md:hidden">
                {pageRows.map(({ original: c }) => (
                  <li key={c.id} className="flex items-center gap-3 px-4 py-3.5">
                    <Link href={`/clients/${c.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                      <Avatar src={c.avatarUrl} name={`${c.firstName} ${c.lastName}`} size={44} />
                      <div className="min-w-0 flex-1 leading-tight">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-[15px] font-semibold">
                            {c.firstName} {c.lastName}
                          </span>
                          <ClientStatusBadge status={c.status} size="sm" />
                        </div>
                        <div className="truncate text-[13px] text-muted-foreground">{t(GOAL_LABELS[c.goal])}</div>
                        <div className="mt-1 flex gap-1.5 text-[12px] text-muted-foreground">
                          <span className={cn("inline-flex items-center gap-1", c.workout?.status === "published" && "text-primary")}>
                            <Dumbbell className="size-3.5" /> {c.workout ? c.workout.name : "—"}
                          </span>
                        </div>
                      </div>
                    </Link>
                    <ClientActionsMenu client={c} onEdit={() => setEditing(c)} />
                  </li>
                ))}
              </ul>

              <div className="flex items-center justify-between gap-3 border-t px-4 py-3 text-[13px] text-muted-foreground md:px-6">
                <span className="tabular">
                  {from}–{to} di {data.length} clienti
                </span>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon-sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} aria-label={t("Pagina precedente")}>
                    <ChevronLeft />
                  </Button>
                  <span className="px-2 tabular">
                    {pageIndex + 1} / {Math.max(1, table.getPageCount())}
                  </span>
                  <Button variant="ghost" size="icon-sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} aria-label={t("Pagina successiva")}>
                    <ChevronRight />
                  </Button>
                </div>
              </div>
            </>
          )}
        </Panel>
      </PageContainer>

      <ClientFormSheet open={createOpen} onOpenChange={setCreateOpen} />
      <ClientFormSheet open={editing !== null} onOpenChange={(o) => !o && setEditing(null)} client={editing} onSaved={() => setEditing(null)} />
    </>
  );
}

function PlanCell({ plan, kind }: { plan: ClientOption["workout"]; kind: "workout" | "nutrition" }) {
  if (!plan) return <span className="text-[13px] text-muted-foreground">—</span>;
  const Icon = kind === "workout" ? Dumbbell : Salad;
  return (
    <Link
      href={kind === "workout" ? `/workouts/${plan.id}` : `/nutrition/${plan.id}`}
      onClick={(e) => e.stopPropagation()}
      className="group flex min-w-0 items-center gap-2"
      title={plan.name}
    >
      <Icon className={cn("size-4 shrink-0", plan.status === "published" ? "text-primary" : "text-warning")} />
      <span className="truncate text-[13.5px] group-hover:underline">{plan.name}</span>
      {plan.status !== "published" && (
        <span className="max-xl:hidden">
          <PlanStatusBadge status={plan.status} kind={kind} size="sm" />
        </span>
      )}
    </Link>
  );
}
