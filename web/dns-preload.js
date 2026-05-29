const dns = require("dns");
try {
  dns.setServers(["8.8.8.8", "8.8.4.4"]);
  dns.setDefaultResultOrder("ipv4first");
  console.error("[PRELOAD] Configured Google DNS servers successfully.");
} catch (e) {
  console.error("[PRELOAD] Failed to set DNS servers:", e);
}
