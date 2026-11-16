"use client";

import * as React from "react";
import { CircleAlert, Eye, EyeOff, KeyRound, LogIn } from "lucide-react";
import { signInAction, type SignInState } from "@/lib/actions/auth";
import { useI18n } from "@/lib/i18n/client";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";

export function LoginForm({ next, demo, supabase }: { next: string; demo: { email: string; password: string } | null; supabase: boolean }) {
  const { t } = useI18n();
  const [state, formAction, pending] = React.useActionState<SignInState, FormData>(signInAction, { error: null, email: "" });
  const [show, setShow] = React.useState(false);
  const emailRef = React.useRef<HTMLInputElement>(null);
  const passwordRef = React.useRef<HTMLInputElement>(null);

  return (
    <form action={formAction} className="mt-8 flex flex-col gap-4" noValidate>
      <input type="hidden" name="next" value={next} />
      <Field label={t("Email")} htmlFor="email">
        <Input ref={emailRef} id="email" name="email" type="email" autoComplete="username" inputMode="email" required defaultValue={state.email} className="h-11" autoFocus />
      </Field>
      <Field label={t("Password")} htmlFor="password">
        <div className="relative">
          <Input ref={passwordRef} id="password" name="password" type={show ? "text" : "password"} autoComplete="current-password" required className="h-11 pr-11" />
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
      {state.error && (
        <p role="alert" className="flex items-start gap-2 rounded-xl bg-danger-soft px-3 py-2.5 text-[13.5px] font-medium text-destructive">
          <CircleAlert className="mt-0.5 size-4 shrink-0" /> {state.error}
        </p>
      )}
      <Button type="submit" size="lg" loading={pending} className="mt-1 h-12 rounded-2xl text-[15.5px]">
        {!pending && <LogIn />} {t("Accedi")}
      </Button>

      {demo && (
        <div className="mt-4 rounded-2xl border border-dashed border-border-strong bg-card p-4">
          <div className="flex items-center gap-2 text-[13.5px] font-semibold">
            <KeyRound className="size-4 text-forest" /> {t("Modalità demo")}
          </div>
          <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
            {t("Dati di esempio salvati in locale. Credenziali demo:")} <span className="font-medium text-foreground">{demo.email}</span> · <span className="font-medium text-foreground">{demo.password}</span>
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-3"
            onClick={() => {
              if (emailRef.current) emailRef.current.value = demo.email;
              if (passwordRef.current) passwordRef.current.value = demo.password;
              passwordRef.current?.form?.requestSubmit();
            }}
          >
            {t("Accedi con le credenziali demo")}
          </Button>
        </div>
      )}
      {supabase && <p className="text-center text-[12.5px] text-muted-foreground">{t("Password dimenticata? Reimpostala dalla dashboard di Supabase (Authentication → Users).")}</p>}
    </form>
  );
}
