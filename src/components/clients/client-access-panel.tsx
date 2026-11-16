"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Eye, KeyRound, Send } from "lucide-react";
import { inviteClientAction, revokeClientAccessAction } from "@/lib/actions/client-access";
import { useI18n } from "@/lib/i18n/client";
import type { Client } from "@/lib/domain/types";
import { Panel, PanelHeader } from "@/components/common/basics";
import { useConfirm } from "@/components/common/confirm";
import { Field, Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface ClientAccessInfo {
  /** Supabase Auth configured: clients can actually sign in. */
  available: boolean;
  email: string | null;
  phone: string | null;
  invitedAt: string | null;
  acceptedAt: string | null;
  linked: boolean;
}

/** Coach invites this client to the read-only area (their published plans + downloads). */
export function ClientAccessPanel({ client, access }: { client: Client; access: ClientAccessInfo }) {
  const { t, fmt } = useI18n();
  const confirm = useConfirm();
  const [pending, startTransition] = React.useTransition();
  const invited = Boolean(access.invitedAt);
  const [email, setEmail] = React.useState(access.email ?? (invited ? "" : (client.email ?? "")));
  const [phone, setPhone] = React.useState(access.phone ?? (invited ? "" : (client.phone ?? "")));
  const [editing, setEditing] = React.useState(!invited);

  const status = access.linked ? (
    <Badge size="sm" variant="success" dot>
      {t("Attivo")}
    </Badge>
  ) : invited ? (
    <Badge size="sm" variant="warning" dot>
      {t("Invitato")}
    </Badge>
  ) : (
    <Badge size="sm" variant="neutral" dot>
      {t("Nessun accesso")}
    </Badge>
  );

  return (
    <Panel>
      <PanelHeader title={t("Accesso cliente")} actions={status} />
      <div className="flex flex-col gap-3 px-5 pb-5 md:px-6">
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          {t("Il cliente accede con la sua email o il suo telefono e vede solo le schede e i piani pubblicati, senza poterli modificare.")}
        </p>

        {!access.available ? (
          <p className="rounded-2xl bg-muted/60 px-4 py-3 text-[13px] text-muted-foreground">
            {t("Disponibile quando Supabase è collegato (vedi docs/AUTH_SETUP.md). Intanto puoi vedere l'anteprima.")}
          </p>
        ) : editing ? (
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              startTransition(async () => {
                const res = await inviteClientAction({ clientId: client.id, email: email || undefined, phone: phone || undefined });
                if (!res.ok) return void toast.error(res.error);
                toast.success(res.message ?? t("Fatto"));
                setEditing(false);
              });
            }}
          >
            <Field label={t("Email del cliente")} htmlFor="access-email">
              <Input id="access-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="cliente@email.it" autoComplete="off" />
            </Field>
            <Field label={t("Telefono (accesso con SMS)")} htmlFor="access-phone" hint={t("Facoltativo. Formato +39 333 1234567.")}>
              <Input id="access-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+39 333 1234567" autoComplete="off" />
            </Field>
            <div className="flex gap-2">
              <Button type="submit" loading={pending} disabled={!email.trim() && !phone.trim()} className="flex-1">
                {!pending && <Send />} {invited ? t("Salva accesso") : t("Invita il cliente")}
              </Button>
              {invited && (
                <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
                  {t("Annulla")}
                </Button>
              )}
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-2.5">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-2xl bg-muted/60 px-4 py-3 text-[13px]">
              {access.email && (
                <>
                  <dt className="text-muted-foreground">{t("Email")}</dt>
                  <dd className="truncate font-semibold">{access.email}</dd>
                </>
              )}
              {access.phone && (
                <>
                  <dt className="text-muted-foreground">{t("Telefono")}</dt>
                  <dd className="font-semibold">{access.phone}</dd>
                </>
              )}
              <dt className="text-muted-foreground">{access.linked ? t("Primo accesso") : t("Invitato il")}</dt>
              <dd>{fmt.instant((access.linked ? access.acceptedAt : access.invitedAt) ?? "", { day: "numeric", month: "short", year: "numeric" })}</dd>
            </dl>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditing(true)} disabled={pending}>
                <KeyRound /> {t("Modifica")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={async () => {
                  const ok = await confirm({
                    title: t("Revocare l'accesso?"),
                    description: t("Il cliente non potrà più vedere schede e piani finché non lo inviti di nuovo."),
                    confirmLabel: t("Revoca accesso"),
                    destructive: true,
                  });
                  if (!ok) return;
                  startTransition(async () => {
                    const res = await revokeClientAccessAction(client.id);
                    if (!res.ok) return void toast.error(res.error);
                    toast.success(t("Accesso revocato"));
                    setEmail(client.email ?? "");
                    setPhone(client.phone ?? "");
                    setEditing(true);
                  });
                }}
              >
                {t("Revoca accesso")}
              </Button>
            </div>
          </div>
        )}

        <Button asChild variant="secondary" size="sm" className="self-start">
          <Link href={`/clients/${client.id}/area-cliente`}>
            <Eye /> {t("Anteprima area cliente")}
          </Link>
        </Button>
      </div>
    </Panel>
  );
}
