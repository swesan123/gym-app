import Link from "next/link";

const links = [
  { href: "/", label: "Home" },
  { href: "/history", label: "History" },
  { href: "/progress", label: "Progress" },
  { href: "/settings/exercises", label: "Exercises" },
] as const;

export function AppNav() {
  return (
    <nav
      className="sticky bottom-0 z-40 border-t border-zinc-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95"
      aria-label="Main"
    >
      <ul className="mx-auto flex max-w-lg justify-around gap-1 px-2 pt-2">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="flex min-h-11 min-w-[4.5rem] items-center justify-center rounded-lg px-2 text-center text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
