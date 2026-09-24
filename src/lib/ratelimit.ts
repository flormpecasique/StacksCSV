/**
 * ratelimit.ts
 *
 * Distributed rate limiting for the API routes, designed to be FAIL-OPEN:
 * rate limiting must never be able to take down the endpoint it protects.
 *
 * If UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set (in Vercel env),
 * limits are enforced GLOBALLY across all serverless instances via Upstash Redis.
 * If Upstash is not configured, is slow, hangs, or errors, we fall back to a
 * per-instance in-memory limiter (and never block the request on infra trouble).
 *
 * Secrets live only in environment variables, never in the repo.
 */
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export interface RateCfg {
  /** Bucket name, keeps each route's limit independent (e.g. "tx", "price"). */
  name: string;
  /** Max requests allowed within the window. */
  max: number;
  /** Window length in seconds. */
  windowSec: number;
}

// Hard cap on the Upstash round-trip so a slow/unreachable Redis can NEVER hang
// the request (which would time out the whole serverless function).
const UPSTASH_TIMEOUT_MS = 1500;

// ── In-memory fallback (best-effort, per serverless instance) ─────────────────
const memHits = new Map<string, { count: number; resetAt: number }>();
function memLimited(key: string, max: number, windowMs: number): boolean {
  if (memHits.size > 10_000) memHits.clear();
  const now = Date.now();
  const e = memHits.get(key);
  if (!e || now > e.resetAt) {
    memHits.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  e.count += 1;
  return e.count > max;
}

// ── Upstash (distributed), created lazily only when env vars exist ────────────
const instances = new Map<string, Ratelimit>();
function upstashFor(cfg: RateCfg): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const cached = instances.get(cfg.name);
  if (cached) return cached;
  try {
    const inst = new Ratelimit({
      redis: new Redis({ url, token }),
      limiter: Ratelimit.slidingWindow(cfg.max, `${cfg.windowSec} s` as `${number} s`),
      prefix: "stackscsv",
      analytics: false,
    });
    instances.set(cfg.name, inst);
    return inst;
  } catch {
    return null;
  }
}

/**
 * Race a limit() call against a timeout. On timeout we resolve as "allowed"
 * (success: true) so a hanging Redis call can never block the request.
 * Exported for testing.
 */
export async function raceLimit(
  limitCall: Promise<{ success: boolean }>,
  timeoutMs: number,
): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<{ success: boolean }>((resolve) => {
    timer = setTimeout(() => resolve({ success: true }), timeoutMs);
  });
  try {
    const res = await Promise.race([limitCall, timeout]);
    return !res.success;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Returns true if the request should be BLOCKED (over the limit). */
export async function isRateLimited(identifier: string, cfg: RateCfg): Promise<boolean> {
  const key = `${cfg.name}:${identifier}`;
  try {
    const rl = upstashFor(cfg);
    if (rl) {
      // rl.limit resolves { success, ... }; race it against the timeout.
      return await raceLimit(rl.limit(key), UPSTASH_TIMEOUT_MS);
    }
    return memLimited(key, cfg.max, cfg.windowSec * 1000);
  } catch {
    // Rate limiting must NEVER take down the endpoint → fall back on any error.
    return memLimited(key, cfg.max, cfg.windowSec * 1000);
  }
}

/** Best-effort client IP from the standard proxy headers (Vercel sets these). */
export function clientIp(req: { headers: { get(name: string): string | null } }): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}
