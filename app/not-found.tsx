import Link from "next/link";

export default function NotFound() {
  return (
    <div className="px-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-[var(--steel-gray)] dark:text-[var(--chalk-white)]">Not found</h1>
      <p className="mt-2 text-sm text-[var(--gray-500)] dark:text-[var(--gray-400)]">
        That workout or page does not exist.
      </p>
      <Link
        href="/"
        className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--gym-amber)] px-4 py-2 font-semibold text-[var(--chalk-white)] hover:bg-orange-600"
      >
        Go home
      </Link>
    </div>
  );
}
