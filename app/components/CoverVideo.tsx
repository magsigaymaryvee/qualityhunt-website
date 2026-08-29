"use client";

import { parseVideoUrl } from "@/lib/video-embed";

// Renders a video (direct file, YouTube, or Vimeo) so it always fills its
// container box exactly the way a cropped photo does — never stretched,
// never letterboxed. Direct files get object-cover, which browsers already
// crop correctly. Embeds (YouTube/Vimeo) don't reliably support
// object-fit across browsers, so this fakes the same "cover" crop instead:
// assume the embed's native 16:9 shape, fill the container's height, let
// the (wider) width overflow, and center it horizontally. That's the same
// math object-fit: cover would do here, since every video slot on this
// site (2:3 or 9:16) is narrower than 16:9.
export default function CoverVideo({ url }: { url: string }) {
  const video = parseVideoUrl(url);
  if (!video) return null;

  if (video.kind === "file") {
    return <video src={video.url} controls className="h-full w-full object-cover" />;
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      <iframe
        src={video.embedUrl}
        title="Video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        style={{ aspectRatio: "16 / 9" }}
        className="absolute left-1/2 top-1/2 h-full w-auto -translate-x-1/2 -translate-y-1/2"
      />
    </div>
  );
}
