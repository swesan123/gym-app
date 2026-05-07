# Gym Tracker MVP

Mobile-first workout logging with Next.js, Tailwind, Supabase, and basic PWA support (“Add to Home Screen” on iPhone Safari).

## Local setup

1. Copy [`.env.example`](.env.example) to `.env.local` and set:

   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

2. In Supabase (hosted or local Postgres), apply **all** migrations in order, then seed:

   - [`supabase/migrations/20250506120000_initial.sql`](supabase/migrations/20250506120000_initial.sql) — tables, RLS, view  
   - [`supabase/migrations/20250507120000_dedupe_global_weight_options.sql`](supabase/migrations/20250507120000_dedupe_global_weight_options.sql) — dedupe global weights + partial unique index  
   - [`supabase/migrations/20250508120000_splits_catalog_drop_workout_type.sql`](supabase/migrations/20250508120000_splits_catalog_drop_workout_type.sql) — `workout_splits` catalog + drops legacy `workout_type` on `exercises`  
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
