-- =============================================================================
-- Forma — coach-only fitness coaching platform
-- Single coach, no sign-in. The Next.js server talks to Postgres with the
-- service-role key; Row Level Security is enabled on every table with NO
-- policies, so the public anon/authenticated roles cannot read or write data.
-- =============================================================================

-- gen_random_uuid() is built into Postgres 13+ (Supabase runs 15+).

-- -----------------------------------------------------------------------------
-- Helpers
-- -----------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Coach profile (singleton)
-- -----------------------------------------------------------------------------
create table public.coach_profile (
  id                   smallint primary key default 1 check (id = 1),
  full_name            text not null default 'Coach' check (char_length(full_name) between 1 and 80),
  email                text check (email is null or char_length(email) <= 120),
  phone                text check (phone is null or char_length(phone) <= 30),
  studio_name          text check (studio_name is null or char_length(studio_name) <= 80),
  bio                  text check (bio is null or char_length(bio) <= 600),
  avatar_url           text,
  default_sets         int  not null default 3  check (default_sets between 1 and 20),
  default_reps         text not null default '10' check (char_length(default_reps) between 1 and 12),
  default_rest_seconds int  not null default 90 check (default_rest_seconds between 0 and 900),
  pdf_footer           text check (pdf_footer is null or char_length(pdf_footer) <= 300),
  updated_at           timestamptz not null default now()
);
insert into public.coach_profile (id) values (1) on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- Clients
-- -----------------------------------------------------------------------------
create table public.clients (
  id               uuid primary key default gen_random_uuid(),
  first_name       text not null check (char_length(first_name) between 1 and 60),
  last_name        text not null check (char_length(last_name) between 1 and 60),
  email            text check (email is null or char_length(email) <= 120),
  phone            text check (phone is null or char_length(phone) <= 30),
  birth_date       date,
  gender           text check (gender in ('female', 'male', 'other')),
  height_cm        numeric(5, 1) check (height_cm between 80 and 250),
  goal             text not null check (goal in ('weight_loss', 'muscle_gain', 'strength', 'recomposition', 'endurance', 'maintenance', 'mobility')),
  goal_details     text check (goal_details is null or char_length(goal_details) <= 600),
  status           text not null default 'active' check (status in ('active', 'paused', 'archived')),
  avatar_url       text,
  start_date       date not null default current_date,
  last_activity_at timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index clients_status_idx on public.clients (status);

create table public.client_notes (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid not null references public.clients (id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index client_notes_client_idx on public.client_notes (client_id, created_at desc);

-- -----------------------------------------------------------------------------
-- Exercise library
-- -----------------------------------------------------------------------------
create table public.exercises (
  id                uuid primary key default gen_random_uuid(),
  name              text not null check (char_length(name) between 2 and 80),
  primary_muscles   text[] not null default '{}',
  secondary_muscles text[] not null default '{}',
  equipment         text not null check (equipment in ('barbell', 'dumbbell', 'kettlebell', 'machine', 'cable', 'bodyweight', 'bands', 'other')),
  difficulty        text not null check (difficulty in ('beginner', 'intermediate', 'advanced')),
  instructions      text[] not null default '{}',
  image_urls        text[] not null default '{}',
  is_custom         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index exercises_name_idx on public.exercises (lower(name));

-- -----------------------------------------------------------------------------
-- Workout plans → days → exercises
-- -----------------------------------------------------------------------------
create table public.workout_plans (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid references public.clients (id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 100),
  status       text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  notes        text check (notes is null or char_length(notes) <= 1000),
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index workout_plans_client_idx on public.workout_plans (client_id, status);

create table public.workout_days (
  id               uuid primary key default gen_random_uuid(),
  plan_id          uuid not null references public.workout_plans (id) on delete cascade,
  weekday          smallint not null check (weekday between 0 and 6),
  title            text check (title is null or char_length(title) <= 80),
  category         text check (category in ('strength', 'hypertrophy', 'full_body', 'upper_body', 'lower_body', 'push', 'pull', 'legs', 'core', 'cardio', 'hiit', 'mobility')),
  goal             text check (goal in ('weight_loss', 'muscle_gain', 'strength', 'recomposition', 'endurance', 'maintenance', 'mobility')),
  duration_minutes int check (duration_minutes between 5 and 300),
  notes            text check (notes is null or char_length(notes) <= 1000),
  constraint workout_days_plan_weekday_key unique (plan_id, weekday) deferrable initially deferred
);

create table public.workout_exercises (
  id           uuid primary key default gen_random_uuid(),
  day_id       uuid not null references public.workout_days (id) on delete cascade,
  exercise_id  uuid not null references public.exercises (id) on delete restrict,
  position     int not null default 0,
  sets         int not null check (sets between 1 and 20),
  reps         text not null check (char_length(reps) between 1 and 12),
  rest_seconds int not null check (rest_seconds between 0 and 900),
  weight_kg    numeric(6, 2) check (weight_kg between 0 and 1000),
  tempo        text check (tempo is null or char_length(tempo) <= 16),
  notes        text check (notes is null or char_length(notes) <= 300),
  superset_id  text
);
create index workout_exercises_day_idx on public.workout_exercises (day_id, position);
create index workout_exercises_exercise_idx on public.workout_exercises (exercise_id);

-- -----------------------------------------------------------------------------
-- Food library (foods + recipes)
-- -----------------------------------------------------------------------------
create table public.foods (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (char_length(name) between 2 and 80),
  category      text not null check (category in ('grains', 'dairy', 'meat_fish', 'eggs', 'legumes', 'fruit', 'vegetables', 'nuts_seeds', 'fats_oils', 'sweets', 'drinks', 'supplements', 'dishes', 'other')),
  kind          text not null default 'food' check (kind in ('food', 'recipe')),
  image_url     text,
  unit          text not null default 'g' check (unit in ('g', 'ml')),
  serving_size  numeric(7, 1) not null check (serving_size > 0),
  serving_label text check (serving_label is null or char_length(serving_label) <= 60),
  kcal_100      numeric(7, 1) not null check (kcal_100 between 0 and 900),
  protein_100   numeric(6, 2) not null default 0 check (protein_100 between 0 and 100),
  carbs_100     numeric(6, 2) not null default 0 check (carbs_100 between 0 and 100),
  fat_100       numeric(6, 2) not null default 0 check (fat_100 between 0 and 100),
  servings      numeric(5, 1) check (servings is null or servings > 0),
  -- demo = bundled indicative values · custom = coach-entered · external = imported from an authoritative database
  source        text not null default 'custom' check (source in ('demo', 'custom', 'external')),
  source_ref    text,
  is_custom     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index foods_name_idx on public.foods (lower(name));

create table public.recipe_ingredients (
  id        uuid primary key default gen_random_uuid(),
  recipe_id uuid not null,
  food_id   uuid not null,
  amount    numeric(7, 1) not null check (amount > 0),
  position  int not null default 0,
  constraint recipe_ingredients_recipe_fk foreign key (recipe_id) references public.foods (id) on delete cascade,
  constraint recipe_ingredients_food_fk foreign key (food_id) references public.foods (id) on delete restrict
);
create index recipe_ingredients_recipe_idx on public.recipe_ingredients (recipe_id, position);
create index recipe_ingredients_food_idx on public.recipe_ingredients (food_id);

-- -----------------------------------------------------------------------------
-- Nutrition plans → meal entries
-- -----------------------------------------------------------------------------
create table public.nutrition_plans (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid references public.clients (id) on delete cascade,
  name           text not null check (char_length(name) between 1 and 100),
  notes          text check (notes is null or char_length(notes) <= 500),
  status         text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  week_start     date,
  target_kcal    int check (target_kcal between 600 and 8000),
  target_protein int check (target_protein between 0 and 500),
  target_carbs   int check (target_carbs between 0 and 1000),
  target_fat     int check (target_fat between 0 and 400),
  published_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index nutrition_plans_client_idx on public.nutrition_plans (client_id, status);

create table public.meal_entries (
  id               uuid primary key default gen_random_uuid(),
  plan_id          uuid not null references public.nutrition_plans (id) on delete cascade,
  day              smallint not null check (day between 0 and 6),
  slot             text not null check (slot in ('breakfast', 'morning_snack', 'lunch', 'afternoon_snack', 'dinner', 'pre_bed')),
  position         int not null default 0,
  food_id          uuid references public.foods (id) on delete set null,
  name             text not null check (char_length(name) between 1 and 80),
  image_url        text,
  amount           numeric(7, 1) check (amount between 0 and 5000),
  unit             text check (unit in ('g', 'ml', 'pz')),
  kcal             numeric(7, 1) check (kcal between 0 and 5000),
  protein          numeric(6, 1) check (protein between 0 and 500),
  carbs            numeric(6, 1) check (carbs between 0 and 1000),
  fat              numeric(6, 1) check (fat between 0 and 500),
  nutrition_source text check (nutrition_source in ('food', 'manual')),
  notes            text check (notes is null or char_length(notes) <= 300)
);
create index meal_entries_plan_idx on public.meal_entries (plan_id, day, slot, position);

-- -----------------------------------------------------------------------------
-- Progress, appointments, activity
-- -----------------------------------------------------------------------------
create table public.progress_records (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references public.clients (id) on delete cascade,
  date         date not null,
  weight_kg    numeric(5, 1) check (weight_kg between 25 and 350),
  body_fat_pct numeric(4, 1) check (body_fat_pct between 2 and 70),
  waist_cm     numeric(5, 1) check (waist_cm between 30 and 250),
  hips_cm      numeric(5, 1) check (hips_cm between 30 and 250),
  chest_cm     numeric(5, 1) check (chest_cm between 30 and 250),
  arm_cm       numeric(5, 1) check (arm_cm between 10 and 90),
  thigh_cm     numeric(5, 1) check (thigh_cm between 20 and 120),
  notes        text check (notes is null or char_length(notes) <= 500),
  created_at   timestamptz not null default now()
);
create index progress_records_client_idx on public.progress_records (client_id, date);

create table public.appointments (
  id               uuid primary key default gen_random_uuid(),
  client_id        uuid references public.clients (id) on delete cascade,
  title            text not null check (char_length(title) between 1 and 100),
  type             text not null check (type in ('training', 'check_in', 'video_call', 'assessment')),
  starts_at        timestamptz not null,
  duration_minutes int not null check (duration_minutes between 5 and 600),
  location         text check (location is null or char_length(location) <= 120),
  notes            text check (notes is null or char_length(notes) <= 1000),
  status           text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index appointments_starts_idx on public.appointments (starts_at);
create index appointments_client_idx on public.appointments (client_id, starts_at);

create table public.activity (
  id          uuid primary key default gen_random_uuid(),
  type        text not null,
  client_id   uuid references public.clients (id) on delete cascade,
  title       text not null,
  description text,
  href        text,
  params      jsonb,
  dedupe_key  text unique,
  created_at  timestamptz not null default now(),
  read_at     timestamptz
);
create index activity_created_idx on public.activity (created_at desc);
create index activity_unread_idx on public.activity (created_at desc) where read_at is null;

-- -----------------------------------------------------------------------------
-- updated_at triggers
-- -----------------------------------------------------------------------------
create trigger coach_profile_touch before update on public.coach_profile for each row execute function public.touch_updated_at();
create trigger clients_touch before update on public.clients for each row execute function public.touch_updated_at();
create trigger exercises_touch before update on public.exercises for each row execute function public.touch_updated_at();
create trigger workout_plans_touch before update on public.workout_plans for each row execute function public.touch_updated_at();
create trigger foods_touch before update on public.foods for each row execute function public.touch_updated_at();
create trigger nutrition_plans_touch before update on public.nutrition_plans for each row execute function public.touch_updated_at();
create trigger appointments_touch before update on public.appointments for each row execute function public.touch_updated_at();

-- -----------------------------------------------------------------------------
-- Atomic plan saves (whole tree in one transaction)
-- -----------------------------------------------------------------------------
create or replace function public.save_workout_plan(p jsonb)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_plan_id uuid := (p ->> 'id')::uuid;
  v_status  text := p ->> 'status';
begin
  insert into workout_plans as wp (id, client_id, name, status, notes, published_at)
  values (
    v_plan_id,
    nullif(p ->> 'clientId', '')::uuid,
    p ->> 'name',
    v_status,
    p ->> 'notes',
    case when v_status = 'published' then now() end
  )
  on conflict (id) do update set
    client_id    = excluded.client_id,
    name         = excluded.name,
    status       = excluded.status,
    notes        = excluded.notes,
    published_at = case
      when excluded.status = 'published' and wp.status = 'published' then coalesce(wp.published_at, now())
      when excluded.status = 'published' then now()
      else null
    end;

  delete from workout_days
  where plan_id = v_plan_id
    and id not in (select (d ->> 'id')::uuid from jsonb_array_elements(coalesce(p -> 'days', '[]'::jsonb)) d);

  insert into workout_days as wd (id, plan_id, weekday, title, category, goal, duration_minutes, notes)
  select (d ->> 'id')::uuid, v_plan_id, (d ->> 'weekday')::smallint, d ->> 'title', d ->> 'category', d ->> 'goal',
         (d ->> 'durationMinutes')::int, d ->> 'notes'
  from jsonb_array_elements(coalesce(p -> 'days', '[]'::jsonb)) d
  on conflict (id) do update set
    weekday          = excluded.weekday,
    title            = excluded.title,
    category         = excluded.category,
    goal             = excluded.goal,
    duration_minutes = excluded.duration_minutes,
    notes            = excluded.notes
  where wd.plan_id = v_plan_id;

  delete from workout_exercises we
  using workout_days wd
  where we.day_id = wd.id
    and wd.plan_id = v_plan_id
    and we.id not in (
      select (e ->> 'id')::uuid
      from jsonb_array_elements(coalesce(p -> 'days', '[]'::jsonb)) d,
           jsonb_array_elements(coalesce(d -> 'exercises', '[]'::jsonb)) e
    );

  insert into workout_exercises as wx (id, day_id, exercise_id, position, sets, reps, rest_seconds, weight_kg, tempo, notes, superset_id)
  select (e ->> 'id')::uuid, (d ->> 'id')::uuid, (e ->> 'exerciseId')::uuid, (x.ord - 1)::int,
         (e ->> 'sets')::int, e ->> 'reps', (e ->> 'restSeconds')::int, (e ->> 'weightKg')::numeric,
         e ->> 'tempo', e ->> 'notes', e ->> 'supersetId'
  from jsonb_array_elements(coalesce(p -> 'days', '[]'::jsonb)) d,
       jsonb_array_elements(coalesce(d -> 'exercises', '[]'::jsonb)) with ordinality as x(e, ord)
  on conflict (id) do update set
    day_id       = excluded.day_id,
    exercise_id  = excluded.exercise_id,
    position     = excluded.position,
    sets         = excluded.sets,
    reps         = excluded.reps,
    rest_seconds = excluded.rest_seconds,
    weight_kg    = excluded.weight_kg,
    tempo        = excluded.tempo,
    notes        = excluded.notes,
    superset_id  = excluded.superset_id;
end;
$$;

create or replace function public.save_nutrition_plan(p jsonb)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_plan_id uuid := (p ->> 'id')::uuid;
  v_status  text := p ->> 'status';
begin
  insert into nutrition_plans as np (id, client_id, name, notes, status, week_start, target_kcal, target_protein, target_carbs, target_fat, published_at)
  values (
    v_plan_id,
    nullif(p ->> 'clientId', '')::uuid,
    p ->> 'name',
    p ->> 'notes',
    v_status,
    (p ->> 'weekStart')::date,
    (p -> 'targets' ->> 'kcal')::int,
    (p -> 'targets' ->> 'protein')::int,
    (p -> 'targets' ->> 'carbs')::int,
    (p -> 'targets' ->> 'fat')::int,
    case when v_status = 'published' then now() end
  )
  on conflict (id) do update set
    client_id      = excluded.client_id,
    name           = excluded.name,
    notes          = excluded.notes,
    status         = excluded.status,
    week_start     = excluded.week_start,
    target_kcal    = excluded.target_kcal,
    target_protein = excluded.target_protein,
    target_carbs   = excluded.target_carbs,
    target_fat     = excluded.target_fat,
    published_at   = case
      when excluded.status = 'published' and np.status = 'published' then coalesce(np.published_at, now())
      when excluded.status = 'published' then now()
      else null
    end;

  delete from meal_entries
  where plan_id = v_plan_id
    and id not in (select (m ->> 'id')::uuid from jsonb_array_elements(coalesce(p -> 'meals', '[]'::jsonb)) m);

  insert into meal_entries as me (id, plan_id, day, slot, position, food_id, name, image_url, amount, unit, kcal, protein, carbs, fat, nutrition_source, notes)
  select (m ->> 'id')::uuid, v_plan_id, (m ->> 'day')::smallint, m ->> 'slot', (m ->> 'position')::int,
         nullif(m ->> 'foodId', '')::uuid, m ->> 'name', m ->> 'imageUrl', (m ->> 'amount')::numeric, m ->> 'unit',
         (m ->> 'kcal')::numeric, (m ->> 'protein')::numeric, (m ->> 'carbs')::numeric, (m ->> 'fat')::numeric,
         m ->> 'nutritionSource', m ->> 'notes'
  from jsonb_array_elements(coalesce(p -> 'meals', '[]'::jsonb)) m
  on conflict (id) do update set
    day              = excluded.day,
    slot             = excluded.slot,
    position         = excluded.position,
    food_id          = excluded.food_id,
    name             = excluded.name,
    image_url        = excluded.image_url,
    amount           = excluded.amount,
    unit             = excluded.unit,
    kcal             = excluded.kcal,
    protein          = excluded.protein,
    carbs            = excluded.carbs,
    fat              = excluded.fat,
    nutrition_source = excluded.nutrition_source,
    notes            = excluded.notes
  where me.plan_id = v_plan_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Security: RLS on, no policies → only the service role (server) has access.
-- -----------------------------------------------------------------------------
alter table public.coach_profile      enable row level security;
alter table public.clients            enable row level security;
alter table public.client_notes       enable row level security;
alter table public.exercises          enable row level security;
alter table public.workout_plans      enable row level security;
alter table public.workout_days       enable row level security;
alter table public.workout_exercises  enable row level security;
alter table public.foods              enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.nutrition_plans    enable row level security;
alter table public.meal_entries       enable row level security;
alter table public.progress_records   enable row level security;
alter table public.appointments       enable row level security;
alter table public.activity           enable row level security;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on all tables in schema public from anon, authenticated';
    execute 'revoke execute on function public.save_workout_plan(jsonb) from public, anon, authenticated';
    execute 'revoke execute on function public.save_nutrition_plan(jsonb) from public, anon, authenticated';
  end if;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant execute on function public.save_workout_plan(jsonb) to service_role';
    execute 'grant execute on function public.save_nutrition_plan(jsonb) to service_role';
  end if;
end
$$;

-- -----------------------------------------------------------------------------
-- Storage bucket for uploaded photos (exercise, food, client avatars).
-- Uploads go through the server with the service role; files are served publicly
-- under unguessable UUID paths.
-- -----------------------------------------------------------------------------
do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('media', 'media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
    on conflict (id) do nothing;
  end if;
end
$$;
