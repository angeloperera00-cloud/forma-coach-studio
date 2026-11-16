import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getRepository } from "@/lib/data";
import { loadPortal } from "@/lib/data/portal";
import { idSchema } from "@/lib/domain/schemas";
import { getI18n } from "@/lib/i18n/server";
import { PortalView } from "@/components/portal/portal-view";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("Anteprima area cliente") };
}

/** Coach preview of what the client sees (only the coach's own clients: scoped repository). */
export default async function ClientPortalPreview({ params }: PageProps<"/clients/[id]/area-cliente">) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  const [data, { locale }] = await Promise.all([loadPortal(getRepository(), id), getI18n()]);
  if (!data) notFound();
  return <PortalView data={data} locale={locale} preview={{ backHref: `/clients/${id}` }} />;
}
