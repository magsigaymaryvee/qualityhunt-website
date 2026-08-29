"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Board, Product } from "@/lib/types";
import { fetchJson } from "@/lib/fetch-json";
import ImageUploadField from "@/app/admin/ImageUploadField";
import ProductMediaEditor from "@/app/admin/products/ProductMediaEditor";
import NewProductMediaEditor, {
  type StagedMedia,
} from "@/app/admin/products/NewProductMediaEditor";
import ConfirmButton from "@/app/admin/ConfirmButton";
import { isLikelyValidUrl } from "@/lib/url-check";

type PublishMode = "now" | "draft" | "schedule";

type ProductDraft = {
  board_id: string;
  name: string;
  tagline: string;
  description: string;
  image_url: string;
  buy_url: string;
  video_url: string;
  notes: string;
  reviews_url: string;
  slug: string;
  position: number;
  publish_mode: PublishMode;
  // datetime-local formatted string ("YYYY-MM-DDTHH:mm"), only meaningful
  // when publish_mode is "schedule".
  schedule_at: string;
};

function emptyDraft(boardId: string): ProductDraft {
  return {
    board_id: boardId,
    name: "",
    tagline: "",
    description: "",
    image_url: "",
    buy_url: "",
    video_url: "",
    notes: "",
    reviews_url: "",
    slug: "",
    position: 0,
    publish_mode: "now",
    schedule_at: "",
  };
}

// datetime-local inputs want "YYYY-MM-DDTHH:mm" in the viewer's own local
// time, with no timezone suffix — this reads back the same wall-clock time
// a person picked, rather than shifting it to UTC first.
function toDatetimeLocal(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toDraft(product: Product): ProductDraft {
  const publishAt = product.publish_at;
  const isFuture = publishAt !== null && new Date(publishAt) > new Date();
  return {
    board_id: product.board_id,
    name: product.name,
    tagline: product.tagline,
    description: product.description,
    image_url: product.image_url ?? "",
    buy_url: product.buy_url ?? "",
    video_url: product.video_url ?? "",
    notes: product.notes,
    reviews_url: product.reviews_url ?? "",
    slug: product.slug,
    position: product.position,
    publish_mode: publishAt === null ? "draft" : isFuture ? "schedule" : "now",
    schedule_at: isFuture && publishAt ? toDatetimeLocal(publishAt) : "",
  };
}

// Turns a draft's visibility choice into the publish_at value the API
// expects: null for a draft, "now" for immediate, or the picked date/time
// for a schedule.
function resolvePublishAt(draft: ProductDraft): string | null {
  if (draft.publish_mode === "draft") return null;
  if (draft.publish_mode === "schedule" && draft.schedule_at) {
    return new Date(draft.schedule_at).toISOString();
  }
  return new Date().toISOString();
}

function addToNow(amount: number, unit: "day" | "month"): string {
  const d = new Date();
  if (unit === "day") d.setDate(d.getDate() + amount);
  else d.setMonth(d.getMonth() + amount);
  return toDatetimeLocal(d);
}

export default function ProductsClient() {
  const searchParams = useSearchParams();
  const initialBoardId = searchParams.get("board_id") ?? "";

  const [boards, setBoards] = useState<Board[] | null>(null);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [filterBoardId, setFilterBoardId] = useState(initialBoardId);
  const [error, setError] = useState<string | null>(null);
  // Arriving via a board's link should filter and scroll to that board's
  // product list (see the effect below) — it shouldn't also silently
  // pre-select that board in the "Create product" form above it, which
  // just looks like an unrelated leftover when you only came here to look.
  const [newDraft, setNewDraft] = useState<ProductDraft>(emptyDraft(""));
  const [newMedia, setNewMedia] = useState<StagedMedia[]>([]);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<ProductDraft | null>(null);
  const [saving, setSaving] = useState(false);

  async function loadBoards() {
    const result = await fetchJson<{ boards: Board[] }>("/api/admin/boards");
    if (result.ok) setBoards(result.data.boards);
  }

  async function loadProducts(boardId: string) {
    setError(null);
    const url = boardId ? `/api/admin/products?board_id=${boardId}` : "/api/admin/products";
    const result = await fetchJson<{ products: Product[] }>(url);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setProducts(result.data.products);
  }

  useEffect(() => {
    // Fetch-on-mount: these setState calls happen once the request
    // resolves, which is fine — it isn't synchronous within this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadBoards();
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadProducts(filterBoardId);
  }, [filterBoardId]);

  // Whenever an edit form opens (including right after creating a product),
  // bring it into view — otherwise it can open off-screen below the fold,
  // which especially defeats the point of auto-opening it after "Add
  // product".
  useEffect(() => {
    if (!editingId) return;
    document
      .getElementById(`product-edit-${editingId}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [editingId]);

  async function createProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!newDraft.board_id) {
      setError("Pick a board first.");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const result = await fetchJson<{ product: Product }>("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          board_id: newDraft.board_id,
          name: newDraft.name,
          tagline: newDraft.tagline,
          description: newDraft.description,
          slug: newDraft.slug,
          position: newDraft.position,
          notes: newDraft.notes,
          image_url: newDraft.image_url || undefined,
          buy_url: newDraft.buy_url || undefined,
          video_url: newDraft.video_url || undefined,
          reviews_url: newDraft.reviews_url || undefined,
          publish_at: resolvePublishAt(newDraft),
        }),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const newProduct = result.data.product;

      // The carousel items were only ever staged client-side (there was no
      // product id to attach them to yet) — now that one exists, write each
      // one for real. One failing item shouldn't lose the rest, so these
      // run independently and any failures just surface as a warning; the
      // product itself is already created either way.
      const mediaFailures: string[] = [];
      for (const item of newMedia) {
        const added = await fetchJson(`/api/admin/products/${newProduct.id}/media`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            media_type: item.media_type,
            url: item.url,
            title: item.title,
            caption: item.caption,
          }),
        });
        if (!added.ok) mediaFailures.push(added.error);
      }
      if (mediaFailures.length > 0) {
        setError(`Product created, but some carousel items failed: ${mediaFailures.join(" · ")}`);
      }

      setNewDraft(emptyDraft(newDraft.board_id));
      setNewMedia([]);
      await loadProducts(filterBoardId);
      // Drop straight into editing the product we just made — the carousel
      // editor there will show the items we just attached, and is still the
      // place to reorder or edit captions afterward.
      startEdit(newProduct);
    } finally {
      setCreating(false);
    }
  }

  function startEdit(product: Product) {
    setEditingId(product.id);
    setEditDraft(toDraft(product));
  }

  async function saveEdit(id: string) {
    if (!editDraft) return;
    setSaving(true);
    setError(null);
    try {
      const result = await fetchJson(`/api/admin/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          board_id: editDraft.board_id,
          name: editDraft.name,
          tagline: editDraft.tagline,
          description: editDraft.description,
          slug: editDraft.slug,
          position: editDraft.position,
          notes: editDraft.notes,
          image_url: editDraft.image_url || null,
          buy_url: editDraft.buy_url || null,
          video_url: editDraft.video_url || null,
          reviews_url: editDraft.reviews_url || null,
          publish_at: resolvePublishAt(editDraft),
        }),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setEditingId(null);
      await loadProducts(filterBoardId);
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct(id: string) {
    setError(null);
    const result = await fetchJson(`/api/admin/products/${id}`, { method: "DELETE" });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    await loadProducts(filterBoardId);
  }

  // One-click hide/show from the list, without opening the full edit form.
  // Live -> hidden sets publish_at to null (draft). Anything not currently
  // live (draft or still-scheduled) -> live sets it to right now.
  async function toggleVisibility(product: Product) {
    setError(null);
    const isLive = product.publish_at !== null && new Date(product.publish_at) <= new Date();
    const result = await fetchJson(`/api/admin/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publish_at: isLive ? null : new Date().toISOString() }),
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    await loadProducts(filterBoardId);
  }

  return (
    <div className="flex flex-col gap-10">
      {error && (
        <p className="rounded-sm border border-oxblood bg-paper-2 px-4 py-3 font-sans text-sm text-oxblood">
          {error}
        </p>
      )}

      {/* Arriving via a board's own link ("click a board to see its
          products") means you came here to look, not to create — so this
          form is skipped entirely rather than just scrolled past. To add a
          product, use the sidebar's plain "Products" link instead, which
          always shows it. */}
      {!initialBoardId && (
      <section>
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="font-serif text-2xl text-ink">Create product</h2>
          <button
            type="submit"
            form="new-product-form"
            disabled={
              creating ||
              !newDraft.name.trim() ||
              !newDraft.board_id ||
              (newDraft.publish_mode === "schedule" && !newDraft.schedule_at)
            }
            className="rounded-full bg-oxblood px-6 py-2.5 font-sans text-sm font-semibold text-on-forest transition hover:opacity-90 disabled:opacity-50"
          >
            {creating
              ? "Adding…"
              : newDraft.publish_mode === "schedule"
                ? "Schedule"
                : newDraft.publish_mode === "draft"
                  ? "Save draft"
                  : "Publish"}
          </button>
        </div>
        <form
          id="new-product-form"
          onSubmit={createProduct}
          className="grid gap-6 lg:grid-cols-[minmax(0,340px)_1fr]"
        >
          <div>
            <ImageUploadField
              kind="product-image"
              value={newDraft.image_url}
              onChange={(url) => setNewDraft({ ...newDraft, image_url: url })}
              size="large"
            />
          </div>

          <div className="flex flex-col gap-3">
            <BoxField label="Board">
              <select
                required
                value={newDraft.board_id}
                onChange={(e) => setNewDraft({ ...newDraft, board_id: e.target.value })}
                className={boxedInputClass}
              >
                <option value="">Choose a board…</option>
                {boards?.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title}
                  </option>
                ))}
              </select>
            </BoxField>
            <BoxField label="Title">
              <input
                required
                value={newDraft.name}
                onChange={(e) => setNewDraft({ ...newDraft, name: e.target.value })}
                className={boxedInputClass}
                placeholder="CHIGUO Faux Leather Cropped Moto Jacket"
              />
            </BoxField>
            <BoxField label="Tagline (small label, optional)">
              <input
                value={newDraft.tagline}
                onChange={(e) => setNewDraft({ ...newDraft, tagline: e.target.value })}
                className={boxedInputClass}
                placeholder="Casual Weekend"
              />
            </BoxField>
            <BoxField label="Description">
              <textarea
                value={newDraft.description}
                onChange={(e) => setNewDraft({ ...newDraft, description: e.target.value })}
                className={boxedInputClass}
                placeholder="Describe your pin"
                rows={2}
              />
            </BoxField>
            <BoxField label="Buy / affiliate link">
              <input
                value={newDraft.buy_url}
                onChange={(e) => setNewDraft({ ...newDraft, buy_url: e.target.value })}
                className={boxedInputClass}
                placeholder="https://www.amazon.com/dp/…?tag=yourtag-20"
              />
            </BoxField>
            <UrlWarning value={newDraft.buy_url} />
            <BoxField label="See reviews on Amazon link (optional)">
              <input
                value={newDraft.reviews_url}
                onChange={(e) => setNewDraft({ ...newDraft, reviews_url: e.target.value })}
                className={boxedInputClass}
                placeholder="https://www.amazon.com/product-reviews/…"
              />
            </BoxField>
            <UrlWarning value={newDraft.reviews_url} />
            <BoxField label="Video URL (optional — your own, YouTube/Vimeo/direct file)">
              <input
                value={newDraft.video_url}
                onChange={(e) => setNewDraft({ ...newDraft, video_url: e.target.value })}
                className={boxedInputClass}
                placeholder="https://youtube.com/watch?v=…"
              />
            </BoxField>
            <UrlWarning value={newDraft.video_url} />
            <BoxField label="Why we like it (optional — your own words, not a copied review)">
              <textarea
                value={newDraft.notes}
                onChange={(e) => setNewDraft({ ...newDraft, notes: e.target.value })}
                className={boxedInputClass}
                rows={2}
              />
            </BoxField>
            <NewProductMediaEditor items={newMedia} onChange={setNewMedia} />
            <VisibilityField
              mode={newDraft.publish_mode}
              scheduleAt={newDraft.schedule_at}
              onModeChange={(publish_mode, scheduleAt) =>
                setNewDraft({
                  ...newDraft,
                  publish_mode,
                  ...(scheduleAt !== undefined ? { schedule_at: scheduleAt } : {}),
                })
              }
              onScheduleAtChange={(schedule_at) => setNewDraft({ ...newDraft, schedule_at })}
            />
          </div>
        </form>
      </section>
      )}

      <section id="existing-products">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-sans text-xs uppercase tracking-[0.14em] text-taupe">
            Existing products
          </h2>
          <select
            value={filterBoardId}
            onChange={(e) => setFilterBoardId(e.target.value)}
            className={`${inputClass} w-48`}
          >
            <option value="">All boards</option>
            {boards?.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title}
              </option>
            ))}
          </select>
        </div>

        {products === null ? (
          error ? null : <p className="font-sans text-sm text-taupe">Loading…</p>
        ) : products.length === 0 ? (
          <p className="font-sans text-sm text-taupe">No products yet — add one above.</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {products.map((product) =>
              editingId === product.id && editDraft ? (
                <li
                  key={product.id}
                  id={`product-edit-${product.id}`}
                  className="rounded-2xl border border-oxblood bg-paper-2 p-4 sm:p-5"
                >
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <h3 className="font-serif text-xl text-ink">Edit product</h3>
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
                        onClick={() => saveEdit(product.id)}
                        disabled={
                          saving ||
                          (editDraft.publish_mode === "schedule" && !editDraft.schedule_at)
                        }
                        className="rounded-full bg-oxblood px-6 py-2.5 font-sans text-sm font-semibold text-on-forest transition hover:opacity-90 disabled:opacity-50"
                      >
                        {saving ? "Saving…" : "Save"}
                      </button>
                    </div>
                  </div>
                  <div className="grid gap-6 lg:grid-cols-[minmax(0,340px)_1fr]">
                    <div>
                      <ImageUploadField
                        kind="product-image"
                        value={editDraft.image_url}
                        onChange={(url) => setEditDraft({ ...editDraft, image_url: url })}
                        size="large"
                      />
                    </div>
                    <div className="flex flex-col gap-3">
                      <BoxField label="Board">
                        <select
                          value={editDraft.board_id}
                          onChange={(e) =>
                            setEditDraft({ ...editDraft, board_id: e.target.value })
                          }
                          className={boxedInputClass}
                        >
                          {boards?.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.title}
                            </option>
                          ))}
                        </select>
                      </BoxField>
                      <BoxField label="Title">
                        <input
                          value={editDraft.name}
                          onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
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
                      <BoxField label="Tagline">
                        <input
                          value={editDraft.tagline}
                          onChange={(e) =>
                            setEditDraft({ ...editDraft, tagline: e.target.value })
                          }
                          className={boxedInputClass}
                        />
                      </BoxField>
                      <BoxField label="Description">
                        <textarea
                          value={editDraft.description}
                          onChange={(e) =>
                            setEditDraft({ ...editDraft, description: e.target.value })
                          }
                          className={boxedInputClass}
                          rows={2}
                        />
                      </BoxField>
                      <BoxField label="Buy / affiliate link">
                        <input
                          value={editDraft.buy_url}
                          onChange={(e) =>
                            setEditDraft({ ...editDraft, buy_url: e.target.value })
                          }
                          className={boxedInputClass}
                        />
                      </BoxField>
                      <UrlWarning value={editDraft.buy_url} />
                      <BoxField label="See reviews on Amazon link">
                        <input
                          value={editDraft.reviews_url}
                          onChange={(e) =>
                            setEditDraft({ ...editDraft, reviews_url: e.target.value })
                          }
                          className={boxedInputClass}
                        />
                      </BoxField>
                      <UrlWarning value={editDraft.reviews_url} />
                      <BoxField label="Video URL">
                        <input
                          value={editDraft.video_url}
                          onChange={(e) =>
                            setEditDraft({ ...editDraft, video_url: e.target.value })
                          }
                          className={boxedInputClass}
                        />
                      </BoxField>
                      <UrlWarning value={editDraft.video_url} />
                      <BoxField label="Why we like it">
                        <textarea
                          value={editDraft.notes}
                          onChange={(e) => setEditDraft({ ...editDraft, notes: e.target.value })}
                          className={boxedInputClass}
                          rows={2}
                        />
                      </BoxField>
                      <BoxField label="Position (lower shows first)">
                        <input
                          type="number"
                          value={editDraft.position}
                          onChange={(e) =>
                            setEditDraft({ ...editDraft, position: Number(e.target.value) })
                          }
                          className={boxedInputClass}
                        />
                      </BoxField>
                      <ProductMediaEditor productId={product.id} />
                      <VisibilityField
                        mode={editDraft.publish_mode}
                        scheduleAt={editDraft.schedule_at}
                        onModeChange={(publish_mode, scheduleAt) =>
                          setEditDraft({
                            ...editDraft,
                            publish_mode,
                            ...(scheduleAt !== undefined ? { schedule_at: scheduleAt } : {}),
                          })
                        }
                        onScheduleAtChange={(schedule_at) =>
                          setEditDraft({ ...editDraft, schedule_at })
                        }
                      />
                    </div>
                  </div>
                </li>
              ) : (
                <li
                  key={product.id}
                  className="flex items-center justify-between gap-4 rounded-sm border border-line bg-paper-2 px-4 py-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-line">
                      {product.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element -- admin list thumbnail of an uploaded photo URL.
                        <img
                          src={product.image_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center font-serif text-lg text-taupe">
                          {product.name.slice(0, 1)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      {product.tagline && (
                        <p className="truncate font-sans text-[11px] font-semibold uppercase tracking-[0.08em] text-oxblood">
                          {product.tagline}
                        </p>
                      )}
                      <p className="truncate font-sans text-sm font-semibold">
                        {product.name}
                        <VisibilityBadge publishAt={product.publish_at} />
                      </p>
                      <p className="truncate font-sans text-xs text-taupe">
                        /products/{product.slug}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1 font-sans text-xs uppercase tracking-[0.1em]">
                    {(() => {
                      const isLive =
                        product.publish_at !== null &&
                        new Date(product.publish_at) <= new Date();
                      return (
                        <button
                          onClick={() => toggleVisibility(product)}
                          aria-label={isLive ? "Hide from the site" : "Publish now"}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition hover:bg-paper hover:text-oxblood"
                        >
                          {isLive ? <EyeIcon /> : <EyeOffIcon />}
                        </button>
                      );
                    })()}
                    <button
                      onClick={() => startEdit(product)}
                      aria-label="Edit"
                      className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition hover:bg-paper hover:text-oxblood"
                    >
                      <EditPencilIcon />
                    </button>
                    <ConfirmButton
                      onConfirm={() => deleteProduct(product.id)}
                      label={<TrashIcon />}
                      warning={`Delete "${product.name}"? This can't be undone.`}
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

const inputClass =
  "rounded-sm border border-line bg-paper px-3 py-2 font-sans text-sm outline-none focus:border-oxblood";

// One bordered box per field with the label inside it — the Pinterest
// create-pin look, in place of a label sitting above a separately-bordered
// input.
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

// A product's Boards-style "Published" checkbox, plus scheduling. NULL
// publish_at = draft, a future time = scheduled, now/past = live. Draft and
// schedule are mutually exclusive by construction — both are just reading
// and writing the same underlying `mode`, so checking one always replaces
// the other rather than needing separate "uncheck the other" logic.
function VisibilityField({
  mode,
  scheduleAt,
  onModeChange,
  onScheduleAtChange,
}: {
  mode: PublishMode;
  scheduleAt: string;
  onModeChange: (mode: PublishMode, scheduleAt?: string) => void;
  onScheduleAtChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <label className="flex items-center gap-2 font-sans text-sm">
        <input
          type="checkbox"
          checked={mode === "draft"}
          onChange={(e) => onModeChange(e.target.checked ? "draft" : "now")}
        />
        Save as draft (hidden from the site)
      </label>

      <ToggleRow
        label="Publish at a later date"
        checked={mode === "schedule"}
        onChange={(checked) => {
          // Turning the toggle on for the first time needs a starting
          // value right away — otherwise the pickers below would show
          // "now" while the actual saved value is still empty. Default to
          // this time tomorrow; the pickers make it easy to change from
          // there.
          if (checked && !scheduleAt) onModeChange("schedule", addToNow(1, "day"));
          else onModeChange(checked ? "schedule" : "now");
        }}
      />

      {mode === "schedule" && (
        <div className="flex gap-2">
          <DatePickerField value={scheduleAt} onChange={onScheduleAtChange} />
          <TimePickerField value={scheduleAt} onChange={onScheduleAtChange} />
        </div>
      )}
    </div>
  );
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

type DateParts = { y: number; m: number; d: number; hour: number; minute: number };

function parseValue(value: string): DateParts {
  const dt = value ? new Date(value) : new Date();
  return { y: dt.getFullYear(), m: dt.getMonth(), d: dt.getDate(), hour: dt.getHours(), minute: dt.getMinutes() };
}

function formatValue(p: DateParts): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.y}-${pad(p.m + 1)}-${pad(p.d)}T${pad(p.hour)}:${pad(p.minute)}`;
}

function formatTime12h(hour: number, minute: number): string {
  const h12 = ((hour + 11) % 12) + 1;
  const ampm = hour >= 12 ? "PM" : "AM";
  return `${String(h12).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${ampm}`;
}

// Simple on/off pill switch, styled with the site's own tokens rather than
// a generic blue — same visual language as everything else in the admin.
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

// A calendar-grid date picker in the site's own palette, standing in for
// the native datetime-local input — that one pops up the browser's own
// unstylable dark calendar widget, which clashed hard with the rest of
// the admin.
function DatePickerField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const parts = parseValue(value);
  const [open, setOpen] = useState(false);
  const [viewY, setViewY] = useState(parts.y);
  const [viewM, setViewM] = useState(parts.m);
  const rootRef = useRef<HTMLDivElement>(null);

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

  const daysInMonth = new Date(viewY, viewM + 1, 0).getDate();
  const firstWeekday = new Date(viewY, viewM, 1).getDay();
  const today = new Date();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function pick(day: number) {
    onChange(formatValue({ ...parts, y: viewY, m: viewM, d: day }));
    setOpen(false);
  }

  function shiftMonth(delta: number) {
    let y = viewY;
    let m = viewM + delta;
    if (m < 0) {
      m = 11;
      y -= 1;
    } else if (m > 11) {
      m = 0;
      y += 1;
    }
    setViewY(y);
    setViewM(m);
  }

  return (
    <div ref={rootRef} className="relative flex-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`${inputClass} flex w-full items-center justify-between gap-2`}
      >
        {String(parts.m + 1).padStart(2, "0")}/{String(parts.d).padStart(2, "0")}/{parts.y}
        <CalendarIcon />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 w-64 rounded-xl border border-line bg-paper-2 p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between font-sans text-sm font-semibold text-ink">
            <button type="button" onClick={() => shiftMonth(-1)} className="px-1 hover:text-oxblood">
              ‹
            </button>
            {MONTH_NAMES[viewM]} {viewY}
            <button type="button" onClick={() => shiftMonth(1)} className="px-1 hover:text-oxblood">
              ›
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center font-sans text-[11px] uppercase tracking-[0.04em] text-taupe">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (day === null) return <span key={`blank-${i}`} />;
              const isSelected = viewY === parts.y && viewM === parts.m && day === parts.d;
              const isToday =
                viewY === today.getFullYear() && viewM === today.getMonth() && day === today.getDate();
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => pick(day)}
                  className={`flex h-8 w-8 items-center justify-center rounded-full font-sans text-sm transition ${
                    isSelected
                      ? "bg-ink text-paper-2"
                      : isToday
                        ? "border border-ink text-ink"
                        : "text-ink-soft hover:bg-paper"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// A scrollable half-hour time list, same idea as the date picker above —
// themed to match rather than relying on the native time input's popup.
function TimePickerField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const parts = parseValue(value);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

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
    // Jump straight to the current selection instead of opening at
    // midnight every time.
    listRef.current?.querySelector('[data-selected="true"]')?.scrollIntoView({ block: "center" });
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const options = Array.from({ length: 48 }, (_, i) => ({
    hour: Math.floor((i * 30) / 60),
    minute: (i * 30) % 60,
  }));

  function pick(hour: number, minute: number) {
    onChange(formatValue({ ...parts, hour, minute }));
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative flex-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`${inputClass} flex w-full items-center justify-between gap-2`}
      >
        {formatTime12h(parts.hour, parts.minute)}
        <ClockIcon />
      </button>
      {open && (
        <div
          ref={listRef}
          className="absolute left-0 top-full z-20 mt-1 max-h-56 w-36 overflow-y-auto rounded-xl border border-line bg-paper-2 p-1 shadow-lg"
        >
          {options.map(({ hour, minute }) => {
            const selected = hour === parts.hour && minute === parts.minute;
            return (
              <button
                key={`${hour}-${minute}`}
                type="button"
                data-selected={selected}
                onClick={() => pick(hour, minute)}
                className={`block w-full rounded-md px-3 py-1.5 text-left font-sans text-sm ${
                  selected ? "bg-ink text-paper-2" : "text-ink-soft hover:bg-paper"
                }`}
              >
                {formatTime12h(hour, minute)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CalendarIcon() {
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
      className="shrink-0 text-ink-soft"
    >
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" />
    </svg>
  );
}

function ClockIcon() {
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
      className="shrink-0 text-ink-soft"
    >
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
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

// Quiet label next to a product's name in the list — nothing shows for a
// normally-live product, so this only draws attention when something is
// hidden or waiting.
function VisibilityBadge({ publishAt }: { publishAt: string | null }) {
  if (publishAt === null) {
    return (
      <span className="ml-1 font-sans text-[11px] uppercase tracking-[0.1em] text-taupe">
        (draft)
      </span>
    );
  }
  if (new Date(publishAt) > new Date()) {
    return (
      <span className="ml-1 font-sans text-[11px] uppercase tracking-[0.1em] text-oxblood-soft">
        (scheduled for{" "}
        {new Date(publishAt).toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        })}
        )
      </span>
    );
  }
  return null;
}

// Shown under a URL field when its current value doesn't look like a real
// web link — a typo/garbage catch, not a reachability check (see
// lib/url-check.ts). Never blocks saving, just flags it before you find out
// the hard way that a "Shop this" button goes nowhere.
function UrlWarning({ value }: { value: string }) {
  if (isLikelyValidUrl(value)) return null;
  return (
    <p className="mt-1 font-sans text-xs text-oxblood">
      ⚠ This doesn&apos;t look like a valid link — double-check it before saving.
    </p>
  );
}
