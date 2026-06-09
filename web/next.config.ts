import type { NextConfig } from "next";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

let gitSha = "unknown";
try {
  gitSha = execSync("git rev-parse HEAD").toString().trim();
} catch (e) {
  // Fallback if git is not available or outside repo
}

// Stamp the build SHA into the static ts file so it's always accurate in production
try {
  const shaFilePath = path.join(__dirname, "src/app/api/version/git_sha.ts");
  fs.writeFileSync(shaFilePath, `export const GIT_SHA = "${gitSha}";\n`);
} catch (e) {
  // Ignore writing errors during build/dev
}

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    turbopack: {
      root: "./",
    },
  } as any,
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
