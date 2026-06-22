import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  children: ReactNode;
};

const base =
  "inline-flex min-h-11 items-center justify-center rounded-lg px-4 py-2 text-base font-semibold transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<NonNullable<Props["variant"]>, string> = {
  primary: "bg-[var(--gym-amber)] text-[var(--chalk-white)] hover:bg-orange-600 active:bg-orange-700",
  secondary:
    "border border-[var(--gray-300)] bg-[var(--chalk-white)] text-[var(--steel-gray)] hover:bg-[var(--gray-100)] dark:border-[var(--gray-200)] dark:bg-[var(--gray-100)] dark:text-[var(--chalk-white)] dark:hover:bg-[var(--gray-200)]",
  danger: "bg-[var(--muted-red)] text-[var(--chalk-white)] hover:bg-red-700 active:bg-red-800",
  ghost: "text-[var(--gym-amber)] hover:bg-[var(--gray-100)] dark:hover:bg-[var(--gray-100)]",
};

export function Button({
  variant = "primary",
  className = "",
  type = "button",
  ...props
}: Props) {
  return (
    <button
      type={type}
      className={`${base} ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
