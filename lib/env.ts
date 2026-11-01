export function hasSupabaseEnv(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.length &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.length,
  );
}

export function hasOpenRouterEnv(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY?.length);
}

export const DEFAULT_OPENROUTER_MODEL = "openai/gpt-6-luna";

export function getOpenRouterModel(): string {
  return process.env.OPENROUTER_MODEL?.trim() || DEFAULT_OPENROUTER_MODEL;
}

export function hasAuthEnv(): boolean {
  return Boolean(process.env.APP_PASSCODE?.length && process.env.AUTH_SECRET?.length);
}
