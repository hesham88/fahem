# Project Walkthrough - Version 63
**Timestamp**: 2026-05-30T21:05:00+03:00

This document provides a walkthrough of the project repository, current setup, and execution guidelines.

## Current Setup Walkthrough
1. **Root Directory**:
   * Contains `agy.exe` for agent orchestration.
   * `readme.md` documents directory rules and layout.
   * `.gitignore` ignores compiler logs, local build outputs, env configurations, the `ignore/` directory, and binary/executables like `agy.exe`.
   * `ignore/`: Used for storing unmasked local temporary secrets before GCP migration (blocked from Git version control). Contains `storage_secrets.json`.
2. **Directory Roles**:
   * `memory/`: Tracks state, plan versions, tasks, and walkthroughs, including the formally defined Section 4: Responsive Mobile-Friendly UI Protocol (`responsive_mobile_friendly_UI`) in `collaboration_protocol.md`.
   * `log/`: Keeps chronological history (`turn_log.md`) and run diaries.
   * `security/`: Holds safety rules, including sensitive data masking (tokens, URLs), Google Cloud Secret Manager policy, pre-commit validation checklist, and authorized Git committer details.
   * `scripts/`: Holds automation and standard scripts. Includes the automated `evaluate_compliance.py` scripted auditor.
   * `doc/`: Holds Google Cloud Rapid Agent Hackathon PDF documents, rules, resources, and FAQ manuals, plus compliance audit reports.
   * `web/`: Next.js web application root (utilizing the Next.js **App Router**), hosted on **Firebase App Hosting** with continuous deployment (CD) via **GitHub**. Configured with Vanilla CSS styling system using a white creamish background and custom color palette (blue, orange, yellow, gold, white, black) in `src/app/globals.css`.
     * **Mobile Responsiveness**: `globals.css` contains highly targeted media queries (under screen widths `< 900px` and `< 600px`) that reorganize layouts gracefully on smaller screens. This includes transforming the vertical desktop sidebar into a sticky horizontal top bar, using `display: contents` to flatten hierarchy, stacking multi-column dashboard grids, hiding heavy text elements, and auto-scrolling dense Markdown data tables.
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
* **v63.0** (2026-05-30T21:05:00+03:00): Registered mobile screen responsive optimizations under the newly integrated `responsive_mobile_friendly_UI` protocol standard.
* **v62.0** (2026-05-30T15:30:00+03:00): Conducted an exhaustive audit of the Serverless VPC Connector and private network routing topology connecting Cloud Run to MongoDB Atlas over secure private IP spaces. Published the complete project explanation and compiled the definitive, zero-trust protocol suite.
* **v61.0** (2026-05-30T15:28:00+03:00): Investigated and validated Google Cloud Model Armor dual-layer pre-flight safety filter implementation in Python ADK backend (`agents/guardrails.py`) and TypeScript Next.js API orchestrator (`web/src/app/api/agent/grounded/route.ts`).
* **v60.0** (2026-05-30T15:24:00+03:00): Conducted a comprehensive code review and protocol audit, verifying 100% compliance PASS with 0 active leaks or findings, and formally documented all architectural, security, and developer protocols applied across the project.
