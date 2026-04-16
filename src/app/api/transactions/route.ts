/**
 * /api/transactions/route.ts
 * GET /api/transactions?address={stacksAddressOrBnsName}
 *
 * Accepts:
 *  - Stacks addresses: SP... or SM...
 *  - BNS names: flor.btc, Flor.BTC, my-wallet.btc (case-insensitive)
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchAllTransactions, resolveBnsName } from "@/lib/hiro-api";
import { transformTransactions } from "@/lib/transform";
import type { ApiSuccessResponse, ApiErrorResponse } from "@/types";

// Stacks principal address: SP or SM prefix + base58 chars
const STACKS_ADDRESS_REGEX = /^S[MP][A-Z0-9]{28,48}$/;

// BNS name: letters/numbers/hyphens/underscores + dot + TLD
// Matches: flor.btc | my-wallet.btc | name_123.stx
const BNS_NAME_REGEX = /^[a-zA-Z0-9_-]+\.[a-zA-Z]+$/;

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiSuccessResponse | ApiErrorResponse>> {
  const { searchParams } = request.nextUrl;
  const raw = searchParams.get("address")?.trim() ?? "";

  // ── Basic presence check ───────────────────────────────────────────────
  if (!raw) {
    return NextResponse.json(
      { error: "Missing 'address' query parameter." },
      { status: 400 }
    );
  }

  let address = raw;
  let resolvedFrom: string | undefined;

  // ── BNS resolution (if input looks like a name, not an address) ─────────
  if (BNS_NAME_REGEX.test(raw) && !STACKS_ADDRESS_REGEX.test(raw)) {
    try {
      address = await resolveBnsName(raw);
      resolvedFrom = raw.toLowerCase();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Could not resolve BNS name.";
      return NextResponse.json({ error: message }, { status: 404 });
    }
  }

  // ── Validate final resolved address ────────────────────────────────────
  if (!STACKS_ADDRESS_REGEX.test(address)) {
    return NextResponse.json(
      {
        error:
          "Invalid input. Enter a Stacks address (SP...) or a BNS name (e.g. flor.btc).",
      },
      { status: 400 }
    );
  }

  // ── Fetch + Transform ──────────────────────────────────────────────────
  try {
    const { transactions, total } = await fetchAllTransactions(address);
    const rows = transformTransactions(transactions, address);

    return NextResponse.json(
      {
        rows,
        total,
        fetched: rows.length,
        address,
        resolvedFrom,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unknown error occurred.";
    const status = message.includes("not found") ? 404 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
