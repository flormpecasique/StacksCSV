/**
 * /api/transactions/route.ts
 * Next.js App Router API Route.
 *
 * GET /api/transactions?address={stacksAddress}
 *
 * Returns transformed CSV rows for a given Stacks wallet address.
 * Only STX transfer transactions (successful) are included.
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchAllTransactions } from "@/lib/hiro-api";
import { transformTransactions } from "@/lib/transform";
import type { ApiSuccessResponse, ApiErrorResponse } from "@/types";

// Stacks address regex: SP or SM prefix, followed by base58 chars, 30-50 chars total
const STACKS_ADDRESS_REGEX = /^S[MP][A-Z0-9]{28,48}$/;

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiSuccessResponse | ApiErrorResponse>> {
  const { searchParams } = request.nextUrl;
  const address = searchParams.get("address")?.trim() ?? "";

  // ── Validation ─────────────────────────────────────────────────────────
  if (!address) {
    return NextResponse.json(
      { error: "Missing 'address' query parameter." },
      { status: 400 }
    );
  }

  if (!STACKS_ADDRESS_REGEX.test(address)) {
    return NextResponse.json(
      {
        error:
          "Invalid Stacks address format. Must start with SP or SM and be 30–50 characters.",
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
        total,        // total raw transactions on-chain
        fetched: rows.length, // STX-transfer rows after filtering
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unknown error occurred.";

    // Network / API errors → 502; validation-like errors → 400
    const status = message.includes("not found") ? 404 : 502;

    return NextResponse.json({ error: message }, { status });
  }
}
