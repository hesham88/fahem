# Project Plan - Version 18

## Objective
Develop a production-grade multi-agent system using the Google Agent Development Kit (ADK) that integrates the **MongoDB MCP server** to solve database challenges, featuring a Next.js (App Router) frontend hosted on Firebase App Hosting. This project is built for the **Google Cloud Rapid Agent Hackathon (MongoDB Track)** under strict security, masking, and timestamped compliance auditing rules.

## Project Scope
* **Context**: Google Cloud Rapid Agent Hackathon (May 5, 2026 - June 11, 2026).
* **Track**: MongoDB Partner Track.
* **Goal**: Build a functional agent using `@google/adk` programmatically integrated with the MongoDB MCP server, paired with a web dashboard for execution and visualization.
* **Tech Stack**:
  * AI Model: Gemini 2.5 (via ADK / Vertex AI / Gemini API).
  * Agent Orchestrator: Google Agent Development Kit (ADK).
  * Frontend: Next.js App Router (TypeScript, Vanilla CSS).
  * Hosting & Deployments: Firebase App Hosting (continuous deployment via GitHub repository `fahem`).
  * Secret Storage: Google Cloud Secret Manager.

## Phases
1. **Phase 1: Project Initialization & Persistent Global Guidelines** (Completed)
   * Setup workspace directory structure and global project guidelines.
   * Initialize local Git repository, configure remote to GitHub repository `fahem`, and enforce committer identity.
   * Configure root `.gitignore` to block the `ignore/` directory for raw secret masking.
2. **Phase 2: Scaffolding & Design Framework Setup** (Completed)
   * Bootstrap Next.js App Router without Tailwind CSS inside the `web/` folder.
   * Bootstrap `@google/adk` TypeScript agents workspace inside the `agents/` folder.
   * Implement automated python-based compliance evaluator agent (`scripts/evaluate_compliance.py`) to audit rules, leaks, and missing MongoDB integration components, refined to exclude competitor mentions by name.
3. **Phase 3: MongoDB MCP Tooling & Agent Logic** (In Progress)
   * Connect and configure the MongoDB MCP server with the ADK agents.
   * Design agent tools that call MongoDB MCP schema, find, aggregation, and stats tools.
   * Secure credentials (connection strings) via Google Cloud Secret Manager.
4. **Phase 4: Next.js Frontend & Firebase App Hosting Integration**
   * Build the web interface with Vanilla CSS (cream paper theme, gold/blue accents).
   * Integrate Firebase App Hosting configurations (`apphosting.yaml`).
   * Setup automated GitHub actions/triggers for deployment on push.

## Revisions History
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
* **v6.0** (2026-05-29T01:14:12+03:00): Added persistent global guidance setup in the CLI knowledge folder.
* **v5.0** (2026-05-29T01:13:27+03:00): Specified GitHub repository integration to auto-deploy commits to Firebase App Hosting.
* **v4.0** (2026-05-29T01:12:40+03:00): Specified Next.js App Router and Firebase App Hosting (apphosting.yaml) as the runtime and framework hosting targets.
* **v3.0** (2026-05-29T01:12:21+03:00): Specified Firebase Hosting as the hosting solution for the Next.js web app.
* **v2.0** (2026-05-29T01:12:05+03:00): Added Google Cloud Secret Manager integration and data masking constraints.
* **v1.0** (2026-05-29T01:05:15+03:00): Initial plan structure created.
