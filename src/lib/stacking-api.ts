/**
 * stacking-api.ts
 *
 * Fetches and transforms Proof-of-Transfer (PoX) stacking rewards.
 * All Hiro API calls go through hiroFetch() in hiro-api.ts, which injects
 * the HIRO_API_KEY header automatically.
 */

import { createHash } from "crypto";
import type { CsvRow } from "@/types";
import { hiroFetch } from "@/lib/hiro-api";

const HIRO_BASE = "https://api.hiro.so";

// ─── Bitcoin address encoding ─────────────────────────────────────────────────

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

export function poxToBitcoinAddress(version: string, hashbytes: string): string | null {
  try {
    const ver  = parseInt(version.replace("0x", ""), 16);
    const hash = Buffer.from(hashbytes.replace("0x", ""), "hex");

    switch (ver) {
      case 0x00: return base58Check(Buffer.concat([Buffer.from([0x00]), hash]));
      case 0x01: return base58Check(Buffer.concat([Buffer.from([0x05]), hash]));
      case 0x04: return bech32Address(0, hash);
      case 0x05: return base58Check(Buffer.concat([Buffer.from([0x05]), hash]));
      case 0x06: return bech32Address(0, hash);
      case 0x07: return bech32Address(1, hash);
      default:   return null;
    }
  } catch { return null; }
}

// ─── Stacking address lookup ─────────────────────────────────────────────────

interface PoXAddressObj {
  version:   string;
  hashbytes: string;
}

export async function getPoXBtcAddresses(stxAddress: string): Promise<string[]> {
  const found = new Set<string>();

  try {
    // Authenticated via hiroFetch — same API key as everywhere else
    const res = await hiroFetch(
      `${HIRO_BASE}/extended/v2/addresses/${stxAddress}/stacking`
    );

    if (res.ok) {
      const data = await res.json();

      const pox: PoXAddressObj | undefined = data?.stacking?.pox_address ?? data?.pox_address;
      if (pox?.version && pox?.hashbytes) {
        const addr = poxToBitcoinAddress(pox.version, pox.hashbytes);
        if (addr) found.add(addr);
      }

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

// ─── Burnchain rewards ───────────────────────────────────────────────────────

export interface BurnchainReward {
  burn_block_hash:   string;
  burn_block_height: number;
  reward_recipient:  string;
  reward_amount:     string;
  reward_index:      number;
}

export async function fetchBurnchainRewards(btcAddress: string): Promise<BurnchainReward[]> {
  const all: BurnchainReward[] = [];
  const LIMIT = 50;
  let offset  = 0;

  while (true) {
    const res = await hiroFetch(
      `${HIRO_BASE}/extended/v1/burnchain/rewards/${btcAddress}?limit=${LIMIT}&offset=${offset}`
    );
    if (!res.ok) break;

    const data = await res.json();
    const results: BurnchainReward[] = data.results ?? [];
    if (results.length === 0) break;

    all.push(...results);
    offset += LIMIT;
    if (results.length < LIMIT) break;
  }

  return all;
}

// ─── Burn block timestamps ───────────────────────────────────────────────────

const blockTimeCache = new Map<number, string>();

export async function getBurnBlockTime(height: number): Promise<string> {
  const hit = blockTimeCache.get(height);
  if (hit) return hit;

  try {
    const res = await hiroFetch(`${HIRO_BASE}/extended/v2/burn-blocks/${height}`);
    if (res.ok) {
      const data = await res.json();
      const ts = data.burn_block_time_iso
        ?? (data.burn_block_time
          ? new Date(data.burn_block_time * 1000).toISOString()
          : null);
      if (ts) { blockTimeCache.set(height, ts); return ts; }
    }
  } catch { /* silent */ }

  const GENESIS_MS = 1_231_006_505_000;
  const AVG_BLOCK  = 10 * 60 * 1000;
  const ts = new Date(GENESIS_MS + height * AVG_BLOCK).toISOString();
  blockTimeCache.set(height, ts);
  return ts;
}

// ─── Main export ─────────────────────────────────────────────────────────────

export async function fetchStackingRewardRows(stxAddress: string): Promise<CsvRow[]> {
  const btcAddresses = await getPoXBtcAddresses(stxAddress);
  if (btcAddresses.length === 0) return [];

  const allRows: CsvRow[] = [];

  for (const btcAddr of btcAddresses) {
    const rewards = await fetchBurnchainRewards(btcAddr);
    if (rewards.length === 0) continue;

    const uniqueHeights = [...new Set(rewards.map(r => r.burn_block_height))];
    const BATCH = 5;
    for (let i = 0; i < uniqueHeights.length; i += BATCH) {
      await Promise.all(
        uniqueHeights.slice(i, i + BATCH).map(h => getBurnBlockTime(h))
      );
    }

    for (const reward of rewards) {
      const satoshis = parseInt(reward.reward_amount, 10);
      if (isNaN(satoshis) || satoshis <= 0) continue;

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

  allRows.sort((a, b) => (a.date > b.date ? -1 : 1));
  return allRows;
}
