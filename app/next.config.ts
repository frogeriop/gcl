import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for Cloudflare Workers / OpenNext deployment
  output: "standalone",
};

export default nextConfig;
