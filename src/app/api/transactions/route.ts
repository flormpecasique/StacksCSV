import { NextRequest, NextResponse } from "next/server";
import { fetchAllTransactions, resolveBnsName } from "@/lib/hiro-api";
import { transformTransactions } from "@/lib/transform";
import type { ApiSuccessResponse, ApiErrorResponse } from "@/types";

const STACKS_ADDRESS_REGEX = /^S[MP][A-Z0-9]{28,48}$/;
// Matches: flor.btc / Flor.BTC / my-name.btc
const BNS_NAME_REGEX = /^[a-zA-Z0-9_-]+\.[a-zA-Z]+$/;

export async function GET(
  request: NextRequest
): Promise<NextResponse<ApiSuccessResponse | ApiErrorResponse>> {
  const { searchParams } = request.nextUrl;
  const raw = searchParams.get("address")?.trim() ?? "";

  if (!raw) {
    return NextResponse.json(
      { error: "Missing 'address' query parameter." },
      { status: 400 }
    );
  }

  let address = raw;
  let resolvedFrom: string | undefined;

  // ── BNS resolution ──────────────────────────────────────────────────────
  if (BNS_NAME_REGEX.test(raw) && !STACKS_ADDRESS_REGEX.test(raw)) {
    try {
      address = await resolveBnsName(raw);
      resolvedFrom = raw; // keep original BNS name for the response
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Could not resolve BNS name.";
      return NextResponse.json({ error: message }, { status: 404 });
    }
  }

  // ── Validate final address ──────────────────────────────────────────────
  if (!STACKS_ADDRESS_REGEX.test(address)) {
    return NextResponse.json(
      {
        error:
          "Invalid input. Enter a Stacks address (SP...) or a BNS name (yourname.btc).",
      },
      { status: 400 }
    );
  }

  // ── Fetch + Transform ───────────────────────────────────────────────────
  try {
    const { transactions, total } = await fetchAllTransactions(address);
    const rows = transformTransactions(transactions, address);

    return NextResponse.json(
      { rows, total, fetched: rows.length, address, resolvedFrom },
      { status: 200 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error occurred.";
    const status = message.includes("not found") ? 404 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
