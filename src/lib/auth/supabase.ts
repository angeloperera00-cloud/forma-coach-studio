import "server-only";
import { cookies, headers } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseAuthConfig, type OAuthProvider } from "./config";

/**
 * Supabase client acting as the signed-in user (anon key + session cookies, PKCE flow).
 * Database calls made with it go through Row Level Security.
 */
export async function supabaseUserClient(): Promise<SupabaseClient | null> {
  const cfg = supabaseAuthConfig();
  if (!cfg) return null;
  const store = await cookies();
  return createServerClient(cfg.url, cfg.anonKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Server Components cannot set cookies; the proxy refreshes the session instead.
        }
      },
    },
  });
}

const g = globalThis as unknown as { __formaServiceClient?: SupabaseClient; __formaProviders?: { at: number; value: ProviderStatus } };

/** Service-role client (bypasses RLS). Server-only: account administration, username lookup, uploads. */
export function supabaseServiceClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  g.__formaServiceClient ??= createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { "x-application-name": "forma-coach" } },
  });
  return g.__formaServiceClient;
}

export type ProviderStatus = Record<OAuthProvider | "email" | "phone", boolean>;

/**
 * Which sign-in methods are enabled in the Supabase project (public /auth/v1/settings endpoint,
 * cached for a minute). Without Supabase Auth only the local email login exists.
 */
export async function providerStatus(): Promise<ProviderStatus | null> {
  const cfg = supabaseAuthConfig();
  if (!cfg) return null;
  if (g.__formaProviders && Date.now() - g.__formaProviders.at < 60_000) return g.__formaProviders.value;
  try {
    const res = await fetch(`${cfg.url}/auth/v1/settings`, { headers: { apikey: cfg.anonKey }, signal: AbortSignal.timeout(4000), cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    const ext = ((await res.json()) as { external?: Record<string, boolean> }).external ?? {};
    const value: ProviderStatus = { google: !!ext.google, facebook: !!ext.facebook, apple: !!ext.apple, email: ext.email !== false, phone: !!ext.phone };
    g.__formaProviders = { at: Date.now(), value };
    return value;
  } catch {
    // Unknown (network/config): let every method try, Supabase reports what is missing.
    return { google: true, facebook: true, apple: true, email: true, phone: true };
  }
}

/** Public origin of this deployment, for OAuth and email redirect URLs. */
export async function siteOrigin(): Promise<string> {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/+$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Only same-site relative paths are accepted as post-login destinations. */
export function safeNext(value: unknown, fallback = "/"): string {
  const next = typeof value === "string" ? value : fallback;
  return next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/login") && !next.startsWith("/auth/") ? next : fallback;
}
