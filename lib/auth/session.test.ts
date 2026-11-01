import { describe, expect, it } from "vitest";

import {
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  safeEqual,
  verifySessionToken,
} from "@/lib/auth/session";

const SECRET = "test-secret";

describe("createSessionToken / verifySessionToken", () => {
  it("round-trips a valid token", async () => {
    const now = 1_700_000_000_000;
    const token = await createSessionToken(SECRET, now);
    expect(await verifySessionToken(token, SECRET, now)).toBe(true);
  });

  it("rejects a tampered signature", async () => {
    const now = 1_700_000_000_000;
    const token = await createSessionToken(SECRET, now);
    const tampered = token.slice(0, -4) + "xxxx";
    expect(await verifySessionToken(tampered, SECRET, now)).toBe(false);
  });

  it("rejects the wrong secret", async () => {
    const now = 1_700_000_000_000;
    const token = await createSessionToken(SECRET, now);
    expect(await verifySessionToken(token, "other-secret", now)).toBe(false);
  });

  it("rejects expired tokens", async () => {
    const issued = 1_700_000_000_000;
    const token = await createSessionToken(SECRET, issued);
    const expiredNow = issued + SESSION_MAX_AGE_SECONDS * 1000 + 1;
    expect(await verifySessionToken(token, SECRET, expiredNow)).toBe(false);
  });

  it("rejects malformed tokens", async () => {
    expect(await verifySessionToken("", SECRET)).toBe(false);
    expect(await verifySessionToken("v1.only", SECRET)).toBe(false);
    expect(await verifySessionToken("v2.123.sig", SECRET)).toBe(false);
    expect(await verifySessionToken("v1.not-a-number.sig", SECRET)).toBe(false);
  });

  it("rejects future-dated tokens beyond skew", async () => {
    const now = 1_700_000_000_000;
    const token = await createSessionToken(SECRET, now + 120_000);
    expect(await verifySessionToken(token, SECRET, now)).toBe(false);
  });
});

describe("safeEqual", () => {
  it("matches equal strings", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
  });

  it("rejects unequal strings", () => {
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "ab")).toBe(false);
  });
});
