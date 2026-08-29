"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Board } from "@/lib/types";
import { fetchJson } from "@/lib/fetch-json";
import ImageUploadField from "@/app/admin/ImageUploadField";
import ConfirmButton from "@/app/admin/ConfirmButton";

type BoardDraft = {
  title: string;
  kicker: string;
  intro: string;
  cover_image_url: string;
  slug: string;
  published: boolean;
  position: number;
};

const emptyDraft: BoardDraft = {
  title: "",
  kicker: "",
  intro: "",
  cover_image_url: "",
  slug: "",
  published: false,
  position: 0,
};

function toDraft(board: Board): BoardDraft {
  return {
    title: board.title,
    kicker: board.kicker,
    intro: board.intro,
    cover_image_url: board.cover_image_url ?? "",
    slug: board.slug,
    published: board.published,
    position: board.position,
  };
}

export default function BoardsClient() {
  const [boards, setBoards] = useState<Board[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newDraft, setNewDraft] = useState<BoardDraft>(emptyDraft);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<BoardDraft>(emptyDraft);
  const [saving, setSaving] = useState(false);

  async function load() {
    setError(null);
    const result = await fetchJson<{ boards: Board[] }>("/api/admin/boards");
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setBoards(result.data.boards);
  }

  useEffect(() => {
    // Fetch-on-mount: load() eventually calls setState once the request
    // resolves, which is fine — it isn't synchronous within this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  // Editing a board opens its edit form inline, in place, further down the
  // "Existing boards" list — without this it can open off-screen below the
  // fold, which just looks like the Edit button did nothing (or worse, like
  // it took you back to the New board form at the top).
  useEffect(() => {
    if (!editingId) return;
    document
      .getElementById(`board-edit-${editingId}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [editingId]);

  async function createBoard(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const result = await fetchJson("/api/admin/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newDraft,
          cover_image_url: newDraft.cover_image_url || undefined,
        }),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setNewDraft(emptyDraft);
      await load();
    } finally {
      setCreating(false);
    }
  }

  function startEdit(board: Board) {
    setEditingId(board.id);
    setEditDraft(toDraft(board));
  }

  async function saveEdit(id: string) {
    setSaving(true);
    setError(null);
    try {
      const result = await fetchJson(`/api/admin/boards/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editDraft,
          cover_image_url: editDraft.cover_image_url || null,
        }),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setEditingId(null);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function deleteBoard(id: string) {
    setError(null);
    const result = await fetchJson(`/api/admin/boards/${id}`, { method: "DELETE" });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    await load();
  }

  // One-click hide/show from the list, without opening the full edit form.
  async function toggleVisibility(board: Board) {
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
    await load();
  }

  return (
    <div className="flex flex-col gap-10">
      {error && (
        <p className="rounded-sm border border-oxblood bg-paper-2 px-4 py-3 font-sans text-sm text-oxblood">
          {error}
        </p>
      )}

      <section>
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="font-serif text-2xl text-ink">Create board</h2>
          <button
            type="submit"
            form="new-board-form"
            disabled={creating || !newDraft.title.trim()}
            className="rounded-full bg-oxblood px-6 py-2.5 font-sans text-sm font-semibold text-on-forest transition hover:opacity-90 disabled:opacity-50"
          >
            {creating ? "Adding…" : newDraft.published ? "Publish" : "Save draft"}
          </button>
        </div>
        <form
          id="new-board-form"
          onSubmit={createBoard}
          className="grid gap-6 lg:grid-cols-[minmax(0,340px)_1fr]"
        >
          <div>
            <ImageUploadField
              kind="board-cover"
              value={newDraft.cover_image_url}
              onChange={(url) => setNewDraft({ ...newDraft, cover_image_url: url })}
              size="large"
              aspect="1/1"
            />
          </div>
          <div className="flex flex-col gap-3">
            <BoxField label="Title">
              <input
                required
                value={newDraft.title}
                onChange={(e) => setNewDraft({ ...newDraft, title: e.target.value })}
                className={boxedInputClass}
                placeholder="Cropped Jacket"
              />
            </BoxField>
            <BoxField label="Kicker (small label above the title)">
              <input
                value={newDraft.kicker}
                onChange={(e) => setNewDraft({ ...newDraft, kicker: e.target.value })}
                className={boxedInputClass}
                placeholder="Jackets & Outerwear · Style Guide"
              />
            </BoxField>
            <BoxField label="Intro">
              <textarea
                value={newDraft.intro}
                onChange={(e) => setNewDraft({ ...newDraft, intro: e.target.value })}
                className={boxedInputClass}
                rows={2}
              />
            </BoxField>
            <ToggleRow
              label="Published (visible on the site)"
              checked={newDraft.published}
              onChange={(published) => setNewDraft({ ...newDraft, published })}
            />
          </div>
        </form>
      </section>

      <section>
        <h2 className="mb-4 font-sans text-xs uppercase tracking-[0.14em] text-taupe">
          Existing boards
        </h2>
        {boards === null ? (
          error ? null : <p className="font-sans text-sm text-taupe">Loading…</p>
        ) : boards.length === 0 ? (
          <p className="font-sans text-sm text-taupe">No boards yet — add one above.</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {boards.map((board) =>
              editingId === board.id ? (
                <li
                  key={board.id}
                  id={`board-edit-${board.id}`}
                  className="rounded-2xl border border-oxblood bg-paper-2 p-4 sm:p-5"
                >
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <h3 className="font-serif text-xl text-ink">Edit board</h3>
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="font-sans text-xs uppercase tracking-[0.1em] text-ink-soft hover:text-oxblood"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => saveEdit(board.id)}
                        disabled={saving}
                        className="rounded-full bg-oxblood px-6 py-2.5 font-sans text-sm font-semibold text-on-forest transition hover:opacity-90 disabled:opacity-50"
                      >
                        {saving ? "Saving…" : "Save"}
                      </button>
                    </div>
                  </div>
                  <div className="grid gap-6 lg:grid-cols-[minmax(0,340px)_1fr]">
                    <div>
                      <ImageUploadField
                        kind="board-cover"
                        value={editDraft.cover_image_url}
                        onChange={(url) => setEditDraft({ ...editDraft, cover_image_url: url })}
                        size="large"
                        aspect="1/1"
                      />
                    </div>
                    <div className="flex flex-col gap-3">
                      <BoxField label="Title">
                        <input
                          value={editDraft.title}
                          onChange={(e) =>
                            setEditDraft({ ...editDraft, title: e.target.value })
                          }
                          className={boxedInputClass}
                        />
                      </BoxField>
                      <BoxField label="Slug">
                        <input
                          value={editDraft.slug}
                          onChange={(e) => setEditDraft({ ...editDraft, slug: e.target.value })}
                          className={boxedInputClass}
                        />
                      </BoxField>
                      <BoxField label="Kicker">
                        <input
                          value={editDraft.kicker}
                          onChange={(e) =>
                            setEditDraft({ ...editDraft, kicker: e.target.value })
                          }
                          className={boxedInputClass}
                        />
                      </BoxField>
                      <BoxField label="Intro">
                        <textarea
                          value={editDraft.intro}
                          onChange={(e) =>
                            setEditDraft({ ...editDraft, intro: e.target.value })
                          }
                          className={boxedInputClass}
                          rows={2}
                        />
                      </BoxField>
                      <ToggleRow
                        label="Published (visible on the site)"
                        checked={editDraft.published}
                        onChange={(published) => setEditDraft({ ...editDraft, published })}
                      />
                    </div>
                  </div>
                </li>
              ) : (
                <li
                  key={board.id}
                  className="flex items-center justify-between gap-4 rounded-sm border border-line bg-paper-2 px-4 py-3"
                >
                  <div>
                    <p className="font-sans text-sm font-semibold">
                      {board.title}{" "}
                      {!board.published && (
                        <span className="ml-1 font-sans text-[11px] uppercase tracking-[0.1em] text-taupe">
                          (draft)
                        </span>
                      )}
                    </p>
                    <p className="font-sans text-xs text-taupe">/boards/{board.slug}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1 font-sans text-xs uppercase tracking-[0.1em]">
                    <Link
                      href={`/admin/products?board_id=${board.id}`}
                      className="mr-2 hover:text-oxblood"
                    >
                      Products
                    </Link>
                    <button
                      onClick={() => toggleVisibility(board)}
                      aria-label={board.published ? "Hide from the site" : "Publish"}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition hover:bg-paper hover:text-oxblood"
                    >
                      {board.published ? <EyeIcon /> : <EyeOffIcon />}
                    </button>
                    <button
                      onClick={() => startEdit(board)}
                      aria-label="Edit"
                      className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition hover:bg-paper hover:text-oxblood"
                    >
                      <EditPencilIcon />
                    </button>
                    <ConfirmButton
                      onConfirm={() => deleteBoard(board.id)}
                      label={<TrashIcon />}
                      warning={`Delete "${board.title}" and all of its products? This can't be undone.`}
                      triggerClassName="flex h-8 w-8 items-center justify-center rounded-full text-oxblood-soft transition hover:bg-paper hover:text-oxblood"
                    />
                  </div>
                </li>
              )
            )}
          </ul>
        )}
      </section>
    </div>
  );
}

// One bordered box per field with the label inside it — the Pinterest
// create-pin look also used on the Products page, in place of a label
// sitting above a separately-bordered input.
const boxedInputClass =
  "mt-1 w-full resize-none border-none bg-transparent p-0 font-sans text-sm text-ink outline-none placeholder:text-taupe";

function BoxField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block rounded-2xl border border-line bg-paper-2 px-4 py-3 transition focus-within:border-oxblood">
      <span className="block font-sans text-xs font-semibold text-ink">{label}</span>
      {children}
    </label>
  );
}

// Simple on/off pill switch, styled with the site's own tokens — same
// component as the Products page's "Publish at a later date" toggle.
function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 font-sans text-sm">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? "bg-oxblood" : "bg-line"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-paper-2 shadow transition ${
            checked ? "left-[22px]" : "left-0.5"
          }`}
        />
      </button>
      {label}
    </label>
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
