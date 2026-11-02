import { LoginForm } from "@/components/auth/LoginForm";
import { sanitizeNextPath } from "@/lib/auth/safeNext";

type Props = {
  searchParams: Promise<{ next?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const nextPath = sanitizeNextPath(params.next);

  return (
    <div className="px-4 pb-28 pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-[var(--steel-gray)] dark:text-[var(--chalk-white)]">
          Sign in
        </h1>
        <p className="mt-2 text-sm text-[var(--gray-500)] dark:text-[var(--gray-400)]">
          Enter your app passcode to continue.
        </p>
      </div>

      <LoginForm nextPath={nextPath} />
    </div>
  );
}
