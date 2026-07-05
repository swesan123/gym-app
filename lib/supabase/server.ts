import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client using the service role key. All DB access in
 * this app happens through Next.js server actions/pages — there is no
 * client-side Supabase and no user auth session, so the service role key
 * (which bypasses RLS) is appropriate here. Anon-key RLS policies are
 * restricted to SELECT-only so a leaked anon key cannot mutate data via the
 * REST API directly (Security Advisor lint 0024).
 */
export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  return createSupabaseClient(url, key, {
    auth: { persistSession: false },
  });
}
