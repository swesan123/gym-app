export function MissingSupabaseConfig() {
  return (
    <div className="mx-auto max-w-lg px-4 py-10 text-center">
      <h1 className="text-xl font-bold text-[var(--steel-gray)] dark:text-[var(--chalk-white)]">
        Configure Supabase
      </h1>
      <p className="mt-3 text-[var(--gray-600)] dark:text-[var(--gray-400)]">
        Copy{" "}
        <code className="rounded bg-[var(--gray-100)] px-1 dark:bg-[var(--gray-800)]">
          .env.example
        </code>{" "}
        to{" "}
        <code className="rounded bg-[var(--gray-100)] px-1 dark:bg-[var(--gray-800)]">
          .env.local
        </code>{" "}
        and add your project URL and anon key. Apply migrations and seed from{" "}
        <code className="rounded bg-[var(--gray-100)] px-1 dark:bg-[var(--gray-800)]">
          supabase/
        </code>
        .
      </p>
    </div>
  );
}
