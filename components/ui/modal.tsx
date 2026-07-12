"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

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
  /** When true, the confirm button is disabled (e.g. finish blocked until sets are Done). */
  confirmDisabled?: boolean;
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
  confirmDisabled = false,
  onConfirm,
  onCancel,
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const isClient = useSyncExternalStore(() => () => {}, () => true, () => false);

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

  if (!open || !isClient) return null;

  return createPortal(
    <>
      {/* Backdrop — separate fixed element so dialog is never a child of it */}
      <div
        style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(0,0,0,0.5)" }}
        role="presentation"
        onPointerUp={() => {
          if (!closeOnBackdrop) return;
          const el = dialogRef.current;
          if (el?.matches(":focus-within")) return;
          onCancel();
        }}
      />
      {/* Dialog — fixed directly to viewport, unaffected by any parent layout */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        style={{
          position: "fixed",
          bottom: "1rem",
          left: "1rem",
          right: "1rem",
          zIndex: 9999,
          maxHeight: "85vh",
          overflowY: "auto",
          overscrollBehavior: "contain",
          borderRadius: "1rem",
          background: "var(--background)",
          padding: "1.25rem",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <h2
          id="modal-title"
          className="text-lg font-bold text-[var(--steel-gray)] dark:text-[var(--chalk-white)]"
        >
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
            disabled={confirmDisabled}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </>,
    document.body
  );
}
