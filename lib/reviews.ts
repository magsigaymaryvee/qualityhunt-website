import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase-server";

// Generous enough for a genuine visitor leaving a review (and maybe
// resubmitting after fixing a typo), tight enough that a script can't flood
// a product with fake reviews.
const REVIEW_RATE_LIMIT_MAX_ATTEMPTS = 5;
const REVIEW_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

// Tracked in the database, not in memory — same reason as the admin login
// rate limit: a serverless function on Vercel can't rely on in-process state
// surviving between invocations.
export async function isReviewRateLimited(ip: string): Promise<boolean> {
  try {
    const supabase = getSupabaseServerClient();
    const windowStart = new Date(Date.now() - REVIEW_RATE_LIMIT_WINDOW_MS).toISOString();
    const { count, error } = await supabase
      .from("review_submission_attempts")
      .select("id", { count: "exact", head: true })
      .eq("ip", ip)
      .gte("created_at", windowStart);

    if (error) {
      console.error("Review rate limit check failed:", error);
      return false; // Fail open — a broken rate-limit table shouldn't block genuine reviews.
    }
    return (count ?? 0) >= REVIEW_RATE_LIMIT_MAX_ATTEMPTS;
  } catch (err) {
    console.error("Review rate limit check failed:", err);
    return false;
  }
}

export async function recordReviewAttempt(ip: string): Promise<void> {
  try {
    const supabase = getSupabaseServerClient();
    const { error } = await supabase.from("review_submission_attempts").insert({ ip });
    if (error) console.error("Failed to record review attempt:", error);
  } catch (err) {
    console.error("Failed to record review attempt:", err);
  }
}
