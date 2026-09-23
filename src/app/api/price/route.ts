import { NextRequest, NextResponse } from "next/server";
import { isRateLimited, clientIp } from "@/lib/ratelimit";

/**
 * /api/price — server-side CoinGecko proxy.
 *
 * The client sends coin ids + a UNIX-second range; we fetch one market_chart
 * range per id and return the daily price series. Running server-side avoids
 * browser CORS and rate limits, keeps any API key off the client, and lets us
 * cache across users.
 *
 * SECURITY:
 *  - ids validated against a strict charset + count cap, then encodeURIComponent'd;
 *    host is pinned. No SSRF.
 *  - Never receives or logs a wallet address — only coin ids + a date range.
 *  - Optional COINGECKO_API_KEY (a free "demo" key) is read from the server env
 *    and sent as a header; never exposed to the client.
 *  - Distributed rate limit shared across serverless instances (see lib/ratelimit).
 */

const CG_BASE = "https://api.coingecko.com/api/v3";
const ID_RE = /^[a-z0-9-]{1,64}$/;
const VS_RE = /^[a-z]{2,5}$/;
const MAX_IDS = 25;
const FETCH_TIMEOUT_MS = 12_000;

type Series = Array<[number, number]>;
const cache = new Map<string, { series: Series; ts: number }>();
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6h — historical prices don't change

export async function GET(req: NextRequest) {
  if (await isRateLimited(clientIp(req), { name: "price", max: 60, windowSec: 60 })) {
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
          prices[id] = []; // leave out; client marks its assets "to review"
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
