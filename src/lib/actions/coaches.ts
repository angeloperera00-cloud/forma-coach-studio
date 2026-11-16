"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { createInvite, deleteInvite, setAccountStatus } from "@/lib/auth/accounts";
import { siteOrigin } from "@/lib/auth/supabase";
import { getI18n } from "@/lib/i18n/server";
import type { AuthResult } from "./auth";

/** Coach administration (Supabase mode, admins only). Always re-checked on the server. */
async function requireAdmin() {
  const session = await getSession();
  return session?.provider === "supabase" && session.role === "admin" && session.userId ? session : null;
}

export async function setCoachStatusAction(raw: unknown): Promise<AuthResult> {
  const { t } = await getI18n();
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: t("Solo un amministratore può gestire i coach.") };
  const parsed = z
    .object({ userId: z.uuid(), status: z.enum(["approved", "disabled", "pending"]), role: z.enum(["admin", "coach"]).optional() })
    .safeParse(raw);
  if (!parsed.success) return { ok: false, error: t("Dati non validi") };
  if (parsed.data.userId === admin.userId) return { ok: false, error: t("Non puoi modificare il tuo stesso account.") };
  try {
    await setAccountStatus(admin.userId!, parsed.data.userId, parsed.data.status, parsed.data.role);
  } catch (error) {
    console.error("[coaches] setStatus", error);
    return { ok: false, error: t("Si è verificato un errore imprevisto. Riprova.") };
  }
  revalidatePath("/settings");
  return { ok: true };
}

export async function inviteCoachAction(raw: unknown): Promise<AuthResult> {
  const { t } = await getI18n();
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: t("Solo un amministratore può gestire i coach.") };
  const parsed = z.object({ email: z.email(), role: z.enum(["admin", "coach"]).default("coach") }).safeParse(raw);
  if (!parsed.success) return { ok: false, error: t("Inserisci un indirizzo email valido.") };
  try {
    const res = await createInvite(admin.userId!, parsed.data.email.toLowerCase(), parsed.data.role, `${await siteOrigin()}/auth/callback?next=/reset-password`);
    revalidatePath("/settings");
    return {
      ok: true,
      message:
        res === "sent"
          ? t("Invito inviato: il coach riceverà un'email per impostare la password.")
          : res === "exists"
            ? t("Invito salvato: l'account esistente viene approvato al prossimo accesso con email verificata.")
            : t("Invito salvato: il coach verrà approvato quando accede con questa email."),
    };
  } catch (error) {
    console.error("[coaches] invite", error);
    return { ok: false, error: t("Si è verificato un errore imprevisto. Riprova.") };
  }
}

export async function deleteInviteAction(email: unknown): Promise<AuthResult> {
  const { t } = await getI18n();
  if (!(await requireAdmin())) return { ok: false, error: t("Solo un amministratore può gestire i coach.") };
  const parsed = z.email().safeParse(email);
  if (!parsed.success) return { ok: false, error: t("Dati non validi") };
  await deleteInvite(parsed.data);
  revalidatePath("/settings");
  return { ok: true };
}
