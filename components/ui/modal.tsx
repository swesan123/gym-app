"use client";

import type { ReactNode } from "react";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  title: string;
  description?: string;
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "primary" | "danger";
  /** When false, backdrop taps do not dismiss (e.g. note editor on mobile). Default true. */
  closeOnBackdrop?: boolean;
  /** When false, Escape does not dismiss. Default true. */
  closeOnEscape?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function Modal({
  open,
  title,
  description,
  children,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "primary",
  closeOnBackdrop = true,
  closeOnEscape = true,
  onConfirm,
  onCancel,
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (!closeOnEscape || e.key !== "Escape") return;
      onCancel();
    };
    const prevOverflow = document.body.style.overflow;
    const prevOverscrollBehavior = document.body.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      document.body.style.overscrollBehavior = prevOverscrollBehavior;
    };
  }, [open, closeOnEscape, onCancel]);

  const backdropMayDismiss = () => {
    const el = dialogRef.current;
    if (el?.matches(":focus-within")) return false;
    return true;
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto overscroll-contain bg-black/50 sm:items-center"
      role="presentation"
      onPointerUp={(e) => {
        if (!closeOnBackdrop) return;
        if (e.target !== e.currentTarget) return;
        if (!backdropMayDismiss()) return;
        onCancel();
      }}
    >
      <div className="w-full p-4 sm:flex sm:justify-center">
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          className="w-full max-w-md max-h-[85vh] overflow-y-auto overscroll-contain rounded-2xl bg-[var(--chalk-white)] p-5 shadow-xl dark:bg-[var(--gray-50)]"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <h2 id="modal-title" className="text-lg font-bold text-[var(--steel-gray)] dark:text-[var(--chalk-white)]">
            {title}
          </h2>
          {description ? (
            <p className="mt-2 text-sm text-[var(--gray-600)] dark:text-[var(--gray-400)]">
              {description}
            </p>
          ) : null}
          {children ? <div className="mt-4">{children}</div> : null}
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" type="button" onClick={onCancel}>
              {cancelLabel}
            </Button>
            <Button
              variant={variant === "danger" ? "danger" : "primary"}
              type="button"
              onClick={onConfirm}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
