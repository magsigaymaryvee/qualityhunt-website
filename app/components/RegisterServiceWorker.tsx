"use client";

import { useEffect } from "react";

// Registering this is what actually makes Chrome offer "Install app" /
// "Add to Home Screen" — a manifest alone isn't enough, Chrome also
// requires an active service worker with a fetch handler.
export default function RegisterServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Installability just won't be offered — not worth bothering the
        // visitor about.
      });
    }
  }, []);

  return null;
}
