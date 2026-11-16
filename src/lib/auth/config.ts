/**
 * Auth configuration shared by the proxy (edge of the app) and server code.
 * Only the coach signs in. Clients never have accounts.
 *
 * - Supabase mode (SUPABASE_URL + keys set): Supabase Auth email/password, restricted to COACH_EMAIL.
 * - Local/demo mode: COACH_EMAIL + COACH_PASSWORD from the environment (demo defaults when unset),
 *   session stored in an HMAC-signed, httpOnly cookie.
 */
export const SESSION_COOKIE = "forma-session";
export const SESSION_DAYS = 14;

export const DEMO_CREDENTIALS = { email: "coach@forma.demo", password: "forma-demo-2026" } as const;

export function supabaseAuthConfig() {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && anonKey && serviceKey ? { url, anonKey } : null;
}

export function coachEmail(): string | null {
  return process.env.COACH_EMAIL?.trim().toLowerCase() || null;
}

/**
 * Local mode credentials. Demo defaults apply only to the local demo store; if real data lives
 * in Supabase, sign-in is disabled until proper credentials are configured.
 */
export function localCredentials(): { email: string; password: string; isDemo: boolean } | null {
  const email = coachEmail();
  const password = process.env.COACH_PASSWORD;
  if (email && password && password.length >= 8) return { email, password, isDemo: false };
  const realData = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (realData) return null;
  return { email: DEMO_CREDENTIALS.email, password: DEMO_CREDENTIALS.password, isDemo: true };
}
