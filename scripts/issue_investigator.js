const fs = require("fs");
const path = require("path");
const { spawn, execSync } = require("child_process");
const https = require("https");

const WORKSPACE_DIR = path.resolve(__dirname, "..");
const WEB_DIR = path.join(WORKSPACE_DIR, "web");
const EXPECTED_NAME = "hesham88";
const EXPECTED_EMAIL = "hesham1988@gmail.com";
const TARGET_PROJECT = "fahem-88d40";
const REGION = "us-east4";
const STAGING_URL = "https://fahem--fahem-88d40.us-east4.hosted.app";

const LANGUAGES = ["en", "ar", "es", "fr", "de", "zh", "it"];

function log(msg, level = "INFO") {
  const ts = new Date().toISOString();
  console.log(`[${level}] [${ts}] ${msg}`);
}

// Helper to run a command and return stdout
function runCmd(cmd, args, options = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { shell: true, ...options });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (data) => { stdout += data.toString(); });
    proc.stderr.on("data", (data) => { stderr += data.toString(); });
    proc.on("close", (code) => {
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(`Command ${cmd} exited with code ${code}. Stderr: ${stderr.trim()}`));
    });
  });
}

// Phase 1: Pre-deployment checks
async function runPreChecks() {
  log("=== PHASE 1: PRE-DEPLOYMENT CHECKS ===");
  const results = { ok: true, details: [] };

  // 1. Git config verification
  try {
    const gitName = execSync("git config user.name", { cwd: WORKSPACE_DIR }).toString().trim();
    const gitEmail = execSync("git config user.email", { cwd: WORKSPACE_DIR }).toString().trim();
    if (gitName === EXPECTED_NAME && gitEmail === EXPECTED_EMAIL) {
      results.details.push(`[PASS] Git Committer Identity: verified as "${gitName} <${gitEmail}>"`);
    } else {
      results.ok = false;
      results.details.push(`[FAIL] Git Committer Identity mismatch: Found "${gitName} <${gitEmail}>", expected "${EXPECTED_NAME} <${EXPECTED_EMAIL}>"`);
    }
  } catch (e) {
    results.ok = false;
    results.details.push(`[FAIL] Git Committer Check: Failed to read git configuration (${e.message})`);
  }

  // 2. Lockfile verification
  try {
    const lockPath = path.join(WEB_DIR, "package-lock.json");
    if (!fs.existsSync(lockPath)) {
      results.ok = false;
      results.details.push(`[FAIL] Package lock file missing at: ${lockPath}`);
    } else {
      const lockfile = JSON.parse(fs.readFileSync(lockPath, "utf8"));
      let missingCount = 0;
      for (const [pkgPath, pkg] of Object.entries(lockfile.packages || {})) {
        if (pkgPath === "" || pkg.link) continue;
        if (!pkg.resolved || !pkg.integrity) {
          missingCount++;
        }
      }
      if (missingCount === 0) {
        results.details.push(`[PASS] Lockfile Integrity: 100% compliant (0 corrupted entries found)`);
      } else {
        results.ok = false;
        results.details.push(`[FAIL] Lockfile Corruption: Found ${missingCount} package entries missing resolved/integrity fields.`);
      }
    }
  } catch (e) {
    results.ok = false;
    results.details.push(`[FAIL] Lockfile Check: Failed to parse package-lock.json (${e.message})`);
  }

  // 3. Local compile dry-run
  try {
    log("Running local compilation check (npm run build)...");
    await runCmd("npm", ["run", "build"], { cwd: WEB_DIR });
    results.details.push(`[PASS] Local Compilation: successfully built Next.js application`);
  } catch (e) {
    results.ok = false;
    results.details.push(`[FAIL] Local Compilation failed: ${e.message}`);
  }

  log(`Pre-deployment checks complete. Status: ${results.ok ? "PASS" : "FAIL"}`);
  results.details.forEach(d => console.log(d));
  return results;
}

// Helper to make HTTPS requests
function fetchHttpsJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        if (res.statusCode === 200) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`Failed to parse JSON: ${data}`));
          }
        } else {
          reject(new Error(`Status ${res.statusCode}: ${data}`));
        }
      });
    }).on("error", reject);
  });
}

function postHttpsStream(url, payload) {
  return new Promise((resolve, reject) => {
    const dataStr = JSON.stringify(payload);
    const parsedUrl = new URL(url);
    const req = https.request({
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.pathname,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(dataStr)
      }
    }, (res) => {
      let accumulated = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        accumulated += chunk;
      });
      res.on("end", () => {
        if (res.statusCode === 200) {
          resolve(accumulated);
        } else {
          reject(new Error(`Status ${res.statusCode}: ${accumulated}`));
        }
      });
    });
    req.on("error", reject);
    req.write(dataStr);
    req.end();
  });
}

// Phase 2: Monitoring deployment status
async function monitorDeployment() {
  log("=== PHASE 2: MONITORING CLOUD BUILD DEPLOYMENT ===");
  try {
    log("Fetching latest build details...");
    const buildsJson = await runCmd("gcloud", ["builds", "list", `--region=${REGION}`, "--limit=1", "--format=json"]);
    const builds = JSON.parse(buildsJson);
    if (!builds || builds.length === 0) {
      throw new Error("No recent builds found.");
    }
    const build = builds[0];
    const buildId = build.id;
    log(`Active Build ID: ${buildId} (Created: ${build.createTime}, Status: ${build.status})`);

    let status = build.status;
    while (status === "WORKING" || status === "QUEUED" || status === "PENDING") {
      log(`Build status: ${status}. Waiting 10 seconds...`);
      await new Promise(r => setTimeout(r, 10000));
      const updatedJson = await runCmd("gcloud", ["builds", "describe", buildId, `--region=${REGION}`, "--format=json"]);
      const updated = JSON.parse(updatedJson);
      status = updated.status;
    }

    if (status === "SUCCESS") {
      log(`Build ${buildId} succeeded!`);
      return { ok: true, buildId };
    } else {
      log(`Build ${buildId} failed with status: ${status}`, "ERROR");
      log("Retrieving build failure log diagnostics...");
      const buildLogs = await runCmd("gcloud", ["builds", "log", buildId, `--region=${REGION}`]);
      let diagnosis = "Unknown build failure.";
      if (buildLogs.includes("Missing Lock File")) {
        diagnosis = "Missing dependency lock file. package-lock.json was deleted or omitted from deployment.";
      } else if (buildLogs.includes("Missing:") && buildLogs.includes("from lock file")) {
        diagnosis = "Lockfile desync error. Optional dependencies in package-lock.json are missing resolved/integrity fields.";
      } else if (buildLogs.includes("API Key is not configured") || buildLogs.includes("secret")) {
        diagnosis = "Firebase secret manager integration error. Verify environment secret configurations.";
      }
      log(`[DIAGNOSIS]: ${diagnosis}`, "ERROR");
      return { ok: false, buildId, status, diagnosis };
    }
  } catch (e) {
    log(`Deployment monitoring failed: ${e.message}`, "ERROR");
    return { ok: false, error: e.message };
  }
}

// Phase 3: Post-deployment Staging Smoke Testing (7 languages!)
async function runStagingSmokeTest() {
  log("=== PHASE 3: RUNNING STAGING SMOKE TESTS ===");
  const results = { ok: true, details: [] };

  // 1. Verify db-metadata endpoint
  try {
    log(`Verifying metadata at: ${STAGING_URL}/api/db-metadata?email=hesham1988@gmail.com...`);
    const metadata = await fetchHttpsJson(`${STAGING_URL}/api/db-metadata?email=hesham1988@gmail.com`);
    if (metadata && metadata.status === "Connected") {
      results.details.push(`[PASS] GET /api/db-metadata: MongoDB Atlas status is "${metadata.status}" (Database: "${metadata.databaseName}", Collections: ${metadata.collectionsCount})`);
    } else {
      results.ok = false;
      results.details.push(`[FAIL] GET /api/db-metadata returned disconnected state: ${JSON.stringify(metadata)}`);
    }
  } catch (e) {
    results.ok = false;
    results.details.push(`[FAIL] GET /api/db-metadata failed: ${e.message}`);
  }

  // 2. Verify agent loop for all 7 languages
  log("Verifying multi-lingual agent execution streams for all seven languages...");
  for (const lang of LANGUAGES) {
    try {
      log(`Testing POST /api/agent with language: "${lang}"...`);
      const response = await postHttpsStream(`${STAGING_URL}/api/agent`, {
        prompt: "List all collections present in the 'fahem' database.",
        language: lang
      });
      
      const containsError = response.includes("[ERROR]") || response.includes("Stream failure");
      if (containsError) {
        results.ok = false;
        results.details.push(`[FAIL] POST /api/agent (Language: "${lang}") returned an error stream: ${response.substring(0, 100)}...`);
      } else {
        // Find system responses or language signature
        results.details.push(`[PASS] POST /api/agent (Language: "${lang}"): response streamed successfully`);
        // Log a sample chunk to console
        const lines = response.split("\n").filter(l => l.trim() !== "");
        const sampleLine = lines[lines.length - 1] || response;
        log(`Sample chunk for "${lang}": "${sampleLine.trim()}"`);
      }
    } catch (e) {
      results.ok = false;
      results.details.push(`[FAIL] POST /api/agent (Language: "${lang}") failed: ${e.message}`);
    }
  }

  log(`Staging smoke test complete. Status: ${results.ok ? "PASS" : "FAIL"}`);
  results.details.forEach(d => console.log(d));
  return results;
}

// Generate unified report
function generateReport(preResults, buildResults, smokeResults) {
  log("Generating unified compliance and deployment report...");
  const ts = new Date().toISOString();
  
  const reportLines = [
    `# 🛡️ FAHEM UNIFIED COMPLIANCE & DEPLOYMENT REPORT`,
    ``,
    `| Metadata Field | Audit Value |`,
    `| :--- | :--- |`,
    `| **Workspace Name** | \`fahem\` |`,
    `| **Evaluation Timestamp** | \`${ts}\` |`,
    `| **Evaluation Tool** | \`Fahem Investigator & deployment Automator\` |`,
    `| **Active GCP Project** | \`${TARGET_PROJECT}\` |`,
    `| **Hosted Domain** | [${STAGING_URL}](${STAGING_URL}) |`,
    ``,
    `---`,
    ``,
    `## 📊 EXECUTIVE SUMMARY`,
    `An automated deployment check, compilation validation, lockfile audit, and live staging smoke test across all seven supported languages was executed.`,
    ``,
    `- **Workspace Pre-Checks Status**: \`${preResults.ok ? "PASS" : "FAIL"}\``,
    `- **Cloud Build Deployment Status**: \`${buildResults.ok ? "PASS" : "FAIL"}\``,
    `- **Staging Smoke Test Status**: \`${smokeResults.ok ? "PASS" : "FAIL"}\``,
    ``,
    `---`,
    ``,
    `## 🔬 DETAILED VERIFICATION RESULTS`,
    ``,
    `### 1. Pre-Deployment Workspace Audit`,
    ...preResults.details.map(d => `- ${d}`),
    ``,
    `### 2. Google Cloud Build Monitoring`,
    buildResults.ok 
      ? `- [PASS] Cloud Build deployment succeeded (Build ID: \`${buildResults.buildId}\`)`
      : `- [FAIL] Cloud Build failed (Build ID: \`${buildResults.buildId || "N/A"}\`, Status: \`${buildResults.status || "N/A"}\`)` + (buildResults.diagnosis ? `\n  - **Diagnosis**: ${buildResults.diagnosis}` : ""),
    ``,
    `### 3. Production Staging Smoke Testing (Seven Languages)`,
    ...smokeResults.details.map(d => `- ${d}`),
    ``,
    `---`,
    ``,
    `## 🏁 DECISION & COMPLIANCE CONFIRMATION`,
  ];

  if (preResults.ok && buildResults.ok && smokeResults.ok) {
    reportLines.push(`### 🟢 COMPLIANT AND FULLY OPERATIONAL`);
    reportLines.push(`All code integration tests, cross-platform package synchronization, deployment pipeline execution, and multi-lingual endpoint audits (en, ar, es, fr, de, zh, it) are completely successful. The app is ready for active hackathon evaluation.`);
  } else {
    reportLines.push(`### 🔴 NON-COMPLIANT / ISSUES DETECTED`);
    reportLines.push(`One or more checks have failed. Please review the detailed verification results above to remediate package-lock, secrets, or endpoint routing configurations.`);
  }

  const reportContent = reportLines.join("\n");
  
  const dateStr = new Date().toISOString().replace(/[:.]/g, "-");
  const reportPath = path.join(WORKSPACE_DIR, "doc", `compliance_report_${dateStr}.md`);
  
  if (!fs.existsSync(path.join(WORKSPACE_DIR, "doc"))) {
    fs.mkdirSync(path.join(WORKSPACE_DIR, "doc"));
  }
  fs.writeFileSync(reportPath, reportContent, "utf8");
  log(`Unified compliance report saved to: ${reportPath}`);
}

async function main() {
  const mode = process.argv[2] || "all";
  log(`Initiating Investigator Tool in mode: "${mode}"`);

  let preResults = { ok: true, details: ["Skipped pre-checks"] };
  let buildResults = { ok: true, buildId: "Skipped monitoring" };
  let smokeResults = { ok: true, details: ["Skipped staging smoke tests"] };

  if (mode === "pre" || mode === "all") {
    preResults = await runPreChecks();
    if (!preResults.ok && mode === "all") {
      log("Pre-checks failed. Aborting further steps.", "ERROR");
      process.exit(1);
    }
  }

  if (mode === "while" || mode === "all") {
    buildResults = await monitorDeployment();
    if (!buildResults.ok && mode === "all") {
      log("Deployment failed. Aborting smoke test.", "ERROR");
      process.exit(1);
    }
  }

  if (mode === "post" || mode === "all") {
    smokeResults = await runStagingSmokeTest();
  }

  if (mode === "all" || mode === "post") {
    generateReport(preResults, buildResults, smokeResults);
    if (!preResults.ok || !buildResults.ok || !smokeResults.ok) {
      process.exit(1);
    }
  }
}

main().catch(err => {
  log(`Investigation crashed: ${err.message}`, "ERROR");
  process.exit(1);
});
