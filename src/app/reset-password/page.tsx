import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("Imposta una nuova password") };
}

/** Reached from the recovery or invite email (the link signs the user in first). */
export default async function ResetPasswordPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login?error=expired");
  const { t, locale } = await getI18n();
  return (
    <AuthShell locale={locale}>
      <h1 className="text-center text-[24px] font-bold tracking-tight">{t("Imposta una nuova password")}</h1>
      <p className="mt-2 text-center text-[14.5px] text-muted-foreground">{t("Account: {email}", { email: user.email ?? user.phone ?? "" })}</p>
      <ResetPasswordForm />
    </AuthShell>
  );
}
