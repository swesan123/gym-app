export function hasSupabaseEnv(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.length &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.length,
  );
}
