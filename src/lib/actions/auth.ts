"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { changePassword, getSession, signIn, signOut } from "@/lib/auth/session";
import { getI18n } from "@/lib/i18n/server";
import { isLocale, LOCALE_COOKIE } from "@/lib/i18n/core";

export interface SignInState {
  error: string | null;
  email: string;
}

const safeNext = (value: FormDataEntryValue | null) => {
  const next = typeof value === "string" ? value : "/";
  return next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/login") ? next : "/";
};

export async function signInAction(_prev: SignInState, form: FormData): Promise<SignInState> {
  const { t } = await getI18n();
  const parsed = z.object({ email: z.email(), password: z.string().min(1).max(200) }).safeParse({ email: form.get("email"), password: form.get("password") });
  const email = String(form.get("email") ?? "");
  if (!parsed.success) return { email, error: t("Inserisci email e password valide.") };

  const h = await headers();
  const clientKey = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
  const result = await signIn(parsed.data.email, parsed.data.password, clientKey);
  if (!result.ok) {
    const messages = {
      credentials: t("Email o password non corretti."),
      "not-coach": t("Questo account non è autorizzato: l'accesso è riservato al coach."),
      config: t("Accesso non configurato: imposta COACH_EMAIL (e COACH_PASSWORD in modalità locale)."),
      "rate-limit": t("Troppi tentativi. Riprova tra qualche minuto."),
    } as const;
    return { email, error: messages[result.error] };
  }
  revalidatePath("/", "layout");
  redirect(safeNext(form.get("next")));
}

export async function signOutAction() {
  await signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function changePasswordAction(raw: unknown): Promise<{ ok: boolean; error?: string }> {
  const { t } = await getI18n();
  if (!(await getSession())) return { ok: false, error: t("Sessione scaduta: accedi di nuovo.") };
  const parsed = z.object({ password: z.string().min(10).max(200) }).safeParse(raw);
  if (!parsed.success) return { ok: false, error: t("La password deve avere almeno 10 caratteri.") };
  const ok = await changePassword(parsed.data.password);
  return ok ? { ok } : { ok, error: t("Impossibile aggiornare la password. Riprova.") };
}

/** Language preference (Italian default). Works signed in or not, e.g. on the login page. */
export async function setLocaleAction(locale: unknown) {
  if (!isLocale(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  revalidatePath("/", "layout");
}
