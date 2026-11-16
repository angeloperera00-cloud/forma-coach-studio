import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getClientLink } from "@/lib/auth/clients";
import { getAuthUser, getSession } from "@/lib/auth/session";
import { loadPortal, portalRepository } from "@/lib/data/portal";
import { getI18n } from "@/lib/i18n/server";
import { PortalView } from "@/components/portal/portal-view";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("Area cliente") };
}

/** Read-only area for a signed-in client (the person doing the workouts). */
export default async function PortalPage() {
  const link = await getClientLink();
  if (!link) {
    const session = await getSession();
    if (session && session.provider !== "none") redirect("/");
    redirect((await getAuthUser()) ? "/pending" : "/login?next=/portale");
  }
  const [data, { locale }] = await Promise.all([loadPortal(portalRepository(link.coachId), link.clientId), getI18n()]);
  if (!data) redirect("/pending");
  return <PortalView data={data} locale={locale} />;
}
