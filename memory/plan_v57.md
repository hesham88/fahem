# Project Plan - Version 57
**Timestamp**: 2026-05-30T01:54:02.854451

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
7. **Phase 7: Google Cloud Armor Perimeter Security** (Completed)
   * Create an automated Cloud Armor deployment PowerShell script (`scripts/deploy/configure_cloud_armor.ps1`).
   * Define global security policies with OWASP Top 10 web protections (SQLi, XSS, RCE, LFI).
   * Configure strict rate-limiting rules (100 requests per minute with a 5-minute ban duration) on our Load Balancer endpoints to prevent DDoS and brute-force bot sweeps.
   * Register Serverless Network Endpoint Group (NEG) targeting our private Cloud Run backend microservice.
   * Document Cloud Armor integration inside the main `security.md` architecture guide.
8. **Phase 8: Multilingual SEO & Strict Quality Protocols** (Completed)
   * Design a highly robust, multilingual SEO metadata generation framework supporting Next.js Server Components.
   * Localize metadata blocks (titles, descriptions, keywords) in all 7 supported languages (ar, en, es, fr, de, it, zh).
   * Inject high-fidelity JSON-LD structured data (`WebApplication` schema) on standard Next.js layouts to unlock Rich Search Snippets.
   * Configure alternate localized language link headers (`canonical` and `alternate` bindings) to ensure seamless crawler discoverability.
   * Add a permanent SEO verification and checking directive into the project's persistent global guidelines (`fahem_guidelines.md`) and workspace guardrails (`security/guardrails_v5.md`).

## Revisions History
* **v57.0** (2026-05-30T01:54:02.854451): Implement robust localized SEO metadata, dynamic JSON-LD structured schema elements across all 7 languages, and append SEO checks to permanent workspace and persistent guidelines protocols
* **v56.0** (2026-05-30T01:44:15.358716): Fix GitHub Actions Deploy workflow by creating Workload Identity Pool, OIDC Provider, and binding IAM roles, and update root readme and security files
* **v55.0** (2026-05-30T01:45:00+03:00): Designed and implemented enterprise-grade edge perimeter security using Google Cloud Armor. Created a robust PowerShell deployment script `configure_cloud_armor.ps1` to orchestrate security policy creation, OWASP WAF protections (SQLi, XSS, RCE, LFI), DDoS rate-limiting configurations, Serverless NEG binding, and global HTTP(S) Load Balancer routing. Fully updated the core `security.md` architectural specifications to document the new perimeter security posture.
* **v54.0** (2026-05-29T23:25:00+03:00): Improved `insert_user_report` parameterized tool signature to support custom report fields (`name`, `email`, `subject`, `description`, `timestamp`) dynamically with auto-fallbacks, resolving model tool-selection mismatches. Upgraded `before_tool_callback` in `guardrails.py` to support dynamic user-identity extraction fallbacks from tool arguments and nested insert documents to prevent unauthorized false-positive blocks during writes.
* **v53.0** (2026-05-30T00:10:42.148062): Improve guardrails.py before_agent_callback to unpack serialized JSON context, populating user session environment variables for delegated tool authorization fallback
* **v52.0** (2026-05-29T23:18:59.043323): Fix secure_tools insert_user_report tool execution to use insert-many
* **v51.0** (2026-05-29T22:49:55.752161): Fix app module root_agent ImportError to resolve Cloud Run orchestration crash
* **v50.0** (2026-05-29T22:19:31.334397): Resolve apphosting.yaml secret manager configuration mismatch by excluding MONGODB_AGENT_URL routing endpoint and reverting to plain deployment value
* **v49.0** (2026-05-29T22:12:06.484433): Implement unique username selection flow in onboarding and fix state persistence loop
* **v48.0** (2026-05-29T20:15:00+03:00): Corrected English and Latin typography variable loops in CSS, resolving unstyled fallback font overrides and styling Latin locales with larger, smooth, comfortable modern layouts. Implemented full RTL side panel mirroring for Arabic views. Locked and dimmed the Name and Email fields in the report ingestion panel for authenticated users to preserve identity alignment. Successfully deployed the updated private `fahem-agent` microservice revision to Cloud Run.
