/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // A separate directory lets build verification run without corrupting a
  // concurrently running local dev server's .next cache.
  distDir: process.env.NEXT_DIST_DIR || ".next",

  // These have native binaries (better-sqlite3) or spawn browser processes
  // and resolve their own files at runtime (playwright). Bundling them breaks
  // both, so Next must require() them directly.
  serverExternalPackages: ["better-sqlite3", "playwright", "@axe-core/playwright"],

  // lib/db/index.ts reads schema.sql from disk at startup. Next's build
  // tracing only follows import graphs, so explicitly include it.
  outputFileTracingIncludes: {
    "/api/**/*": ["./lib/db/schema.sql"],
  },
};

export default nextConfig;
