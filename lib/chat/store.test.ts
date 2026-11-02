import type { UIMessage } from "ai";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createClient } from "@/lib/supabase/server";

import { saveMessages } from "./store";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

type Row = { id: string; created_at: string };

const fakeClient = (existing: Row[]) => {
  const upserts: Record<string, unknown>[][] = [];
  const deletes: string[][] = [];

  const from = (table: string) => {
    const chain = {
      select: () => chain,
      eq: () => chain,
      maybeSingle: async () => ({ data: { title: "Chat" }, error: null }),
      update: () => chain,
      delete: () => ({
        eq: () => ({
          in: async (_col: string, ids: string[]) => {
            deletes.push(ids);
            return { error: null };
          },
        }),
      }),
      upsert: async (rows: Record<string, unknown>[]) => {
        upserts.push(rows);
        return { error: null };
      },
      then: (resolve: (value: unknown) => unknown) =>
        resolve({ data: table === "chat_messages" ? existing : null, error: null }),
    };
    return chain;
  };

  return { client: { from }, upserts, deletes };
};

const message = (id: string, role: UIMessage["role"] = "user"): UIMessage => ({
  id,
  role,
  parts: [{ type: "text", text: id }],
});

describe("saveMessages", () => {
  beforeEach(() => {
    vi.mocked(createClient).mockReset();
  });

  it("sends created_at for every row, keeping stored timestamps for existing messages", async () => {
    const stored = "2026-11-01T12:00:00.000Z";
    const fake = fakeClient([{ id: "m1", created_at: stored }]);
    vi.mocked(createClient).mockResolvedValue(fake.client as never);

    await saveMessages("chat-1", [message("m1"), message("m2", "assistant"), message("m3")]);

    const rows = fake.upserts[0];
    expect(rows.map((r) => r.id)).toEqual(["m1", "m2", "m3"]);
    expect(rows.every((r) => typeof r.created_at === "string")).toBe(true);
    expect(rows[0].created_at).toBe(stored);
    expect(Date.parse(String(rows[1].created_at))).toBeGreaterThan(Date.parse(stored));
    expect(Date.parse(String(rows[2].created_at))).toBeGreaterThan(Date.parse(String(rows[1].created_at)));
  });

  it("deletes stored messages that are no longer in the conversation", async () => {
    const fake = fakeClient([
      { id: "m1", created_at: "2026-11-01T12:00:00.000Z" },
      { id: "stale", created_at: "2026-11-01T12:00:01.000Z" },
    ]);
    vi.mocked(createClient).mockResolvedValue(fake.client as never);

    await saveMessages("chat-1", [message("m1"), message("m2", "assistant")]);

    expect(fake.deletes).toEqual([["stale"]]);
  });
});
