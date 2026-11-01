import { afterEach, describe, expect, it, vi } from "vitest";

import { getToolApprovalSecret, hasAuthEnv } from "./env";

const STRONG_SECRET = "a".repeat(32);

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("hasAuthEnv", () => {
  it("is false when either value is missing", () => {
    vi.stubEnv("APP_PASSCODE", "");
    vi.stubEnv("AUTH_SECRET", STRONG_SECRET);
    expect(hasAuthEnv()).toBe(false);
  });

  it("rejects the placeholder value", () => {
    vi.stubEnv("APP_PASSCODE", "change-me");
    vi.stubEnv("AUTH_SECRET", STRONG_SECRET);
    expect(hasAuthEnv()).toBe(false);
  });

  it("accepts short values outside production", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("APP_PASSCODE", "pw");
    vi.stubEnv("AUTH_SECRET", "short");
    expect(hasAuthEnv()).toBe(true);
  });

  it("requires minimum lengths in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("APP_PASSCODE", "1234567");
    vi.stubEnv("AUTH_SECRET", STRONG_SECRET);
    expect(hasAuthEnv()).toBe(false);

    vi.stubEnv("APP_PASSCODE", "12345678");
    vi.stubEnv("AUTH_SECRET", "a".repeat(31));
    expect(hasAuthEnv()).toBe(false);

    vi.stubEnv("AUTH_SECRET", STRONG_SECRET);
    expect(hasAuthEnv()).toBe(true);
  });
});

describe("getToolApprovalSecret", () => {
  it("returns null for missing or weak secrets in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TOOL_APPROVAL_SECRET", "");
    expect(getToolApprovalSecret()).toBeNull();

    vi.stubEnv("TOOL_APPROVAL_SECRET", "too-short");
    expect(getToolApprovalSecret()).toBeNull();
  });

  it("returns the trimmed secret when strong", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TOOL_APPROVAL_SECRET", ` ${STRONG_SECRET} `);
    expect(getToolApprovalSecret()).toBe(STRONG_SECRET);
  });
});
