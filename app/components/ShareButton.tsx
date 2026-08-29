"use client";

import { useEffect, useRef, useState } from "react";

// Instagram has no official web share-intent URL (unlike Pinterest/Facebook)
// — sharing "to Instagram" from a website isn't something Instagram
// supports directly. The closest real equivalent is the device's own share
// sheet (navigator.share), which lists Instagram as an option on a phone
// that has it installed — so that's offered here as "Share via device"
// instead of a fake Instagram button that wouldn't actually work.
export default function ShareButton({
  title,
  image,
}: {
  title: string;
  image?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Not state: these only ever gate buttons inside the closed-by-default
  // dropdown, so they never affect the initial (server-rendered) markup —
  // safe to read directly on every render, no hydration mismatch, no effect
  // needed.
  const canNativeShare = typeof navigator !== "undefined" && "share" in navigator;
  // The fb-messenger:// deep link below only opens anything on a phone/
  // tablet with the Messenger app installed — on desktop it just does
  // nothing, so the button's hidden there rather than being a dead end.
  const isMobile =
    typeof navigator !== "undefined" && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  function openPopup(url: string) {
    window.open(url, "_blank", "noopener,noreferrer,width=680,height=600");
    setOpen(false);
  }

  function shareToPinterest() {
    const params = new URLSearchParams({ url: window.location.href, description: title });
    if (image) params.set("media", image);
    openPopup(`https://www.pinterest.com/pin/create/button/?${params.toString()}`);
  }

  function shareToFacebook() {
    const params = new URLSearchParams({ u: window.location.href });
    openPopup(`https://www.facebook.com/sharer/sharer.php?${params.toString()}`);
  }

  function shareToMessenger() {
    // Custom URL schemes like this need a direct navigation to trigger the
    // app — window.open() doesn't reliably hand off to it.
    window.location.href = `fb-messenger://share?link=${encodeURIComponent(window.location.href)}`;
    setOpen(false);
  }

  async function shareViaDevice() {
    try {
      await navigator.share({ title, url: window.location.href });
    } catch {
      // User cancelled, or the browser refused — nothing to show for either.
    }
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-oxblood"
      >
        <ShareIcon />
        Share
      </button>

      {open && (
        <div className="absolute right-0 top-full z-10 mt-1 flex w-56 flex-col overflow-hidden rounded-xl border border-line bg-paper-2 py-1 shadow-lg">
          <button
            type="button"
            onClick={copyLink}
            className="flex items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-paper"
          >
            <LinkIcon />
            {copied ? "Copied!" : "Copy link"}
          </button>
          <button
            type="button"
            onClick={shareToPinterest}
            className="flex items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-paper"
          >
            <PinterestIcon />
            Share to Pinterest
          </button>
          <button
            type="button"
            onClick={shareToFacebook}
            className="flex items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-paper"
          >
            <FacebookIcon />
            Share to Facebook
          </button>
          {isMobile && (
            <button
              type="button"
              onClick={shareToMessenger}
              className="flex items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-paper"
            >
              <MessengerIcon />
              Send in Messenger
            </button>
          )}
          {canNativeShare && (
            <button
              type="button"
              onClick={shareViaDevice}
              className="flex items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-paper"
            >
              <DeviceIcon />
              Share via device…
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ShareIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="18" cy="5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="19" r="2.5" />
      <path d="M8.2 10.7 15.8 6.3M8.2 13.3l7.6 4.4" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="17"
      height="17"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0 text-ink-soft"
    >
      <path d="M9.5 14.5 14.5 9.5" />
      <path d="M11 6.5 12.6 4.9a3.5 3.5 0 0 1 5 5L16 11.5" />
      <path d="M13 17.5 11.4 19.1a3.5 3.5 0 0 1-5-5L8 12.5" />
    </svg>
  );
}

// Thin-line versions of each brand's mark, in the site's own ink tone —
// recognizable, but consistent with every other icon on the site (chevrons,
// the share icon, etc.) instead of dropping in solid brand-colored badges.
function PinterestIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="17"
      height="17"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0 text-ink-soft"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 18c.6-1.6 1.6-5.1 1.6-5.1M8.7 11c0-1.8 1.5-3.6 3.7-3.6 2.6 0 4 1.7 4 4 0 3-1.5 5-3.5 5-1 0-1.8-.6-2.1-1.3" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="17"
      height="17"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0 text-ink-soft"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M13.8 19v-6.4h2.1l.3-2.5h-2.4V8.4c0-.7.2-1.2 1.2-1.2h1.3V5c-.3 0-1-.1-1.9-.1-1.9 0-3.1 1.1-3.1 3.2v1.9H9.2v2.5h2.1V19" />
    </svg>
  );
}

function MessengerIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="17"
      height="17"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0 text-ink-soft"
    >
      <path d="M12 4c-4.7 0-8.5 3.4-8.5 7.6 0 2.4 1.2 4.5 3.1 5.9v2.8l2.9-1.6c.8.2 1.6.3 2.5.3 4.7 0 8.5-3.4 8.5-7.4S16.7 4 12 4Z" />
      <path d="m8.2 12.3 2.6-2.7 2.1 1.6 2.6-2.7-2.6 3.9-2.1-1.6-2.6 3.5Z" strokeLinejoin="round" />
    </svg>
  );
}

function DeviceIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="17"
      height="17"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0 text-ink-soft"
    >
      <rect x="5" y="3.5" width="14" height="17" rx="2" />
      <path d="M12 8v6M9.2 10.8 12 8l2.8 2.8" />
      <path d="M9 15.5h6" />
    </svg>
  );
}
