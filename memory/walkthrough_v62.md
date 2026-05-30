# Project Walkthrough - Version 62
**Timestamp**: 2026-05-30T15:30:00+03:00

This document provides a walkthrough of the project repository, current setup, and execution guidelines.

## Current Setup Walkthrough
1. **Root Directory**:
   * Contains `agy.exe` for agent orchestration.
   * `readme.md` documents directory rules and layout.
   * `.gitignore` ignores compiler logs, local build outputs, env configurations, the `ignore/` directory, and binary/executables like `agy.exe`.
   * `ignore/`: Used for storing unmasked local temporary secrets before GCP migration (blocked from Git version control). Contains `storage_secrets.json`.
2. **Directory Roles**:
   * `memory/`: Tracks state, plan versions, tasks, and walkthroughs.
   * `log/`: Keeps chronological history (`turn_log.md`) and run diaries.
   * `security/`: Holds safety rules, including sensitive data masking (tokens, URLs), Google Cloud Secret Manager policy, pre-commit validation checklist, and authorized Git committer details.
   * `scripts/`: Holds automation and standard scripts. Includes the automated `evaluate_compliance.py` scripted auditor.
   * `doc/`: Holds Google Cloud Rapid Agent Hackathon PDF documents, rules, resources, and FAQ manuals, plus compliance audit reports.
   * `web/`: Next.js web application root (utilizing the Next.js **App Router**), hosted on **Firebase App Hosting** with continuous deployment (CD) via **GitHub**. Configured with Vanilla CSS styling system using a white creamish background and custom color palette (blue, orange, yellow, gold, white, black) in `src/app/globals.css`.
     * `/`: Glassmorphic Landing page with animated floating spheres, a glass navbar, and an official Google Sign-In button. Redirects to `/dashboard` upon successful Firebase Auth.
     * `/dashboard`: Protected database agent UI protected by Firebase Auth guard.
     * `/api/db-metadata`: Dynamic database metadata API endpoint running natively in pure Node.js/TypeScript using `"mongodb"` driver (no child process python spawning).
     * `/api/agent`: Real-time streaming API endpoint running natively in pure Node.js/TypeScript using `@google/genai` for guardrail audits and final presentation stream formatting. Requests OIDC Bearer ID tokens using `google-auth-library` to securely fetch query executions from the private Cloud Run microservice backend.
   * `scratches/`: Temp files and experimental data.
   * `agents/`: Multi-agent playground using the **Google Agent Development Kit (ADK)** in Python. Contains the database wrapper tools (`tools.py`), agent definition (`agent.py`), entry run script (`main.py`), and compliance agent usage manual `compliance_agent_guide.md`.
     * `fahem-agent/`: Independent Python ADK service wrapping MongoDB MCP server, running as a containerized endpoint on Google Cloud Run.
       * **Security & Network Isolation**: Configured with `--no-allow-unauthenticated` to restrict public access. Communication is strictly authenticated using GCP service identity ID tokens (OIDC).
       * **Serverless VPC Connector**: Deployed with `--vpc-connector fahem-connector` and `--vpc-egress all-traffic`. This forces 100% of egress traffic from the microservice to be routed through the secure, private GCP VPC network.
       * **MongoDB Atlas Private Tunnel**: Leverages VPC Peering or Private Service Connect (PSC) to connect to MongoDB Atlas securely. This prevents database traffic from being exposed on the public internet. Outbound internet egress is routed via Cloud NAT with a dedicated static IP whitelisted in MongoDB Atlas.

## Hackathon Context & Track
* **Scope**: Google Cloud Rapid Agent Hackathon (ending June 11, 2026).
* **Track**: MongoDB track, utilizing the MongoDB Model Context Protocol (MCP) server integration to give Gemini models capability over database collections, aggregates, and schemas.

## Git Configuration
* Local git user settings are configured to enforce the commit identity:
  * **Name**: `hesham88`
  * **Email**: `hesham1988@gmail.com`
* Git remote origin is configured to:
  * **URL**: `https://github.com/hesham88/fahem.git`

## Pre-Commit Controls
* Guidelines dictate that all files must be manually or automatically scanned before Git commit/push to guarantee zero leakage of usernames, API keys, or raw configurations. Secrets must first reside in Google Cloud Secret Manager. The `scripts/evaluate_compliance.py` script must be run to generate reports, check for MongoDB track tools integration, and verify leaks.

## Global Guidelines (Persistent Cross-Session)
* The persistent cross-session global configuration and instruction set is stored in **[fahem_guidelines.md](file:///C:/Users/hesh1/.gemini/antigravity-cli/knowledge/fahem_guidelines.md)**. This is automatically scanned and referenced by the agent at the beginning of any session.

## Revision History
* **v62.0** (2026-05-30T15:30:00+03:00): Conducted an exhaustive audit of the Serverless VPC Connector and private network routing topology connecting Cloud Run to MongoDB Atlas over secure private IP spaces. Published the complete project explanation and compiled the definitive, zero-trust protocol suite.
* **v61.0** (2026-05-30T15:28:00+03:00): Investigated and validated Google Cloud Model Armor dual-layer pre-flight safety filter implementation in Python ADK backend (`agents/guardrails.py`) and TypeScript Next.js API orchestrator (`web/src/app/api/agent/grounded/route.ts`).
* **v60.0** (2026-05-30T15:24:00+03:00): Conducted a comprehensive code review and protocol audit, verifying 100% compliance PASS with 0 active leaks or findings, and formally documented all architectural, security, and developer protocols applied across the project.
* **v59.0** (2026-05-30T13:38:13.308631): Rotate live MongoDB credentials, secure workspace by removing hardcoded fallback connection strings and Client SDK secrets, achieving 100% compliance across leak finding and audit scans
* **v58.0** (2026-05-30T02:06:21.318341): Fix GitHub Actions Deploy workflow by binding Cloud Run, Cloud Build, Artifact Registry, Storage, and IAM Service Account User roles to the github-deployer service account, completing TSK-011 with a green pipeline
* **v57.0** (2026-05-30T01:54:02.854451): Implement robust localized SEO metadata, dynamic JSON-LD structured schema elements across all 7 languages, and append SEO checks to permanent workspace and persistent guidelines protocols
* **v56.0** (2026-05-30T01:44:15.358716): Fix GitHub Actions Deploy workflow by creating Workload Identity Pool, OIDC Provider, and binding IAM roles, and update root readme and security files
* **v54.0** (2026-05-29T23:25:00+03:00): Improved `insert_user_report` parameterized tool signature to support custom report fields (`name`, `email`, `subject`, `description`, `timestamp`) dynamically with auto-fallbacks, resolving model tool-selection mismatches. Upgraded `before_tool_callback` in `guardrails.py` to support dynamic user-identity extraction fallbacks from tool arguments and nested insert documents to prevent unauthorized false-positive blocks during writes.
* **v53.0** (2026-05-30T00:10:42.148062): Improve guardrails.py before_agent_callback to unpack serialized JSON context, populating user session environment variables for delegated tool authorization fallback
* **v52.0** (2026-05-29T23:18:59.043323): Fix secure_tools insert_user_report tool execution to use insert-many
* **v51.0** (2026-05-29T22:49:55.752161): Fix app module root_agent ImportError to resolve Cloud Run orchestration crash
* **v50.0** (2026-05-29T22:19:31.334397): Resolve apphosting.yaml secret manager configuration mismatch by excluding MONGODB_AGENT_URL routing endpoint and reverting to plain deployment value
* **v49.0** (2026-05-29T22:12:06.484433): Implement unique username selection flow in onboarding and fix state persistence loop
* **v44.0** (2026-05-29T07:53:00+03:00): Migrated both `/api/db-metadata` and `/api/agent` API routes to native TypeScript. `/api/db-metadata` connects directly to MongoDB via the native `"mongodb"` driver to fetch collections, sizes, and indexes. `/api/agent` implements the multi-agent Guardrail and Presenter/Orchestrator natively using `@google/genai` (Gemini SDK), secure OIDC fetching for service-to-service authentications inside Node.js, and direct fetch POST calls to Cloud Run, fully resolving serverless platform-spawning `spawn python ENOENT` bottlenecks and successfully building Next.js in 8.0s with zero errors or warnings.
* **v43.0** (2026-05-29T07:40:00+03:00): Resolved the `spawn python ENOENT` API route error by implementing a platform-agnostic, robust Python executable locator `getPythonCommand()` in `/api/agent/route.ts` that searches for both local Windows custom paths (`C:\Python313\python.exe`, `C:\Windows\py.exe`) and Linux standard PATH variables.
* **v42.0** (2026-05-29T07:31:00+03:00): Synchronized lockfile peer and optional dependencies by explicitly pinning package.json versions (`kerberos@2.2.2`, `mongodb-client-encryption@6.5.0`, `node-addon-api@6.1.0`) and introducing a `.npmrc` file. Regenerated lockfile successfully via `npm install` on local dev and verified that the Next.js production stand-alone bundle builds flawlessly.
* **v41.0** (2026-05-29T07:25:00+03:00): Synchronize package lock dependencies for Firebase App Hosting deployment compilation, removing dependency mismatches for kerberos and mongodb-client-encryption. Verified with successful Next.js build compilation locally.
* **v40.0** (2026-05-29T07:20:00+03:00): Renamed local MongoDB MCP microservice folder name to `fahem-agent` and updated deployed service name on Cloud Run to match exactly, ensuring complete consistency across folder names, URLs, and environments.
* **v39.0** (2026-05-29T07:16:00+03:00): Documented private Cloud Run service settings (`--no-allow-unauthenticated`) and OIDC service identity authorization token integration for agent-to-agent communication.
* **v38.0** (2026-05-29T07:12:00+03:00): Documented the addition of the Cloud Run microservice folder structure (`mongodb_microservice`) and its containerized orchestration parameters, deployed in the `us-east4` region with session auto-creation.
