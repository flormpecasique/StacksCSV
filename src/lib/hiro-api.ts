/**
 * hiro-api.ts
 *
 * All communication with Hiro Stacks API, routed through a single
 * authenticated fetch helper.
 *
 * API KEY (HIRO_API_KEY)
 * ----------------------
 * Hiro requires an API key for reliable server-side usage. Unauthenticated
 * requests from shared cloud IPs (Vercel, Netlify, etc.) are rate-limited
 * aggressively and often return 403 Forbidden.
 *
 * The key lives in process.env.HIRO_API_KEY (set in Vercel → Settings →
 * Environment Variables for Production, Preview, and Development).
 *
 * If the variable is missing, requests go out unauthenticated — fine for
 * local dev or forks, but production MUST set it to avoid 403s.
 */

import type {
  HiroTransactionWithTransfers,
  HiroTransactionsWithTransfersResponse,
  TokenMetadata,
} from "@/types";

const HIRO_BASE  = "https://api.hiro.so";
const PAGE_LIMIT = 50;

// ─── Authenticated fetch helper ──────────────────────────────────────────────

/**
 * Wraps `fetch` to inject the Hiro API key header on every request.
 * Exported so stacking-api.ts can use the same helper.
 *
 * Uses `x-api-key` — Hiro's canonical header name (also accepts
 * `x-hiro-api-key` for backwards compatibility, but x-api-key is preferred).
 */
export async function hiroFetch(url: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");

  // Only read the env var server-side. On the client, process.env is undefined
  // (this code runs server-side in /api/transactions/route.ts, but the guard
  // prevents errors if ever imported in a client component).
  const apiKey = typeof process !== "undefined" ? process.env.HIRO_API_KEY : undefined;
  if (apiKey) headers.set("x-api-key", apiKey);

  return fetch(url, { ...init, headers, cache: "no-store" });
}

// ─── Transaction cache ──────────────────────────────────────────────────────

interface TxCacheEntry {
  transactions: HiroTransactionWithTransfers[];
  total:        number;
  cachedAt:     number;
}

const txCache = new Map<string, TxCacheEntry>();
const TX_TTL  = 2 * 60 * 1000; // 2 minutes

function getCachedTxs(address: string): TxCacheEntry | null {
  const entry = txCache.get(address);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > TX_TTL) { txCache.delete(address); return null; }
  return entry;
}

// ─── Token metadata cache ───────────────────────────────────────────────────

const tokenCache = new Map<string, TokenMetadata>();

const KNOWN_TOKENS: Record<string, TokenMetadata> = {
  "SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR9.age000-governance-token::alex":
    { symbol: "ALEX", decimals: 8, name: "Alex Lab Token" },
  "SP3NE50GEXFG9SZGTT51P40X2CKYSZ5CC4ZTZ7A2G.welshcorgicoin-token::welshcorgicoin":
    { symbol: "WELSH", decimals: 6, name: "Welsh Corgi Coin" },
  "SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token::sbtc":
    { symbol: "sBTC", decimals: 8, name: "Stacks BTC" },
  "SP2C2YFP12AJZB4MABJBAJ55XECVS7E4PMMZ89YZR.usda-token::usda":
    { symbol: "USDA", decimals: 6, name: "USDA Stablecoin" },
  "SP3DX3H4FEYZJZ586MFBS25ZW3HZDMEW92260R2PR.Wrapped-Bitcoin::wrapped-bitcoin":
    { symbol: "xBTC", decimals: 8, name: "Wrapped Bitcoin" },
  "SP2C2YFP12AJZB4MABJBAJ55XECVS7E4PMMZ89YZR.arkadiko-token::diko":
    { symbol: "DIKO", decimals: 6, name: "Arkadiko Token" },
  "SP3Y2ZSH8P7D50B0VBTSX11S7XSG24M589N6BEPB7.usdc::usdc-token":
    { symbol: "USDC", decimals: 6, name: "USD Coin" },
  "SP2KAF9RF86PVX3NEE27DFV1CQX0T4WGR41X3S45C.bananacoin-token::bananas":
    { symbol: "BANANA", decimals: 6, name: "Banana Coin" },
  "SP32AEEF6WW5Y0NMJ1S8SBSZDAY8R5J32NBZFPKKZ.nope::NOT":
    { symbol: "NOT", decimals: 0, name: "Nothing" },
};

for (const [id, meta] of Object.entries(KNOWN_TOKENS)) {
  tokenCache.set(id, meta);
}

// ─── Fetch single page ──────────────────────────────────────────────────────

async function fetchPage(
  address: string,
  offset:  number
): Promise<HiroTransactionsWithTransfersResponse> {
  const url = `${HIRO_BASE}/extended/v1/address/${address}/transactions_with_transfers?limit=${PAGE_LIMIT}&offset=${offset}`;
  const res = await hiroFetch(url);

  if (res.status === 404) {
    throw new Error("Address not found or has no transactions on the Stacks network.");
  }
  if (!res.ok) {
    throw new Error(`Hiro API error: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<HiroTransactionsWithTransfersResponse>;
}

// ─── Fetch ALL transactions ─────────────────────────────────────────────────

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

// ─── Token metadata ─────────────────────────────────────────────────────────

export async function getTokenMetadata(assetId: string): Promise<TokenMetadata> {
  const cached = tokenCache.get(assetId);
  if (cached) return cached;

  try {
    const contractId = assetId.split("::")[0];
    const url = `${HIRO_BASE}/metadata/v1/ft/${encodeURIComponent(contractId)}`;
    const res = await hiroFetch(url);

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
  } catch { /* fall through */ }

  const suffix = assetId.split("::")[1] ?? assetId;
  const fallback: TokenMetadata = {
    symbol:   suffix.toUpperCase().slice(0, 10),
    decimals: 6,
    name:     suffix,
  };
  tokenCache.set(assetId, fallback);
  return fallback;
}

export async function prefetchTokenMetadata(assetIds: string[]): Promise<void> {
  const unique = [...new Set(assetIds)].filter(id => !tokenCache.has(id));
  const BATCH  = 10;
  for (let i = 0; i < unique.length; i += BATCH) {
    await Promise.all(unique.slice(i, i + BATCH).map(id => getTokenMetadata(id)));
  }
}

// ─── BNS Name Resolution ────────────────────────────────────────────────────

/**
 * Resolves a BNS name (e.g. "flor.btc") to a Stacks SP address.
 *
 * Uses the v1 BNS endpoint. With an API key this works reliably from
 * server-side environments like Vercel.
 */
export async function resolveBnsName(name: string): Promise<string> {
  const url = `${HIRO_BASE}/v1/names/${encodeURIComponent(name.toLowerCase())}`;
  const res = await hiroFetch(url);

  if (res.status === 404) {
    throw new Error(`BNS name "${name}" not found. Check the spelling and try again.`);
  }
  if (res.status === 403) {
    throw new Error(
      `Hiro API returned 403 Forbidden. ` +
      `Check that HIRO_API_KEY is set in your Vercel environment variables.`
    );
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
