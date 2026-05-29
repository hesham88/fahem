# Project Plan - Version 38
**Timestamp**: 2026-05-29T07:12:00+03:00

## Objective
Develop a production-grade multi-agent system using the Google Agent Development Kit (ADK) in **Python** that integrates the **MongoDB MCP server** to solve database challenges, featuring a Next.js (App Router) frontend hosted on Firebase App Hosting. This project is built for the **Google Cloud Rapid Agent Hackathon (MongoDB Track)** under strict security, masking, and timestamped compliance auditing rules.

## Project Scope
* **Context**: Google Cloud Rapid Agent Hackathon (ending June 11, 2026).
* **Track**: MongoDB Partner Track.
* **Goal**: Build a functional agent using `google-adk` programmatically integrated with the MongoDB MCP server, paired with a web dashboard for execution and visualization.
* **Tech Stack**:
  * AI Model: Gemini 3.1 Flash Lite (via Gemini API / google-adk).
  * Agent Orchestrator: Google Agent Development Kit (ADK) in Python.
  * Frontend: Next.js App Router (TypeScript, Vanilla CSS).
  * Hosting & Deployments: Firebase App Hosting (continuous deployment via GitHub repository `fahem` mapped to project `fahem-88d40`).
  * Secret Storage: Google Cloud Secret Manager / Ignored local env.

## Phases
1. **Phase 1: Project Initialization & Persistent Global Guidelines** (Completed)
   * Setup workspace directory structure and global project guidelines.
   * Initialize local Git repository, configure remote to GitHub repository `fahem`, and enforce committer identity.
   * Configure root `.gitignore` to block the `ignore/` directory for raw secret masking.
2. **Phase 2: Scaffolding & Design Framework Setup** (Completed)
   * Bootstrap Next.js App Router without Tailwind CSS inside the `web/` folder.
   * Bootstrap `google-adk` Python agents workspace inside the `agents/` folder.
   * Implement automated python-based compliance evaluator agent (`scripts/evaluate_compliance.py`) to audit rules, leaks, and missing MongoDB integration components.
3. **Phase 3: MongoDB MCP Tooling & Agent Logic** (Completed)
   * Connect and configure the MongoDB MCP server with the ADK agents dynamically using platform-agnostic commands (`npx.cmd` vs `npx`).
   * Design custom Python agent tools (`agents/tools.py`) that wrap MongoDB schema, collection listing, and statistics using `pymongo`.
   * Resolve pydantic V2 serialization conflict with `bson.timestamp.Timestamp` types by implementing a top-level monkeypatch.
   * Verify direct and agent-based database operations on the live cluster.
4. **Phase 4: Next.js Frontend & Firebase App Hosting Integration** (Completed)
   * Build the web interface with Vanilla CSS (cream paper theme, gold/blue accents, responsive cards).
   * Implement streaming Next.js API route that executes the Python ADK agent and pipes its execution stream in real-time.
   * Integrate Firebase App Hosting configurations (`web/apphosting.yaml` and standalone next config).
   * Save the storage secret `[MASKED_STORAGE_SECRET_URI]` in local configuration (`web/.env.local`, `ignore/storage_secrets.json`) and configure its secret binding in `web/apphosting.yaml`.
5. **Phase 5: Glassmorphic Google Auth & Multi-language Integration** (Completed)
   * Build glassmorphic Landing page with animated floating spheres, a glass navbar, and an official Google branded Sign-in button.
   * Implement client-side Auth checks using Firebase Auth `onAuthStateChanged`.
   * Secure `/dashboard` routes to redirect to `/` if not logged in.
   * Configure Firebase SDK to export `auth` and `googleProvider` instances.
   * Implement full localized 7-language text, fallbacks, system console streaming outputs, and preset queries across all client pages.
6. **Phase 6: Deploy & Verify** (In Progress)
   * Deploy the MongoDB MCP microservice to Cloud Run in `us-east4` region with auto-session creation.
   * Update Next.js configurations and execute compliance/smoke tests.
   * Stage, commit, and push files to GitHub to trigger automated Firebase deployment.

## Revisions History
* **v38.0** (2026-05-29T07:12:00+03:00): Deploy the MongoDB MCP agent microservice to Cloud Run in the `us-east4` region (not `us-central1`). Update multi-agent orchestrator configurations, preserve full history and turn logs without override or deletion.
* **v37.0** (2026-05-29T06:16:35.500031): Resolve inline style competitor false-positives for compliance sweep, removing inline pointer styles across terms, privacy, report, and dashboard, moving them to globals.css and tab-btn class properties, achieving 100% compliant pass with 0 active findings.
* **v36.0** (2026-05-29T06:01:24.379990): Remove MDB_MCP_API_CLIENT_ID and MDB_MCP_API_CLIENT_SECRET environment variable bindings from apphosting.yaml and .env.local as database communications are strictly managed via MongoDB MCP.
* **v35.0** (2026-05-29T05:56:01.031343): Organize web dashboard header into an elegant glassmorphic vertical side panel navigation, implement beautiful rounded user avatar cards, support seamless dynamic LTR/RTL mirroring for localized language layout compliance, and compile successfully.
* **v34.0** (2026-05-29T05:18:30.000000): Complete 100% full-page internationalization (i18n) by localizing fallback alerts, stream logs, error reports, and interactive database preset queries across all 7 languages.
* **v33.0** (2026-05-29T05:09:30.561066): Implement full native 7-language i18n support in Python ADK MongoDB agent instruction, and update Python agent console runner to support robust Unicode printing of non-English outputs.
* **v32.0** (2026-05-29T03:11:13.751178): Support multiple comma-separated super admins, and resolve agents/main.py path resolution dynamically in standalone Next.js builds
* **v31.0** (2026-05-29T03:07:29.268608): Exposed localized controls for Sourcing Engine in Admin panel, support full RTL/LTR configurations, and ensure successful Next.js compile
* **v30.0** (2026-05-29T02:59:27.390971): Fix next.config.ts outputFileTracingIncludes configuration, update API routes path checks to use statically scoped strings, and compile Next.js successfully
* **v29.0** (2026-05-29T02:57:44.163208): Improve UI typography loading Playfair Display, Plus Jakarta Sans, and JetBrains Mono, and enhance spacing and line heights for reading area comfort
* **v28.0** (2026-05-29T02:55:13.376694): Implement live MongoDB cluster metadata retrieval using Node/Python bridge and swap Japanese for Italian in translations context
* **v27.0** (2026-05-29T02:53:29.614262): Implement 7-language localization system, fix App Hosting build secrets, and add Next.js standalone file tracing for Python agents
* **v26.0** (2026-05-29T02:41:27.038346): Create GCP Secret Manager secrets for MongoDB URI, Storage Bucket, and Gemini API keys, and grant App Hosting backend IAM access permissions.
* **v25.0** (2026-05-29T02:37:30.452483): Test the Python ADK agent utilizing the MongoDB MCP tool to successfully connect and retrieve the list of collections from the fahem database.
* **v24.0** (2026-05-29T02:30:25.936483): Update local Gemini API credentials with new revoked key replacement. Scan workspace to verify zero plaintext exposures.
* **v23.0** (2026-05-29T02:24:56.339411): Mask all plaintext Firebase and Storage secret configurations in project plans, turn logs, and apphosting.yaml manifest. Map client-side credentials to Secret Manager bindings.
* **v22.0** (2026-05-29T02:21:33.743250): Add workspace automation script to manage memory versions, turn logs, and audit credentials. Configured Gemini configuration mappings in apphosting.yaml and .env.example.
* **v20.0** (2026-05-29T02:18:50+03:00): Implemented the Google Authentication landing page. Built glassmorphic navbar, hero container, and background spheres. Protected the dashboard using a client-side Firebase Auth guard. Resolved inline style compliance sweep issues. Checked that the production Next.js build compiled successfully and verified 100% compliance pass.
* **v20.0** (2026-05-29T02:16:30+03:00): Saved storage secret to local config (`ignore/storage_secrets.json`, `.env.local`) and mapped it in `web/apphosting.yaml`. Built a beautiful Next.js frontend with cream paper UI design and real-time streaming capability via `/api/agent`. Compiled Next.js application successfully, cleaned background tasks, and confirmed compliance pass.
* **v19.0** (2026-05-29T02:13:00+03:00): Migrated the ADK multi-agent framework from TypeScript to Python. Created `agents/requirements.txt`, `agents/tools.py`, `agents/agent.py`, and `agents/main.py`. Configured the agent to connect dynamically to the MongoDB MCP server and registered custom pymongo database tools. Resolved BSON Pydantic V2 serialization crashes using a top-level hook. Created `.firebaserc`, `web/apphosting.yaml`, and set Next.js output to standalone. Verified 100% PASS on compliance sweep.
* **v18.0** (2026-05-29T01:44:18+03:00): Cleaned up workspace files to remove specific competitor names by name, replacing them with generic references. Updated the compliance evaluator agent (`scripts/evaluate_compliance.py`) to audit for missing MongoDB track integration and ignore documentation/styling false positives.
* **v17.0** (2026-05-29T01:42:15+03:00): Updated compliance agent script to ignore local system usernames (`hesh1`) to eliminate false-positive path logs.
* **v16.0** (2026-05-29T01:36:27+03:00): Refined the scripted compliance evaluator agent to output highly professional, well-structured, formatted Markdown audit reports in the `doc/` folder.
* **v15.0** (2026-05-29T01:32:25+03:00): Created the `scripts/evaluate_compliance.py` scripted agent and root `.gitignore` rules to isolate raw secrets in `ignore/`. Documented evaluation steps in `agents/compliance_agent_guide.md`.
* **v14.0** (2026-05-29T01:27:04+03:00): Read hackathon rules/details from `doc/` PDFs. Updated scope, target track (MongoDB), and roadmap phases to match the hackathon criteria.
* **v13.0** (2026-05-29T01:24:22+03:00): Scaffolded ADK multi-agent framework in the `agents` folder and completed Next.js App Router bootstrapping in `web` folder.
* **v12.0** (2026-05-29T01:23:26+03:00): Added Design/Aesthetics (Paper theme, custom palette, Vanilla CSS) constraints to Phase 3.
* **v11.0** (2026-05-29T01:18:19+03:00): Added localized timestamping policy to all plans, tasks, walkthroughs, and logs.
* **v10.0** (2026-05-29T01:17:19+03:00): Confirmed global persistent capability of guidelines across session closures.
* **v9.0** (2026-05-29T01:16:17+03:00): Added pre-commit scanning requirement to Phase 2 to prevent any commits containing sensitive unmasked data.
* **v8.0** (2026-05-29T01:15:48+03:00): Git remote origin set to `https://github.com/hesham88/fahem.git`.
* **v7.0** (2026-05-29T01:15:15+03:00): Git repository initialized locally and user committer identity constraints configured.
* **v6.0** (2026-05-29T01:14:12+03:00): Added persistent global guidelines setup in the CLI knowledge folder.
* **v5.0** (2026-05-29T01:13:27+03:00): Specified Next.js App Router and Firebase App Hosting (apphosting.yaml) as the runtime and framework hosting targets.
* **v4.0** (2026-05-29T01:12:40+03:00): Specified Next.js App Router and Firebase App Hosting (apphosting.yaml) as the runtime and framework hosting targets.
* **v3.0** (2026-05-29T01:12:21+03:00): Specified Firebase Hosting as the hosting solution for the Next.js web app.
* **v2.0** (2026-05-29T01:12:05+03:00): Added Google Cloud Secret Manager integration and data masking constraints.
* **v1.0** (2026-05-29T01:05:15+03:00): Initial plan structure created.
