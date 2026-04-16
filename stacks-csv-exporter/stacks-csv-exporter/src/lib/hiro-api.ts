/**
 * hiro-api.ts
 * Handles all communication with the Stacks Hiro API.
 * Supports full pagination to retrieve ALL transactions.
 */

import type { HiroTransaction, HiroTransactionsResponse } from "@/types";

const HIRO_BASE = "https://api.hiro.so";
const PAGE_LIMIT = 50; // max per Hiro API page

// ─── Simple in-memory cache ────────────────────────────────────────────────
// Key: address  |  Value: { data, cachedAt (ms) }
// Cache TTL: 2 minutes — keeps repeated exports snappy without serving stale data.

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

// ─── Core fetcher ──────────────────────────────────────────────────────────

/**
 * Fetches a single page from the Hiro transactions endpoint.
 */
async function fetchPage(
  address: string,
  offset: number
): Promise<HiroTransactionsResponse> {
  const url = `${HIRO_BASE}/extended/v1/address/${address}/transactions?limit=${PAGE_LIMIT}&offset=${offset}`;

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    // Next.js server-side fetch — no caching at the fetch level (we handle it ourselves)
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

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Fetches ALL transactions for a given Stacks address, handling pagination.
 * Results are cached in-memory for CACHE_TTL_MS.
 *
 * @param address  A valid Stacks principal address (SP... or SM...)
 * @returns        Array of raw HiroTransaction objects + total count
 */
export async function fetchAllTransactions(
  address: string
): Promise<{ transactions: HiroTransaction[]; total: number }> {
  // Check cache first
  const cached = getCached(address);
  if (cached) {
    return { transactions: cached.transactions, total: cached.total };
  }

  // Fetch first page to learn the total count
  const firstPage = await fetchPage(address, 0);
  const total = firstPage.total;
  const allTransactions: HiroTransaction[] = [...firstPage.results];

  // If there are more pages, fetch them concurrently in batches of 5
  if (total > PAGE_LIMIT) {
    const remainingOffsets: number[] = [];
    for (let offset = PAGE_LIMIT; offset < total; offset += PAGE_LIMIT) {
      remainingOffsets.push(offset);
    }

    // Batch concurrent fetches (5 at a time) to avoid rate-limiting
    const BATCH_SIZE = 5;
    for (let i = 0; i < remainingOffsets.length; i += BATCH_SIZE) {
      const batch = remainingOffsets.slice(i, i + BATCH_SIZE);
      const pages = await Promise.all(
        batch.map((offset) => fetchPage(address, offset))
      );
      pages.forEach((page) => allTransactions.push(...page.results));
    }
  }

  // Store in cache
  cache.set(address, {
    transactions: allTransactions,
    total,
    cachedAt: Date.now(),
  });

  return { transactions: allTransactions, total };
}
