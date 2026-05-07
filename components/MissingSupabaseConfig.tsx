export function MissingSupabaseConfig() {
  return (
    <div className="mx-auto max-w-lg px-4 py-10 text-center">
      <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
        Configure Supabase
      </h1>
      <p className="mt-3 text-zinc-600 dark:text-zinc-400">
        Copy{" "}
        <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
          .env.example
        </code>{" "}
        to{" "}
        <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
          .env.local
        </code>{" "}
        and add your project URL and anon key. Apply migrations and seed from{" "}
        <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">
          supabase/
        </code>
        .
      </p>
    </div>
  );
}
