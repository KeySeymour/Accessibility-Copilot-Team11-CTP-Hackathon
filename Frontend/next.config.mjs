/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  experimental: {
    // These have native binaries (better-sqlite3) or spawn browser processes
    // and resolve their own files at runtime (playwright). Bundling them
    // through webpack breaks both, so Next must require() them directly.
    serverComponentsExternalPackages: ["better-sqlite3", "playwright", "@axe-core/playwright"],

    // lib/db/index.ts reads schema.sql from disk at startup. Next's build
    // tracing only follows import graphs, so the .sql file has to be declared
    // or it won't ship with a standalone build.
    outputFileTracingIncludes: {
      "/api/**/*": ["./lib/db/schema.sql"],
    },
  },
};

export default nextConfig;
