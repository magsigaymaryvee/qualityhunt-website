"use client";

import { useState } from "react";
import { fetchJson } from "@/lib/fetch-json";

const MAX_NAME_LENGTH = 80;
const MAX_BODY_LENGTH = 2000;

export default function ReviewForm({ productId }: { productId: string }) {
  const [name, setName] = useState("");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (sent) {
    return (
      <p className="rounded-2xl bg-paper-2 p-4 text-sm text-ink-soft sm:p-5">
        Thanks! Your review is awaiting approval and will show here once it&apos;s reviewed.
      </p>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rating) {
      setError("Choose a star rating.");
      return;
    }
    if (!body.trim()) {
      setError("Write a short review.");
      return;
    }

    setSubmitting(true);
    setError(null);
    const result = await fetchJson("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product_id: productId,
        name: name.trim(),
        rating,
        body: body.trim(),
      }),
    });
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSent(true);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-2xl bg-paper-2 p-4 sm:p-5"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-taupe">
        Write a review
      </p>
      <div
        className="flex gap-1"
        onMouseLeave={() => setHoverRating(0)}
        role="radiogroup"
        aria-label="Rating"
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
            onClick={() => setRating(n)}
            onMouseEnter={() => setHoverRating(n)}
            className="flex h-9 w-9 items-center justify-center text-2xl leading-none"
          >
            <span className={n <= (hoverRating || rating) ? "text-oxblood" : "text-line"}>★</span>
          </button>
        ))}
      </div>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name (optional)"
        maxLength={MAX_NAME_LENGTH}
        className="min-h-11 rounded-lg border border-line bg-paper px-3 text-sm outline-none focus:border-oxblood"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="What did you think?"
        maxLength={MAX_BODY_LENGTH}
        rows={3}
        className="resize-none rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-oxblood"
      />
      {error && <p className="text-xs text-oxblood">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="inline-flex min-h-11 w-fit items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-paper transition hover:opacity-90 disabled:opacity-60"
      >
        {submitting ? "Submitting…" : "Submit review"}
      </button>
    </form>
  );
}
