"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Provider, User } from "@supabase/supabase-js";
import { getAuthUser, getSession, rateLimited, recordFailure, signInLocal, signOut } from "@/lib/auth/session";
import { safeNext, siteOrigin, providerStatus, supabaseUserClient } from "@/lib/auth/supabase";
import { emailForUsername, setUsername } from "@/lib/auth/accounts";
import { destinationAfterSignIn } from "@/lib/auth/clients";
import { normalizePhone } from "@/lib/auth/phone";
import { OAUTH_PROVIDERS, type OAuthProvider } from "@/lib/auth/config";
import { getI18n } from "@/lib/i18n/server";
import { isLocale, LOCALE_COOKIE } from "@/lib/i18n/core";

export type AuthResult = { ok: true; message?: string } | { ok: false; error: string };

const PROVIDER_NAMES: Record<OAuthProvider, string> = { google: "Google", facebook: "Facebook", apple: "Apple" };

async function clientKey() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

/** After any successful Supabase sign-in: create/approve the coach account, then route. */
async function finishSupabaseSignIn(user: User | null, next: unknown): Promise<never> {
  const destination = user ? await destinationAfterSignIn(user, safeNext(next)) : "/login";
  revalidatePath("/", "layout");
  redirect(destination);
}

/* ------------------------- email / username + password ------------------------ */
export async function signInWithPasswordAction(raw: unknown): Promise<AuthResult> {
  const { t } = await getI18n();
  const parsed = z.object({ identifier: z.string().trim().min(3).max(120), password: z.string().min(1).max(200), next: z.string().optional() }).safeParse(raw);
  if (!parsed.success) return { ok: false, error: t("Inserisci le credenziali e la password.") };
  const { identifier, password, next } = parsed.data;
  const ip = await clientKey();
  const id = identifier.toLowerCase();
  if (rateLimited(ip, id)) return { ok: false, error: t("Troppi tentativi. Riprova tra qualche minuto.") };
  const wrong = () => {
    recordFailure(ip, id);
    return { ok: false as const, error: t("Credenziali non corrette.") };
  };

  const supabase = await supabaseUserClient();
  if (!supabase) {
    if (!id.includes("@")) return wrong();
    if (!(await signInLocal(id, password))) return wrong();
    revalidatePath("/", "layout");
    redirect(safeNext(next));
  }

  // Username → email lookup happens only on the server and fails exactly like a wrong password.
  const email = id.includes("@") ? id : /^[a-z0-9._]{3,30}$/.test(id) ? await emailForUsername(id) : null;
  if (!email) return wrong();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.code === "email_not_confirmed") return { ok: false, error: t("Conferma prima il tuo indirizzo email: controlla la posta in arrivo.") };
    return wrong();
  }
  return finishSupabaseSignIn(data.user, next);
}

/* --------------------------------- phone OTP --------------------------------- */
export async function sendPhoneCodeAction(raw: unknown): Promise<AuthResult & { phone?: string }> {
  const { t } = await getI18n();
  const supabase = await supabaseUserClient();
  if (!supabase || !(await providerStatus())?.phone) return { ok: false, error: t("L'accesso con il telefono non è ancora configurato.") };
  const phone = normalizePhone(String((raw as { phone?: unknown })?.phone ?? ""));
  if (!phone) return { ok: false, error: t("Numero di telefono non valido. Usa il formato +39 333 1234567.") };
  const ip = await clientKey();
  if (rateLimited(ip, phone)) return { ok: false, error: t("Troppi tentativi. Riprova tra qualche minuto.") };
  recordFailure(phone); // every SMS counts towards the limit
  const { error } = await supabase.auth.signInWithOtp({ phone });
  if (error) {
    console.warn("[auth] signInWithOtp", error.message);
    return { ok: false, error: t("Impossibile inviare il codice. Riprova tra qualche istante.") };
  }
  return { ok: true, phone, message: t("Ti abbiamo inviato un codice via SMS.") };
}

export async function verifyPhoneCodeAction(raw: unknown): Promise<AuthResult> {
  const { t } = await getI18n();
  const parsed = z.object({ phone: z.string().max(20), code: z.string().trim().regex(/^\d{6}$/), next: z.string().optional() }).safeParse(raw);
  if (!parsed.success) return { ok: false, error: t("Inserisci il codice a 6 cifre.") };
  const supabase = await supabaseUserClient();
  if (!supabase) return { ok: false, error: t("L'accesso con il telefono non è ancora configurato.") };
  const ip = await clientKey();
  if (rateLimited(ip, parsed.data.phone)) return { ok: false, error: t("Troppi tentativi. Riprova tra qualche minuto.") };
  const { data, error } = await supabase.auth.verifyOtp({ phone: parsed.data.phone, token: parsed.data.code, type: "sms" });
  if (error) {
    recordFailure(ip, parsed.data.phone);
    return { ok: false, error: t("Codice non valido o scaduto.") };
  }
  return finishSupabaseSignIn(data.user, parsed.data.next);
}

/* ------------------------------------ OAuth ----------------------------------- */
export async function oauthSignInAction(provider: unknown, next?: unknown): Promise<AuthResult> {
  const { t } = await getI18n();
  if (!OAUTH_PROVIDERS.includes(provider as OAuthProvider)) return { ok: false, error: t("Metodo di accesso non valido.") };
  const p = provider as OAuthProvider;
  const supabase = await supabaseUserClient();
  const status = await providerStatus();
  if (!supabase || !status?.[p]) return { ok: false, error: t("L'accesso con {provider} non è ancora configurato.", { provider: PROVIDER_NAMES[p] }) };
  const redirectTo = `${await siteOrigin()}/auth/callback?next=${encodeURIComponent(safeNext(next))}`;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: p as Provider,
    options: { redirectTo, skipBrowserRedirect: true, scopes: p === "apple" ? "name email" : p === "facebook" ? "email public_profile" : undefined },
  });
  if (error || !data.url) {
    console.warn("[auth] signInWithOAuth", error?.message);
    return { ok: false, error: t("Impossibile avviare l'accesso con {provider}. Riprova.", { provider: PROVIDER_NAMES[p] }) };
  }
  redirect(data.url);
}

/* ------------------------------ password recovery ----------------------------- */
export async function requestPasswordResetAction(raw: unknown): Promise<AuthResult> {
  const { t } = await getI18n();
  const parsed = z.object({ email: z.email() }).safeParse(raw);
  if (!parsed.success) return { ok: false, error: t("Inserisci un indirizzo email valido.") };
  const supabase = await supabaseUserClient();
  if (!supabase) return { ok: false, error: t("In modalità locale la password si cambia con la variabile COACH_PASSWORD.") };
  const ip = await clientKey();
  if (rateLimited(ip)) return { ok: false, error: t("Troppi tentativi. Riprova tra qualche minuto.") };
  recordFailure(ip);
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email.toLowerCase(), {
    redirectTo: `${await siteOrigin()}/auth/callback?next=/reset-password`,
  });
  if (error) console.warn("[auth] resetPasswordForEmail", error.message);
  // Same answer whether or not the address exists.
  return { ok: true, message: t("Se l'indirizzo è registrato riceverai un'email con il link per reimpostare la password.") };
}

export async function updatePasswordAction(raw: unknown): Promise<AuthResult> {
  const { t } = await getI18n();
  const parsed = z.object({ password: z.string().min(10).max(200) }).safeParse(raw);
  if (!parsed.success) return { ok: false, error: t("La password deve avere almeno 10 caratteri.") };
  const supabase = await supabaseUserClient();
  if (!supabase || !(await getAuthUser())) return { ok: false, error: t("Link scaduto: richiedi un nuovo link di recupero.") };
  const { data, error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { ok: false, error: t("Impossibile aggiornare la password. Riprova.") };
  return finishSupabaseSignIn(data.user, "/");
}

/** Change password from Impostazioni (signed-in, approved coach). */
export async function changePasswordAction(raw: unknown): Promise<AuthResult> {
  const { t } = await getI18n();
  if (!(await getSession())) return { ok: false, error: t("Sessione scaduta: accedi di nuovo.") };
  const parsed = z.object({ password: z.string().min(10).max(200) }).safeParse(raw);
  if (!parsed.success) return { ok: false, error: t("La password deve avere almeno 10 caratteri.") };
  const supabase = await supabaseUserClient();
  const { error } = (await supabase?.auth.updateUser({ password: parsed.data.password })) ?? { error: true };
  return error ? { ok: false, error: t("Impossibile aggiornare la password. Riprova.") } : { ok: true };
}

/* ------------------------------- account linking ------------------------------ */
/** Links another provider to the CURRENT account (explicit, requires an active session). */
export async function linkIdentityAction(provider: unknown): Promise<AuthResult> {
  const { t } = await getI18n();
  const session = await getSession();
  const supabase = await supabaseUserClient();
  if (session?.provider !== "supabase" || !supabase) return { ok: false, error: t("Sessione scaduta: accedi di nuovo.") };
  if (!OAUTH_PROVIDERS.includes(provider as OAuthProvider)) return { ok: false, error: t("Metodo di accesso non valido.") };
  const { data, error } = await supabase.auth.linkIdentity({
    provider: provider as Provider,
    options: { redirectTo: `${await siteOrigin()}/auth/callback?next=/settings%23account`, skipBrowserRedirect: true },
  });
  if (error || !data.url) {
    console.warn("[auth] linkIdentity", error?.message);
    return { ok: false, error: t("Collegamento non disponibile: abilita il collegamento manuale delle identità in Supabase.") };
  }
  redirect(data.url);
}

export async function unlinkIdentityAction(identityId: unknown): Promise<AuthResult> {
  const { t } = await getI18n();
  const session = await getSession();
  const supabase = await supabaseUserClient();
  if (session?.provider !== "supabase" || !supabase) return { ok: false, error: t("Sessione scaduta: accedi di nuovo.") };
  const { data } = await supabase.auth.getUserIdentities();
  const identity = data?.identities.find((i) => i.identity_id === identityId);
  if (!identity) return { ok: false, error: t("Metodo di accesso non trovato.") };
  if ((data?.identities.length ?? 0) < 2) return { ok: false, error: t("Non puoi scollegare l'unico metodo di accesso.") };
  const { error } = await supabase.auth.unlinkIdentity(identity);
  if (error) return { ok: false, error: t("Impossibile scollegare il metodo di accesso. Riprova.") };
  revalidatePath("/settings");
  return { ok: true };
}

export async function setUsernameAction(raw: unknown): Promise<AuthResult> {
  const { t } = await getI18n();
  const session = await getSession();
  if (session?.provider !== "supabase" || !session.userId) return { ok: false, error: t("Sessione scaduta: accedi di nuovo.") };
  const value = String((raw as { username?: unknown })?.username ?? "").trim().toLowerCase();
  if (value && !/^[a-z0-9._]{3,30}$/.test(value)) return { ok: false, error: t("Nome utente: 3-30 caratteri tra lettere minuscole, numeri, punto e trattino basso.") };
  const res = await setUsername(session.userId, value || null);
  if (res === "taken") return { ok: false, error: t("Nome utente già in uso.") };
  if (res === "error") return { ok: false, error: t("Si è verificato un errore imprevisto. Riprova.") };
  revalidatePath("/settings");
  return { ok: true };
}

/* ---------------------------------- sign out ---------------------------------- */
export async function signOutAction() {
  await signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

/** Language preference (Italian default). Works signed in or not, e.g. on the login page. */
export async function setLocaleAction(locale: unknown) {
  if (!isLocale(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  revalidatePath("/", "layout");
}

/** Pending page: re-check approval (e.g. after an admin approved or invited this account). */
export async function recheckApprovalAction(): Promise<AuthResult> {
  const { t } = await getI18n();
  const supabase = await supabaseUserClient();
  const { data } = (await supabase?.auth.getUser()) ?? { data: { user: null } };
  if (!data.user) redirect("/login");
  const destination = await destinationAfterSignIn(data.user, "/");
  if (destination !== "/pending") {
    revalidatePath("/", "layout");
    redirect(destination);
  }
  return { ok: false, error: t("Il tuo account è ancora in attesa di approvazione.") };
}
