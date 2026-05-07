import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-xl font-bold">Not found</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        That workout or page does not exist.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700"
      >
        Go home
      </Link>
    </div>
  );
}
