"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fetchJson } from "@/lib/fetch-json";

export default function AdminLoginForm() {
  const router = useRouter();
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const result = await fetchJson("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-sm flex-col gap-4">
      <label className="flex flex-col gap-2">
        <span className="text-[13px] font-medium text-forest-soft">Passcode</span>
        <input
          type="password"
          autoFocus
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          className="min-h-14 rounded-xl border border-white/20 bg-white/10 px-4 text-[17px] tracking-[0.2em] text-paper-2 outline-none transition placeholder:text-white/30 focus:border-white/50"
        />
      </label>
      {error && <p className="text-sm text-danger">{error}</p>}
      <button
        type="submit"
        disabled={submitting || !passcode}
        className="inline-flex min-h-13 items-center justify-center rounded-full bg-paper-2 px-6 text-[15px] font-semibold text-oxblood transition hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? "Checking…" : "Sign in"}
      </button>
    </form>
  );
}
