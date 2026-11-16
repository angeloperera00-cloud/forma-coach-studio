/**
 * Auth configuration shared by the proxy (edge of the app) and server code.
 * Only coaches sign in. Clients never have accounts.
 *
 * - Supabase mode (SUPABASE_URL + anon/publishable key + service role key): Supabase Auth with
 *   Google, Facebook, Apple, email/username + password and phone OTP. Every new identity is a
 *   PENDING coach until approved (or invited). Data is isolated per coach with Row Level Security.
 * - Local/demo mode: COACH_EMAIL + COACH_PASSWORD from the environment (demo defaults when unset),
 *   session stored in an HMAC-signed, httpOnly cookie.
 */
export const SESSION_COOKIE = "forma-session";
export const SESSION_DAYS = 14;

/**
 * Sign-in is OFF unless REQUIRE_LOGIN=true is set in the environment.
 * When off, every visitor is treated as the coach (no login gate; data is one shared studio).
 */
export function loginRequired(): boolean {
  return process.env.REQUIRE_LOGIN === "true";
}

export const DEMO_CREDENTIALS = { email: "coach@forma.demo", password: "forma-demo-2026" } as const;

export const OAUTH_PROVIDERS = ["google", "facebook", "apple"] as const;
export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

/** Public paths reachable without a session when login is required. */
export const PUBLIC_PATHS = ["/login", "/auth/", "/privacy", "/terms", "/reset-password", "/pending"];
export const isPublicPath = (pathname: string) => PUBLIC_PATHS.some((p) => (p.endsWith("/") ? pathname.startsWith(p) : pathname === p));

export function supabaseAuthConfig() {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && anonKey && serviceKey ? { url, anonKey, serviceKey } : null;
}

/** Email of the studio owner: becomes the first admin when it signs in with that verified email. */
export function coachEmail(): string | null {
  return process.env.COACH_EMAIL?.trim().toLowerCase() || null;
}

/**
 * Local mode credentials. Demo defaults apply only to the local demo store; if real data lives
 * in Supabase, local sign-in is disabled.
 */
export function localCredentials(): { email: string; password: string; isDemo: boolean } | null {
  const email = coachEmail();
  const password = process.env.COACH_PASSWORD;
  if (email && password && password.length >= 8) return { email, password, isDemo: false };
  const realData = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (realData) return null;
  return { email: DEMO_CREDENTIALS.email, password: DEMO_CREDENTIALS.password, isDemo: true };
}
