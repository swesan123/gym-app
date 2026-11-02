export const SESSION_COOKIE = "gym_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

const TOKEN_VERSION = "v1";
const CLOCK_SKEW_MS = 60_000;

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(value: string): Uint8Array | null {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const padLen = (4 - (padded.length % 4)) % 4;
  const base64 = padded + "=".repeat(padLen);
  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

async function hmacSha256(secret: string, message: string): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return new Uint8Array(sig);
}

export function safeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const aa = enc.encode(a);
  const bb = enc.encode(b);
  const len = Math.max(aa.length, bb.length);
  let mismatch = aa.length ^ bb.length;
  for (let i = 0; i < len; i++) {
    mismatch |= (aa[i] ?? 0) ^ (bb[i] ?? 0);
  }
  return mismatch === 0;
}

export async function createSessionToken(
  secret: string,
  nowMs?: number,
): Promise<string> {
  const issuedAtMs = nowMs ?? Date.now();
  const payload = `${TOKEN_VERSION}.${issuedAtMs}`;
  const signature = await hmacSha256(secret, payload);
  return `${payload}.${base64UrlEncode(signature)}`;
}

export async function verifySessionToken(
  token: string,
  secret: string,
  nowMs?: number,
): Promise<boolean> {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return false;
  }

  const [version, issuedAtRaw, signaturePart] = parts;
  if (version !== TOKEN_VERSION) {
    return false;
  }

  const issuedAtMs = Number(issuedAtRaw);
  if (!Number.isFinite(issuedAtMs) || issuedAtMs <= 0) {
    return false;
  }

  const now = nowMs ?? Date.now();
  if (issuedAtMs > now + CLOCK_SKEW_MS) {
    return false;
  }
  if (now - issuedAtMs > SESSION_MAX_AGE_SECONDS * 1000) {
    return false;
  }

  const expectedSig = base64UrlDecode(signaturePart);
  if (!expectedSig) {
    return false;
  }

  const payload = `${TOKEN_VERSION}.${issuedAtMs}`;
  const actualSig = await hmacSha256(secret, payload);
  if (expectedSig.length !== actualSig.length) {
    return false;
  }

  let mismatch = 0;
  for (let i = 0; i < expectedSig.length; i++) {
    mismatch |= expectedSig[i] ^ actualSig[i];
  }
  return mismatch === 0;
}
