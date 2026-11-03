/**
 * TEMPORARY DEBUG ENDPOINT v2 — test which BNS endpoint actually works now.
 *
 * Deploy at: src/app/api/debug-hiro/route.ts (overwrite the previous one)
 * Then visit: https://stackscsv.vercel.app/api/debug-hiro
 *
 * Tests multiple endpoints in parallel so we see which ones still live.
 */

import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.HIRO_API_KEY;
  const headers: HeadersInit = apiKey
    ? { Accept: "application/json", "x-api-key": apiKey }
    : { Accept: "application/json" };

  // List of endpoints to probe. If one returns 200, that's our new URL.
  const endpoints = [
    // Legacy BNS v1 (likely dead)
    "https://api.hiro.so/v1/names/flor.btc",

    // BNS v2 via Stacks node RPC
    "https://api.hiro.so/v2/bns/names/flor.btc",

    // BNS lookup via extended API
    "https://api.hiro.so/extended/v1/address/flor.btc/stx",

    // Alternative: BNS names endpoint
    "https://api.hiro.so/extended/v1/names/flor.btc",

    // Stacks node direct
    "https://api.hiro.so/v2/contracts/call-read/SP000000000000000000002Q6VF78/bns/name-resolve",

    // Sanity check: confirm root API responds
    "https://api.hiro.so/extended",
  ];

  const results: Record<string, unknown> = {};

  await Promise.all(
    endpoints.map(async (url) => {
      try {
        const res = await fetch(url, { headers, cache: "no-store" });
        const body = await res.text();
        results[url] = {
          status:     res.status,
          statusText: res.statusText,
          bodyPreview: body.slice(0, 200),
        };
      } catch (err) {
        results[url] = { error: err instanceof Error ? err.message : String(err) };
      }
    })
  );

  return NextResponse.json({
    keyPresent: !!apiKey,
    keyLength:  apiKey?.length ?? 0,
    results,
  });
}
