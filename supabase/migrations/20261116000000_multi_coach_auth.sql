-- =============================================================================
-- Forma · multi-coach accounts and per-coach data isolation (Row Level Security)
--
-- * coach_accounts: one row per Supabase Auth user. Signing in (Google, Facebook,
--   Apple, email, phone) only creates a PENDING account: no data access until an
--   admin approves it, or the user's verified email matches an invite.
-- * Every data row gets coach_id (default auth.uid()). Policies let an approved
--   coach see and change only rows where coach_id = auth.uid().
-- * The starter library (exercises/foods with coach_id null) is shared read-only.
-- * Rows created before login was enabled (coach_id null) are claimed by the first
--   admin (public.claim_unowned_data).
-- * The service role (server) still bypasses RLS: it is used only for account
--   administration, username lookup and storage uploads, after server-side checks.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Accounts & invites
-- -----------------------------------------------------------------------------
create table if not exists public.coach_accounts (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  email        text,
  phone        text,
  username     text check (username is null or username ~ '^[a-z0-9._]{3,30}$'),
  display_name text check (display_name is null or char_length(display_name) <= 120),
  role         text not null default 'coach' check (role in ('admin', 'coach')),
  status       text not null default 'pending' check (status in ('pending', 'approved', 'disabled')),
  created_at   timestamptz not null default now(),
  approved_at  timestamptz,
  approved_by  uuid references auth.users (id) on delete set null
);
create unique index if not exists coach_accounts_username_key on public.coach_accounts (lower(username));
create index if not exists coach_accounts_status_idx on public.coach_accounts (status, created_at);

create table if not exists public.coach_invites (
  email       text primary key check (email = lower(email) and email like '%@%'),
  role        text not null default 'coach' check (role in ('admin', 'coach')),
  invited_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  accepted_at timestamptz,
  accepted_by uuid references auth.users (id) on delete set null
);

-- New auth users get a pending account automatically.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.coach_accounts (user_id, email, phone, display_name)
  values (
    new.id,
    lower(new.email),
    new.phone,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- Is the current user an approved coach? (security definer: reads accounts despite RLS)
create or replace function public.is_coach()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.coach_accounts where user_id = auth.uid() and status = 'approved');
$$;

-- -----------------------------------------------------------------------------
-- Ownership columns
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'clients', 'client_notes', 'exercises', 'workout_plans', 'workout_days', 'workout_exercises',
    'foods', 'recipe_ingredients', 'nutrition_plans', 'meal_entries', 'progress_records', 'appointments', 'activity'
  ] loop
    execute format('alter table public.%I add column if not exists coach_id uuid default auth.uid() references auth.users (id) on delete cascade', t);
    execute format('create index if not exists %I on public.%I (coach_id)', t || '_coach_idx', t);
  end loop;
end
$$;

-- Coach profile: from a singleton to one row per coach (the coach_id-null row is the
-- profile used while login is off).
alter table public.coach_profile drop constraint if exists coach_profile_pkey;
alter table public.coach_profile drop constraint if exists coach_profile_id_check;
alter table public.coach_profile alter column id drop default;
alter table public.coach_profile alter column id drop not null;
alter table public.coach_profile add column if not exists pk uuid not null default gen_random_uuid();
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'coach_profile_pk') then
    alter table public.coach_profile add constraint coach_profile_pk primary key (pk);
  end if;
end
$$;
alter table public.coach_profile add column if not exists coach_id uuid default auth.uid() references auth.users (id) on delete cascade;
create unique index if not exists coach_profile_coach_key on public.coach_profile (coach_id) nulls not distinct;

-- Reminders are de-duplicated per coach.
alter table public.activity drop constraint if exists activity_dedupe_key_key;
alter table public.activity add column if not exists dedupe_scope text
  generated always as (coalesce(coach_id::text, '-') || ':' || dedupe_key) stored;
create unique index if not exists activity_dedupe_scope_key on public.activity (dedupe_scope);

-- Plans may only point at the saving coach's own clients (RLS hides other coaches' rows).
create or replace function public.assert_visible_client(p_client uuid)
returns void
language plpgsql
stable
set search_path = public
as $$
begin
  if p_client is not null and not exists (select 1 from public.clients where id = p_client) then
    raise exception 'client not found' using errcode = '23503';
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- First admin: claim data created while login was off
-- -----------------------------------------------------------------------------
create or replace function public.claim_unowned_data(p_coach uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  t text;
begin
  foreach t in array array[
    'clients', 'client_notes', 'workout_plans', 'workout_days', 'workout_exercises',
    'nutrition_plans', 'meal_entries', 'progress_records', 'appointments', 'activity'
  ] loop
    execute format('update public.%I set coach_id = $1 where coach_id is null', t) using p_coach;
  end loop;
  -- Custom library items (not the shared starter set) become the admin's.
  update public.exercises set coach_id = p_coach where coach_id is null and is_custom;
  update public.foods set coach_id = p_coach where coach_id is null and is_custom;
  update public.recipe_ingredients ri set coach_id = p_coach
    from public.foods f where ri.recipe_id = f.id and f.coach_id = p_coach and ri.coach_id is null;
  -- Profile used while login was off becomes the admin's profile.
  if not exists (select 1 from public.coach_profile where coach_id = p_coach) then
    update public.coach_profile set coach_id = p_coach where coach_id is null;
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Row Level Security policies (role "authenticated" = signed-in Supabase users)
-- -----------------------------------------------------------------------------
alter table public.coach_accounts enable row level security;
alter table public.coach_invites enable row level security;

drop policy if exists coach_accounts_self on public.coach_accounts;
create policy coach_accounts_self on public.coach_accounts
  for select to authenticated using (user_id = auth.uid());
-- coach_invites: no policies → server (service role) only.

do $$
declare
  t text;
begin
  -- Private per-coach data.
  foreach t in array array[
    'coach_profile', 'clients', 'client_notes', 'workout_plans', 'workout_days', 'workout_exercises',
    'nutrition_plans', 'meal_entries', 'progress_records', 'appointments', 'activity'
  ] loop
    execute format('drop policy if exists %I on public.%I', t || '_own', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (coach_id = auth.uid() and public.is_coach()) with check (coach_id = auth.uid() and public.is_coach())',
      t || '_own', t
    );
  end loop;

  -- Library: shared starter items readable by every approved coach, own items fully editable.
  foreach t in array array['exercises', 'foods', 'recipe_ingredients'] loop
    execute format('drop policy if exists %I on public.%I', t || '_read', t);
    execute format('drop policy if exists %I on public.%I', t || '_write', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.is_coach() and (coach_id is null or coach_id = auth.uid()))',
      t || '_read', t
    );
    execute format(
      'create policy %I on public.%I for all to authenticated using (coach_id = auth.uid() and public.is_coach()) with check (coach_id = auth.uid() and public.is_coach())',
      t || '_write', t
    );
  end loop;
end
$$;

-- Plan saves run with the caller's rights (RLS applies); check the client first.
create or replace function public.save_workout_plan_checked(p jsonb)
returns void
language plpgsql
set search_path = public
as $$
begin
  perform public.assert_visible_client(nullif(p ->> 'clientId', '')::uuid);
  perform public.save_workout_plan(p);
end;
$$;

create or replace function public.save_nutrition_plan_checked(p jsonb)
returns void
language plpgsql
set search_path = public
as $$
begin
  perform public.assert_visible_client(nullif(p ->> 'clientId', '')::uuid);
  perform public.save_nutrition_plan(p);
end;
$$;

-- -----------------------------------------------------------------------------
-- Grants: signed-in users go through RLS; anonymous visitors get nothing.
-- -----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'grant usage on schema public to authenticated';
    execute 'grant select, insert, update, delete on public.coach_profile, public.clients, public.client_notes, public.exercises,
      public.workout_plans, public.workout_days, public.workout_exercises, public.foods, public.recipe_ingredients,
      public.nutrition_plans, public.meal_entries, public.progress_records, public.appointments, public.activity to authenticated';
    execute 'grant select on public.coach_accounts to authenticated';
    execute 'grant execute on function public.is_coach() to authenticated';
    execute 'grant execute on function public.assert_visible_client(uuid) to authenticated';
    execute 'grant execute on function public.save_workout_plan(jsonb), public.save_nutrition_plan(jsonb) to authenticated';
    execute 'grant execute on function public.save_workout_plan_checked(jsonb), public.save_nutrition_plan_checked(jsonb) to authenticated';
  end if;
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on all tables in schema public from anon';
    execute 'revoke execute on function public.claim_unowned_data(uuid) from public, anon, authenticated';
    execute 'revoke execute on function public.handle_new_auth_user() from public, anon, authenticated';
  end if;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant all on public.coach_accounts, public.coach_invites to service_role';
    execute 'grant execute on function public.claim_unowned_data(uuid) to service_role';
    execute 'grant execute on function public.save_workout_plan_checked(jsonb), public.save_nutrition_plan_checked(jsonb) to service_role';
  end if;
end
$$;
