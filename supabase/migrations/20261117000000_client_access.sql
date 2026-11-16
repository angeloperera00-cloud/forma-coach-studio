-- =============================================================================
-- Forma · client (athlete) access — read-only area for the person doing the workouts
--
-- * A coach invites one of their clients by email and/or phone (client_access row).
-- * When someone signs in with a VERIFIED email or phone that matches the invite, their
--   Supabase user is linked to that single client record (user_id). Never by email alone
--   if unverified, and one user can be linked to one client only.
-- * Clients get NO direct database access: this table has no RLS policies and is_coach()
--   is false for them, so every coach table stays invisible through the public API.
--   The server reads the client's published plans with the service role, after checking
--   the link on every request.
-- * Re-runnable.
-- =============================================================================

create table if not exists public.client_access (
  client_id   uuid primary key references public.clients (id) on delete cascade,
  coach_id    uuid references auth.users (id) on delete cascade,
  email       text check (email is null or (email = lower(email) and email like '%@%' and char_length(email) <= 120)),
  phone       text check (phone is null or phone ~ '^\+[1-9][0-9]{7,14}$'),
  user_id     uuid references auth.users (id) on delete set null,
  invited_at  timestamptz not null default now(),
  accepted_at timestamptz,
  constraint client_access_contact check (email is not null or phone is not null)
);
create unique index if not exists client_access_email_key on public.client_access (email) where email is not null;
create unique index if not exists client_access_phone_key on public.client_access (phone) where phone is not null;
create unique index if not exists client_access_user_key on public.client_access (user_id) where user_id is not null;
create index if not exists client_access_coach_idx on public.client_access (coach_id);

alter table public.client_access enable row level security;
-- No policies on purpose: only the server (service role) reads or writes client_access.

-- A user linked to a client is never treated as a coach, even if a coach account exists.
create or replace function public.is_coach()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.coach_accounts where user_id = auth.uid() and status = 'approved')
     and not exists (select 1 from public.client_access where user_id = auth.uid());
$$;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke all on public.client_access from authenticated';
    execute 'grant execute on function public.is_coach() to authenticated';
  end if;
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on public.client_access from anon';
  end if;
end
$$;
