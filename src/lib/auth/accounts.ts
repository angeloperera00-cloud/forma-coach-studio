import "server-only";
import type { User } from "@supabase/supabase-js";
import { coachEmail } from "./config";
import { supabaseServiceClient } from "./supabase";

/*
 * Coach accounts (Supabase mode). Signing in with any provider only proves identity: access to
 * coach data requires an APPROVED account. Approval happens when
 *   - the user's VERIFIED email equals COACH_EMAIL (studio owner → admin), or
 *   - the user's VERIFIED email matches a pending invite, or
 *   - an admin approves the account from Impostazioni → Coach.
 * Accounts are never merged by email here: one Supabase user = one coach account.
 */

export type CoachRole = "admin" | "coach";
export type CoachStatus = "pending" | "approved" | "disabled";

export interface CoachAccount {
  userId: string;
  email: string | null;
  phone: string | null;
  username: string | null;
  displayName: string | null;
  role: CoachRole;
  status: CoachStatus;
  createdAt: string;
}

export interface CoachInvite {
  email: string;
  role: CoachRole;
  createdAt: string;
  acceptedAt: string | null;
}

/* eslint-disable @typescript-eslint/no-explicit-any -- untyped PostgREST rows */
const toAccount = (r: any): CoachAccount => ({
  userId: r.user_id,
  email: r.email,
  phone: r.phone,
  username: r.username,
  displayName: r.display_name,
  role: r.role,
  status: r.status,
  createdAt: r.created_at,
});

function admin() {
  const sb = supabaseServiceClient();
  if (!sb) throw new Error("Supabase service role is not configured");
  return sb;
}

export async function loadAccount(userId: string): Promise<CoachAccount | null> {
  const { data, error } = await admin().from("coach_accounts").select("*").eq("user_id", userId).maybeSingle();
  if (error) {
    console.error("[auth] loadAccount", error);
    return null;
  }
  return data ? toAccount(data) : null;
}

/** Email the provider has verified (OAuth providers, confirmed email/password users). */
export function verifiedEmail(user: User): string | null {
  const email = user.email?.toLowerCase() ?? null;
  if (!email) return null;
  if (user.email_confirmed_at) return email;
  const viaIdentity = user.identities?.some((i) => (i.identity_data?.email as string | undefined)?.toLowerCase() === email && i.identity_data?.email_verified === true);
  return viaIdentity ? email : null;
}

/**
 * Makes sure the user has a coach account and applies automatic approval rules.
 * Called after every successful sign-in (password, OTP, OAuth callback, email link).
 */
export async function syncAccount(user: User): Promise<CoachAccount | null> {
  const sb = admin();
  const meta = user.user_metadata ?? {};
  await sb
    .from("coach_accounts")
    .upsert(
      {
        user_id: user.id,
        email: user.email?.toLowerCase() ?? null,
        phone: user.phone || null,
        display_name: (meta.full_name as string | undefined) ?? (meta.name as string | undefined) ?? null,
      },
      { onConflict: "user_id", ignoreDuplicates: true },
    );
  let account = await loadAccount(user.id);
  if (!account || account.status !== "pending") return account;

  const email = verifiedEmail(user);
  if (!email) return account;

  const now = new Date().toISOString();
  if (email === coachEmail()) {
    const { count } = await sb.from("coach_accounts").select("user_id", { count: "exact", head: true }).eq("role", "admin").eq("status", "approved");
    await sb.from("coach_accounts").update({ status: "approved", role: "admin", approved_at: now }).eq("user_id", user.id);
    // The first admin inherits everything created while login was off.
    if (!count) await sb.rpc("claim_unowned_data", { p_coach: user.id });
  } else {
    const { data: invite } = await sb.from("coach_invites").select("*").eq("email", email).is("accepted_at", null).maybeSingle();
    if (!invite) return account;
    await sb.from("coach_accounts").update({ status: "approved", role: invite.role, approved_at: now, approved_by: invite.invited_by }).eq("user_id", user.id);
    await sb.from("coach_invites").update({ accepted_at: now, accepted_by: user.id }).eq("email", email);
  }
  account = await loadAccount(user.id);
  return account;
}

/** Resolves a username (approved coaches only) to the account email, server-side only. */
export async function emailForUsername(username: string): Promise<string | null> {
  const sb = admin();
  const { data } = await sb.from("coach_accounts").select("user_id, email").eq("username", username.trim().toLowerCase()).eq("status", "approved").maybeSingle();
  if (!data) return null;
  if (data.email) return data.email;
  const { data: u } = await sb.auth.admin.getUserById(data.user_id);
  return u.user?.email?.toLowerCase() ?? null;
}

export async function setUsername(userId: string, username: string | null): Promise<"ok" | "taken" | "error"> {
  const { error } = await admin().from("coach_accounts").update({ username }).eq("user_id", userId);
  if (!error) return "ok";
  return error.code === "23505" ? "taken" : "error";
}

/* ------------------------------- administration ------------------------------ */
export async function listAccounts(): Promise<CoachAccount[]> {
  const { data } = await admin().from("coach_accounts").select("*").order("status").order("created_at", { ascending: false });
  return (data ?? []).map(toAccount);
}

export async function listInvites(): Promise<CoachInvite[]> {
  const { data } = await admin().from("coach_invites").select("*").order("created_at", { ascending: false });
  return (data ?? []).map((r: any) => ({ email: r.email, role: r.role, createdAt: r.created_at, acceptedAt: r.accepted_at }));
}

export async function setAccountStatus(adminId: string, userId: string, status: CoachStatus, role?: CoachRole) {
  const patch: Record<string, unknown> = { status };
  if (role) patch.role = role;
  if (status === "approved") Object.assign(patch, { approved_at: new Date().toISOString(), approved_by: adminId });
  const { error } = await admin().from("coach_accounts").update(patch).eq("user_id", userId);
  if (error) throw error;
}

export async function createInvite(adminId: string, email: string, role: CoachRole, redirectTo: string) {
  const sb = admin();
  const { error } = await sb.from("coach_invites").upsert({ email, role, invited_by: adminId, accepted_at: null, accepted_by: null }, { onConflict: "email" });
  if (error) throw error;
  // Existing user with this verified email: approve right away. Otherwise send Supabase's invite email.
  const { data: existing } = await sb.from("coach_accounts").select("user_id").eq("email", email).maybeSingle();
  if (existing) {
    const { data } = await sb.auth.admin.getUserById(existing.user_id);
    if (data.user && verifiedEmail(data.user) === email) await syncAccount(data.user);
    return "exists" as const;
  }
  const { error: inviteError } = await sb.auth.admin.inviteUserByEmail(email, { redirectTo });
  if (inviteError) {
    console.warn("[auth] inviteUserByEmail", inviteError.message);
    return "saved" as const;
  }
  return "sent" as const;
}

export async function deleteInvite(email: string) {
  await admin().from("coach_invites").delete().eq("email", email);
}
