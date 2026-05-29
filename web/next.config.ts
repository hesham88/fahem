import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingIncludes: {
    "/api/agent": [
      "agents/**/*"
    ],
    "/api/db-metadata": [
      "agents/**/*"
    ],
  },
  serverExternalPackages: [
    "@mongodb-js/mongodb-mcp-server",
    "@modelcontextprotocol/sdk",
    "mongodb",
    "bson",
    "kerberos",
    "mongodb-client-encryption",
    "ssh2",
    "@mongosh/service-provider-node-driver",
    "@mongodb-js/devtools-connect",
    "@mongodb-js/devtools-proxy-support",
    "@mongodb-js/oidc-plugin",
    "mongodb-log-writer"
  ]
};

export default nextConfig;
