"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Activity, Appointment } from "@/lib/domain/types";
import { APPOINTMENT_TYPE_LABELS } from "@/lib/domain/constants";
import { Panel, PanelHeader, EmptyState } from "@/components/common/basics";
import { ActivityIcon } from "@/components/common/activity-icon";
import { RelativeTime } from "@/components/common/relative-time";
import { Avatar } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { dayKeyOf, timeOf } from "@/lib/datetime";
import { useI18n } from "@/lib/i18n/client";
import { activityText } from "@/lib/i18n/activity";

export function ActivityFeed({ items }: { items: Activity[] }) {
  const i18n = useI18n();
  const { t } = i18n;
  return (
    <Panel>
      <PanelHeader
        title={t("Attività clienti")}
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link href="/notifications">{t("Vedi tutte")}</Link>
          </Button>
        }
      />
      {items.length === 0 ? (
        <EmptyState compact emoji="sparkles" title={t("Nessuna attività")} description={t("Qui vedrai progressi, pubblicazioni e promemoria.")} />
      ) : (
        <ol className="relative px-5 pb-4 md:px-6">
          {items.map((a, i) => {
            const text = activityText(a, i18n);
            return (
            <li key={a.id} className="relative flex gap-3 pb-4 last:pb-1">
              {i < items.length - 1 && <span className="absolute top-10 bottom-0 left-[17px] w-px bg-border" aria-hidden />}
              <ActivityIcon type={a.type} />
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex items-baseline justify-between gap-2">
                  {a.href ? (
                    <Link href={a.href} className="truncate text-[13.5px] font-semibold hover:underline">
                      {text.title}
                    </Link>
                  ) : (
                    <span className="truncate text-[13.5px] font-semibold">{text.title}</span>
                  )}
                  <RelativeTime date={a.createdAt} className="shrink-0 text-[11.5px] text-muted-foreground" />
                </div>
                {text.description && <p className="line-clamp-2 text-[12.5px] leading-snug text-muted-foreground">{text.description}</p>}
              </div>
            </li>
            );
          })}
        </ol>
      )}
    </Panel>
  );
}

type Upcoming = Appointment & { clientName: string | null; clientAvatar: string | null };

export function UpcomingList({ items }: { items: Upcoming[] }) {
  const { fmt, t } = useI18n();
  return (
    <Panel>
      <PanelHeader
        title={t("In programma")}
        description={t("Prossimi 7 giorni")}
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link href="/calendar">{t("Calendario")}</Link>
          </Button>
        }
      />
      {items.length === 0 ? (
        <EmptyState compact emoji="spiral-calendar" title={t("Agenda libera")} description={t("Nessun appuntamento nei prossimi 7 giorni.")} />
      ) : (
        <ul className="flex flex-col gap-1 px-2 pb-3 md:px-3">
          {items.map((a) => (
            <li key={a.id}>
              <Link href={`/calendar?date=${dayKeyOf(a.startsAt)}`} className="group flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors hover:bg-muted">
                <div className="flex w-12 shrink-0 flex-col items-center rounded-xl bg-pale py-1.5 text-forest">
                  <span className="text-[10.5px] font-semibold uppercase">{fmt.instant(a.startsAt, { weekday: "short" })}</span>
                  <span className="text-[17px] leading-tight font-bold tabular">{fmt.instant(a.startsAt, { day: "numeric" })}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-semibold">{a.title}</div>
                  <div className="flex items-center gap-1.5 truncate text-[12.5px] text-muted-foreground">
                    <span className="tabular">{timeOf(a.startsAt)}</span>
                    <span aria-hidden>·</span>
                    <span className={cn("truncate")}>{t(APPOINTMENT_TYPE_LABELS[a.type])}</span>
                  </div>
                </div>
                {a.clientName && <Avatar src={a.clientAvatar} name={a.clientName} size={30} />}
                <ChevronRight className="size-4 text-muted-foreground/60" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
