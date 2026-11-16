import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Clock3, ShieldX } from "lucide-react";
import { getAuthState, getSession } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { PendingActions } from "@/components/auth/pending-actions";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("Account in attesa di approvazione") };
}

export default async function PendingPage() {
  if (await getSession()) redirect("/");
  const state = await getAuthState();
  if (!state) redirect("/login");
  const { t, locale } = await getI18n();
  const disabled = state.account?.status === "disabled";
  const identity = state.user.email ?? state.user.phone ?? "";
  const provider = state.user.app_metadata?.provider as string | undefined;

  return (
    <AuthShell locale={locale}>
      <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-pale text-forest">{disabled ? <ShieldX className="size-7" /> : <Clock3 className="size-7" />}</div>
      <h1 className="mt-5 text-center text-[24px] font-bold tracking-tight">{disabled ? t("Accesso disattivato") : t("Account in attesa di approvazione")}</h1>
      <p className="mt-2 text-center text-[14.5px] leading-relaxed text-muted-foreground">
        {disabled
          ? t("Un amministratore ha disattivato questo account. Contatta il titolare dello studio.")
          : t("Hai effettuato l'accesso, ma i dati dei coach sono visibili solo agli account approvati. Chiedi al titolare dello studio di approvarti o di invitarti con questa email.")}
      </p>
      <div className="mt-5 rounded-2xl bg-muted/70 px-4 py-3 text-center text-[13.5px]">
        <span className="font-semibold">{identity}</span>
        {provider && <span className="text-muted-foreground"> · {provider}</span>}
      </div>
      <PendingActions disabled={disabled} />
    </AuthShell>
  );
}
