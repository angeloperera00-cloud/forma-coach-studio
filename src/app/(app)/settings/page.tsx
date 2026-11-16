import type { Metadata } from "next";
import { getRepository, supabaseConfig } from "@/lib/data";
import { getSession } from "@/lib/auth/session";
import { localCredentials } from "@/lib/auth/config";
import { getI18n } from "@/lib/i18n/server";
import { SettingsView } from "@/components/settings/settings-view";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("Impostazioni") };
}

export default async function SettingsPage() {
  const repo = getRepository();
  const [coach, session, { locale }] = await Promise.all([repo.getCoach(), getSession(), getI18n()]);
  const supabase = supabaseConfig();
  const local = session?.provider === "local" ? localCredentials() : null;

  return (
    <SettingsView
      coach={coach}
      locale={locale}
      account={{
        email: session?.email ?? "",
        provider: session?.provider ?? "local",
        demoCredentials: Boolean(local?.isDemo),
      }}
      data={{
        mode: repo.mode,
        host: supabase ? new URL(supabase.url).host : null,
      }}
    />
  );
}
