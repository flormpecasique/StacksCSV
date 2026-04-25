/**
 * hiro-api.ts
 * Handles all communication with the Stacks Hiro API.
 *
 * Key upgrades vs v1:
 *  - Uses /transactions_with_transfers endpoint to capture FT (SIP-010) transfers
 *  - Fetches token metadata (symbol + decimals) for every unique FT contract
 *  - In-memory cache for both transactions and token metadata
 *  - BNS name resolution
 */

import type {
  HiroTransactionWithTransfers,
  HiroTransactionsWithTransfersResponse,
  TokenMetadata,
} from "@/types";

const HIRO_BASE  = "https://api.hiro.so";
const PAGE_LIMIT = 50;

// ─── Transaction cache ─────────────────────────────────────────────────────

interface TxCacheEntry {
  transactions: HiroTransactionWithTransfers[];
  total:        number;
  cachedAt:     number;
}

const txCache  = new Map<string, TxCacheEntry>();
const TX_TTL   = 2 * 60 * 1000; // 2 minutes

function getCachedTxs(address: string): TxCacheEntry | null {
  const entry = txCache.get(address);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > TX_TTL) { txCache.delete(address); return null; }
  return entry;
}

// ─── Token metadata cache ──────────────────────────────────────────────────
// Key: asset_identifier (e.g. "SP2XD...::alex")
// Cached forever for the session — token decimals/symbols never change.

const tokenCache = new Map<string, TokenMetadata>();

// Known common tokens — avoids a network round-trip for the most popular assets
const KNOWN_TOKENS: Record<string, TokenMetadata> = {
  // ALEX Lab
  "SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR9.age000-governance-token::alex":
    { symbol: "ALEX", decimals: 8, name: "Alex Lab Token" },
  // WELSH
  "SP3NE50GEXFG9SZGTT51P40X2CKYSZ5CC4ZTZ7A2G.welshcorgicoin-token::welshcorgicoin":
    { symbol: "WELSH", decimals: 6, name: "Welsh Corgi Coin" },
  // sBTC
  "SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token::sbtc":
    { symbol: "sBTC", decimals: 8, name: "Stacks BTC" },
  // USDA
  "SP2C2YFP12AJZB4MABJBAJ55XECVS7E4PMMZ89YZR.usda-token::usda":
    { symbol: "USDA", decimals: 6, name: "USDA Stablecoin" },
  // xBTC
  "SP3DX3H4FEYZJZ586MFBS25ZW3HZDMEW92260R2PR.Wrapped-Bitcoin::wrapped-bitcoin":
    { symbol: "xBTC", decimals: 8, name: "Wrapped Bitcoin" },
  // DIKO
  "SP2C2YFP12AJZB4MABJBAJ55XECVS7E4PMMZ89YZR.arkadiko-token::diko":
    { symbol: "DIKO", decimals: 6, name: "Arkadiko Token" },
  // USDC (Bridged)
  "SP3Y2ZSH8P7D50B0VBTSX11S7XSG24M589N6BEPB7.usdc::usdc-token":
    { symbol: "USDC", decimals: 6, name: "USD Coin" },
  // BANANA
  "SP2KAF9RF86PVX3NEE27DFV1CQX0T4WGR41X3S45C.bananacoin-token::bananas":
    { symbol: "BANANA", decimals: 6, name: "Banana Coin" },
  // NOT (Nothing)
  "SP32AEEF6WW5Y0NMJ1S8SBSZDAY8R5J32NBZFPKKZ.nope::NOT":
    { symbol: "NOT", decimals: 0, name: "Nothing" },
};

// Pre-fill cache with known tokens
for (const [id, meta] of Object.entries(KNOWN_TOKENS)) {
  tokenCache.set(id, meta);
}

// ─── Fetch single page of transactions with transfers ─────────────────────

async function fetchPage(
  address: string,
  offset:  number
): Promise<HiroTransactionsWithTransfersResponse> {
  const url = `${HIRO_BASE}/extended/v1/address/${address}/transactions_with_transfers?limit=${PAGE_LIMIT}&offset=${offset}`;

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    cache:   "no-store",
  });

  if (res.status === 404) {
    throw new Error("Address not found or has no transactions on the Stacks network.");
  }
  if (!res.ok) {
    throw new Error(`Hiro API error: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<HiroTransactionsWithTransfersResponse>;
}

// ─── Fetch ALL transactions (paginated) ───────────────────────────────────

/**
 * Returns ALL transactions_with_transfers for an address.
 * Results cached for TX_TTL ms.
 */
export async function fetchAllTransactions(
  address: string
): Promise<{ transactions: HiroTransactionWithTransfers[]; total: number }> {
  const cached = getCachedTxs(address);
  if (cached) return { transactions: cached.transactions, total: cached.total };

  const firstPage = await fetchPage(address, 0);
  const total     = firstPage.total;
  const all: HiroTransactionWithTransfers[] = [...firstPage.results];

  if (total > PAGE_LIMIT) {
    const offsets: number[] = [];
    for (let off = PAGE_LIMIT; off < total; off += PAGE_LIMIT) offsets.push(off);

    // Concurrent fetches in batches of 5
    const BATCH = 5;
    for (let i = 0; i < offsets.length; i += BATCH) {
      const pages = await Promise.all(
        offsets.slice(i, i + BATCH).map(off => fetchPage(address, off))
      );
      pages.forEach(p => all.push(...p.results));
    }
  }

  txCache.set(address, { transactions: all, total, cachedAt: Date.now() });
  return { transactions: all, total };
}

// ─── Token metadata ────────────────────────────────────────────────────────

/**
 * Returns symbol + decimals for a given FT asset_identifier.
 * Tries Hiro Token Metadata API; falls back to the asset_identifier itself.
 *
 * @param assetId  e.g. "SP2XD7...token-alex::alex"
 */
export async function getTokenMetadata(assetId: string): Promise<TokenMetadata> {
  const cached = tokenCache.get(assetId);
  if (cached) return cached;

  try {
    // Extract contract principal (everything before "::")
    const contractId = assetId.split("::")[0];

    // Hiro Token Metadata API
    const url = `${HIRO_BASE}/metadata/v1/ft/${encodeURIComponent(contractId)}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      cache:   "no-store",
    });

    if (res.ok) {
      const data = await res.json();
      const meta: TokenMetadata = {
        symbol:   data.symbol   ?? assetId.split("::")[1] ?? "TOKEN",
        decimals: data.decimals ?? 6,
        name:     data.name     ?? contractId,
      };
      tokenCache.set(assetId, meta);
      return meta;
    }
  } catch {
    // Network error — fall through to fallback
  }

  // Fallback: derive symbol from the asset_identifier suffix
  const suffix = assetId.split("::")[1] ?? assetId;
  const fallback: TokenMetadata = {
    symbol:   suffix.toUpperCase().slice(0, 10),
    decimals: 6,
    name:     suffix,
  };
  tokenCache.set(assetId, fallback);
  return fallback;
}

/**
 * Pre-fetches metadata for all unique FT assets in a batch.
 * Runs concurrently (max 10 at a time) to warm the cache before transform.
 */
export async function prefetchTokenMetadata(assetIds: string[]): Promise<void> {
  const unique = [...new Set(assetIds)].filter(id => !tokenCache.has(id));
  const BATCH  = 10;
  for (let i = 0; i < unique.length; i += BATCH) {
    await Promise.all(unique.slice(i, i + BATCH).map(id => getTokenMetadata(id)));
  }
}

// ─── BNS Name Resolution ───────────────────────────────────────────────────

/**
 * Resolves a BNS name (e.g. "flor.btc") to a Stacks SP address.
 */
export async function resolveBnsName(name: string): Promise<string> {
  const url = `${HIRO_BASE}/v1/names/${encodeURIComponent(name.toLowerCase())}`;
  const res = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });

  if (res.status === 404) {
    throw new Error(`BNS name "${name}" not found. Check the spelling and try again.`);
  }
  if (!res.ok) {
    throw new Error(`Could not resolve BNS name: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  if (!data?.address) {
    throw new Error(`BNS name "${name}" exists but has no associated Stacks address.`);
  }
  return data.address as string;
}
