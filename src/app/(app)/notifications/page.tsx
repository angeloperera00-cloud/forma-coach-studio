import type { Metadata } from "next";
import { getRepository } from "@/lib/data";
import { getI18n } from "@/lib/i18n/server";
import { NotificationsView, type NotificationFilter } from "@/components/notifications/notifications-view";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("Notifiche") };
}

const FILTERS: NotificationFilter[] = ["all", "unread", "reminders"];

export default async function NotificationsPage({ searchParams }: PageProps<"/notifications">) {
  const sp = await searchParams;
  const items = await getRepository().listActivity({ limit: 300 });
  const filter = FILTERS.find((f) => f === sp.filter) ?? "all";
  return <NotificationsView items={items} initialFilter={filter} />;
}
