"use client";

import { useEffect, useRef, useState } from "react";
import type { ProductMedia } from "@/lib/types";
import CoverVideo from "@/app/components/CoverVideo";
import ShareButton from "@/app/components/ShareButton";
import FormattedText from "@/app/components/FormattedText";

// One fixed frame for every carousel item, photo or video. Letting photos
// keep 2:3 and videos keep 9:16 in the same row made the carousel look
// jagged — now everything crops (Instagram-style) into this same shape
// instead.
const TILE_ASPECT = "aspect-[2/3]";

export default function MediaCarousel({ media }: { media: ProductMedia[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  function scroll(direction: -1 | 1) {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * track.clientWidth * 0.85, behavior: "smooth" });
  }

  if (media.length === 0) return null;

  return (
    <div className="relative">
      <div
        ref={trackRef}
        className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-4 sm:mx-0 sm:gap-4 sm:px-0"
      >
        {media.map((item, index) => (
          <figure key={item.id} className="w-[74%] shrink-0 snap-start sm:w-[260px]">
            <div
              className={`w-full overflow-hidden rounded-xl bg-line sm:rounded-2xl ${TILE_ASPECT}`}
            >
              {item.media_type === "image" ? (
                <button
                  type="button"
                  onClick={() => setLightboxIndex(index)}
                  className="block h-full w-full"
                  aria-label={item.title ? `View larger: ${item.title}` : "View photo larger"}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- uploaded/pasted URLs, not a fixed next/image domain allowlist. */}
                  <img src={item.url} alt="" className="h-full w-full object-cover" />
                </button>
              ) : (
                <CoverVideo url={item.url} />
              )}
            </div>
            <MediaCaption title={item.title} onMore={() => setLightboxIndex(index)} />
          </figure>
        ))}
      </div>

      {media.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => scroll(-1)}
            aria-label="Previous"
            className="absolute left-1 top-[38%] hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-paper-2/95 text-ink shadow-md transition hover:text-oxblood sm:flex"
          >
            <ChevronIcon direction="left" />
          </button>
          <button
            type="button"
            onClick={() => scroll(1)}
            aria-label="Next"
            className="absolute right-1 top-[38%] hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-paper-2/95 text-ink shadow-md transition hover:text-oxblood sm:flex"
          >
            <ChevronIcon direction="right" />
          </button>
        </>
      )}

      {lightboxIndex !== null && (
        <Lightbox
          media={media}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </div>
  );
}

// Title sits under the picture, same as a normal photo caption. "More"
// doesn't expand anything in place — it opens the full detail card (title
// + description together), the same way tapping into a Pinterest pin does.
function MediaCaption({ title, onMore }: { title: string; onMore: () => void }) {
  return (
    <figcaption className="mt-2 flex flex-col items-start gap-0.5">
      {title && (
        <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-ink">{title}</p>
      )}
      <button
        type="button"
        onClick={onMore}
        className="text-[13px] font-semibold text-oxblood hover:underline"
      >
        More
      </button>
    </figcaption>
  );
}

function Lightbox({
  media,
  index,
  onClose,
  onNavigate,
}: {
  media: ProductMedia[];
  index: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}) {
  const item = media[index];

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && index > 0) onNavigate(index - 1);
      if (e.key === "ArrowRight" && index < media.length - 1) onNavigate(index + 1);
    }
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-paper-2 shadow-xl sm:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Media side — close button over it. */}
        <div className="relative shrink-0 bg-ink sm:w-[55%]">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute left-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-paper-2/90 text-ink transition hover:text-oxblood"
          >
            <CloseIcon />
          </button>
          {item.media_type === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element -- same pasted/uploaded URL as the carousel thumbnail, just shown larger.
            <img
              src={item.url}
              alt=""
              className="max-h-[45vh] w-full object-contain sm:max-h-[92vh] sm:w-full sm:object-cover"
            />
          ) : (
            <div className="h-[45vh] sm:h-full">
              <CoverVideo url={item.url} />
            </div>
          )}
          {media.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => onNavigate(index - 1)}
                disabled={index === 0}
                aria-label="Previous"
                className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-paper-2/90 text-ink transition hover:text-oxblood disabled:opacity-0"
              >
                <ChevronIcon direction="left" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate(index + 1)}
                disabled={index === media.length - 1}
                aria-label="Next"
                className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-paper-2/90 text-ink transition hover:text-oxblood disabled:opacity-0"
              >
                <ChevronIcon direction="right" />
              </button>
              <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-ink/60 px-2 py-0.5 text-xs text-paper-2">
                {index + 1} / {media.length}
              </span>
            </>
          )}
        </div>

        {/* Info side */}
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5 sm:p-6">
          <div className="flex items-center justify-end">
            <ShareButton title={item.title || "Photo"} image={item.url} />
          </div>
          {item.title && (
            <h2 className="font-serif text-xl leading-snug text-ink sm:text-2xl">{item.title}</h2>
          )}
          {item.caption && (
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-taupe">
                Description
              </p>
              <SeeMoreText text={item.caption} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Pinterest's own pin page truncates a long description behind a "See
// more" link rather than showing it all up front — same pattern here. The
// toggle is a separate element after the paragraph (not inline inside it),
// so line-clamp's ellipsis never clips it off mid-word the way it did when
// the button lived inside the clamped text.
function SeeMoreText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <p
        className={
          expanded
            ? "whitespace-pre-line text-sm leading-6 text-ink-soft"
            : "line-clamp-4 text-sm leading-6 text-ink-soft"
        }
      >
        <FormattedText text={text} />
      </p>
      {!expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-1 text-sm font-semibold text-ink hover:text-oxblood"
        >
          See more
        </button>
      )}
    </div>
  );
}

function ChevronIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={direction === "left" ? "M14.5 5.5 8 12l6.5 6.5" : "M9.5 5.5 16 12l-6.5 6.5"} />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}
