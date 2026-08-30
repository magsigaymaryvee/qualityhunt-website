"use client";

import { useRef, useState } from "react";
import { fetchJson } from "@/lib/fetch-json";
import { isLikelyValidUrl } from "@/lib/url-check";
import ConfirmButton from "@/app/admin/ConfirmButton";
import MediaCaptionField from "@/app/admin/MediaCaptionField";
import ImageCropModal from "@/app/admin/ImageCropModal";

// Same fixed shape the carousel actually displays tiles in (see
// MediaCarousel's TILE_ASPECT) — cropping to anything else would just mean
// object-cover silently re-cropping it again on the public page.
const CAROUSEL_ASPECT = "2/3";

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

export type StagedMedia = {
  // Client-only id (the real product_media row doesn't exist yet) — just
  // needs to be stable for React keys and for finding/reordering items.
  localId: string;
  media_type: "image" | "video";
  url: string;
  title: string;
  caption: string;
};

// Same carousel UI as ProductMediaEditor, but for a product that doesn't
// exist yet — there's no product_id to attach media rows to. Files still
// upload to storage immediately (same as the cover photo field), but the
// resulting URLs are just held in local state and handed back to the
// parent via onChange. Once the product is actually created, the parent
// posts each staged item to the real /media endpoint.
export default function NewProductMediaEditor({
  items,
  onChange,
}: {
  items: StagedMedia[];
  onChange: (items: StagedMedia[]) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [linkValue, setLinkValue] = useState("");
  // Photos go through "move and scale to crop" one at a time before
  // uploading — same tool the cover photo uses. A stable id per queued file
  // (not just its index) so ImageCropModal fully remounts, and resets its
  // pan/zoom state, between photos instead of reusing one instance.
  // replaceId is set when re-cropping an already-staged photo (clicked its
  // thumbnail) rather than adding a brand new one.
  const [cropQueue, setCropQueue] = useState<
    { id: string; file: File; replaceId?: string }[]
  >([]);
  const [uploadingCrop, setUploadingCrop] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  function addItem(mediaType: "image" | "video", url: string) {
    onChange([
      ...items,
      { localId: crypto.randomUUID(), media_type: mediaType, url, title: "", caption: "" },
    ]);
  }

  function onImagesChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;

    setError(null);
    const failures: string[] = [];
    const accepted: { id: string; file: File }[] = [];
    for (const file of files) {
      if (file.size > MAX_IMAGE_BYTES) {
        failures.push(`${file.name}: too large (over 4MB)`);
        continue;
      }
      accepted.push({ id: crypto.randomUUID(), file });
    }
    if (failures.length > 0) setError(failures.join(" · "));
    // Queued rather than uploaded directly — each goes through "move and
    // scale to crop" first, one at a time.
    if (accepted.length > 0) setCropQueue((q) => [...q, ...accepted]);
  }

  // A photo you already staged, re-opened for a different crop — fetches
  // it back as a file (its "original" from the crop tool's point of view;
  // this project doesn't keep the pre-crop source around) and queues it
  // the same as a fresh upload, just tagged with which item to replace.
  async function startRecrop(item: StagedMedia) {
    setError(null);
    try {
      const res = await fetch(item.url);
      const blob = await res.blob();
      const file = new File([blob], "recrop.jpg", { type: blob.type || "image/jpeg" });
      setCropQueue((q) => [...q, { id: crypto.randomUUID(), file, replaceId: item.localId }]);
    } catch {
      setError("Couldn't load that photo to re-crop it. Try again.");
    }
  }

  async function uploadCroppedImage(blob: Blob, replaceId?: string) {
    setUploadingCrop(true);
    try {
      const body = new FormData();
      body.append("file", blob, "photo.jpg");
      body.append("kind", "product-image");
      const uploaded = await fetchJson<{ url: string }>("/api/admin/upload", {
        method: "POST",
        body,
      });
      if (!uploaded.ok) {
        setError((prev) => (prev ? `${prev} · ${uploaded.error}` : uploaded.error));
      } else if (replaceId) {
        onChange(
          items.map((i) => (i.localId === replaceId ? { ...i, url: uploaded.data.url } : i))
        );
      } else {
        addItem("image", uploaded.data.url);
      }
    } catch {
      setError((prev) => (prev ? `${prev} · upload failed` : "upload failed"));
    } finally {
      setUploadingCrop(false);
    }
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
            addItem("video", ticket.data.publicUrl);
          }
        }
      } catch {
        failures.push(`${file.name}: upload failed`);
      }
      setProgress((p) => (p ? { ...p, done: p.done + 1 } : p));
    }

    setProgress(null);
    if (failures.length > 0) setError(failures.join(" · "));
  }

  function addLinks() {
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

    setError(null);
    onChange([
      ...items,
      ...links.map((url) => ({
        localId: crypto.randomUUID(),
        media_type: "video" as const,
        url,
        title: "",
        caption: "",
      })),
    ]);
    setLinkValue("");
  }

  function setField(localId: string, field: "title" | "caption", value: string) {
    onChange(
      items.map((item) => (item.localId === localId ? { ...item, [field]: value } : item))
    );
  }

  function move(index: number, direction: -1 | 1) {
    const otherIndex = index + direction;
    if (otherIndex < 0 || otherIndex >= items.length) return;
    const next = [...items];
    [next[index], next[otherIndex]] = [next[otherIndex], next[index]];
    onChange(next);
  }

  function remove(localId: string) {
    onChange(items.filter((item) => item.localId !== localId));
  }

  return (
    <div className="flex flex-col gap-3 rounded-sm border border-line bg-paper p-3">
      <p className="font-sans text-xs uppercase tracking-[0.14em] text-taupe">
        Photo &amp; video carousel (optional)
      </p>
      {error && <p className="font-sans text-xs text-oxblood">{error}</p>}
      {progress && (
        <p className="font-sans text-xs text-ink-soft">
          Uploading {progress.done} of {progress.total}…
        </p>
      )}
      {uploadingCrop ? (
        <p className="font-sans text-xs text-ink-soft">Uploading…</p>
      ) : (
        cropQueue.length > 1 && (
          <p className="font-sans text-xs text-ink-soft">
            {cropQueue.length} photos to crop — one at a time.
          </p>
        )
      )}

      {items.length === 0 ? (
        <p className="font-sans text-xs text-taupe">Nothing added yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item, index) => (
            <li
              key={item.localId}
              className="flex items-start gap-3 rounded-sm border border-line bg-paper-2 p-2"
            >
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-sm bg-line">
                {item.media_type === "image" ? (
                  <button
                    type="button"
                    onClick={() => startRecrop(item)}
                    aria-label="Adjust crop"
                    title="Move and scale to crop"
                    className="group relative block h-full w-full"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- admin preview of an uploaded photo URL. */}
                    <img src={item.url} alt="" className="h-full w-full object-cover" />
                    <span className="absolute inset-0 flex items-center justify-center bg-ink/0 text-transparent transition group-hover:bg-ink/40 group-hover:text-paper">
                      <PencilIcon />
                    </span>
                  </button>
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
                    if (e.target.value !== item.title)
                      setField(item.localId, "title", e.target.value);
                  }}
                  placeholder="Title (shown under the thumbnail)"
                  className="rounded-sm border border-line bg-paper px-2 py-1 font-sans text-xs outline-none focus:border-oxblood"
                />
                <MediaCaptionField
                  initialValue={item.caption}
                  onSave={(value) => setField(item.localId, "caption", value)}
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
                    disabled={index === items.length - 1}
                    className="hover:text-oxblood disabled:opacity-30"
                  >
                    ↓
                  </button>
                </div>
                <ConfirmButton
                  onConfirm={() => remove(item.localId)}
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
            disabled={progress !== null || cropQueue.length > 0}
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
            disabled={!linkValue.trim()}
            className="w-fit rounded-sm border border-ink px-3 py-1.5 font-sans text-xs uppercase tracking-[0.1em] transition hover:bg-ink hover:text-paper disabled:opacity-50"
          >
            + Add video link(s)
          </button>
        </div>
      </div>

      {cropQueue.length > 0 && (
        <ImageCropModal
          key={cropQueue[0].id}
          file={cropQueue[0].file}
          aspect={CAROUSEL_ASPECT}
          onCancel={() => setCropQueue((q) => q.slice(1))}
          onCropped={async (blob) => {
            await uploadCroppedImage(blob, cropQueue[0].replaceId);
            setCropQueue((q) => q.slice(1));
          }}
        />
      )}
    </div>
  );
}

function PencilIcon() {
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
