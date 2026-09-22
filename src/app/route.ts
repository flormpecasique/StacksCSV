import { NextRequest, NextResponse } from "next/server";

/**
 * /api/price — server-side CoinGecko proxy.
 *
 * The client sends coin ids + a UNIX-second range; we fetch one market_chart
 * range per id (a handful of calls instead of one-per-day) and return the daily
 * price series. Running server-side avoids browser CORS and rate limits, keeps
 * any API key off the client, and lets us cache across users.
 *
 * SECURITY:
 *  - ids are validated against a strict charset and count cap, then
 *    encodeURIComponent'd; the host is pinned. No SSRF.
 *  - Never receives or logs a wallet address — only coin ids + a date range.
 *  - Optional COINGECKO_API_KEY (a free "demo" key) is read from the server env
 *    and sent as a header; it is never exposed to the client.
 */

const CG_BASE = "https://api.coingecko.com/api/v3";
const ID_RE = /^[a-z0-9-]{1,64}$/;
const VS_RE = /^[a-z]{2,5}$/;
const MAX_IDS = 25;
const FETCH_TIMEOUT_MS = 12_000;

type Series = Array<[number, number]>;
const cache = new Map<string, { series: Series; ts: number }>();
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6h — historical prices don't change

// Light per-IP rate limit (best-effort, per serverless instance).
const hits = new Map<string, { count: number; resetAt: number }>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const e = hits.get(ip);
  if (!e || now > e.resetAt) { hits.set(ip, { count: 1, resetAt: now + 60_000 }); return false; }
  e.count += 1;
  return e.count > 60;
}

export async function GET(req: NextRequest) {
  if (hits.size > 10_000) hits.clear();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const vs = (searchParams.get("vs") ?? "usd").toLowerCase();
  const from = Number(searchParams.get("from"));
  const to = Number(searchParams.get("to"));
  const ids = (searchParams.get("ids") ?? "").split(",").map((s) => s.trim()).filter(Boolean);

  // Validate everything before building any outbound URL.
  if (!VS_RE.test(vs)) return NextResponse.json({ error: "Invalid vs currency" }, { status: 400 });
  if (!Number.isInteger(from) || !Number.isInteger(to) || from <= 0 || to <= from) {
    return NextResponse.json({ error: "Invalid range" }, { status: 400 });
  }
  if (ids.length === 0 || ids.length > MAX_IDS || !ids.every((id) => ID_RE.test(id))) {
    return NextResponse.json({ error: "Invalid ids" }, { status: 400 });
  }

  const apiKey = process.env.COINGECKO_API_KEY;
  const prices: Record<string, Series> = {};

  await Promise.all(
    ids.map(async (id) => {
      const key = `${id}|${vs}|${from}|${to}`;
      const cached = cache.get(key);
      if (cached && Date.now() - cached.ts < CACHE_TTL) {
        prices[id] = cached.series;
        return;
      }
      const url =
        `${CG_BASE}/coins/${encodeURIComponent(id)}/market_chart/range` +
        `?vs_currency=${encodeURIComponent(vs)}&from=${from}&to=${to}`;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      try {
        const res = await fetch(url, {
          signal: controller.signal,
          headers: {
            accept: "application/json",
            ...(apiKey ? { "x-cg-demo-api-key": apiKey } : {}),
          },
        });
        if (!res.ok) {
          // Leave this id out; the client marks its assets as "to review".
          prices[id] = [];
          return;
        }
        const data = (await res.json()) as { prices?: Series };
        const series = Array.isArray(data.prices) ? data.prices : [];
        cache.set(key, { series, ts: Date.now() });
        prices[id] = series;
      } catch {
        prices[id] = [];
      } finally {
        clearTimeout(timer);
      }
    }),
  );

  return NextResponse.json({ prices });
}
