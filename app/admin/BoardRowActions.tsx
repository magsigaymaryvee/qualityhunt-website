"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Board } from "@/lib/types";
import { fetchJson } from "@/lib/fetch-json";
import ConfirmButton from "@/app/admin/ConfirmButton";

// Same quick actions as the Boards page's own list (hide/show, edit,
// delete) — but this one lives on the Dashboard, which is a server
// component, so this piece needs to be its own small client island.
export default function BoardRowActions({ board }: { board: Board }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function toggleVisibility() {
    setError(null);
    const result = await fetchJson(`/api/admin/boards/${board.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !board.published }),
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function deleteBoard() {
    setError(null);
    const result = await fetchJson(`/api/admin/boards/${board.id}`, { method: "DELETE" });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex shrink-0 items-center gap-1">
      {error && <p className="mr-1 font-sans text-xs text-oxblood">{error}</p>}
      <button
        type="button"
        onClick={toggleVisibility}
        aria-label={board.published ? "Hide from the site" : "Publish"}
        className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition hover:bg-paper hover:text-oxblood"
      >
        {board.published ? <EyeIcon /> : <EyeOffIcon />}
      </button>
      <Link
        href={`/admin/boards?edit=${board.id}`}
        aria-label={`Edit ${board.title}`}
        className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition hover:bg-paper hover:text-oxblood"
      >
        <EditPencilIcon />
      </Link>
      <ConfirmButton
        onConfirm={deleteBoard}
        label={<TrashIcon />}
        warning={`Delete "${board.title}" and all of its products? This can't be undone.`}
        triggerClassName="flex h-8 w-8 items-center justify-center rounded-full text-oxblood-soft transition hover:bg-paper hover:text-oxblood"
      />
    </div>
  );
}

function EditPencilIcon() {
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
      <path d="M14.5 5.5 18.5 9.5 8 20H4v-4Z" />
      <path d="M13 7 17 11" />
    </svg>
  );
}

function EyeIcon() {
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
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.7" />
    </svg>
  );
}

function EyeOffIcon() {
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
      <path d="M3.5 12S7 6 12 6c1.5 0 2.9.3 4.1.9M20.5 12S17 18 12 18c-1.5 0-2.9-.3-4.1-.9" />
      <path d="M9.8 9.8a2.7 2.7 0 0 0 3.9 3.9" />
      <path d="M4 4l16 16" />
    </svg>
  );
}

function TrashIcon() {
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
      <path d="M5 7h14M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="M7 7l1 12a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-12" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}
