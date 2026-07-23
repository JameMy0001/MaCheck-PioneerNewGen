# MaCheck / MaCheck shared platform

This folder is the single Supabase backend for both applications. It contains the
database schema, row-level security policies, username authentication gateway,
and the shared clinical catalogue.

## Hosted Free project

- Project: `MaCheck-MaCheck-Central`
- Project ref: `witsidzbewjkcnvnnapi`
- Region: Southeast Asia (Singapore)
- URL: `https://witsidzbewjkcnvnnapi.supabase.co`
- Applied migrations: `202607170001` through `202607180011`
- Deployed functions: `register-username`, `login-username`,
  `recover-username`, `delete-account`, and `send-caregiver-message`

The hosted project has automatic table exposure disabled. Migration
`202607170004_explicit_api_grants.sql` grants only the Data API privileges used
by the apps; RLS policies remain the per-row authorization boundary.

## Clinical Admin

The admin web app lives in `../admin`. Migrations `202607180001` and
`202607180002` add role-based admin access, the Draft/Review/Published workflow,
clinical audit history, aggregate dashboard functions, and a database-level
requirement that newly published clinical records include a source reference.

Normal app users continue to read only active Published catalogue records.
The admin account list exposes username and operational metadata only; it does
not expose a user's medications, diseases, allergies, or adherence history.

## Privacy model

- Account creation accepts only a username and password.
- Supabase Auth stores the password hash. Application tables never store a
  password or a real email/phone number.
- The username-to-auth-user mapping is kept in the private schema and is never
  readable by mobile clients.
- Names, phone numbers, birth dates, and emergency contacts are not uploaded.
- Medication, condition, allergy, and adherence data remain sensitive health
  data. Every user-owned table is protected by RLS and `auth.uid()`.

## Free-plan setup

1. Create one Supabase Free project in the Singapore region.
2. Install the Supabase CLI and run `supabase login`.
3. From this folder run:

   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   supabase db push
   supabase secrets set AUTH_PEPPER="$(openssl rand -hex 32)"
   supabase functions deploy register-username --no-verify-jwt
   supabase functions deploy login-username --no-verify-jwt
   supabase functions deploy recover-username --no-verify-jwt
   supabase functions deploy delete-account
   ```

4. Copy the project URL and publishable/anon key into each app's `.env` file.
   Never put the service-role key in an app.

The three public auth functions perform their own validation and rate limiting.
`--no-verify-jwt` is required because a user has no access token before login.

## Remote caregiver access

Migrations `202607180009` and `202607180010` add consent-gated caregiver invitations. A patient invites an existing username, the invitation expires after seven days, and no health record becomes readable until the caregiver explicitly accepts. Either participant can revoke the link immediately.

The private username mapping remains inaccessible to mobile clients. Authenticated security-definer RPCs resolve only the username entered for an invitation and return usernames only for that user's own invitations or active relationships. Caregivers can send short general messages after consent. Server-side validation rejects medicine changes and explicit dosage instructions. Pseudonymous Expo device tokens are isolated in a client-unreadable table and are used by the authenticated `send-caregiver-message` Edge Function for remote push delivery.

## Free-plan operations

Free projects can be paused after inactivity. Open the Supabase dashboard before
a live pilot, and export a manual backup regularly:

```bash
supabase db dump --linked --file backups/schema-and-data.sql
```

Do not commit dumps, `.env` files, recovery codes, or service-role credentials.
