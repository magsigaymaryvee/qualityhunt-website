"use client";

import { useEffect, useState } from "react";
import type { Review } from "@/lib/types";
import { fetchJson } from "@/lib/fetch-json";
import ConfirmButton from "@/app/admin/ConfirmButton";

type ReviewRow = Review & { products: { name: string; slug: string } | null };

export default function ReviewsClient() {
  const [reviews, setReviews] = useState<ReviewRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setError(null);
    const result = await fetchJson<{ reviews: ReviewRow[] }>("/api/admin/reviews");
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setReviews(result.data.reviews);
  }

  useEffect(() => {
    // Fetch-on-mount: load() eventually calls setState once the request
    // resolves, which is fine — it isn't synchronous within this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  async function setApproved(id: string, approved: boolean) {
    setBusyId(id);
    setError(null);
    const result = await fetchJson(`/api/admin/reviews/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approved }),
    });
    setBusyId(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    await load();
  }

  async function removeReview(id: string) {
    setError(null);
    const result = await fetchJson(`/api/admin/reviews/${id}`, { method: "DELETE" });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    await load();
  }

  if (reviews === null) {
    return <p className="text-sm text-taupe">Loading…</p>;
  }

  const pending = reviews.filter((r) => !r.approved);
  const approved = reviews.filter((r) => r.approved);

  return (
    <div className="flex flex-col gap-8">
      {error && <p className="font-sans text-sm text-oxblood">{error}</p>}

      <section>
        <h2 className="mb-3 font-serif text-xl text-ink">
          Awaiting approval {pending.length > 0 && `(${pending.length})`}
        </h2>
        {pending.length === 0 ? (
          <p className="text-sm text-taupe">Nothing waiting on you right now.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {pending.map((review) => (
              <li
                key={review.id}
                className="rounded-sm border border-line bg-paper-2 px-4 py-3"
              >
                <ReviewRowContent review={review} />
                <div className="mt-3 flex items-center gap-2 font-sans text-xs uppercase tracking-[0.1em]">
                  <button
                    onClick={() => setApproved(review.id, true)}
                    disabled={busyId === review.id}
                    className="rounded-full bg-ink px-4 py-2 font-semibold text-paper transition hover:opacity-90 disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <ConfirmButton
                    onConfirm={() => removeReview(review.id)}
                    label="Reject"
                    warning="Delete this review? This can't be undone."
                    triggerClassName="rounded-full border border-line px-4 py-2 font-semibold text-oxblood transition hover:bg-paper"
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-serif text-xl text-ink">
          Approved {approved.length > 0 && `(${approved.length})`}
        </h2>
        {approved.length === 0 ? (
          <p className="text-sm text-taupe">No approved reviews yet.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {approved.map((review) => (
              <li
                key={review.id}
                className="rounded-sm border border-line bg-paper-2 px-4 py-3"
              >
                <ReviewRowContent review={review} />
                <div className="mt-3 flex items-center gap-2 font-sans text-xs uppercase tracking-[0.1em]">
                  <button
                    onClick={() => setApproved(review.id, false)}
                    disabled={busyId === review.id}
                    className="rounded-full border border-line px-4 py-2 font-semibold text-ink-soft transition hover:bg-paper disabled:opacity-50"
                  >
                    Unapprove
                  </button>
                  <ConfirmButton
                    onConfirm={() => removeReview(review.id)}
                    label="Delete"
                    warning="Delete this review? This can't be undone."
                    triggerClassName="rounded-full border border-line px-4 py-2 font-semibold text-oxblood transition hover:bg-paper"
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function ReviewRowContent({ review }: { review: ReviewRow }) {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-sans text-sm font-semibold">
          {review.products?.name ?? "(deleted product)"}
        </p>
        <p aria-label={`${review.rating} out of 5 stars`} className="text-oxblood">
          {"★".repeat(review.rating)}
          <span className="text-line">{"★".repeat(5 - review.rating)}</span>
        </p>
      </div>
      <p className="font-sans text-xs text-taupe">
        {review.name || "Anonymous"} · {new Date(review.created_at).toLocaleDateString()}
      </p>
      <p className="mt-2 font-sans text-sm leading-6 text-ink-soft">{review.body}</p>
    </>
  );
}
