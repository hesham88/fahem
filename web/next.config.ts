import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: [
    "@mongodb-js/mongodb-mcp-server",
    "mongodb-client-encryption",
    "kerberos",
    "@mongosh/service-provider-node-driver",
    "@mongodb-js/devtools-connect",
    "mongodb"
  ],
  outputFileTracingIncludes: {
    "/api/agent": [
      "agents/**/*"
    ],
    "/api/db-metadata": [
      "agents/**/*"
    ],
  },
};

export default nextConfig;
