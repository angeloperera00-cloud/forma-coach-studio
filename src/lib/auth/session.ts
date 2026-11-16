import "server-only";
import { cache } from "react";
import { promises as fs } from "node:fs";
import path from "node:path";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { coachEmail, localCredentials, SESSION_COOKIE, SESSION_DAYS, supabaseAuthConfig, loginRequired, DEMO_CREDENTIALS } from "./config";
import { safeEqual, signToken, verifyToken } from "./token";
import { demoDataDir } from "@/lib/data/demo/repository";

export interface Session {
  email: string;
  provider: "supabase" | "local" | "none";
}

/* ------------------------------- local secret ------------------------------- */
const g = globalThis as unknown as { __formaAuthSecret?: string };

/** AUTH_SECRET from the environment, or (demo mode only) a random secret persisted in .demo-data/. */
export async function localSecret(): Promise<string> {
  if (process.env.AUTH_SECRET && process.env.AUTH_SECRET.length >= 32) return process.env.AUTH_SECRET;
  if (g.__formaAuthSecret) return g.__formaAuthSecret;
  const file = path.join(await demoDataDir(), "auth-secret");
  try {
    g.__formaAuthSecret = (await fs.readFile(file, "utf8")).trim();
  } catch {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    g.__formaAuthSecret = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    await fs.writeFile(file, g.__formaAuthSecret, { mode: 0o600 });
  }
  return g.__formaAuthSecret;
}

/* ------------------------------ supabase client ----------------------------- */
export async function supabaseAuthClient() {
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

/* --------------------------------- session ---------------------------------- */
/** The signed-in coach for this request, verified on the server. Memoized per request. */
export const getSession = cache(async (): Promise<Session | null> => {
  if (!loginRequired()) return { email: coachEmail() ?? DEMO_CREDENTIALS.email, provider: "none" };
  const supabase = await supabaseAuthClient();
  if (supabase) {
    const { data } = await supabase.auth.getClaims();
    const email = typeof data?.claims?.email === "string" ? data.claims.email.toLowerCase() : null;
    const allowed = coachEmail();
    if (!email || !allowed || email !== allowed) return null;
    return { email, provider: "supabase" };
  }
  const creds = localCredentials();
  if (!creds) return null;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const payload = await verifyToken(token, await localSecret());
  if (!payload || payload.sub !== creds.email) return null;
  return { email: payload.sub, provider: "local" };
});

/* -------------------------------- sign in/out ------------------------------- */
export type SignInResult = { ok: true } | { ok: false; error: "credentials" | "not-coach" | "config" | "rate-limit" };

const attempts = new Map<string, { count: number; since: number }>();
const WINDOW_MS = 10 * 60_000;
const MAX_ATTEMPTS = 8;

function limited(key: string) {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now - entry.since > WINDOW_MS) return false;
  return entry.count >= MAX_ATTEMPTS;
}
function fail(key: string) {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now - entry.since > WINDOW_MS) attempts.set(key, { count: 1, since: now });
  else entry.count++;
}

export async function signIn(emailInput: string, password: string, clientKey: string): Promise<SignInResult> {
  const email = emailInput.trim().toLowerCase();
  if (limited(clientKey) || limited(email)) return { ok: false, error: "rate-limit" };

  const supabase = await supabaseAuthClient();
  if (supabase) {
    const allowed = coachEmail();
    if (!allowed) return { ok: false, error: "config" };
    if (email !== allowed) {
      fail(clientKey);
      fail(email);
      return { ok: false, error: "not-coach" };
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      fail(clientKey);
      fail(email);
      return { ok: false, error: "credentials" };
    }
    return { ok: true };
  }

  const creds = localCredentials();
  if (!creds) return { ok: false, error: "config" };
  const valid = safeEqual(email, creds.email) && safeEqual(password, creds.password);
  if (!valid) {
    fail(clientKey);
    fail(email);
    return { ok: false, error: "credentials" };
  }
  const exp = Math.floor(Date.now() / 1000) + SESSION_DAYS * 86_400;
  const token = await signToken({ sub: creds.email, exp }, await localSecret());
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
  return { ok: true };
}

export async function signOut() {
  const supabase = await supabaseAuthClient();
  if (supabase) await supabase.auth.signOut();
  (await cookies()).delete(SESSION_COOKIE);
}

export async function changePassword(newPassword: string): Promise<boolean> {
  const supabase = await supabaseAuthClient();
  if (!supabase) return false;
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  return !error;
}
