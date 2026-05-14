// Next.js instrumentation hook — runs once on server startup.
// Uses require() instead of import so Turbopack does NOT statically analyze
// @opennextjs/cloudflare at compile time (avoids MODULE_UNPARSABLE / dynamic import errors).
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { initOpenNextCloudflareForDev } = require("@opennextjs/cloudflare");
      await initOpenNextCloudflareForDev();
    } catch {
      // Not running in Cloudflare dev context (plain `next dev`) — safe to ignore.
    }
  }
}
