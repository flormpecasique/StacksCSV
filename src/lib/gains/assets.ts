/**
 * Asset registry.
 *
 * SECURITY: this doubles as an ALLOWLIST. The price provider will only ever
 * fetch ids that exist here, so a malformed/hostile asset string coming from a
 * parsed transaction can never be turned into an arbitrary outbound request
 * (defense against SSRF / request smuggling via the price URL).
 *
 * `decimals` is the on-chain precision, used only for validation bounds.
 * `coingeckoId` is the id used on the /coins/{id}/history endpoint.
 * Extend this as StacksCSV adds SIP-010 support; unknown assets are rejected
 * loudly rather than priced as $0.
 */
export interface AssetInfo {
  /** Canonical key used throughout the engine. */
  id: string;
  symbol: string;
  decimals: number;
  coingeckoId: string | null; // null = no reliable price feed yet
}

const REGISTRY: Record<string, AssetInfo> = Object.create(null);

function register(a: AssetInfo) {
  REGISTRY[a.id.toLowerCase()] = a;
}

// Core assets. Add SIP-010 tokens here as you support them.
register({ id: "STX", symbol: "STX", decimals: 6, coingeckoId: "blockstack" });
register({ id: "sBTC", symbol: "sBTC", decimals: 8, coingeckoId: "bitcoin" }); // 1:1 BTC
register({ id: "BTC", symbol: "BTC", decimals: 8, coingeckoId: "bitcoin" });
register({ id: "aeUSDC", symbol: "aeUSDC", decimals: 6, coingeckoId: "usd-coin" });
register({ id: "USDC", symbol: "USDC", decimals: 6, coingeckoId: "usd-coin" });
register({ id: "ALEX", symbol: "ALEX", decimals: 8, coingeckoId: "alexgo" });
register({ id: "WELSH", symbol: "WELSH", decimals: 6, coingeckoId: "welshcorgicoin" });

// --- Additional SIP-010 tokens seen in StacksCSV's KNOWN_TOKENS ---
// coingeckoId set to null where there is no reliable price feed yet: those
// flows surface in errors[] for manual pricing instead of being valued wrong.
// VERIFY these ids against live data before trusting the numbers in production.
register({ id: "USDA", symbol: "USDA", decimals: 6, coingeckoId: null }); // stablecoin, but has depegged — price it, don't assume $1
register({ id: "xBTC", symbol: "xBTC", decimals: 8, coingeckoId: "bitcoin" }); // wrapped BTC, tracks BTC (proxy)
register({ id: "DIKO", symbol: "DIKO", decimals: 6, coingeckoId: null });
register({ id: "BANANA", symbol: "BANANA", decimals: 6, coingeckoId: null });
register({ id: "NOT", symbol: "NOT", decimals: 0, coingeckoId: null });

// --- More Stacks tokens ---
// Verified CoinGecko ids (id taken from the coingecko.com/en/coins/<id> URL):
register({ id: "VELAR", symbol: "VELAR", decimals: 6, coingeckoId: "velar" });   // verified: coingecko.com/en/coins/velar
register({ id: "USDCx", symbol: "USDCx", decimals: 6, coingeckoId: "usd-coin" }); // bridged USDC → USDC price
register({ id: "sUSDT", symbol: "sUSDT", decimals: 6, coingeckoId: "tether" });   // USDT-pegged representation
// Known but not yet priced (no verified feed) → flagged "to review", never mis-priced.
// To enable pricing: find the token on coingecko.com and copy the id from its
// URL (e.g. /en/coins/<id>), confirm it's the SAME token, then set coingeckoId.
register({ id: "stSTX", symbol: "stSTX", decimals: 6, coingeckoId: "stacking-dao" });   // verified: coingecko "ID de la API: stacking-dao"
register({ id: "USDH", symbol: "USDH", decimals: 8, coingeckoId: "hermetica-usdh" });   // verified: coingecko "ID de la API: hermetica-usdh" (fluctúa, no asumir $1)
register({ id: "sUSDH", symbol: "sUSDH", decimals: 8, coingeckoId: null });

export function getAsset(id: string): AssetInfo | undefined {
  if (typeof id !== "string" || id.length === 0 || id.length > 64) return undefined;
  return REGISTRY[id.toLowerCase()];
}

export function requireAsset(id: string): AssetInfo {
  const a = getAsset(id);
  if (!a) {
    throw new RangeError(
      `Unknown asset "${id}". Add it to the registry before pricing — ` +
        `refusing to value an unknown asset (would corrupt the tax result).`,
    );
  }
  return a;
}

export function isKnownAsset(id: string): boolean {
  return getAsset(id) !== undefined;
}
