# Forma · Coach Studio

Web app for personal trainers and nutrition coaches: clients, weekly workout plans, 7‑day meal plans, progress tracking, calendar, reminders and branded PDF exports. Italian is the default language, English is available from the language switcher.

Only the coach signs in. Clients don't need an account: they receive their workout and meal plans as PDFs.

## Features

- **Dashboard** — client selector, “Crea Scheda di Allenamento” / “Crea Piano Alimentare” hero cards, stats, recent plans, upcoming appointments, client activity.
- **Clients** — searchable/sortable table, profile with overview, workouts, nutrition, progress, appointments and private coach notes.
- **Workout builder** — Monday–Sunday days, drag-and-drop exercises, sets/reps/rest/load/tempo, supersets, notes, live summary (duration, sets, muscles), draft → publish, duplicate, PDF.
- **Meal planner** — 7 days × 6 meals grid, foods and recipes from the library or free text, daily/weekly totals vs targets, copy day/meal, PDF.
- **Libraries** — 43 exercises with photos and 73 foods/recipes (with illustrations); add your own exercises, foods and recipes (nutrition computed from ingredients).
- **Progress** — weight, body fat and circumferences with charts and history.
- **Calendar** — month view with agenda; training, check-ins, video calls, assessments.
- **Notifications** — activity log plus automatic reminders (upcoming appointments, missing check-ins, missing plans, pending drafts).
- **Settings** — coach profile, workout defaults, PDF footer, language, password, JSON data export, demo reset.
- **Italian / English** — all screens, validation messages, notifications, dates/numbers and PDFs.

Stack: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Radix UI primitives, Lucide, Motion, React Hook Form + Zod, TanStack Table, Recharts, dnd-kit, @react-pdf/renderer, Supabase (Postgres, Storage, Auth).

## Quick start (demo mode)

Requirements: Node.js ≥ 20.9 and npm.

```bash
npm install
npm run dev
```

Open http://localhost:3000 and sign in with **coach@forma.demo** / **forma-demo-2026** (or press “Accedi con le credenziali demo”).

With no environment variables the app runs in **demo mode**: realistic sample data is created in `.demo-data/db.json` and uploads go to `.demo-data/media/`. Reset it any time from **Impostazioni → Dati → Ripristina dati demo** (or delete the `.demo-data` folder). Demo mode is meant for local use: serverless hosts don't keep files between requests, so use Supabase in production.

## Database setup (Supabase)

1. Create a project at [supabase.com](https://supabase.com).
2. **Create the schema** — either
   - Supabase CLI: `supabase link --project-ref <ref>` then `supabase db push`, or
   - Dashboard → SQL Editor: paste and run `supabase/migrations/20261115000000_forma_init.sql`.

   This creates all tables, constraints, indexes, the `save_workout_plan` / `save_nutrition_plan` functions (atomic saves), enables RLS on every table (no public policies: the app only talks to the database from the server) and creates the public `media` storage bucket (5 MB, JPG/PNG/WebP).
3. **Load the starter library** — run `supabase/seed.sql` in the SQL Editor (or `psql "$DATABASE_URL" -f supabase/seed.sql`). It inserts the 43 exercises and 73 foods/recipes and is safe to run more than once. The images it references are served from this app's `public/` folder.
4. **Environment** — copy `.env.example` to `.env.local` and set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (Project Settings → API).
5. **Coach account** (Supabase Auth, recommended):
   - Authentication → Sign In / Providers → Email: enable it and **turn off “Allow new users to sign up”**.
   - Authentication → Users → **Add user** with your email and a strong password.
   - Set `COACH_EMAIL` to that email and `SUPABASE_ANON_KEY` (or `SUPABASE_PUBLISHABLE_KEY`) in `.env.local`. Only that email can sign in; password changes are available in Impostazioni → Account.
6. Restart `npm run dev`. The sidebar account menu shows “Database Supabase” when connected.

If the `media` bucket wasn't created (e.g. the storage schema wasn't available when the migration ran), create it manually: Storage → New bucket → name `media`, public.

`npm run db:seed-sql` regenerates `supabase/seed.sql` from `src/lib/data/seed/library.ts` if you change the starter library.

## Sign-in options

| Mode | When | Variables |
| --- | --- | --- |
| Supabase Auth | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` and an anon/publishable key are set | `COACH_EMAIL` (+ user created in Supabase) |
| Local | No Supabase Auth keys | `COACH_EMAIL`, `COACH_PASSWORD` (≥ 8 chars), `AUTH_SECRET` (≥ 32 chars) |
| Demo | Nothing configured and no Supabase data | built-in `coach@forma.demo` / `forma-demo-2026` |

Sessions are checked on the server for every page, server action, PDF/export/upload route; the proxy only adds a fast redirect. Failed logins are rate-limited.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `SUPABASE_URL` | for Supabase | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | for Supabase | Server-only key used for all data access |
| `SUPABASE_ANON_KEY` / `SUPABASE_PUBLISHABLE_KEY` | for Supabase Auth | Public key used for coach sign-in |
| `COACH_EMAIL` | yes (non-demo) | The only account allowed to sign in |
| `COACH_PASSWORD` | local sign-in | Coach password when not using Supabase Auth |
| `AUTH_SECRET` | local sign-in in production | Signs the session cookie (≥ 32 chars) |
| `NEXT_PUBLIC_APP_TIMEZONE` | no | Default `Europe/Rome` |
| `DEMO_DATA_DIR` | no | Demo data folder (default `.demo-data`) |

## Languages

Italian is the default; the choice (IT/EN) is stored in a cookie and can be changed on the sign-in page, in the account menu and in Impostazioni → Lingua.

Components are written in Italian (`t("Salva bozza")`) and `src/lib/i18n/catalog/*.ts` maps each Italian string to English. After adding UI text run:

```bash
npm run i18n:check   # lists strings without an English translation (exit 1 if any)
npm run i18n:scan    # finds Italian text that isn't wrapped in t()
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / server |
| `npm run lint` | ESLint |
| `npm run typecheck` | Route types + TypeScript |
| `npm run i18n:check` / `npm run i18n:scan` | Translation checks |
| `npm run db:seed-sql` | Regenerate `supabase/seed.sql` |

## Deploy

Any Node host or Vercel: set the environment variables above (Supabase mode), then `npm run build && npm start`. PDF generation runs in the Node runtime and reads the bundled fonts from `src/lib/pdf/fonts` and images from `public/` (already listed in `outputFileTracingIncludes`).

## Project structure

```
src/app/(app)/        coach pages (dashboard, clients, workouts, nutrition, libraries, progress, calendar, notifications, settings)
src/app/login/        sign-in page
src/app/api/          PDF export, JSON export, uploads, demo media
src/components/       UI by feature (shell, dashboard, clients, workouts, nutrition, library, calendar, progress, settings…)
src/lib/data/         repository interface + Supabase and demo implementations, seed data, reminders
src/lib/domain/       types, constants, zod schemas, workout/nutrition calculations
src/lib/auth/         coach session (Supabase Auth or signed cookie)
src/lib/i18n/         translator, formatters, English catalogue
src/lib/pdf/          PDF documents (workout, nutrition)
src/proxy.ts          sign-in redirect + Supabase session refresh
supabase/             SQL migration and starter seed
```

## Credits

- Exercise photos: [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (public domain / Unlicense).
- Food illustrations and emoji: [Microsoft Fluent Emoji](https://github.com/microsoft/fluentui-emoji) (MIT).
- Font: [Inter](https://rsms.me/inter/) (SIL Open Font License, `src/lib/pdf/fonts/OFL.txt`).
- Hero and avatar images: derived from the supplied reference designs.
- Nutrition values of the starter foods are indicative (marked “Valori indicativi”); verify them against your reference source.
