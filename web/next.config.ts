import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingIncludes: {
    "/api/agent": ["../agents/**/*"],
    "/api/db-metadata": ["../agents/**/*"],
  },
};

export default nextConfig;
