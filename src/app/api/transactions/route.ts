import { NextRequest, NextResponse } from "next/server";
import { fetchAllTransactions, resolveBnsName } from "@/lib/hiro-api";
import { transformTransactions } from "@/lib/transform";
import { fetchStackingRewardRows } from "@/lib/stacking-api";
import { isRateLimited, clientIp } from "@/lib/ratelimit";

const cache = new Map<string, { rows: unknown[]; total: number; ts: number }>();
const TTL_MS = 2 * 60 * 1000;

// A Stacks mainnet address is c32-encoded (alphabet excludes I, L, O, U) and
// starts with SP (standard) or SM (multisig). Validating here stops crafted
// values from being interpolated into the Hiro URL (path/parameter injection).
const STACKS_ADDRESS = /^S[PM][0-9ABCDEFGHJKMNPQRSTVWXYZ]{38,42}$/;
// BNS names: letters, digits, dot, hyphen, underscore.
const BNS_NAME = /^[a-z0-9][a-z0-9._-]{0,62}$/i;

export async function GET(req: NextRequest) {
  // Distributed rate limit (Upstash when configured, in-memory fallback otherwise).
  if (await isRateLimited(clientIp(req), { name: "tx", max: 30, windowSec: 60 })) {
    return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("address")?.trim() ?? "";

  if (!raw) return NextResponse.json({ error: "Missing address" }, { status: 400 });
  if (raw.length > 64) return NextResponse.json({ error: "Invalid address" }, { status: 400 });

  const looksLikeAddress = raw.startsWith("SP") || raw.startsWith("SM");

  // Validate up-front so nothing malformed reaches the Hiro URL.
  if (looksLikeAddress) {
    if (!STACKS_ADDRESS.test(raw)) {
      return NextResponse.json({ error: "Invalid Stacks address" }, { status: 400 });
    }
  } else if (!BNS_NAME.test(raw)) {
    return NextResponse.json({ error: "Invalid BNS name" }, { status: 400 });
  }

  // Resolve BNS name if needed.
  let address = raw;
  let resolvedFrom: string | undefined;

  if (!looksLikeAddress) {
    try {
      address = await resolveBnsName(raw);
      resolvedFrom = raw;
      if (!STACKS_ADDRESS.test(address)) {
        return NextResponse.json({ error: `Could not resolve BNS name: ${raw}` }, { status: 404 });
      }
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : `Could not resolve BNS name: ${raw}` },
        { status: 404 },
      );
    }
  }

  // Cache hit.
  const cached = cache.get(address);
  if (cached && Date.now() - cached.ts < TTL_MS) {
    return NextResponse.json({ address, resolvedFrom, rows: cached.rows, total: cached.total });
  }

  try {
    const [txResult, stackingRows] = await Promise.all([
      fetchAllTransactions(address),
      fetchStackingRewardRows(address),
    ]);

    const stxFtRows = await transformTransactions(txResult.transactions, address);
    const allRows = [...stxFtRows, ...stackingRows].sort((a, b) => (a.date > b.date ? -1 : 1));

    cache.set(address, { rows: allRows, total: txResult.total, ts: Date.now() });

    return NextResponse.json({ address, resolvedFrom, rows: allRows, total: txResult.total });
  } catch (err) {
    // Log details server-side; return a generic message to avoid leaking internals.
    console.error("API error:", err);
    return NextResponse.json({ error: "Failed to fetch transactions" }, { status: 500 });
  }
}
