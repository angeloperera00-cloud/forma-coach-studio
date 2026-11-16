import type { Metadata } from "next";
import { getRepository, supabaseConfig } from "@/lib/data";
import { getAuthState, getSession } from "@/lib/auth/session";
import { localCredentials } from "@/lib/auth/config";
import { providerStatus } from "@/lib/auth/supabase";
import { listAccounts, listInvites } from "@/lib/auth/accounts";
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

  // Supabase Auth: linked sign-in methods, username and (admins) coach management.
  let auth = null;
  if (session?.provider === "supabase") {
    const [state, providers] = await Promise.all([getAuthState(), providerStatus()]);
    const isAdmin = session.role === "admin";
    const [accounts, invites] = isAdmin ? await Promise.all([listAccounts(), listInvites()]) : [[], []];
    auth = {
      selfId: session.userId!,
      username: state?.account?.username ?? null,
      identities: (state?.user.identities ?? []).map((i) => ({
        id: i.identity_id,
        provider: i.provider,
        label: (i.identity_data?.email as string | undefined) ?? (i.identity_data?.phone as string | undefined) ?? null,
      })),
      providers: providers ?? { google: false, facebook: false, apple: false, email: true, phone: false },
      admin: isAdmin ? { accounts, invites } : null,
    };
  }

  return (
    <SettingsView
      coach={coach}
      locale={locale}
      account={{
        email: session?.email ?? "",
        provider: session?.provider ?? "local",
        demoCredentials: Boolean(local?.isDemo),
      }}
      auth={auth}
      data={{
        mode: repo.mode,
        host: supabase ? new URL(supabase.url).host : null,
      }}
    />
  );
}
