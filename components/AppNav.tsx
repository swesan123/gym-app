import Link from "next/link";

const links = [
  { href: "/", label: "Home" },
  { href: "/history", label: "History" },
  { href: "/progress", label: "Progress" },
  { href: "/settings/splits", label: "Splits" },
  { href: "/settings/exercises", label: "Exercises" },
  { href: "/settings/profile", label: "Profile" },
] as const;

export function AppNav() {
  return (
    <nav
      className="sticky bottom-0 z-40 border-t border-[var(--gray-200)] bg-[var(--chalk-white)]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-[var(--gray-700)] dark:bg-[var(--iron-black)]/95"
      aria-label="Main"
    >
      <ul className="mx-auto flex max-w-2xl flex-wrap justify-around gap-x-1 gap-y-0 px-1 pt-2">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="flex min-h-11 min-w-[3.75rem] items-center justify-center rounded-lg px-1.5 text-center text-xs font-medium text-[var(--gray-600)] hover:bg-[var(--gray-100)] sm:min-w-[4.25rem] sm:text-sm dark:text-[var(--gray-400)] dark:hover:bg-[var(--gray-800)] transition-colors"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
