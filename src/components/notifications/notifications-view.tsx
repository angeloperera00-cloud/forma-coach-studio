"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCheck, Circle, CircleCheck, MoreHorizontal, Trash2 } from "lucide-react";
import type { Activity } from "@/lib/domain/types";
import { deleteActivityAction, markActivityAction } from "@/lib/actions/account";
import { useI18n } from "@/lib/i18n/client";
import { activityText } from "@/lib/i18n/activity";
import { addDaysToKey, dayKeyOf, timeOf, todayKey } from "@/lib/datetime";
import { cn } from "@/lib/utils";
import { Topbar, PageContainer } from "@/components/shell/topbar";
import { EmptyState, Panel } from "@/components/common/basics";
import { ActivityIcon } from "@/components/common/activity-icon";
import { Segmented } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/menus";
import { useConfirm } from "@/components/common/confirm";

export type NotificationFilter = "all" | "unread" | "reminders";

export function NotificationsView({ items, initialFilter }: { items: Activity[]; initialFilter: NotificationFilter }) {
  const i18n = useI18n();
  const { t, tn, fmt } = i18n;
  const router = useRouter();
  const confirm = useConfirm();
  const [filter, setFilter] = React.useState<NotificationFilter>(initialFilter);
  const [pending, startTransition] = React.useTransition();

  const unread = items.filter((a) => !a.readAt).length;
  const readCount = items.length - unread;
  const reminders = items.filter((a) => a.type === "reminder").length;
  const visible = items.filter((a) => (filter === "unread" ? !a.readAt : filter === "reminders" ? a.type === "reminder" : true));

  const groups = React.useMemo(() => {
    const map = new Map<string, Activity[]>();
    for (const a of visible) {
      const key = dayKeyOf(a.createdAt);
      map.set(key, [...(map.get(key) ?? []), a]);
    }
    return [...map.entries()];
  }, [visible]);

  const today = todayKey();
  const dayLabel = (key: string) =>
    key === today ? t("Oggi") : key === addDaysToKey(today, -1) ? t("Ieri") : fmt.dayKey(key, { weekday: "long", day: "numeric", month: "long" }, true);

  const changeFilter = (value: NotificationFilter) => {
    setFilter(value);
    window.history.replaceState(null, "", value === "all" ? "/notifications" : `/notifications?filter=${value}`);
  };

  const run = (task: () => Promise<{ ok: boolean; error?: string }>, success?: string) =>
    startTransition(async () => {
      const res = await task();
      if (!res.ok) toast.error(res.error);
      else if (success) toast.success(success);
    });

  const markAll = () => run(() => markActivityAction("all", true), t("Tutte le notifiche sono state lette"));
  const deleteRead = async () => {
    const ok = await confirm({
      title: t("Eliminare le notifiche lette?"),
      description: tn("Verrà eliminata {n} notifica già letta.", "Verranno eliminate {n} notifiche già lette.", readCount),
      confirmLabel: t("Elimina"),
      destructive: true,
    });
    if (ok) run(() => deleteActivityAction("read"), t("Notifiche lette eliminate"));
  };

  const open = (a: Activity) => {
    if (!a.readAt) run(() => markActivityAction([a.id], true));
    if (a.href) router.push(a.href);
  };

  return (
    <>
      <Topbar
        title={t("Notifiche")}
        breadcrumbs={[{ label: t("Monitoraggio") }]}
        actions={
          <>
            <Button variant="ghost" onClick={deleteRead} disabled={readCount === 0 || pending} className="max-md:hidden">
              <Trash2 /> {t("Elimina lette")}
            </Button>
            <Button variant="secondary" onClick={markAll} disabled={unread === 0 || pending} className="max-sm:hidden">
              <CheckCheck /> {t("Segna tutte come lette")}
            </Button>
          </>
        }
      />
      <PageContainer className="max-w-[920px]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Segmented
            value={filter}
            onValueChange={changeFilter}
            aria-label={t("Filtra notifiche")}
            options={[
              { value: "all", label: t("Tutte"), badge: <Count n={items.length} /> },
              { value: "unread", label: t("Non lette"), badge: <Count n={unread} /> },
              { value: "reminders", label: t("Promemoria"), badge: <Count n={reminders} /> },
            ]}
          />
          <div className="flex items-center gap-1 md:hidden">
            <Button variant="ghost" size="sm" onClick={markAll} disabled={unread === 0 || pending}>
              <CheckCheck /> {t("Segna lette")}
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={deleteRead} disabled={readCount === 0 || pending} aria-label={t("Elimina lette")}>
              <Trash2 />
            </Button>
          </div>
        </div>

        {groups.length === 0 ? (
          <Panel className="mt-5">
            <EmptyState
              emoji={filter === "unread" ? "check-mark-button" : "bell-with-slash"}
              title={filter === "unread" ? t("Tutto letto") : filter === "reminders" ? t("Nessun promemoria") : t("Nessuna notifica")}
              description={
                filter === "unread"
                  ? t("Non ci sono notifiche da leggere.")
                  : t("Qui trovi promemoria, progressi registrati e piani pubblicati.")
              }
            />
          </Panel>
        ) : (
          <div className={cn("mt-5 flex flex-col gap-6 transition-opacity", pending && "opacity-70")}>
            {groups.map(([key, list]) => (
              <section key={key} aria-label={dayLabel(key)}>
                <h2 className="mb-2 px-1 text-[13px] font-semibold text-muted-foreground">{dayLabel(key)}</h2>
                <Panel className="overflow-hidden">
                  <ul className="divide-y">
                    {list.map((a) => {
                      const text = activityText(a, i18n);
                      return (
                        <li key={a.id} className={cn("group relative flex items-start gap-3 px-4 py-3.5 md:px-5", !a.readAt && "bg-pale/45")}>
                          <ActivityIcon type={a.type} />
                          <button type="button" onClick={() => open(a)} className="min-w-0 flex-1 text-left outline-none focus-visible:underline">
                            <div className="flex items-center gap-2">
                              <span className={cn("truncate text-[14px]", a.readAt ? "font-medium" : "font-semibold")}>{text.title}</span>
                              {!a.readAt && <span className="size-2 shrink-0 rounded-full bg-primary" aria-label={t("Non letta")} />}
                            </div>
                            {text.description && <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">{text.description}</p>}
                            <div className="mt-1 text-[12px] text-muted-foreground/90 tabular">
                              {timeOf(a.createdAt)}
                              {a.href && (
                                <>
                                  {" · "}
                                  <span className="font-medium text-primary">{t("Apri")}</span>
                                </>
                              )}
                            </div>
                          </button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon-xs" aria-label={t("Azioni notifica")} className="shrink-0">
                                <MoreHorizontal />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              {a.readAt ? (
                                <DropdownMenuItem onSelect={() => run(() => markActivityAction([a.id], false))}>
                                  <Circle /> {t("Segna come da leggere")}
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onSelect={() => run(() => markActivityAction([a.id], true))}>
                                  <CircleCheck /> {t("Segna come letta")}
                                </DropdownMenuItem>
                              )}
                              {a.href && (
                                <DropdownMenuItem asChild>
                                  <Link href={a.href}>{t("Apri")}</Link>
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem destructive onSelect={() => run(() => deleteActivityAction([a.id]), t("Notifica eliminata"))}>
                                <Trash2 /> {t("Elimina")}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </li>
                      );
                    })}
                  </ul>
                </Panel>
              </section>
            ))}
          </div>
        )}
      </PageContainer>
    </>
  );
}

function Count({ n }: { n: number }) {
  return <span className="rounded-full bg-muted px-1.5 text-[11px] leading-[18px] font-semibold text-muted-foreground tabular">{n}</span>;
}
