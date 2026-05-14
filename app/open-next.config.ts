import type { OpenNextConfig } from "@opennextjs/cloudflare";

const config: OpenNextConfig = {
  default: {
    override: {
      wrapper: "cloudflare-node",
      converter: "edge",
      proxyExternalRequest: "fetch",
      incrementalCache: "dummy",
      tagCache: "dummy",
      queue: "dummy",
    },
  },

  // Required: exposes node:crypto to edge runtime (Supabase auth dependency)
  edgeExternals: ["node:crypto"],

  // Middleware: Next.js 16 uses proxy.ts which runs on Node.js.
  // OpenNext will bundle it for edge via cloudflare-edge wrapper.
  middleware: {
    external: true,
    override: {
      wrapper: "cloudflare-edge",
      converter: "edge",
      proxyExternalRequest: "fetch",
      incrementalCache: "dummy",
      tagCache: "dummy",
      queue: "dummy",
    },
  },

  cloudflare: {
    // Bypass strict config validation — Next.js 16 proxy.ts is auto-compiled
    // to edge by OpenNext regardless of the runtime export restriction.
    dangerousDisableConfigValidation: false,
  },
};

export default config;
