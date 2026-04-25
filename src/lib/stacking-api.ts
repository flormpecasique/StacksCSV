/**
 * stacking-api.ts
 *
 * Fetches and transforms Proof-of-Transfer (PoX) stacking rewards
 * for a Stacks wallet address.
 *
 * FLOW:
 *   1. Get the user's PoX BTC reward address via the stacking API
 *   2. Fetch all BTC reward payments to that address (burnchain rewards)
 *   3. Resolve ISO timestamps from Bitcoin block heights
 *   4. Return as CsvRow[] ready for tax export
 *
 * TAX TREATMENT:
 *   Stacking rewards = BTC income received
 *   Each reward cycle payment = one row in the CSV
 *   Amount in BTC (satoshis ÷ 100_000_000)
 */

import { createHash } from "crypto";
import type { CsvRow } from "@/types";

const HIRO_BASE = "https://api.hiro.so";

// ─── Bitcoin address encoding ─────────────────────────────────────────────────
//
// The Hiro API returns PoX addresses as raw bytes:
//   { version: "0x00", hashbytes: "0xdeadbeef..." }
//
// We convert these to human-readable Bitcoin address strings.
// The version byte maps to Bitcoin address types:
//   0x00 → P2PKH   (base58check, starts with "1")
//   0x01 → P2SH    (base58check, starts with "3")
//   0x04 → P2WPKH  (bech32, starts with "bc1q", 20-byte program)
//   0x06 → P2WSH   (bech32, starts with "bc1q", 32-byte program)
//   0x07 → P2TR    (bech32m, starts with "bc1p", taproot)

const B58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const BECH32_CHARS = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
const BECH32_GEN   = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];

function sha256(buf: Buffer): Buffer {
  return createHash("sha256").update(buf).digest();
}

function base58Encode(buf: Buffer): string {
  let n = BigInt("0x" + (buf.length ? buf.toString("hex") : "00"));
  let s = "";
  while (n > 0n) { s = B58_ALPHABET[Number(n % 58n)] + s; n /= 58n; }
  for (let i = 0; i < buf.length && buf[i] === 0; i++) s = "1" + s;
  return s;
}

function base58Check(payload: Buffer): string {
  const checksum = sha256(sha256(payload)).slice(0, 4);
  return base58Encode(Buffer.concat([payload, checksum]));
}

// Bech32/bech32m encoder ──────────────────────────────────────────────────────

function b32Polymod(values: number[]): number {
  let c = 1;
  for (const v of values) {
    const b = c >> 25;
    c = ((c & 0x1ffffff) << 5) ^ v;
    for (let i = 0; i < 5; i++) if ((b >> i) & 1) c ^= BECH32_GEN[i];
  }
  return c;
}

function b32Expand(hrp: string): number[] {
  const r = [];
  for (const c of hrp) r.push(c.charCodeAt(0) >> 5);
  r.push(0);
  for (const c of hrp) r.push(c.charCodeAt(0) & 31);
  return r;
}

function b32Checksum(hrp: string, data: number[], bech32m: boolean): number[] {
  const poly = b32Polymod([...b32Expand(hrp), ...data, 0, 0, 0, 0, 0, 0])
    ^ (bech32m ? 0x2bc830a3 : 1);
  return Array.from({ length: 6 }, (_, p) => (poly >> (5 * (5 - p))) & 31);
}

function to5Bits(prog: Buffer): number[] {
  let acc = 0, bits = 0;
  const out: number[] = [];
  for (const b of prog) {
    acc = (acc << 8) | b;
    bits += 8;
    while (bits >= 5) { bits -= 5; out.push((acc >> bits) & 31); }
  }
  if (bits) out.push((acc << (5 - bits)) & 31);
  return out;
}

function bech32Address(witnessVersion: number, witnessProgram: Buffer): string {
  const data    = [witnessVersion, ...to5Bits(witnessProgram)];
  const bech32m = witnessVersion > 0;
  return "bc1" + [...data, ...b32Checksum("bc", data, bech32m)]
    .map(d => BECH32_CHARS[d])
    .join("");
}

/**
 * Converts a Stacks PoX address object to a Bitcoin address string.
 * Returns null for unknown version bytes.
 */
export function poxToBitcoinAddress(version: string, hashbytes: string): string | null {
  try {
    const ver  = parseInt(version.replace("0x", ""), 16);
    const hash = Buffer.from(hashbytes.replace("0x", ""), "hex");

    switch (ver) {
      case 0x00: return base58Check(Buffer.concat([Buffer.from([0x00]), hash])); // P2PKH
      case 0x01: return base58Check(Buffer.concat([Buffer.from([0x05]), hash])); // P2SH
      case 0x04: return bech32Address(0, hash);   // P2WPKH  (20 bytes)
      case 0x05: return base58Check(Buffer.concat([Buffer.from([0x05]), hash])); // P2WPKH-P2SH
      case 0x06: return bech32Address(0, hash);   // P2WSH   (32 bytes)
      case 0x07: return bech32Address(1, hash);   // P2TR    taproot
      default:   return null;
    }
  } catch { return null; }
}

// ─── Stacking address lookup ──────────────────────────────────────────────────

interface PoXAddressObj {
  version:   string;
  hashbytes: string;
}

/**
 * Returns the set of Bitcoin PoX reward addresses registered for a Stacks address.
 * Uses the v2 stacking endpoint (current state).
 */
export async function getPoXBtcAddresses(stxAddress: string): Promise<string[]> {
  const found = new Set<string>();

  try {
    const res = await fetch(
      `${HIRO_BASE}/extended/v2/addresses/${stxAddress}/stacking`,
      { headers: { Accept: "application/json" }, cache: "no-store" }
    );

    if (res.ok) {
      const data = await res.json();

      // Current stacking entry
      const pox: PoXAddressObj | undefined = data?.stacking?.pox_address ?? data?.pox_address;
      if (pox?.version && pox?.hashbytes) {
        const addr = poxToBitcoinAddress(pox.version, pox.hashbytes);
        if (addr) found.add(addr);
      }

      // Historical cycle entries (if available in v2 response)
      const cycles: Array<{ pox_address?: PoXAddressObj }> = data?.cycles ?? [];
      for (const cycle of cycles) {
        if (cycle.pox_address?.version && cycle.pox_address?.hashbytes) {
          const addr = poxToBitcoinAddress(cycle.pox_address.version, cycle.pox_address.hashbytes);
          if (addr) found.add(addr);
        }
      }
    }
  } catch { /* no stacking info — silent */ }

  return [...found];
}

// ─── Burnchain (Bitcoin) rewards ──────────────────────────────────────────────

export interface BurnchainReward {
  burn_block_hash:   string;
  burn_block_height: number;
  reward_recipient:  string;   // BTC address that received the reward
  reward_amount:     string;   // satoshis (string)
  reward_index:      number;
}

/**
 * Fetches ALL burnchain rewards paid to a Bitcoin address (paginated).
 */
export async function fetchBurnchainRewards(btcAddress: string): Promise<BurnchainReward[]> {
  const all: BurnchainReward[] = [];
  const LIMIT = 50;
  let offset  = 0;

  while (true) {
    const res = await fetch(
      `${HIRO_BASE}/extended/v1/burnchain/rewards/${btcAddress}?limit=${LIMIT}&offset=${offset}`,
      { headers: { Accept: "application/json" }, cache: "no-store" }
    );
    if (!res.ok) break;

    const data = await res.json();
    const results: BurnchainReward[] = data.results ?? [];
    if (results.length === 0) break;

    all.push(...results);
    offset += LIMIT;
    if (results.length < LIMIT) break; // last page
  }

  return all;
}

// ─── Burn block timestamps ────────────────────────────────────────────────────

// Cache: block height → ISO timestamp (never changes once confirmed)
const blockTimeCache = new Map<number, string>();

/**
 * Returns the ISO UTC timestamp for a Bitcoin block height.
 * Results are cached indefinitely (block times are immutable).
 */
export async function getBurnBlockTime(height: number): Promise<string> {
  const hit = blockTimeCache.get(height);
  if (hit) return hit;

  try {
    const res = await fetch(
      `${HIRO_BASE}/extended/v2/burn-blocks/${height}`,
      { headers: { Accept: "application/json" }, cache: "no-store" }
    );
    if (res.ok) {
      const data = await res.json();
      // burn_block_time_iso preferred; fallback to unix conversion
      const ts = data.burn_block_time_iso
        ?? (data.burn_block_time
          ? new Date(data.burn_block_time * 1000).toISOString()
          : null);
      if (ts) { blockTimeCache.set(height, ts); return ts; }
    }
  } catch { /* silent */ }

  // Last-resort fallback: rough estimate (Bitcoin genesis + avg block time)
  const GENESIS_MS = 1_231_006_505_000;
  const AVG_BLOCK   = 10 * 60 * 1000; // ~10 min
  const ts = new Date(GENESIS_MS + height * AVG_BLOCK).toISOString();
  blockTimeCache.set(height, ts);
  return ts;
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Fetches and transforms PoX stacking rewards for a Stacks address.
 *
 * Returns CsvRow[] where each row represents one BTC reward payment.
 * These rows are merged into the main CSV alongside STX and FT transfers.
 */
export async function fetchStackingRewardRows(stxAddress: string): Promise<CsvRow[]> {
  // 1. Find PoX BTC reward address(es)
  const btcAddresses = await getPoXBtcAddresses(stxAddress);
  if (btcAddresses.length === 0) return [];

  const allRows: CsvRow[] = [];

  for (const btcAddr of btcAddresses) {
    // 2. Fetch all BTC rewards for this address
    const rewards = await fetchBurnchainRewards(btcAddr);
    if (rewards.length === 0) continue;

    // 3. Pre-fetch all block timestamps in batches (5 at a time)
    const uniqueHeights = [...new Set(rewards.map(r => r.burn_block_height))];
    const BATCH = 5;
    for (let i = 0; i < uniqueHeights.length; i += BATCH) {
      await Promise.all(
        uniqueHeights.slice(i, i + BATCH).map(h => getBurnBlockTime(h))
      );
    }

    // 4. Build CSV rows
    for (const reward of rewards) {
      const satoshis = parseInt(reward.reward_amount, 10);
      if (isNaN(satoshis) || satoshis <= 0) continue;

      // Convert satoshis → BTC (8 decimals, strip trailing zeros)
      const btcAmount = (satoshis / 100_000_000)
        .toFixed(8)
        .replace(/\.?0+$/, "");

      const date = await getBurnBlockTime(reward.burn_block_height);

      allRows.push({
        date,
        receivedAmount:   btcAmount,
        receivedCurrency: "BTC",
        sentAmount:       "",
        sentCurrency:     "",
        feeAmount:        "",
        feeCurrency:      "",
        txHash:           reward.burn_block_hash,
        txType:           "Stacking Reward (PoX)",
      });
    }
  }

  // Sort newest-first
  allRows.sort((a, b) => (a.date > b.date ? -1 : 1));
  return allRows;
}
