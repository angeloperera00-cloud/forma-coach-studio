import { NextResponse, type NextRequest } from "next/server";
import { supabaseUserClient, safeNext } from "@/lib/auth/supabase";
import { destinationAfterSignIn } from "@/lib/auth/clients";

/**
 * OAuth (Google, Facebook, Apple), identity linking and email links (password recovery, invites)
 * come back here with a PKCE ?code=. Cancellation and provider errors arrive as ?error=.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const next = safeNext(url.searchParams.get("next"));
  const fail = (reason: string) => NextResponse.redirect(new URL(`/login?error=${reason}`, url.origin));

  const error = url.searchParams.get("error");
  if (error) {
    const description = url.searchParams.get("error_description") ?? "";
    console.warn("[auth/callback]", error, description);
    return fail(error === "access_denied" || /cancel|denied/i.test(description) ? "cancelled" : "provider");
  }
  const code = url.searchParams.get("code");
  const supabase = await supabaseUserClient();
  if (!code || !supabase) return fail("provider");

  const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError || !data.user) {
    console.warn("[auth/callback] exchange", exchangeError?.message);
    return fail("expired");
  }
  const destination = await destinationAfterSignIn(data.user, next);
  // Password recovery / invite: always allow setting the password first.
  if (next === "/reset-password") return NextResponse.redirect(new URL(next, url.origin));
  return NextResponse.redirect(new URL(destination, url.origin));
}
