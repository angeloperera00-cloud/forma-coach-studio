import "server-only";
import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { supabaseAuthConfig } from "./config";
import { supabaseServiceClient } from "./supabase";
import { getAuthUser } from "./session";
import { syncAccount, verifiedEmail } from "./accounts";

/*
 * Client (athlete) access, Supabase mode only. A coach invites one of their clients by email
 * and/or phone; a person who signs in with that VERIFIED email or phone is linked to that one
 * client record and can only read its published plans (read-only area at /portale).
 * The link lives in public.client_access, which only the server can read (no RLS policies).
 */

export interface ClientLink {
  userId: string;
  clientId: string;
  coachId: string | null;
  identity: string;
}

export interface ClientAccess {
  email: string | null;
  phone: string | null;
  invitedAt: string;
  acceptedAt: string | null;
  linked: boolean;
}

function admin() {
  const sb = supabaseServiceClient();
  if (!sb) throw new Error("Supabase service role is not configured");
  return sb;
}

/** Phone the provider has verified, in E.164 (Supabase stores it without the "+"). */
export function verifiedPhone(user: User): string | null {
  if (!user.phone || !user.phone_confirmed_at) return null;
  return user.phone.startsWith("+") ? user.phone : `+${user.phone}`;
}

const identityOf = (user: User) => user.email ?? (user.phone ? `+${user.phone.replace(/^\+/, "")}` : "");

/** Existing link for this user, if any. */
async function existingLink(user: User): Promise<ClientLink | null> {
  const { data, error } = await admin().from("client_access").select("client_id, coach_id").eq("user_id", user.id).maybeSingle();
  if (error) console.error("[clients] link", error);
  return data ? { userId: user.id, clientId: data.client_id, coachId: data.coach_id, identity: identityOf(user) } : null;
}

/** Links the user to an open invite matching their verified email or phone. */
async function claimInvite(user: User): Promise<ClientLink | null> {
  const sb = admin();
  const email = verifiedEmail(user);
  const phone = verifiedPhone(user);
  for (const [column, value] of [["email", email], ["phone", phone]] as const) {
    if (!value) continue;
    const { data } = await sb
      .from("client_access")
      .update({ user_id: user.id, accepted_at: new Date().toISOString() })
      .eq(column, value)
      .is("user_id", null)
      .select("client_id, coach_id")
      .maybeSingle();
    if (data) return { userId: user.id, clientId: data.client_id, coachId: data.coach_id, identity: identityOf(user) };
  }
  return null;
}

/** A client never keeps a (pending) coach account, so they never show up in the approval list. */
async function dropPendingCoachAccount(userId: string) {
  await admin().from("coach_accounts").delete().eq("user_id", userId).eq("status", "pending");
}

/**
 * Where a freshly signed-in Supabase user goes: approved coach → `next`, invited/linked
 * client → /portale, anyone else → /pending. Called after every sign-in method.
 */
export async function destinationAfterSignIn(user: User, next: string): Promise<string> {
  const linked = await existingLink(user);
  if (linked) {
    await dropPendingCoachAccount(user.id);
    return "/portale";
  }
  const account = await syncAccount(user);
  if (account?.status === "approved") return next;
  const claimed = await claimInvite(user);
  if (claimed) {
    await dropPendingCoachAccount(user.id);
    return "/portale";
  }
  return "/pending";
}

/** The signed-in client for this request (verified on the server), or null. */
export const getClientLink = cache(async (): Promise<ClientLink | null> => {
  if (!supabaseAuthConfig()) return null;
  const user = await getAuthUser();
  return user ? existingLink(user) : null;
});

/* ------------------------------ coach-side management ------------------------------ */

export async function loadClientAccess(clientId: string): Promise<ClientAccess | null> {
  if (!supabaseServiceClient()) return null;
  const { data, error } = await admin().from("client_access").select("*").eq("client_id", clientId).maybeSingle();
  if (error) {
    console.error("[clients] access", error);
    return null;
  }
  return data ? { email: data.email, phone: data.phone, invitedAt: data.invited_at, acceptedAt: data.accepted_at, linked: Boolean(data.user_id) } : null;
}

export type InviteOutcome = "sent" | "saved" | "taken";

/**
 * Creates or replaces the invite for a client. Changing the email/phone of an accepted invite
 * unlinks the previous person. Sends Supabase's invite email when an email is given and no
 * account exists yet; existing users simply sign in with that verified email or phone.
 */
export async function saveClientInvite(input: { clientId: string; coachId: string | null; email: string | null; phone: string | null; redirectTo: string }): Promise<InviteOutcome> {
  const sb = admin();
  const { data: current } = await sb.from("client_access").select("*").eq("client_id", input.clientId).maybeSingle();
  const sameContact = current && current.email === input.email && current.phone === input.phone;
  const row = {
    client_id: input.clientId,
    coach_id: input.coachId,
    email: input.email,
    phone: input.phone,
    invited_at: new Date().toISOString(),
    ...(sameContact ? {} : { user_id: null, accepted_at: null }),
  };
  const { error } = await sb.from("client_access").upsert(row, { onConflict: "client_id" });
  if (error) {
    if (error.code === "23505") return "taken";
    throw error;
  }
  if (!input.email || (sameContact && current?.user_id)) return "saved";
  const { error: inviteError } = await sb.auth.admin.inviteUserByEmail(input.email, { redirectTo: input.redirectTo });
  if (inviteError) {
    // Already registered (e.g. signed in before with Google): they just need to sign in again.
    console.warn("[clients] invite email", inviteError.message);
    return "saved";
  }
  return "sent";
}

export async function revokeClientAccess(clientId: string) {
  await admin().from("client_access").delete().eq("client_id", clientId);
}
