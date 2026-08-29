import "server-only";

// getSupabaseServerClient() throws (rather than returning a Postgrest
// `error`) when env vars are missing — catch that at the route boundary so
// it comes back as JSON, not Next's HTML error page, which the admin UI's
// fetch helper can't parse.
export function configErrorResponse(err: unknown) {
  console.error("Unexpected server error:", err);
  return Response.json(
    { error: "Something went wrong on the server. Check the deploy logs." },
    { status: 500 }
  );
}
