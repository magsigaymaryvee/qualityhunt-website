"use client";

import { useState } from "react";

// An in-context "are you sure?" in place of the browser's native confirm()
// popup — same idea, but styled, and it can't be silently auto-dismissed by
// browser popup-blocking the way confirm() sometimes is.
export default function ConfirmButton({
  onConfirm,
  label,
  warning,
  triggerClassName,
}: {
  onConfirm: () => void | Promise<void>;
  label: React.ReactNode;
  warning: string;
  triggerClassName: string;
}) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className={triggerClassName}>
        {label}
      </button>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2 rounded-sm border border-oxblood bg-paper-2 px-2 py-1">
      <span className="font-sans text-xs text-oxblood">{warning}</span>
      <button
        type="button"
        onClick={() => {
          setConfirming(false);
          onConfirm();
        }}
        className="font-sans text-xs font-bold uppercase tracking-[0.08em] text-oxblood underline hover:opacity-80"
      >
        Yes, delete
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="font-sans text-xs uppercase tracking-[0.08em] text-ink-soft hover:text-oxblood"
      >
        Cancel
      </button>
    </span>
  );
}
