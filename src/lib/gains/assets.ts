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
