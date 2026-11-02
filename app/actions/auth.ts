"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { sanitizeNextPath } from "@/lib/auth/safeNext";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  safeEqual,
} from "@/lib/auth/session";
import { hasAuthEnv } from "@/lib/env";

export type LoginState = {
  error?: string;
};

const FAILURE_DELAY_MS = 400;

export async function login(
  _prevState: LoginState | undefined,
  formData: FormData,
): Promise<LoginState> {
  const passcode = String(formData.get("passcode") ?? "");
  if (!hasAuthEnv()) {
    return { error: "Authentication is not configured" };
  }
  const expected = process.env.APP_PASSCODE ?? "";
  const secret = process.env.AUTH_SECRET ?? "";

  if (!safeEqual(passcode, expected)) {
    await new Promise((resolve) => setTimeout(resolve, FAILURE_DELAY_MS));
    return { error: "Incorrect passcode" };
  }

  const token = await createSessionToken(secret);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  redirect(sanitizeNextPath(String(formData.get("next") ?? "")));
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect("/login");
}
