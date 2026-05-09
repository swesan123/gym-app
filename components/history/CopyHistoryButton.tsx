"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

export function CopyHistoryButton({ payload }: { payload: string }) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Button variant="secondary" onClick={onCopy} disabled={!payload.trim()}>
      {copied ? "Copied" : "Copy history"}
    </Button>
  );
}
