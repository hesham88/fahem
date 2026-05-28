# Project Plan - Version 26
**Timestamp**: 2026-05-29T02:41:27.038346

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
5. **Phase 5: Glassmorphic Google Auth Integration** (Completed)
   * Build glassmorphic Landing page with animated floating spheres, a glass navbar, and an official Google branded Sign-in button.
   * Implement client-side Auth checks using Firebase Auth `onAuthStateChanged`.
   * Secure `/dashboard` routes to redirect to `/` if not logged in.
   * Configure Firebase SDK to export `auth` and `googleProvider` instances.
6. **Phase 6: Deploy & Verify** (In Progress)
   * Verify Next.js build compiled successfully.
   * Run compliance sweeps locally.
   * Stage, commit, and push files to GitHub to trigger automated Firebase deployment.

## Revisions History
* **v26.0** (2026-05-29T02:41:27.038346): Create GCP Secret Manager secrets for MongoDB URI, Storage Bucket, and Gemini API keys, and grant App Hosting backend IAM access permissions.
* **v25.0** (2026-05-29T02:37:30.452483): Test the Python ADK agent utilizing the MongoDB MCP tool to successfully connect and retrieve the list of collections from the fahem database.
* **v24.0** (2026-05-29T02:30:25.936483): Update local Gemini API credentials with new revoked key replacement. Scan workspace to verify zero plaintext exposures.
* **v23.0** (2026-05-29T02:24:56.339411): Mask all plaintext Firebase and Storage secret configurations in project plans, turn logs, and apphosting.yaml manifest. Map client-side credentials to Secret Manager bindings.
* **v22.0** (2026-05-29T02:21:33.743250): Add workspace automation script to manage memory versions, turn logs, and audit credentials. Configured Gemini configuration mappings in apphosting.yaml and .env.example.
* **v21.0** (2026-05-29T02:18:50+03:00): Implemented the Google Authentication landing page. Built glassmorphic navbar, hero container, and background spheres. Protected the dashboard using a client-side Firebase Auth guard. Resolved inline style compliance sweep issues. Checked that the production Next.js build compiled successfully and verified 100% compliance pass.
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
