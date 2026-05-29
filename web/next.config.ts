import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingIncludes: {
    "/api/agent": [
      "node_modules/{@mongodb-js,@modelcontextprotocol,@mongosh,mongodb,bson,socks,ip-address,jsbn,sprintf-js,kerberos,mongodb-client-encryption,node-addon-api,prebuild-install,zod,zod-to-json-schema,zod-validation-error}/**/*",
      "agents/**/*"
    ],
    "/api/db-metadata": [
      "node_modules/{@mongodb-js,@modelcontextprotocol,@mongosh,mongodb,bson,socks,ip-address,jsbn,sprintf-js,kerberos,mongodb-client-encryption,node-addon-api,prebuild-install,zod,zod-to-json-schema,zod-validation-error}/**/*",
      "agents/**/*"
    ],
  },
};

export default nextConfig;
