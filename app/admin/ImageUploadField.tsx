"use client";

import { useRef, useState } from "react";
import { fetchJson } from "@/lib/fetch-json";
import type { UploadKind } from "@/lib/upload-server";
import ImageCropModal from "@/app/admin/ImageCropModal";

export default function ImageUploadField({
  value,
  onChange,
  kind,
  size = "compact",
  aspect = "2/3",
}: {
  value: string;
  onChange: (url: string) => void;
  kind: UploadKind;
  // "large" is the Pinterest-create-pin style: a big preview filling its
  // column with a small edit button over the corner, instead of a thumbnail
  // beside a "Choose photo" button.
  size?: "compact" | "large";
  // Only used by size="large" — matches whatever fixed frame the photo
  // actually gets cropped into on the public site (products: tall 2:3
  // pins; board covers: a shorter square), so the preview isn't lying
  // about the shape you'll end up with.
  aspect?: "2/3" | "1/1";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Holds the file between "picked from disk" and "cropped" — the large,
  // fixed-frame layout is exactly the situation where framing actually
  // matters, so that's the one that gets the move/zoom step before upload.
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  async function uploadFile(file: File | Blob, filename = "photo.jpg") {
    setUploading(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file, filename);
      body.append("kind", kind);
      const result = await fetchJson<{ url: string }>("/api/admin/upload", {
        method: "POST",
        body,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onChange(result.data.url);
    } finally {
      setUploading(false);
    }
  }

  function onFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (size === "large") {
      setPendingFile(file);
    } else {
      void uploadFile(file);
    }
  }

  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      accept="image/jpeg,image/png,image/webp,image/gif"
      onChange={onFileChosen}
      className="hidden"
    />
  );

  if (size === "large") {
    return (
      <div className="flex flex-col gap-2">
        <div
          className={`relative w-full overflow-hidden rounded-2xl bg-line ${
            aspect === "1/1" ? "aspect-square" : "aspect-[2/3]"
          }`}
        >
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element -- previewing a Supabase Storage URL.
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="flex h-full w-full flex-col items-center justify-center gap-2 text-ink-soft transition hover:text-oxblood disabled:opacity-50"
            >
              <span className="text-3xl leading-none">+</span>
              <span className="text-sm font-medium">
                {uploading ? "Uploading…" : "Choose photo"}
              </span>
            </button>
          )}
          {value && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              aria-label="Replace photo"
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-paper-2/95 text-ink shadow-md transition hover:text-oxblood disabled:opacity-50"
            >
              <PencilIcon />
            </button>
          )}
        </div>
        {fileInput}
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-taupe">JPEG, PNG, WebP, or GIF — up to 4MB.</p>
          {value && !uploading && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="shrink-0 text-xs font-medium text-ink-soft hover:text-oxblood"
            >
              Remove
            </button>
          )}
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}
        {pendingFile && (
          <ImageCropModal
            file={pendingFile}
            aspect={aspect}
            onCancel={() => setPendingFile(null)}
            onCropped={(blob) => {
              setPendingFile(null);
              void uploadFile(blob);
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-3">
        {value && (
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-line sm:h-24 sm:w-24">
            {/* eslint-disable-next-line @next/next/no-img-element -- previewing a Supabase Storage URL. */}
            <img src={value} alt="" className="h-full w-full object-cover" />
          </div>
        )}
        <div className="flex flex-1 flex-wrap gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-line bg-paper-2 px-4 text-[13px] font-medium transition hover:border-oxblood disabled:opacity-50"
          >
            {uploading ? "Uploading…" : value ? "Replace photo" : "Choose photo"}
          </button>
          {value && !uploading && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="inline-flex min-h-11 items-center px-2 text-[13px] font-medium text-ink-soft hover:text-oxblood"
            >
              Remove
            </button>
          )}
        </div>
      </div>
      {fileInput}
      <p className="text-xs text-taupe">JPEG, PNG, WebP, or GIF — up to 4MB.</p>
      {error && <p className="text-xs text-danger">{error}</p>}
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
