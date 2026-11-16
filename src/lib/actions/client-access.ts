"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getRepository } from "@/lib/data";
import { getSession } from "@/lib/auth/session";
import { supabaseAuthConfig } from "@/lib/auth/config";
import { revokeClientAccess, saveClientInvite } from "@/lib/auth/clients";
import { normalizePhone } from "@/lib/auth/phone";
import { siteOrigin } from "@/lib/auth/supabase";
import { idSchema } from "@/lib/domain/schemas";
import { getI18n } from "@/lib/i18n/server";
import type { AuthResult } from "./auth";

/**
 * Coach invites one of THEIR clients to the read-only area. Ownership is checked through the
 * coach's own repository (Row Level Security when login is on): another coach's client is "not found".
 */
async function ownClient(clientId: unknown) {
  const session = await getSession();
  if (!session || !supabaseAuthConfig()) return null;
  const id = idSchema.safeParse(clientId);
  if (!id.success) return null;
  const client = await getRepository().getClient(id.data);
  return client ? { session, client } : null;
}

export async function inviteClientAction(raw: unknown): Promise<AuthResult & { message?: string }> {
  const { t } = await getI18n();
  const parsed = z
    .object({ clientId: z.string(), email: z.string().trim().max(120).optional(), phone: z.string().trim().max(30).optional() })
    .safeParse(raw);
  if (!parsed.success) return { ok: false, error: t("Dati non validi") };
  const owned = await ownClient(parsed.data.clientId);
  if (!owned) return { ok: false, error: t("L'accesso clienti richiede Supabase collegato.") };

  const email = parsed.data.email ? parsed.data.email.toLowerCase() : null;
  if (email && !z.email().safeParse(email).success) return { ok: false, error: t("Inserisci un indirizzo email valido.") };
  const phone = parsed.data.phone ? normalizePhone(parsed.data.phone) : null;
  if (parsed.data.phone && !phone) return { ok: false, error: t("Numero di telefono non valido. Usa il formato +39 333 1234567.") };
  if (!email && !phone) return { ok: false, error: t("Inserisci l'email o il telefono del cliente.") };

  try {
    const outcome = await saveClientInvite({
      clientId: owned.client.id,
      coachId: owned.session.userId,
      email,
      phone,
      redirectTo: `${await siteOrigin()}/auth/callback?next=/portale`,
    });
    if (outcome === "taken") return { ok: false, error: t("Questa email o questo telefono sono già collegati a un altro cliente.") };
    revalidatePath(`/clients/${owned.client.id}`);
    return {
      ok: true,
      message: outcome === "sent" ? t("Invito inviato: il cliente riceverà un'email per accedere.") : t("Accesso salvato: il cliente può accedere con questa email o questo telefono."),
    };
  } catch (error) {
    console.error("[client-access] invite", error);
    return { ok: false, error: t("Si è verificato un errore imprevisto. Riprova.") };
  }
}

export async function revokeClientAccessAction(clientId: unknown): Promise<AuthResult> {
  const { t } = await getI18n();
  const owned = await ownClient(clientId);
  if (!owned) return { ok: false, error: t("Dati non validi") };
  try {
    await revokeClientAccess(owned.client.id);
  } catch (error) {
    console.error("[client-access] revoke", error);
    return { ok: false, error: t("Si è verificato un errore imprevisto. Riprova.") };
  }
  revalidatePath(`/clients/${owned.client.id}`);
  return { ok: true };
}
