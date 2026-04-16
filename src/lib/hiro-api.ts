/**
 * hiro-api.ts
 * Handles all communication with the Stacks Hiro API.
 * Supports full pagination, in-memory cache, and BNS name resolution.
 */

import type { HiroTransaction, HiroTransactionsResponse } from "@/types";

const HIRO_BASE = "https://api.hiro.so";
const PAGE_LIMIT = 50;

// ─── In-memory cache ───────────────────────────────────────────────────────
interface CacheEntry {
  transactions: HiroTransaction[];
  total: number;
  cachedAt: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

function getCached(address: string): CacheEntry | null {
  const entry = cache.get(address);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
    cache.delete(address);
    return null;
  }
  return entry;
}

// ─── Fetch a single page ───────────────────────────────────────────────────
async function fetchPage(
  address: string,
  offset: number
): Promise<HiroTransactionsResponse> {
  const url = `${HIRO_BASE}/extended/v1/address/${address}/transactions?limit=${PAGE_LIMIT}&offset=${offset}`;

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (res.status === 404) {
    throw new Error("Address not found or has no transactions on the Stacks network.");
  }
  if (!res.ok) {
    throw new Error(`Hiro API error: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<HiroTransactionsResponse>;
}

// ─── Fetch ALL transactions with pagination ────────────────────────────────
/**
 * Fetches ALL transactions for a given Stacks address, handling pagination.
 * Results are cached in-memory for CACHE_TTL_MS.
 */
export async function fetchAllTransactions(
  address: string
): Promise<{ transactions: HiroTransaction[]; total: number }> {
  const cached = getCached(address);
  if (cached) {
    return { transactions: cached.transactions, total: cached.total };
  }

  const firstPage = await fetchPage(address, 0);
  const total = firstPage.total;
  const allTransactions: HiroTransaction[] = [...firstPage.results];

  if (total > PAGE_LIMIT) {
    const remainingOffsets: number[] = [];
    for (let offset = PAGE_LIMIT; offset < total; offset += PAGE_LIMIT) {
      remainingOffsets.push(offset);
    }

    // Fetch in batches of 5 to avoid rate-limiting
    const BATCH_SIZE = 5;
    for (let i = 0; i < remainingOffsets.length; i += BATCH_SIZE) {
      const batch = remainingOffsets.slice(i, i + BATCH_SIZE);
      const pages = await Promise.all(
        batch.map((offset) => fetchPage(address, offset))
      );
      pages.forEach((page) => allTransactions.push(...page.results));
    }
  }

  cache.set(address, {
    transactions: allTransactions,
    total,
    cachedAt: Date.now(),
  });

  return { transactions: allTransactions, total };
}

// ─── BNS Name Resolution ───────────────────────────────────────────────────
/**
 * Resolves a BNS name (e.g. "flor.btc") to a Stacks SP address.
 * Always lowercases the name before querying.
 * Throws if the name doesn't exist or has no associated address.
 */
export async function resolveBnsName(name: string): Promise<string> {
  const url = `${HIRO_BASE}/v1/names/${encodeURIComponent(name.toLowerCase())}`;

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (res.status === 404) {
    throw new Error(
      `BNS name "${name}" not found. Check the spelling and try again.`
    );
  }
  if (!res.ok) {
    throw new Error(
      `Could not resolve BNS name: ${res.status} ${res.statusText}`
    );
  }

  const data = await res.json();

  if (!data?.address) {
    throw new Error(
      `BNS name "${name}" exists but has no associated Stacks address.`
    );
  }

  return data.address as string;
}
