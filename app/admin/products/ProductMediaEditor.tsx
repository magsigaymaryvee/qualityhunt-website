"use client";

import { useEffect, useRef, useState } from "react";
import type { ProductMedia } from "@/lib/types";
import { fetchJson } from "@/lib/fetch-json";
import { isLikelyValidUrl } from "@/lib/url-check";
import ConfirmButton from "@/app/admin/ConfirmButton";
import MediaCaptionField from "@/app/admin/MediaCaptionField";

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

// Manages the mixed photo/video carousel for one product — separate from
// the product's single cover photo and single "main" video field. Only
// usable once a product exists (media rows need a product_id), so this
// only ever renders inside the edit form, never the "new product" form.
export default function ProductMediaEditor({ productId }: { productId: string }) {
  const [media, setMedia] = useState<ProductMedia[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [linkValue, setLinkValue] = useState("");
  const [addingLink, setAddingLink] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    setError(null);
    const result = await fetchJson<{ media: ProductMedia[] }>(
      `/api/admin/products/${productId}/media`
    );
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setMedia(result.data.media);
  }

  useEffect(() => {
    // Fetch-on-mount: setState happens once the request resolves, not
    // synchronously within this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  async function addMediaRow(mediaType: "image" | "video", url: string) {
    return fetchJson(`/api/admin/products/${productId}/media`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ media_type: mediaType, url, caption: "" }),
    });
  }

  // Uploads and adds every selected file, one at a time (so a per-file
  // failure — e.g. one photo over the size cap — doesn't lose the rest of
  // the batch), then refreshes the list once at the end.
  async function onImagesChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;

    setError(null);
    setProgress({ done: 0, total: files.length });
    const failures: string[] = [];

    for (const file of files) {
      if (file.size > MAX_IMAGE_BYTES) {
        failures.push(`${file.name}: too large (over 4MB)`);
        setProgress((p) => (p ? { ...p, done: p.done + 1 } : p));
        continue;
      }
      try {
        const body = new FormData();
        body.append("file", file);
        body.append("kind", "product-image");
        const uploaded = await fetchJson<{ url: string }>("/api/admin/upload", {
          method: "POST",
          body,
        });
        if (!uploaded.ok) {
          failures.push(`${file.name}: ${uploaded.error}`);
        } else {
          const added = await addMediaRow("image", uploaded.data.url);
          if (!added.ok) failures.push(`${file.name}: ${added.error}`);
        }
      } catch {
        failures.push(`${file.name}: upload failed`);
      }
      setProgress((p) => (p ? { ...p, done: p.done + 1 } : p));
    }

    setProgress(null);
    if (failures.length > 0) setError(failures.join(" · "));
    await load();
  }

  async function onVideosChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;

    const allowedTypes = new Set(["video/mp4", "video/webm", "video/quicktime"]);
    setError(null);
    setProgress({ done: 0, total: files.length });
    const failures: string[] = [];

    for (const file of files) {
      if (!allowedTypes.has(file.type)) {
        failures.push(`${file.name}: must be MP4, WebM, or MOV`);
        setProgress((p) => (p ? { ...p, done: p.done + 1 } : p));
        continue;
      }
      if (file.size > MAX_VIDEO_BYTES) {
        failures.push(`${file.name}: too large (over 50MB)`);
        setProgress((p) => (p ? { ...p, done: p.done + 1 } : p));
        continue;
      }
      try {
        const ticket = await fetchJson<{ uploadUrl: string; publicUrl: string }>(
          "/api/admin/upload-video-url",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contentType: file.type, size: file.size }),
          }
        );
        if (!ticket.ok) {
          failures.push(`${file.name}: ${ticket.error}`);
        } else {
          const putRes = await fetch(ticket.data.uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": file.type },
            body: file,
          });
          if (!putRes.ok) {
            failures.push(`${file.name}: upload failed`);
          } else {
            const added = await addMediaRow("video", ticket.data.publicUrl);
            if (!added.ok) failures.push(`${file.name}: ${added.error}`);
          }
        }
      } catch {
        failures.push(`${file.name}: upload failed`);
      }
      setProgress((p) => (p ? { ...p, done: p.done + 1 } : p));
    }

    setProgress(null);
    if (failures.length > 0) setError(failures.join(" · "));
    await load();
  }

  // One link per line, so pasting several YouTube URLs at once adds them
  // all in one go instead of one-at-a-time.
  async function addLinks() {
    const links = linkValue
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (links.length === 0) return;

    const invalid = links.filter((l) => !isLikelyValidUrl(l));
    if (invalid.length > 0) {
      setError(
        `These don't look like valid links: ${invalid.join(", ")}. Fix or remove them and try again.`
      );
      return;
    }

    setAddingLink(true);
    setError(null);
    const failures: string[] = [];
    for (const link of links) {
      const added = await addMediaRow("video", link);
      if (!added.ok) failures.push(`${link}: ${added.error}`);
    }
    setAddingLink(false);
    if (failures.length > 0) setError(failures.join(" · "));
    setLinkValue("");
    await load();
  }

  async function saveField(id: string, field: "title" | "caption", value: string) {
    setError(null);
    const result = await fetchJson(`/api/admin/products/${productId}/media/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    if (!result.ok) setError(result.error);
  }

  async function move(index: number, direction: -1 | 1) {
    if (!media) return;
    const otherIndex = index + direction;
    if (otherIndex < 0 || otherIndex >= media.length) return;
    const a = media[index];
    const b = media[otherIndex];
    setError(null);
    const [r1, r2] = await Promise.all([
      fetchJson(`/api/admin/products/${productId}/media/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ position: b.position }),
      }),
      fetchJson(`/api/admin/products/${productId}/media/${b.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ position: a.position }),
      }),
    ]);
    if (!r1.ok) setError(r1.error);
    else if (!r2.ok) setError(r2.error);
    await load();
  }

  async function remove(id: string) {
    setError(null);
    const result = await fetchJson(`/api/admin/products/${productId}/media/${id}`, {
      method: "DELETE",
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    await load();
  }

  return (
    <div className="flex flex-col gap-3 rounded-sm border border-line bg-paper p-3">
      <p className="font-sans text-xs uppercase tracking-[0.14em] text-taupe">
        Photo &amp; video carousel
      </p>
      {error && <p className="font-sans text-xs text-oxblood">{error}</p>}
      {progress && (
        <p className="font-sans text-xs text-ink-soft">
          Uploading {progress.done} of {progress.total}…
        </p>
      )}

      {media === null ? (
        <p className="font-sans text-xs text-taupe">Loading…</p>
      ) : media.length === 0 ? (
        <p className="font-sans text-xs text-taupe">Nothing in the carousel yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {media.map((item, index) => (
            <li
              key={item.id}
              className="flex items-start gap-3 rounded-sm border border-line bg-paper-2 p-2"
            >
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-sm bg-line">
                {item.media_type === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element -- admin preview of an uploaded photo URL.
                  <img src={item.url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <>
                    <video
                      src={item.url}
                      muted
                      preload="metadata"
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/20 font-sans text-[10px] font-bold uppercase tracking-[0.08em] text-white">
                      Video
                    </span>
                  </>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <input
                  defaultValue={item.title}
                  onBlur={(e) => {
                    if (e.target.value !== item.title) saveField(item.id, "title", e.target.value);
                  }}
                  placeholder="Title (shown under the thumbnail)"
                  className="rounded-sm border border-line bg-paper px-2 py-1 font-sans text-xs outline-none focus:border-oxblood"
                />
                <MediaCaptionField
                  initialValue={item.caption}
                  onSave={(value) => saveField(item.id, "caption", value)}
                  placeholder="Description / styling tip (behind the More button)"
                  rows={2}
                  className="rounded-sm border border-line bg-paper px-2 py-1 font-sans text-xs outline-none focus:border-oxblood"
                />
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1 font-sans text-xs uppercase tracking-[0.08em]">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    className="hover:text-oxblood disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === media.length - 1}
                    className="hover:text-oxblood disabled:opacity-30"
                  >
                    ↓
                  </button>
                </div>
                <ConfirmButton
                  onConfirm={() => remove(item.id)}
                  label="Remove"
                  warning="Remove this item?"
                  triggerClassName="text-oxblood-soft hover:text-oxblood"
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-3 border-t border-line pt-3">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            disabled={progress !== null}
            className="flex flex-col items-center justify-center gap-1 rounded-sm border border-dashed border-line py-4 font-sans text-xs uppercase tracking-[0.08em] text-ink-soft transition hover:border-oxblood hover:text-oxblood disabled:opacity-50"
          >
            <span className="text-lg leading-none">+</span>
            Photos
          </button>
          <button
            type="button"
            onClick={() => videoInputRef.current?.click()}
            disabled={progress !== null}
            className="flex flex-col items-center justify-center gap-1 rounded-sm border border-dashed border-line py-4 font-sans text-xs uppercase tracking-[0.08em] text-ink-soft transition hover:border-oxblood hover:text-oxblood disabled:opacity-50"
          >
            <span className="text-lg leading-none">+</span>
            Upload video(s)
          </button>
        </div>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          onChange={onImagesChosen}
          className="hidden"
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          multiple
          onChange={onVideosChosen}
          className="hidden"
        />
        <p className="-mt-1 font-sans text-xs text-taupe">
          Select multiple files at once to add them all. Photos up to 4MB each, videos up to
          50MB each. Captions can be added afterward, per item, above.
        </p>

        <div className="flex flex-col gap-2">
          <label className="font-sans text-xs text-ink-soft">
            Or paste video link(s) — one per line (YouTube, Vimeo, or a direct file)
          </label>
          <textarea
            value={linkValue}
            onChange={(e) => setLinkValue(e.target.value)}
            placeholder={"https://youtube.com/watch?v=…\nhttps://vimeo.com/…"}
            rows={2}
            className="rounded-sm border border-line bg-paper px-2 py-1.5 font-sans text-xs outline-none focus:border-oxblood"
          />
          <button
            type="button"
            onClick={addLinks}
            disabled={addingLink || !linkValue.trim()}
            className="w-fit rounded-sm border border-ink px-3 py-1.5 font-sans text-xs uppercase tracking-[0.1em] transition hover:bg-ink hover:text-paper disabled:opacity-50"
          >
            {addingLink ? "Adding…" : "+ Add video link(s)"}
          </button>
        </div>
      </div>
    </div>
  );
}
