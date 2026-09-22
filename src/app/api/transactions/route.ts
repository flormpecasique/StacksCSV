import { NextRequest, NextResponse } from "next/server";
import { fetchAllTransactions, resolveBnsName } from "@/lib/hiro-api";
import { transformTransactions } from "@/lib/transform";
import { fetchStackingRewardRows } from "@/lib/stacking-api";

const cache = new Map<string, { rows: unknown[]; total: number; ts: number }>();
const TTL_MS = 2 * 60 * 1000;

// ─── Input validation ───────────────────────────────────────────────────────
// A Stacks mainnet address is c32-encoded (alphabet excludes I, L, O, U) and
// starts with SP (standard) or SM (multisig). Validating here stops crafted
// values like "SP1/../v1/names/x" or "SPx?limit=99999" from being interpolated
// into the Hiro URL (path/parameter injection).
const STACKS_ADDRESS = /^S[PM][0-9ABCDEFGHJKMNPQRSTVWXYZ]{38,42}$/;
// BNS names: letters, digits, dot, hyphen, underscore. Keeps junk out of the
// name-resolution URL even though resolveBnsName also encodes it.
const BNS_NAME = /^[a-z0-9][a-z0-9._-]{0,62}$/i;

// ─── Rate limiting (in-memory, best-effort) ─────────────────────────────────
// Zero-dependency per-IP limiter. On serverless this is per-instance, so it is
// best-effort rather than global; it still blunts abuse and accidental loops.
// For a hard global limit, move to Upstash Ratelimit + KV later.
const RATE_MAX = 30; // requests
const RATE_WINDOW_MS = 60 * 1000; // per minute
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_MAX;
}

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

export async function GET(req: NextRequest) {
  // Opportunistic cleanup so the maps don't grow unbounded.
  if (hits.size > 10_000) hits.clear();

  const ip = clientIp(req);
  if (rateLimited(ip)) {
    return NextResponse.json({ error: "Too many requests. Please slow down." }, { status: 429 });
  }

  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("address")?.trim() ?? "";

  if (!raw) {
    return NextResponse.json({ error: "Missing address" }, { status: 400 });
  }
  if (raw.length > 64) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }

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
      // The resolved value must itself be a valid address before we use it.
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
