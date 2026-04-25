import { NextRequest, NextResponse } from "next/server";
import { fetchAllTransactions, resolveBnsName } from "@/lib/hiro-api";
import { transformTransactions } from "@/lib/transform";
import { fetchStackingRewardRows } from "@/lib/stacking-api";

const cache  = new Map<string, { rows: unknown[]; total: number; ts: number }>();
const TTL_MS = 2 * 60 * 1000;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("address")?.trim() ?? "";

  if (!raw) {
    return NextResponse.json({ error: "Missing address" }, { status: 400 });
  }

  // Resolve BNS name if needed
  let address      = raw;
  let resolvedFrom: string | undefined;

  if (!raw.startsWith("SP") && !raw.startsWith("SM")) {
    try {
      address      = await resolveBnsName(raw);
      resolvedFrom = raw;
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : `Could not resolve BNS name: ${raw}` },
        { status: 404 }
      );
    }
  }

  // Cache hit
  const cached = cache.get(address);
  if (cached && Date.now() - cached.ts < TTL_MS) {
    return NextResponse.json({ address, resolvedFrom, rows: cached.rows, total: cached.total });
  }

  try {
    // Fetch STX/FT transactions and stacking rewards in parallel
    const [txResult, stackingRows] = await Promise.all([
      fetchAllTransactions(address),
      fetchStackingRewardRows(address),
    ]);

    // fetchAllTransactions returns { transactions, total }
    const stxFtRows = await transformTransactions(txResult.transactions, address);

    // Merge and sort newest-first
    const allRows = [...stxFtRows, ...stackingRows].sort((a, b) =>
      a.date > b.date ? -1 : 1
    );

    cache.set(address, { rows: allRows, total: txResult.total, ts: Date.now() });

    return NextResponse.json({
      address,
      resolvedFrom,
      rows:  allRows,
      total: txResult.total,
    });
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}
