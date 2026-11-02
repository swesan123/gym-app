"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/chat", label: "Chat" },
  { href: "/history", label: "History" },
  { href: "/progress", label: "Progress" },
  { href: "/settings/splits", label: "Splits" },
  { href: "/settings/exercises", label: "Exercises" },
  { href: "/settings/profile", label: "Profile" },
] as const;

const isActive = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav
      className="sticky bottom-0 z-40 border-t border-[var(--gray-200)] bg-[var(--chalk-white)]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-[var(--gray-200)] dark:bg-[var(--iron-black)]/95"
      aria-label="Main"
    >
      <ul className="flex gap-x-0.5 px-1 pt-2">
        {links.map((l) => {
          const active = isActive(pathname, l.href);
          return (
            <li key={l.href} className="min-w-0 flex-1">
              <Link
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 w-full items-center justify-center truncate rounded-lg px-0.5 text-center text-[11px] font-medium tracking-tight transition-colors hover:bg-[var(--gray-100)] sm:text-sm dark:hover:bg-[var(--gray-100)] ${
                  active
                    ? "text-[var(--gym-amber)] dark:text-orange-400"
                    : "text-[var(--gray-600)] dark:text-[var(--gray-400)]"
                }`}
              >
                {l.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
