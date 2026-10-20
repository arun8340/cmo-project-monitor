import path from "node:path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
    // Unmatched URLs: the root layout lives under app/[locale], so app/global-not-found.tsx renders the 404.
    globalNotFound: true,
    // Imagery uploads: up to 10 files of 20 MB each (see app/actions/imagery.ts).
    // Proxy buffers request bodies and would otherwise truncate at 10 MB.
    proxyClientMaxBodySize: "210mb",
    serverActions: { bodySizeLimit: "210mb" },
  },
  cacheComponents: true,
  // Demo mode (lib/demo.ts) reads the bundled demo database and imagery at runtime.
  outputFileTracingIncludes: { "/*": ["./demo/**/*"] },
  partialPrefetching: true,
  turbopack: {
    // Pin the root so a stray lockfile in a parent folder is not picked up.
    root: path.join(__dirname),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withNextIntl(nextConfig);
