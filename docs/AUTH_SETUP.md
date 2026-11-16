# Sign-in setup — Google, Facebook, Apple, email, username and SMS

The sign-in page (`/login`) offers four options:

| Button | How it works |
| --- | --- |
| **Usa telefono / email / nome utente** | Email + password, username + password (resolved to the account email on the server), or phone number + SMS code. “Password dimenticata?” sends a reset link. |
| **Continua con Facebook** | Supabase OAuth (PKCE) → `/auth/callback` |
| **Continua con Google** | Supabase OAuth (PKCE) → `/auth/callback` |
| **Continua con Apple** | Supabase OAuth (PKCE) → `/auth/callback` |

A button whose provider is not enabled in Supabase shows “non ancora configurato” instead of failing. Nothing works for real until you finish the steps below **and test each provider yourself**.

> Signing in never grants access to data by itself. A new account is **pending** until an administrator approves it (Impostazioni → Coach dello studio) or it signs in with a verified email that matches an invite. Each coach only sees their own clients, plans and reminders. This is enforced on the server and by Postgres Row Level Security.

---

## 0. Before you start

1. Run **all three** migrations, in order (SQL Editor or `supabase db push`):
   - `supabase/migrations/20261115000000_forma_init.sql`
   - `supabase/migrations/20261116000000_multi_coach_auth.sql`
   - `supabase/migrations/20261117000000_client_access.sql`
2. Run `supabase/seed.sql` (shared exercise/food library).
3. Set these on Vercel (Project → Settings → Environment Variables) and in `.env.local`:

   ```
   SUPABASE_URL=https://<ref>.supabase.co
   SUPABASE_ANON_KEY=...            # or SUPABASE_PUBLISHABLE_KEY
   SUPABASE_SERVICE_ROLE_KEY=...    # server only, never NEXT_PUBLIC_
   SITE_URL=https://forma-coach-studio.vercel.app
   COACH_EMAIL=<your email>         # becomes the first administrator
   REQUIRE_LOGIN=true               # leave false until sign-in is tested
   ```

   The first time `COACH_EMAIL` signs in with a **verified** email, it becomes administrator and takes ownership of everything created while login was off.

4. Supabase → **Authentication → URL Configuration**
   - **Site URL:** `https://forma-coach-studio.vercel.app`
   - **Redirect URLs:** add
     - `https://forma-coach-studio.vercel.app/auth/callback`
     - `http://localhost:3000/auth/callback`
     - optionally Vercel previews: `https://*-<your-team>.vercel.app/auth/callback`

5. The callback URL every provider needs is Supabase's, **not** the website's:

   ```
   https://<ref>.supabase.co/auth/v1/callback
   ```

---

## 1. Email + password, username, password reset

1. Supabase → Authentication → **Sign In / Providers → Email**: enabled, “Confirm email” **on**.
2. If only invited coaches should get in, turn **off** “Allow new users to sign up”. Invites still work.
3. Authentication → **Email Templates** (recommended, so links open the right page):
   - **Invite user**: link `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite`
   - **Reset password**: link `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery`
   - **Confirm signup**: link `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`
4. For real volume, set a custom SMTP server (Authentication → SMTP). Supabase's built-in sender is heavily rate-limited.
5. Usernames are set by each coach in Impostazioni → Metodi di accesso (3–30 chars: `a-z 0-9 . _`). The lookup happens only on the server, so emails are never exposed.

## 2. Google

1. [console.cloud.google.com](https://console.cloud.google.com) → create/select a project.
2. **APIs & Services → OAuth consent screen** (Google Auth Platform): External, app name “Forma”, support email, and the authorized domain `vercel.app` (or your own domain). Scopes: `openid`, `email`, `profile`. Publish the app when you go live.
3. **Clients → Create client → Web application**
   - Authorized JavaScript origins: `https://forma-coach-studio.vercel.app`
   - Authorized redirect URIs: `https://<ref>.supabase.co/auth/v1/callback`
4. Copy the **Client ID** and **Client secret** → Supabase → Authentication → Sign In / Providers → **Google** → enable, paste, save.

## 3. Facebook (Meta)

1. [developers.facebook.com](https://developers.facebook.com) → My Apps → **Create app** → use case **“Authenticate and request data from users with Facebook Login”**.
2. Use cases → Facebook Login → **Permissions**: add `email` (and `public_profile`).
3. Facebook Login → **Settings** → Valid OAuth Redirect URIs: `https://<ref>.supabase.co/auth/v1/callback`.
4. App settings → **Basic**:
   - Privacy Policy URL: `https://forma-coach-studio.vercel.app/privacy`
   - Terms of Service URL: `https://forma-coach-studio.vercel.app/terms`
   - User data deletion: “Data deletion instructions URL” → `https://forma-coach-studio.vercel.app/privacy`
   - App domain, category and icon.
5. Copy the **App ID** and **App secret** → Supabase → Providers → **Facebook** → enable, paste, save.
6. Switch the app to **Live**. In development mode only users with a role on the app can sign in.
7. Note: a Facebook account registered with a phone number may not share an email. That user stays pending until you approve them manually.

## 4. Apple

You need a paid Apple Developer account.

1. [developer.apple.com](https://developer.apple.com/account) → Certificates, Identifiers & Profiles → **Identifiers → App IDs** → new App ID (e.g. `com.forma.coach`) with **Sign in with Apple** enabled.
2. Identifiers → **Services IDs** → new (e.g. `com.forma.coach.web`). This string is the **Client ID**. Enable Sign in with Apple → Configure:
   - Primary App ID: the one from step 1
   - Domains: `<ref>.supabase.co`
   - Return URLs: `https://<ref>.supabase.co/auth/v1/callback`
3. **Keys** → new key with Sign in with Apple → download the `.p8` file (one download only) and note the **Key ID** and your **Team ID**.
4. Supabase → Providers → **Apple** → enable:
   - Client IDs: the Services ID
   - Secret key: generate it from the `.p8`, Team ID, Key ID and Services ID (Supabase links a generator in that panel).
   - **The secret expires after 6 months.** Put a reminder in your calendar to regenerate it.
5. **Hide My Email (private relay):** Apple may return an address like `xyz@privaterelay.appleid.com`. It is a real, verified address, but it won't match an invite sent to the coach's normal email. Approve such accounts manually in Impostazioni → Coach dello studio. If you want to email relay addresses, register your sending domain under Services → **Sign in with Apple for Email Communication**.
6. Apple sends the user's name only on the first sign-in.

## 5. Phone + SMS code (Twilio)

1. Create a [Twilio](https://www.twilio.com) account → buy/verify a sender. For Italy use an alphanumeric sender or a Messaging Service; check Twilio's Italy requirements.
2. Create a **Messaging Service** and note the Account SID, Auth Token and Messaging Service SID.
3. Supabase → Providers → **Phone** → enable, SMS provider **Twilio**, paste the three values, save.
4. Numbers without a country code are treated as Italian (`+39`). Supabase limits how often codes can be sent.

## 6. Account linking (one coach, several sign-in methods)

- Supabase → Authentication → **Sign In / Providers → “Allow manual linking”**: on. Coaches can then link Google/Facebook/Apple in Impostazioni → Metodi di accesso while signed in.
- Supabase links automatically only when the provider's email is **verified** and identical. Unverified emails are never merged, and the app never merges accounts on email alone.
- A coach can't unlink their last remaining sign-in method.

## 7. Client access (the people doing the workouts)

- On a client's page → **Accesso cliente**: enter their email and/or phone → **Invita il cliente**. With an email, Supabase sends them an invite to set a password.
- The client signs in on the same `/login` page with any method (email, Google, Facebook, Apple, SMS) whose **verified** email or phone matches the invite. They land on **/portale**.
- In /portale they only see **published** workouts and meal plans of their own profile, and can download them as PDF, PNG or JPG. They cannot edit anything, and they have no access to the coach pages or the database API.
- **Anteprima area cliente** on the client's page shows exactly what they see. It works in demo mode too.
- **Revoca accesso** removes the link immediately.
- No extra Supabase setup is needed: the client invite uses the redirect URLs from step 0.

## 8. Turning it on and testing

1. Set `REQUIRE_LOGIN=true` on Vercel → Redeploy.
2. Sign in with `COACH_EMAIL` → you should land on the dashboard as administrator.
3. Test each button from a private window: Google, Facebook, Apple, email, username and SMS. A new account should land on **/pending** until you approve it.
4. Cancel a provider halfway: you should come back to `/login` with “Accesso annullato”.
5. Approve a second test coach and confirm they see **none** of your clients.
6. Invite a test client with an email you own, publish a plan for them, sign in from a private window and check /portale shows only that plan.

If a provider fails, check in order: the redirect URI in the provider console, the Supabase Redirect URLs, the `SITE_URL` value, and Supabase → Logs → Auth.
