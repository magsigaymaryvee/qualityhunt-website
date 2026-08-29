import "server-only";
import { randomUUID } from "crypto";

// The set of buckets this app uploads to, and the migration that creates
// each one — kept as a closed allowlist so a request can never write to an
// arbitrary bucket name.
const BUCKETS = {
  "board-cover": { bucket: "board-covers", migration: "0002_board_covers_bucket.sql" },
  "product-image": { bucket: "product-images", migration: "0003_product_images_bucket.sql" },
} as const;

export type UploadKind = keyof typeof BUCKETS;

export function isUploadKind(value: unknown): value is UploadKind {
  return typeof value === "string" && Object.hasOwn(BUCKETS, value);
}

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_BYTES = 4 * 1024 * 1024; // 4MB — stays under Vercel's default request body limit.

export class UploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadError";
  }
}

function extensionFor(type: string): string {
  switch (type) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "bin";
  }
}

// Uploads an image file to the given kind's Supabase Storage bucket using
// the storage REST API directly (same reasoning as lib/supabase-server.ts —
// no need to pull in the full supabase-js client for one PUT request).
// Returns the public URL to store on the board/product row.
export async function uploadImage(file: File, kind: UploadKind): Promise<string> {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new UploadError("Please upload a JPEG, PNG, WebP, or GIF image.");
  }
  if (file.size > MAX_BYTES) {
    throw new UploadError("Image is too large — please keep it under 4MB.");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new UploadError(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local."
    );
  }

  const { bucket, migration } = BUCKETS[kind];
  const path = `${randomUUID()}.${extensionFor(file.type)}`;
  const bytes = await file.arrayBuffer();

  const res = await fetch(`${url}/storage/v1/object/${bucket}/${path}`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": file.type,
    },
    body: bytes,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("Supabase Storage upload failed:", res.status, detail);
    throw new UploadError(
      res.status === 404
        ? `The "${bucket}" storage bucket doesn't exist yet — run supabase/migrations/${migration}.`
        : "Upload failed. Try again."
    );
  }

  return `${url}/storage/v1/object/public/${bucket}/${path}`;
}

const VIDEO_BUCKET = "product-videos";
const VIDEO_MIGRATION = "0007_product_media.sql";
const ALLOWED_VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50MB — enforced again at the Supabase bucket level.

function videoExtensionFor(type: string): string {
  switch (type) {
    case "video/mp4":
      return "mp4";
    case "video/webm":
      return "webm";
    case "video/quicktime":
      return "mov";
    default:
      return "bin";
  }
}

// Videos are too big to proxy through our own server (Vercel's serverless
// functions cap request bodies around 4.5MB) — so instead of receiving the
// file, this mints a short-lived signed upload URL that lets the *browser*
// PUT the file straight to Supabase Storage. The URL is scoped to one
// specific bucket/path and expires in ~2 hours; it carries its own
// authorization (as a query token), so the browser never needs — and is
// never given — the service role key.
export async function createVideoUploadTicket(
  contentType: string,
  size: number
): Promise<{ uploadUrl: string; publicUrl: string }> {
  if (!ALLOWED_VIDEO_TYPES.has(contentType)) {
    throw new UploadError("Please upload an MP4, WebM, or MOV video.");
  }
  if (size > MAX_VIDEO_BYTES) {
    throw new UploadError("Video is too large — please keep it under 50MB.");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new UploadError(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local."
    );
  }

  const path = `${randomUUID()}.${videoExtensionFor(contentType)}`;

  const res = await fetch(`${url}/storage/v1/object/upload/sign/${VIDEO_BUCKET}/${path}`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("Supabase signed video upload URL failed:", res.status, detail);
    throw new UploadError(
      res.status === 404
        ? `The "${VIDEO_BUCKET}" storage bucket doesn't exist yet — run supabase/migrations/${VIDEO_MIGRATION}.`
        : "Couldn't start the upload. Try again."
    );
  }

  const { url: signPath } = (await res.json()) as { url: string };
  return {
    uploadUrl: `${url}/storage/v1${signPath}`,
    publicUrl: `${url}/storage/v1/object/public/${VIDEO_BUCKET}/${path}`,
  };
}
