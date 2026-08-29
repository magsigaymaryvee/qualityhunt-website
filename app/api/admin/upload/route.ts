import { isAdminSession } from "@/lib/admin-auth";
import { uploadImage, isUploadKind, UploadError } from "@/lib/upload-server";
import { configErrorResponse } from "@/lib/api-error";

export async function POST(request: Request) {
  if (!(await isAdminSession())) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Invalid form data." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "No file uploaded." }, { status: 400 });
  }

  const kind = formData.get("kind");
  if (!isUploadKind(kind)) {
    return Response.json({ error: "Invalid or missing upload kind." }, { status: 400 });
  }

  try {
    const url = await uploadImage(file, kind);
    return Response.json({ url }, { status: 201 });
  } catch (err) {
    if (err instanceof UploadError) {
      return Response.json({ error: err.message }, { status: 400 });
    }
    return configErrorResponse(err);
  }
}
