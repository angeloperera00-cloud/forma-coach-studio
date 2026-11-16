"use client";

import * as React from "react";
import { toast } from "sonner";
import { AtSign, Check, Link2, Mail, Phone, ShieldCheck, Trash2, UserPlus, Users, X } from "lucide-react";
import { linkIdentityAction, setUsernameAction, unlinkIdentityAction } from "@/lib/actions/auth";
import { deleteInviteAction, inviteCoachAction, setCoachStatusAction } from "@/lib/actions/coaches";
import { useI18n } from "@/lib/i18n/client";
import { Panel, PanelHeader } from "@/components/common/basics";
import { useConfirm } from "@/components/common/confirm";
import { AppleLogo, FacebookLogo, GoogleLogo } from "@/components/auth/provider-logos";
import { Field, Input } from "@/components/ui/input";
import { Select } from "@/components/ui/menus";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface IdentityInfo {
  id: string;
  provider: string;
  label: string | null;
}
export interface CoachRow {
  userId: string;
  email: string | null;
  phone: string | null;
  username: string | null;
  displayName: string | null;
  role: "admin" | "coach";
  status: "pending" | "approved" | "disabled";
  createdAt: string;
}
export interface InviteRow {
  email: string;
  role: "admin" | "coach";
  createdAt: string;
  acceptedAt: string | null;
}

const LOGOS: Record<string, React.ReactNode> = {
  google: <GoogleLogo className="size-5" />,
  facebook: <FacebookLogo className="size-5" />,
  apple: <AppleLogo className="size-5 text-black" />,
  email: <Mail className="size-5 text-forest" />,
  phone: <Phone className="size-5 text-forest" />,
};
const NAMES: Record<string, string> = { google: "Google", facebook: "Facebook", apple: "Apple", email: "Email", phone: "SMS" };

/* ------------------------- sign-in methods & username ------------------------- */
export function SignInMethodsPanel({ identities, username, providers }: { identities: IdentityInfo[]; username: string | null; providers: Record<string, boolean> }) {
  const { t } = useI18n();
  const confirm = useConfirm();
  const [pending, startTransition] = React.useTransition();
  const [name, setName] = React.useState(username ?? "");
  const linked = new Set(identities.map((i) => i.provider));

  const run = (fn: () => Promise<{ ok: boolean; error?: string } | void>, success?: string) =>
    startTransition(async () => {
      const res = await fn();
      if (res && !res.ok) toast.error(res.error);
      else if (success) toast.success(success);
    });

  return (
    <Panel id="accessi" className="scroll-mt-24">
      <PanelHeader title={t("Metodi di accesso")} description={t("Collega più metodi allo stesso account per non creare profili duplicati.")} />
      <div className="flex flex-col gap-5 px-5 pb-6 md:px-6">
        <ul className="flex flex-col divide-y rounded-2xl border">
          {identities.map((i) => (
            <li key={i.id} className="flex items-center gap-3 px-4 py-3">
              <span className="grid size-9 place-items-center rounded-xl bg-muted">{LOGOS[i.provider] ?? <ShieldCheck className="size-5" />}</span>
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-semibold">{NAMES[i.provider] ?? i.provider}</div>
                {i.label && <div className="truncate text-[12.5px] text-muted-foreground">{i.label}</div>}
              </div>
              <Badge variant="success" size="sm" dot>
                {t("Collegato")}
              </Badge>
              {identities.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("Scollega {provider}", { provider: NAMES[i.provider] ?? i.provider })}
                  disabled={pending}
                  onClick={async () => {
                    const ok = await confirm({
                      title: t("Scollegare {provider}?", { provider: NAMES[i.provider] ?? i.provider }),
                      description: t("Non potrai più accedere con questo metodo finché non lo ricolleghi."),
                      confirmLabel: t("Scollega"),
                      destructive: true,
                    });
                    if (ok) run(() => unlinkIdentityAction(i.id), t("Metodo scollegato"));
                  }}
                >
                  <X />
                </Button>
              )}
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          {(["google", "facebook", "apple"] as const)
            .filter((p) => !linked.has(p))
            .map((p) => (
              <Button key={p} variant="outline" disabled={pending || !providers[p]} onClick={() => run(() => linkIdentityAction(p))} title={!providers[p] ? t("Non ancora configurato") : undefined}>
                {LOGOS[p]} {t("Collega {provider}", { provider: NAMES[p] })}
              </Button>
            ))}
        </div>

        <form
          className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => setUsernameAction({ username: name }), t("Nome utente salvato"));
          }}
        >
          <Field label={t("Nome utente")} htmlFor="username" hint={t("Per accedere con nome utente e password. 3-30 caratteri: a-z, 0-9, punto, trattino basso.")}>
            <div className="relative">
              <AtSign className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input id="username" value={name} onChange={(e) => setName(e.target.value.toLowerCase())} className="pl-9" autoComplete="username" />
            </div>
          </Field>
          <Button type="submit" variant="secondary" loading={pending} className="sm:mb-[22px]">
            {t("Salva")}
          </Button>
        </form>
      </div>
    </Panel>
  );
}

/* ----------------------------- coach administration ---------------------------- */
export function CoachesPanel({ selfId, accounts, invites }: { selfId: string; accounts: CoachRow[]; invites: InviteRow[] }) {
  const { t, fmt } = useI18n();
  const [pending, startTransition] = React.useTransition();
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<"coach" | "admin">("coach");
  const waiting = accounts.filter((a) => a.status === "pending");
  const others = accounts.filter((a) => a.status !== "pending");

  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>, success?: string) =>
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) toast.error(res.error);
      else toast.success(res.message ?? success ?? t("Fatto"));
    });

  const who = (a: CoachRow) => a.displayName || a.email || a.phone || a.userId.slice(0, 8);

  return (
    <Panel id="coach" className="scroll-mt-24">
      <PanelHeader title={t("Coach dello studio")} description={t("Chi accede con Google, Facebook, Apple, email o telefono resta in attesa finché non lo approvi.")} />
      <div className="flex flex-col gap-6 px-5 pb-6 md:px-6">
        <form
          className="grid gap-3 sm:grid-cols-[1fr_150px_auto] sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => inviteCoachAction({ email, role }));
            setEmail("");
          }}
        >
          <Field label={t("Invita un coach via email")} htmlFor="invite-email">
            <Input id="invite-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="coach@email.it" />
          </Field>
          <Field label={t("Ruolo")} htmlFor="invite-role">
            <Select
              id="invite-role"
              value={role}
              onValueChange={(v) => setRole(v)}
              options={[
                { value: "coach", label: t("Coach") },
                { value: "admin", label: t("Amministratore") },
              ]}
            />
          </Field>
          <Button type="submit" loading={pending} disabled={!email.includes("@")}>
            <UserPlus /> {t("Invita")}
          </Button>
        </form>

        <div>
          <h3 className="mb-2 text-[13px] font-semibold text-muted-foreground">{t("In attesa di approvazione")}</h3>
          {waiting.length === 0 ? (
            <p className="rounded-2xl bg-muted/60 px-4 py-3 text-[13px] text-muted-foreground">{t("Nessuna richiesta in attesa.")}</p>
          ) : (
            <ul className="flex flex-col divide-y rounded-2xl border">
              {waiting.map((a) => (
                <li key={a.userId} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-semibold">{who(a)}</div>
                    <div className="truncate text-[12.5px] text-muted-foreground">
                      {[a.email, a.phone].filter(Boolean).join(" · ")} · {fmt.instant(a.createdAt, { day: "numeric", month: "short" })}
                    </div>
                  </div>
                  <Button size="sm" disabled={pending} onClick={() => run(() => setCoachStatusAction({ userId: a.userId, status: "approved" }), t("Coach approvato"))}>
                    <Check /> {t("Approva")}
                  </Button>
                  <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => setCoachStatusAction({ userId: a.userId, status: "disabled" }), t("Richiesta rifiutata"))}>
                    {t("Rifiuta")}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h3 className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground">
            <Users className="size-4" /> {t("Coach")}
          </h3>
          <ul className="flex flex-col divide-y rounded-2xl border">
            {others.map((a) => (
              <li key={a.userId} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-semibold">
                    {who(a)} {a.userId === selfId && <span className="text-[12px] font-normal text-muted-foreground">({t("tu")})</span>}
                  </div>
                  <div className="truncate text-[12.5px] text-muted-foreground">{[a.email, a.username && `@${a.username}`].filter(Boolean).join(" · ")}</div>
                </div>
                <Badge size="sm" variant={a.status === "approved" ? "success" : "neutral"} dot>
                  {a.status === "approved" ? (a.role === "admin" ? t("Amministratore") : t("Coach")) : t("Disattivato")}
                </Badge>
                {a.userId !== selfId &&
                  (a.status === "approved" ? (
                    <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => setCoachStatusAction({ userId: a.userId, status: "disabled" }), t("Accesso disattivato"))}>
                      {t("Disattiva")}
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => setCoachStatusAction({ userId: a.userId, status: "approved" }), t("Coach riattivato"))}>
                      {t("Riattiva")}
                    </Button>
                  ))}
              </li>
            ))}
          </ul>
        </div>

        {invites.length > 0 && (
          <div>
            <h3 className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-muted-foreground">
              <Link2 className="size-4" /> {t("Inviti")}
            </h3>
            <ul className="flex flex-col divide-y rounded-2xl border">
              {invites.map((i) => (
                <li key={i.email} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1 truncate text-[14px]">{i.email}</div>
                  <Badge size="sm" variant={i.acceptedAt ? "success" : "warning"} dot>
                    {i.acceptedAt ? t("Accettato") : t("In attesa")}
                  </Badge>
                  {!i.acceptedAt && (
                    <Button size="icon-sm" variant="ghost" aria-label={t("Elimina invito")} disabled={pending} onClick={() => run(() => deleteInviteAction(i.email), t("Invito eliminato"))}>
                      <Trash2 />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Panel>
  );
}
