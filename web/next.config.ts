import type { NextConfig } from "next";
import { execSync } from "child_process";

let gitSha = "unknown";
try {
  gitSha = execSync("git rev-parse HEAD").toString().trim();
} catch (e) {
  // Fallback if git is not available or outside repo
}

const nextConfig: NextConfig = {
  output: "standalone",
  env: {
    NEXT_PUBLIC_BUILD_SHA: process.env.NEXT_PUBLIC_BUILD_SHA || gitSha,
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
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
