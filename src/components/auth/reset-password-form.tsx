"use client";

import * as React from "react";
import { CircleAlert } from "lucide-react";
import { updatePasswordAction } from "@/lib/actions/auth";
import { useI18n } from "@/lib/i18n/client";
import { Field, Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function ResetPasswordForm() {
  const { t } = useI18n();
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();
  return (
    <form
      className="mt-6 flex flex-col gap-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (password.length < 10) return setError(t("La password deve avere almeno 10 caratteri."));
        if (password !== confirm) return setError(t("Le password non coincidono."));
        startTransition(async () => {
          const res = await updatePasswordAction({ password });
          if (res && !res.ok) setError(res.error);
        });
      }}
    >
      <Field label={t("Nuova password")} htmlFor="new-password" hint={t("Almeno 10 caratteri.")}>
        <Input id="new-password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12" autoFocus />
      </Field>
      <Field label={t("Conferma password")} htmlFor="confirm-password">
        <Input id="confirm-password" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="h-12" />
      </Field>
      {error && (
        <p role="alert" className="flex items-start gap-2 rounded-2xl bg-danger-soft px-3.5 py-2.5 text-[13.5px] font-medium text-destructive">
          <CircleAlert className="mt-0.5 size-4 shrink-0" /> {error}
        </p>
      )}
      <Button type="submit" size="lg" loading={pending} className="h-12 rounded-full text-[15.5px]">
        {t("Salva password")}
      </Button>
    </form>
  );
}
