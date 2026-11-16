import "server-only";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { AppError, getRepository } from "@/lib/data";
import type { ActivityInput } from "@/lib/data/repository";
import { getI18n } from "@/lib/i18n/server";
import { getSession } from "@/lib/auth/session";

export type ActionResult<T = null> = { ok: true; data: T } | { ok: false; error: string; fieldErrors?: Record<string, string> };

/**
 * Every server action runs through here:
 * 1. the coach session is verified on the server (not just hidden in the UI);
 * 2. validation and domain errors become messages in the coach's language;
 * 3. anything unexpected is logged and reported generically.
 */
export async function handle<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  const i18n = await getI18n();
  const { t, has } = i18n;
  // Expired or missing session: send the coach back to the sign-in page.
  if (!(await getSession())) redirect("/login");
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    if (error instanceof ZodError) {
      const translate = (message: string) => (has(message) ? t(message) : t("Alcuni dati non sono validi."));
      const fieldErrors: Record<string, string> = {};
      for (const issue of error.issues) {
        const key = issue.path.join(".");
        if (!(key in fieldErrors)) fieldErrors[key] = translate(issue.message);
      }
      return { ok: false, error: translate(error.issues[0]?.message ?? ""), fieldErrors };
    }
    if (error instanceof AppError) return { ok: false, error: t(error.template, error.params) };
    console.error("[action]", error);
    return { ok: false, error: t("Si è verificato un errore imprevisto. Riprova.") };
  }
}

export function refreshAll() {
  revalidatePath("/", "layout");
}

/** Coach-initiated events are recorded as already read (they are an activity log, not alerts). */
export async function logActivity(input: ActivityInput) {
  try {
    await getRepository().createActivity({ read: true, ...input });
  } catch (error) {
    console.error("[activity]", error);
  }
}

export async function touch(clientId: string | null | undefined) {
  if (!clientId) return;
  try {
    await getRepository().touchClient(clientId);
  } catch (error) {
    console.error("[touch]", error);
  }
}
