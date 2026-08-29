import { isAdminSession } from "@/lib/admin-auth";
import { createVideoUploadTicket, UploadError } from "@/lib/upload-server";
import { configErrorResponse } from "@/lib/api-error";

// Returns a short-lived signed URL the browser can PUT a video file to
// directly — see lib/upload-server.ts for why this doesn't accept the file
// itself.
export async function POST(request: Request) {
  if (!(await isAdminSession())) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { contentType, size } = (body ?? {}) as { contentType?: unknown; size?: unknown };
  if (typeof contentType !== "string" || !contentType) {
    return Response.json({ error: "contentType is required." }, { status: 400 });
  }
  if (typeof size !== "number" || !Number.isFinite(size) || size <= 0) {
    return Response.json({ error: "size must be a positive number." }, { status: 400 });
  }

  try {
    const ticket = await createVideoUploadTicket(contentType, size);
    return Response.json(ticket, { status: 201 });
  } catch (err) {
    if (err instanceof UploadError) {
      return Response.json({ error: err.message }, { status: 400 });
    }
    return configErrorResponse(err);
  }
}
