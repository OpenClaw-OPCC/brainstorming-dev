import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    // Prevent Turbopack from inferring the workspace root from unrelated lockfiles.
    root: process.cwd(),
  },
};

export default nextConfig;
