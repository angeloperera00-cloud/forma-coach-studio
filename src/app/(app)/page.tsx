import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CalendarClock, ClipboardList, Salad, UserPlus, Users } from "lucide-react";
import { getDashboardData } from "@/lib/data/queries";
import { Topbar, PageContainer } from "@/components/shell/topbar";
import { Button } from "@/components/ui/button";
import { StatTile } from "@/components/common/basics";
import { HeroActionCards } from "@/components/dashboard/hero-cards";
import { ClientContextBar } from "@/components/dashboard/client-context";
import { RecentPlans } from "@/components/dashboard/recent-plans";
import { ActivityFeed, UpcomingList } from "@/components/dashboard/activity-feed";

import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("Dashboard") };
}

export default async function DashboardPage({ searchParams }: PageProps<"/">) {
  const { fmt, t } = await getI18n();
  const params = await searchParams;
  const selected = typeof params.client === "string" ? params.client : undefined;
  const data = await getDashboardData(selected);
  const today = fmt.instant(new Date(), { weekday: "long", day: "numeric", month: "long" }, true);

  return (
    <>
      <Topbar
        title={t("Dashboard")}
        mobileTitleHidden
        actions={
          <Button asChild className="max-sm:hidden">
            <Link href="/clients?new=1">
              <UserPlus /> {t("Nuovo cliente")}
            </Link>
          </Button>
        }
      />
      <PageContainer>
        <section className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-[32px] leading-tight font-bold tracking-[-0.02em] text-foreground md:text-[38px]">
              
              {t("Ciao Coach!")}
              <Image src="/emoji/flexed-biceps.png" alt="" width={40} height={40} priority className="size-9 md:size-10" />
            </h2>
            <p className="mt-1 text-[17px] text-muted-foreground md:text-[19px]">{t("Cosa vuoi creare oggi?")}</p>
          </div>
          <div className="text-[13.5px] font-medium text-muted-foreground max-md:hidden" suppressHydrationWarning>
            {today}
          </div>
        </section>

        <section aria-label={t("Riepilogo")} className="mt-6 grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
          <StatTile icon={<Users />} label={t("Clienti attivi")} value={data.stats.activeClients} hint={t("su {n} totali", { n: data.stats.totalClients })} />
          <StatTile icon={<ClipboardList />} label={t("Schede create")} value={data.stats.workoutPlans} hint={t("{n} pubblicate", { n: data.stats.workoutPublished })} />
          <StatTile icon={<Salad />} label={t("Piani alimentari")} value={data.stats.nutritionPlans} hint={t("{n} pubblicati", { n: data.stats.nutritionPublished })} />
          <StatTile
            icon={<CalendarClock />}
            label={t("In programma")}
            value={data.stats.upcomingWeek}
            hint={data.stats.upcomingToday ? t("{n} oggi · prossimi 7 giorni", { n: data.stats.upcomingToday }) : t("prossimi 7 giorni")}
          />
        </section>

        <ClientContextBar options={data.options} selectedId={data.selectedId} context={data.context} className="mt-6" />

        <HeroActionCards clientId={data.selectedId} className="mt-5" />

        <div className="mt-6 grid gap-5 lg:grid-cols-12">
          <RecentPlans plans={data.recentPlans} className="lg:col-span-7 2xl:col-span-8" />
          <div className="flex flex-col gap-5 lg:col-span-5 2xl:col-span-4">
            <UpcomingList items={data.upcoming} />
            <ActivityFeed items={data.activity} />
          </div>
        </div>
      </PageContainer>
    </>
  );
}
