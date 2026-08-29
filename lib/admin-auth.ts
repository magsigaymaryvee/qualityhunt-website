import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "@/lib/supabase-server";

// Single-tenant passcode gate for the admin (owner) area — see app/admin.
// Not a real multi-user auth system: there is exactly one owner, so a shared
// passcode plus a signed session cookie is enough. Nobody who doesn't know
// the passcode ever reaches the admin API routes.

const COOKIE_NAME = "qh_admin_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error("Admin is not configured. Set ADMIN_SESSION_SECRET in .env.local.");
  }
  return secret;
}

function getPasscode(): string {
  const passcode = process.env.ADMIN_PASSCODE;
  if (!passcode) {
    throw new Error("Admin is not configured. Set ADMIN_PASSCODE in .env.local.");
  }
  return passcode;
}

function sign(): string {
  return createHmac("sha256", getSecret()).update("admin-owner").digest("hex");
}

export function checkPasscode(candidate: string): boolean {
  const expected = getPasscode();
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  // Lengths usually differ for a wrong guess; timingSafeEqual requires equal
  // length buffers, so fall back to a plain (still fine — passcodes aren't
  // secret-length-sensitive) comparison in that case.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function createAdminSession() {
  const store = await cookies();
  store.set(COOKIE_NAME, sign(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearAdminSession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

// Generous enough that the real owner mistyping the passcode a couple of
// times never gets locked out, tight enough that automated guessing against
// the single shared passcode isn't practical.
const LOGIN_RATE_LIMIT_MAX_ATTEMPTS = 8;
const LOGIN_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

// Tracked in the database rather than in memory — a serverless function on
// Vercel can't rely on in-process state surviving between invocations, or
// even landing on the same instance twice in a row.
export async function isLoginRateLimited(ip: string): Promise<boolean> {
  try {
    const supabase = getSupabaseServerClient();
    const windowStart = new Date(Date.now() - LOGIN_RATE_LIMIT_WINDOW_MS).toISOString();
    const { count, error } = await supabase
      .from("admin_login_attempts")
      .select("id", { count: "exact", head: true })
      .eq("ip", ip)
      .gte("created_at", windowStart);

    if (error) {
      console.error("Login rate limit check failed:", error);
      return false; // Fail open — a broken rate-limit table shouldn't lock the owner out.
    }
    return (count ?? 0) >= LOGIN_RATE_LIMIT_MAX_ATTEMPTS;
  } catch (err) {
    console.error("Login rate limit check failed:", err);
    return false;
  }
}

export async function recordLoginAttempt(ip: string): Promise<void> {
  try {
    const supabase = getSupabaseServerClient();
    const { error } = await supabase.from("admin_login_attempts").insert({ ip });
    if (error) console.error("Failed to record login attempt:", error);
  } catch (err) {
    console.error("Failed to record login attempt:", err);
  }
}

export async function isAdminSession(): Promise<boolean> {
  const store = await cookies();
  const value = store.get(COOKIE_NAME)?.value;
  if (!value) return false;
  const expected = sign();
  const a = Buffer.from(value);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
