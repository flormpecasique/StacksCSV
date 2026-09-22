/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV !== "production";

// Content-Security-Policy tuned to keep the app working:
//  - connect-src allows same-origin (/api), Hiro (data) and CoinGecko (client-side
//    price lookups used by the tax report). Add your own proxy host here if you
//    move pricing server-side.
//  - blob:/data: allow the in-browser PDF download and inline icons.
//  - 'unsafe-inline' scripts/styles are needed by Next's hydration; 'unsafe-eval'
//    is dev-only (React Refresh). This is the pragmatic, non-breaking baseline;
//    a nonce-based strict CSP is a later hardening step.
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "connect-src 'self' https://api.hiro.so https://api.coingecko.com",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig = {
  reactStrictMode: true,
  // Minimize bundle size
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
