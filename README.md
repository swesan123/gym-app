# Gym Tracker MVP

Mobile-first workout logging with Next.js, Tailwind, Supabase, and basic PWA support (“Add to Home Screen” on iPhone Safari).

## Local setup

1. Copy [`.env.example`](.env.example) to `.env.local` and set:

   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` — server-only, used by all server actions/pages (bypasses RLS); never expose to the client

2. In Supabase (hosted or local Postgres), apply **all** migrations in order, then seed:

   - [`supabase/migrations/20250506120000_initial.sql`](supabase/migrations/20250506120000_initial.sql) — tables, RLS, view  
   - [`supabase/migrations/20250507120000_dedupe_global_weight_options.sql`](supabase/migrations/20250507120000_dedupe_global_weight_options.sql) — dedupe global weights + partial unique index  
   - [`supabase/migrations/20250508120000_splits_catalog_drop_workout_type.sql`](supabase/migrations/20250508120000_splits_catalog_drop_workout_type.sql) — `workout_splits` catalog + drops legacy `workout_type` on `exercises`  
   - [`supabase/migrations/20260507032000_training_profile_machine_weights.sql`](supabase/migrations/20260507032000_training_profile_machine_weights.sql) — body weight profile + machine weight fields  
   - [`supabase/migrations/20260508010000_dedupe_exercises_by_name_split.sql`](supabase/migrations/20260508010000_dedupe_exercises_by_name_split.sql) — remove duplicate exercises by `(name, split)`  
   - [`supabase/migrations/20260508011000_seed_exercise_weight_ranges.sql`](supabase/migrations/20260508011000_seed_exercise_weight_ranges.sql) — per-exercise machine stacks / weight options  
   - [`supabase/migrations/20260508012000_import_user_progress_history.sql`](supabase/migrations/20260508012000_import_user_progress_history.sql) — import historical completed workouts + sets  
   - [`supabase/seed.sql`](supabase/seed.sql) — default splits (if missing), exercises + weight presets (run after migrations; weight `ON CONFLICT` needs the dedupe migration)

   Paste each file into the SQL editor and run (or use `psql`). The migration enables row-level security with permissive allow-all policies for anonymous clients — suitable only if your deployment is private.

3. Install and run:

   ```bash
   npm install
   npm run dev
   ```

4. Production build:

   ```bash
   npm run build && npm start
   ```

## Security note

The default migration grants anon/authenticated full CRUD on app tables so you can skip auth for a solo MVP. **Anyone with your anon key and project URL can read/write data.** Prefer Vercel deployment protection, Supabase Auth, or tightened RLS before exposing the app publicly.

## Deploy (Vercel)

Create a Vercel project from this repo, add the same `NEXT_PUBLIC_*` env vars, and ensure migrations + seed have been applied to production Supabase.

## Backups (Google Drive)

This repo includes a scheduled workflow at [`.github/workflows/backup-database.yml`](.github/workflows/backup-database.yml) that runs `pg_dump`, compresses the dump, uploads to Google Drive, and also stores a short-lived GitHub artifact.

Required repository secrets:

- `SUPABASE_MIGRATION_DB_URL` (Postgres connection string used for migrations/backups)
- `GCP_WORKLOAD_IDENTITY_PROVIDER` (Workload Identity Federation provider for GitHub Actions)
- `GCP_SERVICE_ACCOUNT` (service account email — no JSON key; share the Drive folder with this account)
- `GOOGLE_DRIVE_FOLDER_ID` (target Drive folder ID shared with that service account)

Authentication uses [Workload Identity Federation](https://cloud.google.com/iam/docs/workload-identity-federation) instead of a downloaded service account key.

Restore example:

```bash
gunzip -c gym-app-backup-YYYYMMDD-HHMMSS.sql.gz | psql "$SUPABASE_MIGRATION_DB_URL"
```
