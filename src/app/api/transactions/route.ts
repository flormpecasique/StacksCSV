import { NextRequest, NextResponse } from "next/server";
import { fetchAllTransactions, resolveBnsName } from "@/lib/hiro-api";
import { transformTransactions } from "@/lib/transform";
import { fetchStackingRewardRows } from "@/lib/stacking-api";

// Simple in-memory cache (address → {rows, timestamp})
const cache = new Map<string, { rows: unknown[]; ts: number }>();
const TTL_MS = 2 * 60 * 1000; // 2 minutes

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("address")?.trim() ?? "";

  if (!raw) {
    return NextResponse.json({ error: "Missing address" }, { status: 400 });
  }

  // Resolve BNS name → STX address if needed
  let address = raw;
  if (!raw.startsWith("SP") && !raw.startsWith("SM")) {
    const resolved = await resolveBnsName(raw);
    if (!resolved) {
      return NextResponse.json(
        { error: `Could not resolve BNS name: ${raw}` },
        { status: 404 }
      );
    }
    address = resolved;
  }

  // Cache check
  const cached = cache.get(address);
  if (cached && Date.now() - cached.ts < TTL_MS) {
    return NextResponse.json({ address, rows: cached.rows });
  }

  try {
    // Fetch STX + FT transactions and stacking rewards in parallel
    const [rawTxs, stackingRows] = await Promise.all([
      fetchAllTransactions(address),
      fetchStackingRewardRows(address),
    ]);

    const stxFtRows = await transformTransactions(rawTxs, address);

    // Merge and sort all rows newest-first
    const allRows = [...stxFtRows, ...stackingRows].sort((a, b) =>
      a.date > b.date ? -1 : 1
    );

    cache.set(address, { rows: allRows, ts: Date.now() });

    return NextResponse.json({ address, rows: allRows });
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}
