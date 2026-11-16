"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, CircleAlert, CircleCheck, Eye, EyeOff, KeyRound, Loader2, MessageSquareText, UserRound } from "lucide-react";
import {
  oauthSignInAction,
  requestPasswordResetAction,
  sendPhoneCodeAction,
  signInWithPasswordAction,
  verifyPhoneCodeAction,
  type AuthResult,
} from "@/lib/actions/auth";
import type { Locale } from "@/lib/i18n/core";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/shell/brand";
import { LanguageSwitcher } from "@/components/common/language-switcher";
import { Field, Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AppleLogo, FacebookLogo, GoogleLogo } from "./provider-logos";

type Provider = "google" | "facebook" | "apple";
type View = "choose" | "identifier" | "forgot";

interface Props {
  locale: Locale;
  next: string;
  mode: "supabase" | "local";
  providers: Record<Provider | "email" | "phone", boolean>;
  demo: { email: string; password: string } | null;
  preview: boolean;
  initialError: "cancelled" | "provider" | "expired" | null;
}

const isPhoneLike = (v: string) => /^\+?[\d\s\-().]{8,}$/.test(v.trim()) && !/[a-z@]/i.test(v);

export function SignIn({ locale, next, mode, providers, demo, preview, initialError }: Props) {
  const { t } = useI18n();
  const [view, setView] = React.useState<View>("choose");
  const [busy, setBusy] = React.useState<string | null>(null);
  const initialMessages = {
    cancelled: t("Accesso annullato. Puoi riprovare quando vuoi."),
    provider: t("Il provider non ha completato l'accesso. Riprova o usa un altro metodo."),
    expired: t("Il link o la sessione sono scaduti. Riprova."),
  };
  const [error, setError] = React.useState<string | null>(initialError ? initialMessages[initialError] : null);
  const [notice, setNotice] = React.useState<string | null>(null);

  const go = (v: View) => {
    setError(null);
    setNotice(null);
    setView(v);
  };

  /** Runs a server action; redirects (success) navigate away, errors are shown inline. */
  const run = async (key: string, action: () => Promise<AuthResult | void>) => {
    setBusy(key);
    setError(null);
    setNotice(null);
    try {
      const res = await action();
      if (res && !res.ok) setError(res.error);
      else if (res?.ok && res.message) setNotice(res.message);
      return res;
    } finally {
      setBusy(null);
    }
  };

  const oauth = (provider: Provider) => run(provider, () => oauthSignInAction(provider, next));

  const buttons: { key: Provider | "identifier"; label: string; icon: React.ReactNode; onClick: () => void; available: boolean }[] = [
    { key: "identifier", label: t("Usa telefono / email / nome utente"), icon: <UserRound className="size-[22px] text-foreground" />, onClick: () => go("identifier"), available: true },
    { key: "facebook", label: t("Continua con Facebook"), icon: <FacebookLogo className="size-[22px]" />, onClick: () => oauth("facebook"), available: providers.facebook },
    { key: "google", label: t("Continua con Google"), icon: <GoogleLogo className="size-[21px]" />, onClick: () => oauth("google"), available: providers.google },
    { key: "apple", label: t("Continua con Apple"), icon: <AppleLogo className="size-[22px] text-black" />, onClick: () => oauth("apple"), available: providers.apple },
  ];

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-background">
      {/* soft brand backdrop */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(60rem_30rem_at_50%_-10%,rgb(22_131_75/0.12),transparent_70%),radial-gradient(40rem_24rem_at_100%_100%,rgb(221_235_217/0.7),transparent_70%)]" />

      <header className="relative flex items-center justify-between px-5 py-5 sm:px-10">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Forma">
          <BrandMark size={36} />
          <span className="leading-tight">
            <span className="block text-[16px] font-semibold text-forest">Forma</span>
            <span className="block text-[12px] text-muted-foreground">Coach Studio</span>
          </span>
        </Link>
        <LanguageSwitcher locale={locale} />
      </header>

      <main className="relative flex flex-1 items-start justify-center px-4 pt-4 pb-10 sm:items-center sm:pt-0">
        <div className="w-full max-w-[460px]">
          {preview && (
            <p className="mb-4 rounded-2xl border border-dashed border-border-strong bg-card/80 px-4 py-2.5 text-center text-[12.5px] text-muted-foreground">
              {t("Anteprima: il login è disattivato (REQUIRE_LOGIN non attivo).")}
            </p>
          )}
          <section className="rounded-[28px] border bg-card/95 px-4 py-8 shadow-[0_24px_60px_-28px_rgb(18_62_48/0.35)] backdrop-blur sm:px-9 sm:py-10">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={view} initial={{ opacity: 0, x: view === "choose" ? -12 : 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
                {view !== "choose" && (
                  <button
                    type="button"
                    onClick={() => go(view === "forgot" ? "identifier" : "choose")}
                    className="-mt-2 mb-3 flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label={t("Indietro")}
                  >
                    <ArrowLeft className="size-5" />
                  </button>
                )}
                <h1 className="text-center text-[26px] font-bold tracking-tight text-foreground sm:text-[28px]">
                  {view === "forgot" ? t("Password dimenticata?") : t("Accedi al tuo account")}
                </h1>
                <p className="mx-auto mt-2 max-w-[320px] text-center text-[14.5px] leading-relaxed text-muted-foreground">
                  {view === "forgot"
                    ? t("Inserisci l'email del tuo account: ti invieremo un link per reimpostare la password.")
                    : t("Area riservata ai coach: gestisci clienti, schede e piani alimentari.")}
                </p>

                <Messages error={error} notice={notice} />

                {view === "choose" && (
                  <ul className="mt-7 flex flex-col gap-3">
                    {buttons.map((b) => (
                      <li key={b.key}>
                        <button
                          type="button"
                          onClick={b.onClick}
                          disabled={busy !== null}
                          aria-describedby={!b.available ? `${b.key}-off` : undefined}
                          className={cn(
                            "group relative flex min-h-[54px] w-full items-center justify-center rounded-full border border-border-strong bg-card py-2 pr-6 pl-12 text-center text-[14.5px] leading-snug font-semibold text-foreground sm:px-12 sm:text-[15px]",
                            "transition-[transform,border-color,background-color,box-shadow] duration-200 hover:-translate-y-px hover:border-primary/60 hover:bg-pale/60 hover:shadow-[0_8px_20px_-12px_rgb(18_62_48/0.45)]",
                            "outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30 active:translate-y-0 disabled:pointer-events-none disabled:opacity-60",
                          )}
                        >
                          <span className="absolute left-4 flex size-7 sm:left-5 items-center justify-center">{busy === b.key ? <Loader2 className="size-5 animate-spin text-primary" /> : b.icon}</span>
                          <span>{b.label}</span>
                        </button>
                        {!b.available && (
                          <span id={`${b.key}-off`} className="sr-only">
                            {t("Non ancora configurato")}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                {view === "identifier" && <IdentifierForm mode={mode} next={next} phoneEnabled={providers.phone} busy={busy} run={run} onForgot={() => go("forgot")} demo={demo} />}
                {view === "forgot" && <ForgotForm mode={mode} busy={busy} run={run} />}
              </motion.div>
            </AnimatePresence>
          </section>

          <p className="mx-auto mt-6 max-w-[380px] text-center text-[12.5px] leading-relaxed text-muted-foreground">
            {t("Continuando accetti i")}{" "}
            <Link href="/terms" className="font-semibold text-forest underline-offset-4 hover:underline">
              {t("Termini di servizio")}
            </Link>{" "}
            {t("e confermi di aver letto l'")}
            <Link href="/privacy" className="font-semibold text-forest underline-offset-4 hover:underline">
              {t("Informativa sulla privacy")}
            </Link>
            .
          </p>
        </div>
      </main>

      <footer className="relative pb-6 text-center text-[12px] text-muted-foreground">
        © {new Date().getFullYear()} Forma · Coach Studio · {t("I clienti non hanno bisogno di un account.")}
      </footer>
    </div>
  );
}

function Messages({ error, notice }: { error: string | null; notice: string | null }) {
  if (!error && !notice) return null;
  return (
    <p
      role={error ? "alert" : "status"}
      className={cn(
        "mt-5 flex items-start gap-2 rounded-2xl px-3.5 py-2.5 text-[13.5px] font-medium",
        error ? "bg-danger-soft text-destructive" : "bg-pale text-forest",
      )}
    >
      {error ? <CircleAlert className="mt-0.5 size-4 shrink-0" /> : <CircleCheck className="mt-0.5 size-4 shrink-0" />}
      {error ?? notice}
    </p>
  );
}

type Run = (key: string, action: () => Promise<AuthResult | void>) => Promise<AuthResult | void>;

function IdentifierForm({
  mode,
  next,
  phoneEnabled,
  busy,
  run,
  onForgot,
  demo,
}: {
  mode: "supabase" | "local";
  next: string;
  phoneEnabled: boolean;
  busy: string | null;
  run: Run;
  onForgot: () => void;
  demo: { email: string; password: string } | null;
}) {
  const { t } = useI18n();
  const [identifier, setIdentifier] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [show, setShow] = React.useState(false);
  const [otpPhone, setOtpPhone] = React.useState<string | null>(null);
  const [code, setCode] = React.useState("");
  const phone = mode === "supabase" && isPhoneLike(identifier);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (otpPhone) {
      await run("verify", () => verifyPhoneCodeAction({ phone: otpPhone, code, next }));
      return;
    }
    if (phone) {
      const res = (await run("send", () => sendPhoneCodeAction({ phone: identifier }))) as (AuthResult & { phone?: string }) | void;
      if (res?.ok && res.phone) setOtpPhone(res.phone);
      return;
    }
    await run("password", () => signInWithPasswordAction({ identifier, password, next }));
  };

  if (otpPhone) {
    return (
      <form onSubmit={submit} className="mt-6 flex flex-col gap-4" noValidate>
        <p className="text-center text-[13.5px] text-muted-foreground">{t("Codice inviato a {phone}", { phone: otpPhone })}</p>
        <Field label={t("Codice di verifica")} htmlFor="otp">
          <Input
            id="otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className="h-12 text-center text-[20px] font-semibold tracking-[0.5em]"
            autoFocus
          />
        </Field>
        <Button type="submit" size="lg" loading={busy === "verify"} disabled={code.length !== 6} className="h-12 rounded-full text-[15.5px]">
          {t("Verifica e accedi")}
        </Button>
        <button type="button" onClick={() => setOtpPhone(null)} className="text-center text-[13px] font-semibold text-forest hover:underline">
          {t("Cambia numero")}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={submit} className="mt-6 flex flex-col gap-4" noValidate>
      <Field
        label={mode === "supabase" ? t("Telefono, email o nome utente") : t("Email")}
        htmlFor="identifier"
        hint={mode === "supabase" ? (phoneEnabled ? t("Con il numero di telefono ricevi un codice via SMS.") : undefined) : undefined}
      >
        <Input
          id="identifier"
          autoComplete="username"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          className="h-12"
          placeholder={mode === "supabase" ? t("es. +39 333 1234567, nome@email.it o mario.rossi") : "nome@email.it"}
          autoFocus
        />
      </Field>
      {!phone && (
        <Field label={t("Password")} htmlFor="password">
          <div className="relative">
            <Input id="password" type={show ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 pr-11" />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute top-1/2 right-2 grid size-8 -translate-y-1/2 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label={show ? t("Nascondi password") : t("Mostra password")}
            >
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </Field>
      )}
      {!phone && (
        <button type="button" onClick={onForgot} className="-mt-1 self-start text-[13px] font-semibold text-forest hover:underline">
          {t("Password dimenticata?")}
        </button>
      )}
      <Button
        type="submit"
        size="lg"
        loading={busy === "password" || busy === "send"}
        disabled={!identifier.trim() || (!phone && !password)}
        className="h-12 rounded-full text-[15.5px]"
      >
        {phone ? (
          <>
            <MessageSquareText /> {t("Invia codice")}
          </>
        ) : (
          t("Accedi")
        )}
      </Button>

      {demo && (
        <div className="rounded-2xl border border-dashed border-border-strong bg-background p-3.5 text-[12.5px] text-muted-foreground">
          <div className="flex items-center gap-1.5 font-semibold text-foreground">
            <KeyRound className="size-3.5 text-forest" /> {t("Modalità demo")}
          </div>
          <p className="mt-1">
            {demo.email} · {demo.password}
          </p>
          <button
            type="button"
            className="mt-2 font-semibold text-forest hover:underline"
            onClick={() => {
              setIdentifier(demo.email);
              setPassword(demo.password);
            }}
          >
            {t("Usa le credenziali demo")}
          </button>
        </div>
      )}
    </form>
  );
}

function ForgotForm({ mode, busy, run }: { mode: "supabase" | "local"; busy: string | null; run: Run }) {
  const { t } = useI18n();
  const [email, setEmail] = React.useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void run("forgot", () => requestPasswordResetAction({ email }));
      }}
      className="mt-6 flex flex-col gap-4"
      noValidate
    >
      <Field label={t("Email")} htmlFor="reset-email">
        <Input id="reset-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12" autoFocus />
      </Field>
      <Button type="submit" size="lg" loading={busy === "forgot"} disabled={!email.includes("@") || mode === "local"} className="h-12 rounded-full text-[15.5px]">
        {t("Invia link di recupero")}
      </Button>
      {mode === "local" && <p className="text-center text-[12.5px] text-muted-foreground">{t("In modalità locale la password si cambia con la variabile COACH_PASSWORD.")}</p>}
    </form>
  );
}
