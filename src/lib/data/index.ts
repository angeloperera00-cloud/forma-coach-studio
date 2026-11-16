import "server-only";
import type { Repository } from "./repository";
import { createDemoRepository } from "./demo/repository";
import { createSupabaseRepository } from "./supabase/repository";

export type { Repository } from "./repository";
export { AppError, ConflictError, NotFoundError } from "./repository";

const g = globalThis as unknown as { __formaRepository?: Repository };

export function supabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? { url, key } : null;
}

/**
 * Supabase when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set (server-only, never exposed to the browser),
 * otherwise the labelled local demo store.
 */
export function getRepository(): Repository {
  if (!g.__formaRepository) {
    const cfg = supabaseConfig();
    g.__formaRepository = cfg ? createSupabaseRepository(cfg.url, cfg.key) : createDemoRepository();
  }
  return g.__formaRepository;
}
