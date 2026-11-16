import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { localCredentials, loginRequired, supabaseAuthConfig } from "@/lib/auth/config";
import { providerStatus } from "@/lib/auth/supabase";
import { getI18n } from "@/lib/i18n/server";
import { SignIn } from "@/components/auth/sign-in";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("Accedi al tuo account") };
}

const ERRORS = ["cancelled", "provider", "expired"] as const;

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const required = loginRequired();
  if (required && (await getSession())) redirect("/");
  const [{ locale }, sp, providers] = await Promise.all([getI18n(), searchParams, providerStatus()]);
  const supabase = Boolean(supabaseAuthConfig());
  const local = supabase ? null : localCredentials();
  const error = ERRORS.find((e) => e === sp.error) ?? null;

  return (
    <SignIn
      locale={locale}
      next={typeof sp.next === "string" ? sp.next : "/"}
      mode={supabase ? "supabase" : "local"}
      providers={providers ?? { google: false, facebook: false, apple: false, email: true, phone: false }}
      demo={local?.isDemo ? { email: local.email, password: local.password } : null}
      preview={!required}
      initialError={error}
    />
  );
}
