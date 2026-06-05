# Project Walkthrough - Version 78
**Timestamp**: 2026-06-05T03:03:01.198366
**Phase**: Phase 24: Comprehensive Requirements Audit, Swarm Architectural Blueprint, and Version 77 Sync  

This document provides a comprehensive walk-through of the project directory structures, active coding modules, and compliance/evaluation pipelines aligned with Version 77 optimizations.

## Repository Layout & Directory Walkthrough

1. **Root Directory**:
   - Contains core configuration guidelines and execution environments.
   - `AGENT_PROTOCOLS.md`: Standardised protocols manual documenting development, security, memory, and validation requirements.
   - `LICENSE`: Open-source distribution terms.
   - `agy.exe`: Programmatic ADK orchestration executable.
   - `readme.md`: Repository overview and directory mapping guidelines.
   - `.gitignore`: Enforces exclusion patterns for compiler caches, build outputs, active secrets, local logs, and executable files.

2. **Core Modules**:
   - **`memory/`**: Tracks platform milestones, historical versions of plans (`plan_v77.md`), tasks (`tasks_v77.md`), setup walkthroughs (`walkthrough_v77.md`), and standard developer-coordination protocols (`collaboration_protocol.md`).
   - **`log/`**: Contains running histories and Turn Logs (`turn_log.md`) to record sequential workspace tasks.
   - **`doc/`**: Houses reference guides, Rapid Agent Hackathon PDFs, rules, and compliance reports (`compliance_report_*.md`).
   - **`security/`**: Houses pre-commit checklists, sensitive content masks, authorized Git committer profiles (`hesham88`), and Google Cloud Armor WAF configurations.
   - **`scripts/`**: Automation tools and utility utilities. Includes `evaluate_compliance.py` (pre-commit auditor) and `mirror_artifacts.py` (archival utility).
   - **`web/`**: Next.js App Router root built in pure Vanilla CSS (Cream-paper aesthetics, custom dynamic language pickers, responsive collapsible mobile headers, concentric spinning loaders, and Google reCAPTCHA v3/Enterprise).
     - **`src/app/[locale]/home/page.tsx`**: Central coordinator layout. Spawns side-drawers, manages global authentication subscriptions, real-time typing indicators, and renders modular spaces.
     - **`src/components/dashboard/`**:
       - `LibraryPanel.tsx`: Page-grounded double-pane textbook reading panel.
       - `PracticePanel.tsx`: Video-game style Active Recall workstation.
       - `QuizPanel.tsx`: Timed assessment sheets (now embedded inside the workstation).
       - `SettingsPanel.tsx`: Profile photo base64 uploader and profile syncs.
       - `SocialPanel.tsx`: Discussion boards with real-time stream snapshots.
       - `UserAccountsPanel.tsx`: Whitelist controls for external evaluations.
     - **`src/components/StickyChat.tsx`**: Floating companion assistant UI supporting layout-mode expands, clock-drawers, saved sessions list deletion overlays, and context-targeted mentions (`@`, `#`, `/`).

3. **Active Pipelines**:
   - **`/api/agent` & `/api/agent/grounded`**: Standard API proxy routes forwarding user inputs to Cloud Run (`fahem-agent`) with automatic Google OIDC Bearer token generation.
   - **`/api/db-metadata`**: Standard DB connector route loading live MongoDB stats and collection sizes natively.
   - **`evaluate_compliance.py`**: Local scanning utility validating committer identity constraints, MongoDB tools registrations, and blocking leaks of keys/sensitive data.

## Execution and Test Protocols
* Run local development server: `npm run dev` inside `web/`
* Execute compiler type checks: `npx tsc --noEmit` inside `web/`
* Execute automated compliance checks: `python scripts/evaluate_compliance.py`
* Mirror updated memory states to artifacts: `python scripts/mirror_artifacts.py`


## Revisions History
* **v78.0** (2026-06-05T03:03:01.198366): Fixed LibraryPanel JSX syntax bug and StickyChat TypeScript compiler type error
