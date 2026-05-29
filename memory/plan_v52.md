# Project Plan - Version 52
**Timestamp**: 2026-05-29T23:18:59.043323

## Objective
Develop a production-grade multi-agent system using the Google Agent Development Kit (ADK) in **Python** that integrates the **MongoDB MCP server** to solve database challenges, featuring a Next.js (App Router) frontend hosted on Firebase App Hosting. This project is built for the **Google Cloud Rapid Agent Hackathon (MongoDB Track)** under strict security, masking, and timestamped compliance auditing rules.

## Project Scope
* **Context**: Google Cloud Rapid Agent Hackathon (ending June 11, 2026).
* **Track**: MongoDB Partner Track.
* **Goal**: Build a functional agent using `google-adk` programmatically integrated with the MongoDB MCP server, paired with a web dashboard for execution and visualization.
* **Tech Stack**:
  * AI Model: Gemini 3.1 Flash Lite (via Gemini API / google-adk).
  * Agent Orchestrator: Google Agent Development Kit (ADK) in Python (microservice) & TypeScript (frontend orchestrator fallback).
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
6. **Phase 6: Deploy & Verify** (Completed)
   * Deploy the MongoDB MCP microservice to Cloud Run in `us-east4` region with the exact name `fahem-agent`, auto-session creation, and strict IAM authentication (no public access).
   * Rename the local microservice directory to `fahem-agent` to match the Cloud Run service name exactly.
   * Secure multi-agent orchestrator communications with GCP service-to-service OAuth2/OIDC ID tokens.
   * Sync package-lock.json peer and optional dependencies (kerberos, mongodb-client-encryption, node-addon-api) to support seamless production builds on Firebase App Hosting.
   * Run Google Cloud Model Armor policy configurations and self-healing schema index tuning on the live database.
   * Execute local compilation checks, compliance/smoke tests.
   * Stage, commit, and push files to GitHub to trigger automated Firebase deployment.

## Revisions History
* **v52.0** (2026-05-29T23:18:59.043323): Fix secure_tools insert_user_report tool execution to use insert-many
* **v51.0** (2026-05-29T22:49:55.752161): Fix app module root_agent ImportError to resolve Cloud Run orchestration crash
* **v50.0** (2026-05-29T22:19:31.334397): Resolve apphosting.yaml secret manager configuration mismatch by excluding MONGODB_AGENT_URL routing endpoint and reverting to plain deployment value
* **v49.0** (2026-05-29T22:12:06.484433): Implement unique username selection flow in onboarding and fix state persistence loop
* **v48.0** (2026-05-29T20:15:00+03:00): Corrected English and Latin typography variable loops in CSS, resolving unstyled fallback font overrides and styling Latin locales with larger, smooth, comfortable modern layouts. Implemented full RTL side panel mirroring for Arabic views. Locked and dimmed the Name and Email fields in the report ingestion panel for authenticated users to preserve identity alignment. Successfully deployed the updated private `fahem-agent` microservice revision to Cloud Run.
* **v47.0** (2026-05-29T20:10:00+03:00): Successfully updated regional Google Cloud Model Armor template with Sensitive Data Protection (SDP), declared and deployed self-healing database schema index tuning inside our private Cloud Run container (establishing unique user indexes and composite chat message retrieval indexes over MCP), and launched the final Next.js production build verification.
* **v46.0** (2026-05-29T20:02:00+03:00): Fixed the compliance script false positive on CSS/Tailwind 'cursor-' classes, securing 100% compliant pass with 0 active findings. Generated clean comprehensive walkthrough and architecture model artifact (`fahem_implementation_walkthrough_v46.md`).
* **v45.0** (2026-05-29T08:15:00+03:00): Fixed the 403 Forbidden HTTP error by introducing a highly robust dual-strategy OIDC token retrieval mechanism in the Next.js `/api/agent` route (fetching directly from the GCP Metadata Server first, with a fallback to `google-auth-library`), ensuring seamless authenticated service-to-service communication with the private `fahem-agent` Cloud Run container.
* **v44.0** (2026-05-29T07:53:00+03:00): Migrated both `/api/db-metadata` and `/api/agent` API routes to native TypeScript. `/api/db-metadata` connects directly to MongoDB via the native `"mongodb"` driver to fetch collections, sizes, and indexes. `/api/agent` implements the multi-agent Guardrail and Presenter/Orchestrator natively using `@google/genai` (Gemini SDK), secure OIDC fetching for service-to-service authentications inside Node.js, and direct fetch POST calls to Cloud Run, fully resolving serverless platform-spawning `spawn python ENOENT` bottlenecks and successfully building Next.js in 8.0s with zero errors or warnings.
* **v43.0** (2026-05-29T07:40:00+03:00): Resolved the `spawn python ENOENT` API route error by implementing a platform-agnostic, robust Python executable locator `getPythonCommand()` in `/api/agent/route.ts` that searches for both local Windows custom paths (`C:\Python313\python.exe`, `C:\Windows\py.exe`) and Linux standard PATH variables.
* **v42.0** (2026-05-29T07:31:00+03:00): Pinned exact required versions of peer and optional dependencies (`kerberos@2.2.2`, `mongodb-client-encryption@6.5.0`, and `node-addon-api@6.1.0`) in `web/package.json` and introduced a `web/.npmrc` file with `legacy-peer-deps=true` and `strict-peer-deps=false` configurations. Ran `npm install` inside the `web` folder to generate a clean, fully-synchronized, platform-agnostic `package-lock.json` file. Successfully compiled the Next.js production build locally.
* **v41.0** (2026-05-29T07:25:00+03:00): Synchronize package-lock.json peer and optional dependencies (kerberos, mongodb-client-encryption, node-addon-api) inside `web/package.json` and force-regenerate lockfile to resolve Firebase App Hosting `npm ci` out-of-sync dependency errors. Successfully compiled Next.js build locally and pushed to GitHub main branch.
* **v40.0** (2026-05-29T07:20:00+03:00): Rename the MongoDB MCP microservice folder name to `fahem-agent` in `web/agents/` and deploy the private service under the exact name `fahem-agent` to Cloud Run in the `us-east4` region. Update `.env.local` URL configuration and complete E2E integration verification.
* **v39.0** (2026-05-29T07:16:00+03:00): Enforce private deployment of MongoDB MCP Cloud Run microservice using `--no-allow-unauthenticated` (no public access). Implement standard GCP OIDC ID token authentication for Orchestrator-to-Microservice communication, satisfying all security, dockerization, and microservice isolation comments.
* **v38.0** (2026-05-29T07:12:00+03:00): Deploy the MongoDB MCP agent microservice to Cloud Run in the `us-east4` region (not `us-central1`). Update multi-agent orchestrator configurations, preserve full history and turn logs without override or deletion.
