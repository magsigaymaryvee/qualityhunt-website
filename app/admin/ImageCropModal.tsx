"use client";

import { useEffect, useRef, useState } from "react";

const FRAME_WIDTH = 300;
// Output pixel size rendered onto the canvas — bigger than the on-screen
// frame so the saved photo still looks sharp, not just the CSS preview size.
const OUTPUT_WIDTH = 1000;

type Aspect = "1/1" | "2/3";

function frameHeight(aspect: Aspect): number {
  return aspect === "1/1" ? FRAME_WIDTH : FRAME_WIDTH * 1.5;
}

// Pinterest-style "move and scale to crop": the frame is a fixed size, the
// photo underneath it is what moves and zooms — so whatever's inside the
// frame when you hit Done is exactly what gets saved, not a guess made by
// object-cover's automatic centering.
export default function ImageCropModal({
  file,
  aspect,
  onCancel,
  onCropped,
}: {
  file: File;
  aspect: Aspect;
  onCancel: () => void;
  onCropped: (blob: Blob) => void;
}) {
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [minScale, setMinScale] = useState(1);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; startOffset: { x: number; y: number } } | null>(
    null
  );

  const fh = frameHeight(aspect);

  const [imgUrl, setImgUrl] = useState<string | null>(null);
  // The create and its matching revoke have to live in the same effect run.
  // A useMemo'd URL with the revoke in a separate effect looks equivalent,
  // but React's Strict Mode double-invokes effects in dev — mount, clean up,
  // mount again — and since the memo doesn't recreate the URL on that second
  // mount, the cleanup from the first pass revokes the only copy, so the
  // <img> ends up loading an already-revoked blob URL and silently fails.
  useEffect(() => {
    const url = URL.createObjectURL(file);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- see comment above: the setState has to be paired with the object URL it creates, not derived separately.
    setImgUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const img = e.currentTarget;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    // The smallest scale that still lets the photo cover the whole frame —
    // the same math object-fit: cover does, but here it's just the floor,
    // not the final word.
    const min = Math.max(FRAME_WIDTH / w, fh / h);
    setNatural({ w, h });
    setMinScale(min);
    setScale(min);
    setOffset({ x: (FRAME_WIDTH - w * min) / 2, y: (fh - h * min) / 2 });
  }

  function clamp(nextOffset: { x: number; y: number }, nextScale: number) {
    if (!natural) return nextOffset;
    const w = natural.w * nextScale;
    const h = natural.h * nextScale;
    const minX = FRAME_WIDTH - w;
    const minY = fh - h;
    return {
      x: Math.min(0, Math.max(minX, nextOffset.x)),
      y: Math.min(0, Math.max(minY, nextOffset.y)),
    };
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, startOffset: offset };
    setIsDragging(true);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setOffset(
      clamp(
        { x: dragRef.current.startOffset.x + dx, y: dragRef.current.startOffset.y + dy },
        scale
      )
    );
  }

  function onPointerUp() {
    dragRef.current = null;
    setIsDragging(false);
  }

  function onZoomChange(next: number) {
    // Zoom toward the frame's center, not the image's top-left corner —
    // otherwise every zoom step drags the photo back toward one edge.
    const cx = FRAME_WIDTH / 2;
    const cy = fh / 2;
    const ratio = next / scale;
    const nextOffset = {
      x: cx - (cx - offset.x) * ratio,
      y: cy - (cy - offset.y) * ratio,
    };
    setScale(next);
    setOffset(clamp(nextOffset, next));
  }

  function handleDone() {
    if (!natural || !imgUrl) return;
    const outputHeight = aspect === "1/1" ? OUTPUT_WIDTH : OUTPUT_WIDTH * 1.5;
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_WIDTH;
    canvas.height = outputHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const outputScale = OUTPUT_WIDTH / FRAME_WIDTH;
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(
        img,
        offset.x * outputScale,
        offset.y * outputScale,
        natural.w * scale * outputScale,
        natural.h * scale * outputScale
      );
      canvas.toBlob(
        (blob) => {
          if (blob) onCropped(blob);
        },
        "image/jpeg",
        0.92
      );
    };
    img.src = imgUrl;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-4"
      onClick={onCancel}
    >
      <div
        className="flex w-full max-w-sm flex-col gap-4 rounded-2xl bg-paper-2 p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg text-ink">Move and scale to crop</h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancel"
            className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition hover:bg-paper hover:text-oxblood"
          >
            ✕
          </button>
        </div>

        <div
          className="relative mx-auto touch-none select-none overflow-hidden rounded-xl bg-ink"
          style={{ width: FRAME_WIDTH, height: fh, cursor: isDragging ? "grabbing" : "grab" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          {imgUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- a local blob URL being positioned by hand, not a fixed remote source.
            <img
              src={imgUrl}
              alt=""
              draggable={false}
              onLoad={onImageLoad}
              className="pointer-events-none absolute left-0 top-0 max-w-none origin-top-left"
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
              }}
            />
          )}
        </div>

        <label className="flex items-center gap-3 font-sans text-xs text-ink-soft">
          Zoom
          <input
            type="range"
            min={minScale}
            max={minScale * 3}
            step={minScale / 100}
            value={scale}
            onChange={(e) => onZoomChange(Number(e.target.value))}
            className="flex-1 accent-oxblood"
          />
        </label>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="font-sans text-xs uppercase tracking-[0.1em] text-ink-soft hover:text-oxblood"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDone}
            disabled={!natural}
            className="rounded-full bg-oxblood px-6 py-2 font-sans text-sm font-semibold text-on-forest transition hover:opacity-90 disabled:opacity-50"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
