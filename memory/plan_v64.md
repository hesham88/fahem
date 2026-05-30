# Project Plan - Version 64
**Timestamp**: 2026-05-30T21:15:00+03:00

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
9. **Phase 9: Secret Rotation & Codebase Hardcode Purging** (Completed)
   * Rotate live MongoDB connection string credentials to the new private cluster endpoint and update GCP Secret Manager `fahem_mongodb_uri` to Version 2.
   * Purge all hardcoded database fallback connection strings, hosts, and Client-side Firebase credentials/API keys from the scanned codebase to ensure absolute compliance.
   * Verify zero active leaks or vulnerability findings via automated leak sweep tools and compliance evaluation scripts.
10. **Phase 10: Compliance Audit & Architectural Verification** (Completed)
    * Complete full repository review and protocol audit using the automated compliance evaluator script (`evaluate_compliance.py`).
    * Document all applied security, development, collaboration, and architectural protocols.
    * Inspect and verify double-layer integration of Google Cloud Model Armor in both the Python ADK backend guardrails and TypeScript serverless Next.js orchestrator API routes.
11. **Phase 11: VPC Private Networking Tunnel Architecture & High-Fidelity Project Reprint** (Completed)
    * Audit exact Serverless VPC network configuration (`fahem-connector`) in `deploy_agent.ps1` with strict `--vpc-egress all-traffic` rules.
    * Map out private IP tunnel network topology linking containerized Cloud Run agents (`fahem-agent`) directly to MongoDB Atlas cluster via VPC Peering / Private Service Connect (PSC) with Static Outbound Cloud NAT IP whitelisting.
    * Compile and publish an exhaustive high-fidelity architectural blueprint of the entire multi-tiered, secure enterprise orchestrator.
12. **Phase 12: Mobile Screen Optimization & Responsive Protocol** (Completed)
    * Define and formally document the `responsive_mobile_friendly_UI` protocol in `collaboration_protocol.md`.
    * Restructure web interface layout using media queries in `web/src/app/globals.css` to gracefully degrade on mobile viewports.
    * Use CSS `display: contents` to flatten the sidebar layout hierarchy and build a fluid, sticky grid-based mobile top nav strip.
    * Restructure multi-column preset and stat grids into responsive single-column stacked structures under screen width `< 600px`.
    * Enforce automated horizontal scrolling (`overflow-x: auto`) for data tables rendered inside Markdown components.
13. **Phase 13: Hamburger Collapsible Mobile Drawer Navigation** (Completed)
    * Refactor `/home` dashboard structure to introduce a React state `isMobileSidebarOpen` controlling sidebar visibility.
    * Implement a modern sticky `.mobile-header` top bar visible only under `< 900px`, featuring a responsive hamburger menu toggler button.
    * Transform the sidebar `.sidebar` on mobile into a fully collapsible slide-out drawer sliding in from the left (LTR) or right (RTL), complete with a rotating close button (`FiX`).
    * Introduce a smooth `.sidebar-backdrop` overlay covering the page content with a glass-blur effect to easily dismiss the navigation drawer.

## Revisions History
* **v64.0** (2026-05-30T21:15:00+03:00): Implemented a premium hamburger collapsible mobile sidebar drawer. Upgraded `page.tsx` with toggle states and injected highly polished media query drawer styles, backdrop blurs, and RTL direction alignments in `globals.css`.
* **v63.0** (2026-05-30T21:05:00+03:00): Added Phase 12 to formally establish the `responsive_mobile_friendly_UI` protocol. Refactored layout styling in `globals.css` with responsive media queries (<900px, <600px), converting the vertical desktop sidebar to a sticky horizontal top navigation bar and restructuring dense dashboards for small screen viewports.
* **v62.0** (2026-05-30T15:30:00+03:00): Conducted an exhaustive audit of the Serverless VPC Connector and private network routing topology connecting Cloud Run to MongoDB Atlas over secure private IP spaces. Published the complete project explanation and compiled the definitive, zero-trust protocol suite.
