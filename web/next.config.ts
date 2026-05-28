import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    outputFileTracingIncludes: {
      "/api/agent": ["../agents/**/*"],
    },
  },
};

export default nextConfig;
