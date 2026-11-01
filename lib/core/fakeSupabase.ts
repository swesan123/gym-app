type FakeResult = { data?: unknown; error?: { message: string } | null };

export type FakeCall = { table: string; op: string };

/**
 * Minimal chainable stand-in for the Supabase client, for unit tests.
 * Results are keyed by `"<table>.<first method>"` (e.g. `"exercises.insert"`);
 * any later filter/modifier returns the same builder, and awaiting it (or
 * `.single()` / `.maybeSingle()`) resolves to the configured result.
 */
export function createFakeSupabase(results: Record<string, FakeResult>) {
  const calls: FakeCall[] = [];

  const from = (table: string) => {
    let op: string | null = null;

    const builder: object = new Proxy(
      {},
      {
        get: (_target, prop: string) => {
          if (prop === "then") {
            return (resolve: (value: FakeResult) => unknown) =>
              resolve({ data: null, error: null, ...results[`${table}.${op}`] });
          }
          return () => {
            if (op === null) {
              op = prop;
              calls.push({ table, op });
            }
            return builder;
          };
        },
      },
    );

    return builder;
  };

  return { client: { from }, calls };
}
