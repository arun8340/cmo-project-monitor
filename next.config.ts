import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
    // Imagery uploads: up to 10 files of 20 MB each (see app/actions/imagery.ts).
    // Proxy buffers request bodies and would otherwise truncate at 10 MB.
    proxyClientMaxBodySize: "210mb",
    serverActions: { bodySizeLimit: "210mb" },
  },
  cacheComponents: true,
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

export default nextConfig;
