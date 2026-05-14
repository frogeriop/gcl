#!/usr/bin/env node
/**
 * build-cf.mjs — Cloudflare Workers build script
 *
 * Workaround for Next.js 16 + Turbopack bug where instrumentation.js
 * is not copied to the standalone output directory.
 */

import { execSync } from 'child_process'
import { existsSync, copyFileSync, mkdirSync } from 'fs'
import { join } from 'path'

const cwd = process.cwd()
const dotNext    = join(cwd, '.next')
const standalone = join(dotNext, 'standalone', '.next')

// ── Step 1: Build Next.js ───────────────────────────────────────────────────
console.log('\n🔨  Building Next.js app...')
execSync('next build', { stdio: 'inherit' })

// ── Step 2: Copy missing instrumentation.js to standalone ──────────────────
// Bug: Next.js 16 + Turbopack does not copy instrumentation.js to standalone.
const src  = join(dotNext, 'server', 'instrumentation.js')
const dest = join(standalone, 'server', 'instrumentation.js')

if (existsSync(src)) {
  mkdirSync(join(standalone, 'server'), { recursive: true })
  copyFileSync(src, dest)
  console.log('✅  Copied instrumentation.js → standalone (Next.js 16 workaround applied)')
} else {
  console.warn('⚠️  instrumentation.js not found in .next/server — skipping copy')
}

// ── Step 3: Bundle for Cloudflare Workers ──────────────────────────────────
console.log('\n📦  Bundling for Cloudflare Workers (skipping Next.js build)...')
execSync('opennextjs-cloudflare build --skipNextBuild', { stdio: 'inherit' })

console.log('\n🚀  Done! Deploy with: npm run deploy')
