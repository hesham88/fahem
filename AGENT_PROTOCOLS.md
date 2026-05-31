# 🛡️ Fahem Project: AI Agent Development Protocols & Compliance Rules

Welcome, AI Coding Agent! This document defines the **mandatory engineering protocols, compliance gates, and architectural constraints** governing the **Fahem** project. 

Any AI system or developer editing this codebase **MUST** read, understand, and fully adhere to these protocols. Failure to comply will violate security guidelines, trigger deployment blocks, or fail the pre-push compliance checks.

---

## 🧭 1. Architectural Integrity & Decoupling

Fahem is a secure multi-agent swarm platform. To prevent architectural decay, you must adhere to the following decoupling rules:

* **Zero Direct PyMongo Mutations**: Direct database insertions, updates, or deletions using direct PyMongo or MongoClient lines inside the main agent scripts (e.g., `agents/agent.py`) are **strictly prohibited**. 
* **Model Context Protocol (MCP) Delegation**: All database operations must be programmatically delegated through high-level parameterized tools exposed by our custom **MongoDB Atlas MCP Server**.
* **ADK 2.0 Graph Primitives**: Do not write linear procedural routing loops. All agent handoffs and workflows must be constructed using Google ADK 2.0 dynamic **`Workflow` and `Node` structures**.
* **High-Context Specialist Partitioning**: Keep agent prompts specialized and micro-scoped (MCQ, Text Practice, Oral, Zatona, Insights) to minimize prompt bloat and keep reasoning trajectories deterministic.

---

## 🔑 2. Identity, Version Control & Secrets Policy

To ensure compliance with hackathon rules and CI/CD pipelines, you must enforce strict access controls:

* **Authorized Git Identity**: You must only commit code to version control using the following Git identity:
  * **Git Name**: `hesham88`
  * **Git Email**: `hesham1988@gmail.com`
* **Zero Plaintext Credentials**: Never hardcode API keys, database connection strings, or cloud tokens. Local dev keys reside in `web/.env.local` or `ignore/storage_secrets.json` (both blocked in `.gitignore`). Production secrets are secured inside **GCP Secret Manager**.
* **Pre-Commit Compliance Verification**: Before completing any workspace modification or submitting code, you **MUST** run the compliance script locally:
  ```powershell
  python scripts/evaluate_compliance.py
  ```
  This script audits your modified files for plaintext credentials, local paths, unauthorized libraries, and incorrect Git identities.

---

## 🎨 3. UI/UX Excellence & Arabic RTL Support

Fahem is a premium, localized, pocket-sized companion. The interface must look elegant, responsive, and tactile.

* **Vanilla CSS Only**: Strictly avoid Tailwind CSS unless the user explicitly requests it. Rely on modern, organized CSS variables and custom tokens in `web/src/app/globals.css`.
* **CSS Logical Properties**: Never hardcode asymmetrical directions (e.g., `margin-left` or `right: 0`) inside layouts. Always use **CSS logical properties** (`margin-inline-start`, `padding-inline-end`, `inset-inline-end`) so that the application layout naturally mirrors itself when switching directions between English (`dir="ltr"`) and Arabic (`dir="rtl"`).
* **RTL Nav Layout Guard**: Never reverse a natural direction reversal by force. For example, do not apply `flex-direction: row-reverse` on `.glass-nav-links` under `[dir="rtl"]`, as the HTML root `dir="rtl"` naturally flows the items from right to left; overriding it forces LTR flow and causes navigation collisions with the logo.
* **DOM-Level Copy-Paste Blocker**: To promote active recall and educational rigor, all open-ended writing workspaces (such as the Text Practice pane) must contain event listeners that call `event.preventDefault()` on `"paste"` events.

---

## 💾 4. Session Continuity & Onboarding Safeguards

* **No Volatile In-Memory States**: Never save onboarding checkpoints, selected languages, or session parameters directly to global Python variables or private agent instance fields.
* **ADK Transaction States**: Save progress transactionally inside the ADK `ToolContext` using `context.state`. A background thread must serialize this state back to the persistent `onboarding_sessions` collection in MongoDB.
* **SMS Verification Logic Guard**: 
  * On session startup, query the active profile from the `user_profiles` collection.
  * If **`phone_verified: true`** is returned, you **MUST completely bypass the SMS verification screen** and redirect the student straight to the core dashboard unless the user explicitly requests a session reset.

---

## 🧪 5. Trajectory Evaluations & Quality Gates

* **Zero Direct Prompt Commits**: Never edit model prompts directly in production without evaluating their impact on routing trajectories.
* **Programmatic CLI Evaluation**: Configure test suites in `tests/eval/evalsets/basic.evalset.json` and execute:
  ```powershell
  google-agents-cli eval run
  ```
* **Production Quality Score**: Prompt changes or agent definitions will be blocked from merging unless they achieve a minimum score of **0.85** on the trajectory validation and grounding evaluations, ensuring that the orchestrator routes cleanly to specialized subagents.

---

## 📁 6. Workspace Artifact Archival & Mirroring

To ensure persistent workspace-level tracking, compliance transparency, and version accountability:
* **Automatic Mirroring**: All generated system brain artifacts (e.g. plans, blueprints, audits, milestones) **MUST** be persistently mirrored into the workspace `/artifacts` folder.
* **Revision Tracking**: When an artifact is updated, save a timestamped copy under `/artifacts/revisions` (e.g. `artifact_name_rev_YYYYMMDD_HHMMSS.md`) before writing the updated version to `/artifacts`. This preserves the complete historical trajectory.
* **Verification**: Keep this directory unignored in `.gitignore` to guarantee full inclusion in Git commits and remote push pushes.

---

## 📁 7. Workspace File Structure References

* **`/agents`**: The Python ADK agent workspace.
* **`/web`**: Next.js App Router workspace (Vanilla CSS/TypeScript).
* **`/artifacts`**: Persistent mirrored project artifacts and version revisions.
* **`security.md`**: Master security architecture, rate-limiting, and WAF rules.
* **`readme.md`**: Quickstart setup guide and general project summary.

*Keep these protocols unchanged and always verify your modifications against them. Let's make Fahem the ultimate educational swarm!*

