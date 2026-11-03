/**
 * TEMPORARY DEBUG ENDPOINT — delete after diagnosing the 403 issue.
 *
 * Deploy this as: src/app/api/debug-hiro/route.ts
 * Then visit:     https://stackscsv.vercel.app/api/debug-hiro
 *
 * It tells you:
 *   1. Whether HIRO_API_KEY is loaded in the serverless function
 *   2. What Hiro returns when we call it WITH the key
 *   3. What Hiro returns when we call it WITHOUT any key
 *
 * SECURITY: This endpoint masks the key (shows only length + first/last chars).
 * Delete it as soon as you've diagnosed the problem.
 */

import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.HIRO_API_KEY;

  // ─── 1. Check if the env var is loaded ────────────────────────────
  const keyStatus = {
    present:        !!apiKey,
    length:         apiKey?.length ?? 0,
    firstChars:     apiKey ? apiKey.slice(0, 4) : null,
    lastChars:      apiKey ? apiKey.slice(-4) : null,
    hasWhitespace:  apiKey ? /\s/.test(apiKey) : false,
    hasQuotes:      apiKey ? /["']/.test(apiKey) : false,
  };

  // ─── 2. Test the call WITH the API key ────────────────────────────
  let withKey: Record<string, unknown>;
  try {
    const res = await fetch("https://api.hiro.so/v1/names/flor.btc", {
      headers: apiKey
        ? { Accept: "application/json", "x-api-key": apiKey }
        : { Accept: "application/json" },
      cache: "no-store",
    });
    const body = await res.text();
    withKey = {
      status:     res.status,
      statusText: res.statusText,
      bodyPreview: body.slice(0, 300),
    };
  } catch (err) {
    withKey = { error: err instanceof Error ? err.message : String(err) };
  }

  // ─── 3. Test the call WITHOUT any key (baseline) ──────────────────
  let withoutKey: Record<string, unknown>;
  try {
    const res = await fetch("https://api.hiro.so/v1/names/flor.btc", {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const body = await res.text();
    withoutKey = {
      status:     res.status,
      statusText: res.statusText,
      bodyPreview: body.slice(0, 300),
    };
  } catch (err) {
    withoutKey = { error: err instanceof Error ? err.message : String(err) };
  }

  // ─── 4. Return everything as JSON ─────────────────────────────────
  return NextResponse.json({
    diagnosis: {
      keyStatus,
      withKey,
      withoutKey,
    },
    instructions: "Share this JSON output. Delete this endpoint after diagnosing.",
  });
}
