import "server-only";
import { cache } from "react";
import { promises as fs } from "node:fs";
import path from "node:path";
import { cookies } from "next/headers";
import type { User } from "@supabase/supabase-js";
import { coachEmail, localCredentials, SESSION_COOKIE, SESSION_DAYS, supabaseAuthConfig, loginRequired, DEMO_CREDENTIALS } from "./config";
import { safeEqual, signToken, verifyToken } from "./token";
import { supabaseUserClient } from "./supabase";
import { loadAccount, type CoachAccount, type CoachRole } from "./accounts";
import { demoDataDir } from "@/lib/data/demo/repository";

export interface Session {
  /** Supabase user id (Supabase mode), null otherwise. */
  userId: string | null;
  email: string;
  provider: "supabase" | "local" | "none";
  role: CoachRole;
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

/** @deprecated kept for existing imports: use supabaseUserClient. */
export const supabaseAuthClient = supabaseUserClient;

/* --------------------------------- session ---------------------------------- */
/**
 * Supabase user behind the current request (any provider), verified on the server.
 * Signed in does NOT mean authorized: see getSession / the coach account status.
 */
export const getAuthUser = cache(async (): Promise<User | null> => {
  const supabase = await supabaseUserClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser();
  return error ? null : data.user;
});

export const getAuthState = cache(async (): Promise<{ user: User; account: CoachAccount | null } | null> => {
  const user = await getAuthUser();
  return user ? { user, account: await loadAccount(user.id) } : null;
});

/** The authorized coach for this request (approved account), verified on the server. Memoized per request. */
export const getSession = cache(async (): Promise<Session | null> => {
  if (!loginRequired()) return { userId: null, email: coachEmail() ?? DEMO_CREDENTIALS.email, provider: "none", role: "admin" };
  if (supabaseAuthConfig()) {
    const state = await getAuthState();
    if (!state?.account || state.account.status !== "approved") return null;
    return { userId: state.user.id, email: state.user.email ?? state.user.phone ?? "", provider: "supabase", role: state.account.role };
  }
  const creds = localCredentials();
  if (!creds) return null;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const payload = await verifyToken(token, await localSecret());
  if (!payload || payload.sub !== creds.email) return null;
  return { userId: null, email: payload.sub, provider: "local", role: "admin" };
});

/* ----------------------------- rate limiting -------------------------------- */
const attempts = new Map<string, { count: number; since: number }>();
const WINDOW_MS = 10 * 60_000;
const MAX_ATTEMPTS = 8;

export function rateLimited(...keys: string[]) {
  const now = Date.now();
  return keys.some((key) => {
    const entry = attempts.get(key);
    return entry && now - entry.since <= WINDOW_MS && entry.count >= MAX_ATTEMPTS;
  });
}
export function recordFailure(...keys: string[]) {
  const now = Date.now();
  for (const key of keys) {
    const entry = attempts.get(key);
    if (!entry || now - entry.since > WINDOW_MS) attempts.set(key, { count: 1, since: now });
    else entry.count++;
  }
}

/* ----------------------------- local sign in/out ----------------------------- */
/** Local (non-Supabase) mode: credentials from the environment, signed httpOnly cookie. */
export async function signInLocal(emailInput: string, password: string): Promise<boolean> {
  const creds = localCredentials();
  if (!creds) return false;
  const email = emailInput.trim().toLowerCase();
  if (!(safeEqual(email, creds.email) && safeEqual(password, creds.password))) return false;
  const exp = Math.floor(Date.now() / 1000) + SESSION_DAYS * 86_400;
  const token = await signToken({ sub: creds.email, exp }, await localSecret());
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
  return true;
}

export async function signOut() {
  const supabase = await supabaseUserClient();
  if (supabase) await supabase.auth.signOut();
  (await cookies()).delete(SESSION_COOKIE);
}
