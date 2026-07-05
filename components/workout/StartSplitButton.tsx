"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

export function StartSplitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full py-4 text-lg" disabled={pending}>
      {pending ? "Starting…" : label}
    </Button>
  );
}
