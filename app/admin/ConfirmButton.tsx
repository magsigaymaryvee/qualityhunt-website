"use client";

import { useState } from "react";

// A centered modal in place of the browser's native confirm() popup — same
// idea, but styled to match the rest of the admin instead of looking like
// a plain browser dialog, and it can't be silently auto-dismissed by
// popup-blocking the way confirm() sometimes is.
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

  return (
    <>
      <button type="button" onClick={() => setConfirming(true)} className={triggerClassName}>
        {label}
      </button>
      {confirming && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-4"
          onClick={() => setConfirming(false)}
        >
          <div
            // normal-case: this button lives inside rows that set
            // uppercase/tracking for their own small icon labels — without
            // resetting it here, that styling inherits straight into this
            // modal's heading and body text too, even though the modal is
            // visually detached (fixed positioning doesn't stop CSS
            // inheritance, only layout).
            className="w-full max-w-sm rounded-2xl bg-paper-2 p-6 normal-case tracking-normal shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-serif text-xl text-ink">Are you sure?</h2>
            <p className="mt-2 text-sm leading-6 text-ink-soft">{warning}</p>
            <div className="mt-6 flex justify-end gap-4">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="font-sans text-sm font-medium text-ink-soft hover:text-oxblood"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirming(false);
                  onConfirm();
                }}
                className="rounded-full bg-oxblood px-5 py-2 font-sans text-sm font-semibold text-on-forest transition hover:opacity-90"
              >
                Yes, delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
