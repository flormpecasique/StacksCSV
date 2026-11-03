/**
 * hiro-api.ts
 *
 * All communication with Hiro Stacks API, routed through a single
 * authenticated fetch helper.
 *
 * BNS RESOLUTION
 * --------------
 * As of late 2026, Hiro DEPRECATED the REST BNS endpoints:
 *   - /v1/names/{name}            → 403 (dead)
 *   - /v2/bns/names/{name}        → 404 (dead)
 *   - /extended/v1/names/{name}   → 404 (dead)
 *
 * The only working method is calling the BNS Clarity contract directly
 * via POST to /v2/contracts/call-read/. This is actually MORE robust
 * than REST endpoints — the contract is on-chain and immutable, so it
 * will never disappear.
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
 */
export async function hiroFetch(url: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");

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
const TX_TTL  = 2 * 60 * 1000;

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

// ─── Fetch transactions ─────────────────────────────────────────────────────

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

// ─── BNS Name Resolution via Clarity Contract ────────────────────────────────
//
// Hiro deprecated all REST BNS endpoints. We call the on-chain contract
// SP000000000000000000002Q6VF78.bns directly via /v2/contracts/call-read/.
//
// This is more robust than REST — the contract lives on-chain and is immutable.

const BNS_CONTRACT_ADDR = "SP000000000000000000002Q6VF78";
const BNS_CONTRACT_NAME = "bns";
const BNS_FUNCTION      = "name-resolve";

// A caller address is required by call-read but doesn't affect results
const DUMMY_CALLER = "SP000000000000000000002Q6VF78";

/**
 * Encodes an ASCII string as a Clarity buffer argument in hex format.
 *
 * Clarity serialization for (buff):
 *   type byte (0x02) + 4-byte big-endian length + bytes
 *
 * Example: "btc" → "0x0200000003627463"
 *   0x02             → buffer type
 *   0x00000003       → length = 3
 *   0x627463         → ASCII "btc"
 */
function stringToClarityBuffHex(s: string): string {
  const bytes = new TextEncoder().encode(s);
  const len   = bytes.length;

  const lenHex = len.toString(16).padStart(8, "0");
  const dataHex = Array.from(bytes)
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");

  return "0x02" + lenHex + dataHex;
}

/**
 * Decodes a Clarity (ok (tuple ...)) response that contains a standard
 * principal, returning the "SP..."/"SM..." address as a string.
 *
 * The response shape from name-resolve is:
 *   (ok (tuple (owner principal) (zonefile-hash buff) ...))
 *
 * We walk the hex to find the principal bytes. A standard principal in
 * Clarity binary is:
 *   type byte 0x05 (standard principal)
 *   + 1 version byte
 *   + 20 hash160 bytes
 *
 * We then C32-encode those to produce the SP... address.
 */

// ─── C32 encoding (Stacks address format, Crockford base32) ──────────────────

const C32_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function sha256Sync(bytes: Uint8Array): Uint8Array {
  // Node crypto - always available in Next.js server runtime
  const { createHash } = require("crypto");
  return new Uint8Array(createHash("sha256").update(Buffer.from(bytes)).digest());
}

function c32checksum(versionByte: number, hash160: Uint8Array): Uint8Array {
  const data = new Uint8Array(1 + hash160.length);
  data[0] = versionByte;
  data.set(hash160, 1);
  const hash = sha256Sync(sha256Sync(data));
  return hash.slice(0, 4);
}

function c32encode(bytes: Uint8Array): string {
  // Convert bytes to 5-bit groups, big-endian
  let result = "";
  let carry = 0;
  let carryBits = 0;
  for (let i = bytes.length - 1; i >= 0; i--) {
    const current = (bytes[i] << carryBits) | carry;
    result = C32_ALPHABET[current & 0x1f] + result;
    carry = current >> 5;
    carryBits = carryBits + 8 - 5;
    if (carryBits >= 5) {
      result = C32_ALPHABET[carry & 0x1f] + result;
      carry = carry >> 5;
      carryBits -= 5;
    }
  }
  if (carryBits > 0) {
    result = C32_ALPHABET[carry & 0x1f] + result;
  }

  // Strip leading zero-chars (but preserve positions for leading zero BYTES)
  let numLeadingZeroBytes = 0;
  for (const b of bytes) {
    if (b === 0) numLeadingZeroBytes++;
    else break;
  }
  result = result.replace(/^0+/, "");
  for (let i = 0; i < numLeadingZeroBytes; i++) result = "0" + result;

  return result;
}

function c32address(versionByte: number, hash160: Uint8Array): string {
  const checksum = c32checksum(versionByte, hash160);
  const combined = new Uint8Array(hash160.length + checksum.length);
  combined.set(hash160, 0);
  combined.set(checksum, hash160.length);
  return "S" + C32_ALPHABET[versionByte] + c32encode(combined);
}

/**
 * Resolves a BNS name (e.g. "flor.btc") to a Stacks address.
 *
 * Calls the on-chain BNS contract via Hiro's /v2/contracts/call-read/
 * endpoint. Works regardless of REST endpoint deprecations because the
 * contract itself is immutable on the Stacks blockchain.
 */
export async function resolveBnsName(name: string): Promise<string> {
  // Split "flor.btc" into name="flor" and namespace="btc"
  const lower = name.toLowerCase().trim();
  const parts = lower.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error(`Invalid BNS name format: "${name}". Expected format: name.namespace (e.g. flor.btc)`);
  }
  const [bnsName, bnsNamespace] = parts;

  const url = `${HIRO_BASE}/v2/contracts/call-read/${BNS_CONTRACT_ADDR}/${BNS_CONTRACT_NAME}/${BNS_FUNCTION}`;
  const body = {
    sender: DUMMY_CALLER,
    arguments: [
      stringToClarityBuffHex(bnsNamespace),  // namespace first (btc)
      stringToClarityBuffHex(bnsName),       // then name (flor)
    ],
  };

  const res = await hiroFetch(url, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`BNS resolution failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();

  // Response: { okay: true, result: "0x<hex-encoded-clarity-value>" }
  if (!data.okay || !data.result) {
    throw new Error(`BNS name "${name}" not found or not registered.`);
  }

  const resultHex: string = data.result.startsWith("0x")
    ? data.result.slice(2)
    : data.result;

  // Parse the Clarity response to extract the principal (SP... address)
  const address = parseClarityPrincipalFromResponse(resultHex);
  if (!address) {
    throw new Error(`BNS name "${name}" exists but has no associated Stacks address.`);
  }

  return address;
}

/**
 * Walks a hex-encoded Clarity response looking for the first standard
 * principal (type byte 0x05) and decodes it to a Stacks address.
 *
 * Standard principal Clarity binary:
 *   0x05 (type tag)
 *   + 1 byte version
 *   + 20 bytes hash160
 */
function parseClarityPrincipalFromResponse(hex: string): string | null {
  const bytes = hexToBytes(hex);

  // Scan for the principal type marker (0x05) followed by 21 bytes
  for (let i = 0; i < bytes.length - 21; i++) {
    if (bytes[i] === 0x05) {
      const version = bytes[i + 1];
      // Valid mainnet version bytes: 22 (SP), 20 (SM)
      // Valid testnet version bytes: 26 (ST), 21 (SN)
      if (version === 22 || version === 20 || version === 26 || version === 21) {
        const hash160 = bytes.slice(i + 2, i + 22);
        if (hash160.length === 20) {
          return c32address(version, hash160);
        }
      }
    }
  }

  return null;
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.substr(i * 2, 2), 16);
  }
  return bytes;
}
