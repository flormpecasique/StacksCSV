/**
 * ratelimit.ts
 *
 * Distributed rate limiting for the API routes.
 *
 * If UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set (in Vercel env),
 * limits are enforced GLOBALLY across all serverless instances via Upstash Redis
 * — so an attacker can't bypass them by hitting many instances at once.
 *
 * If Upstash is NOT configured (local dev, or before you set it up), it falls
 * back to a per-instance in-memory limiter, so the app always works. If Upstash
 * is configured but momentarily errors, it also falls back — never blocking real
 * users because of a Redis hiccup.
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

/** Returns true if the request should be BLOCKED (over the limit). */
export async function isRateLimited(identifier: string, cfg: RateCfg): Promise<boolean> {
  const key = `${cfg.name}:${identifier}`;
  const rl = upstashFor(cfg);
  if (rl) {
    try {
      const { success } = await rl.limit(key);
      return !success;
    } catch {
      // Redis unavailable → fall back so the app stays protected AND functional.
      return memLimited(key, cfg.max, cfg.windowSec * 1000);
    }
  }
  return memLimited(key, cfg.max, cfg.windowSec * 1000);
}

/** Best-effort client IP from the standard proxy headers (Vercel sets these). */
export function clientIp(req: { headers: { get(name: string): string | null } }): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}
