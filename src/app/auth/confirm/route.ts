import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabaseUserClient, safeNext } from "@/lib/auth/supabase";
import { destinationAfterSignIn } from "@/lib/auth/clients";

const TYPES: EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"];

/**
 * Email links using the token-hash templates (recommended for invites and recovery):
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const supabase = await supabaseUserClient();
  if (!tokenHash || !type || !TYPES.includes(type) || !supabase) return NextResponse.redirect(new URL("/login?error=expired", url.origin));

  const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  if (error || !data.user) return NextResponse.redirect(new URL("/login?error=expired", url.origin));
  const destination = await destinationAfterSignIn(data.user, safeNext(url.searchParams.get("next")));
  if (type === "invite" || type === "recovery") return NextResponse.redirect(new URL("/reset-password", url.origin));
  return NextResponse.redirect(new URL(destination, url.origin));
}
