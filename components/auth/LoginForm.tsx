"use client";

import { useActionState } from "react";

import { login, type LoginState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";

type Props = {
  nextPath: string;
};

const initialState: LoginState = {};

export function LoginForm({ nextPath }: Props) {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={nextPath} />
      <label className="flex flex-col gap-2 text-sm font-medium text-[var(--steel-gray)] dark:text-[var(--chalk-white)]">
        Passcode
        <input
          name="passcode"
          type="password"
          autoFocus
          autoComplete="current-password"
          required
          className="min-h-11 rounded-lg border border-[var(--gray-300)] bg-[var(--chalk-white)] px-3 text-base dark:border-[var(--gray-200)] dark:bg-[var(--gray-50)]"
        />
      </label>
      {state.error ? (
        <p role="alert" className="text-sm text-[var(--muted-red)]">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" className="mt-2 w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
