/**
 * hiro-fetch.ts
 *
 * Wrapper around fetch for all Hiro API calls. It:
 *  - adds the Hiro API key (from HIRO_API_KEY env, server-side only — never in the
 *    repo or the client bundle) via the `x-api-key` header,
 *  - retries on 429 (rate limit) with backoff, respecting the Retry-After header,
 *  - times out so a slow Hiro call can never hang a serverless function.
 *
 * Without a key, Hiro limits to ~25–50 req/min per IP; with a FREE key, ~500/min.
 * Create one at https://platform.hiro.so and set HIRO_API_KEY in Vercel env vars.
 */
const TIMEOUT_MS = 15_000;
const MAX_RETRIES = 3;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
function backoff(attempt: number): number {
  return Math.min(500 * 2 ** attempt, 4000) + Math.floor(Math.random() * 200);
}

export async function hiroFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const apiKey = process.env.HIRO_API_KEY;
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  if (apiKey) headers["x-api-key"] = apiKey;

  for (let attempt = 0; ; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(url, { ...init, headers, signal: controller.signal });
    } catch (err) {
      clearTimeout(timer);
      if (attempt < MAX_RETRIES) { await sleep(backoff(attempt)); continue; }
      throw err;
    }
    clearTimeout(timer);

    if (res.status === 429 && attempt < MAX_RETRIES) {
      const ra = Number(res.headers.get("retry-after"));
      await sleep(Number.isFinite(ra) && ra > 0 ? Math.min(ra * 1000, 8000) : backoff(attempt));
      continue;
    }
    return res;
  }
}
