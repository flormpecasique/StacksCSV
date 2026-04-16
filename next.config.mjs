/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Minimize bundle size
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
};

export default nextConfig;
