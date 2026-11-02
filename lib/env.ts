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

const MIN_SECRET_LENGTH = 32;
const MIN_PASSCODE_LENGTH = 8;
const PLACEHOLDER_VALUE = "change-me";

const isUsableSecret = (value: string | undefined, minLength: number): value is string => {
  if (!value?.length || value === PLACEHOLDER_VALUE) return false;
  return process.env.NODE_ENV !== "production" || value.length >= minLength;
};

/** Production requires a passcode of 8+ chars and a 32+ char AUTH_SECRET; placeholders never count. */
export function hasAuthEnv(): boolean {
  return (
    isUsableSecret(process.env.APP_PASSCODE, MIN_PASSCODE_LENGTH) &&
    isUsableSecret(process.env.AUTH_SECRET, MIN_SECRET_LENGTH)
  );
}

export function getToolApprovalSecret(): string | null {
  const secret = process.env.TOOL_APPROVAL_SECRET?.trim();
  return isUsableSecret(secret, MIN_SECRET_LENGTH) ? secret : null;
}
