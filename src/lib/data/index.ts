import "server-only";
import type { Repository } from "./repository";
import { AppError } from "./repository";
import { createDemoRepository } from "./demo/repository";
import { createSupabaseRepository, type DataScope } from "./supabase/repository";
import { loginRequired, supabaseAuthConfig } from "@/lib/auth/config";
import { getSession } from "@/lib/auth/session";
import { supabaseUserClient } from "@/lib/auth/supabase";

export type { Repository } from "./repository";
export { AppError, ConflictError, NotFoundError } from "./repository";

const g = globalThis as unknown as { __formaRepository?: Repository };

export function supabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url, key } : null;
}

/**
 * With login on and Supabase Auth configured, every query runs as the signed-in coach so Row Level
 * Security only exposes that coach's data. With login off, the server uses the service role.
 */
const coachScope: DataScope = async () => {
  const session = await getSession();
  const client = await supabaseUserClient();
  if (!session?.userId || !client) throw new AppError("Sessione scaduta: accedi di nuovo.");
  return { client, coachId: session.userId };
};

/**
 * Supabase when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set (server-only, never exposed to the browser),
 * otherwise the labelled local demo store.
 */
export function getRepository(): Repository {
  if (!g.__formaRepository) {
    const cfg = supabaseConfig();
    const perCoach = loginRequired() && Boolean(supabaseAuthConfig());
    g.__formaRepository = cfg ? createSupabaseRepository(cfg.url, cfg.key, perCoach ? coachScope : undefined) : createDemoRepository();
  }
  return g.__formaRepository;
}
