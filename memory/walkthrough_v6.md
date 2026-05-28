# Project Walkthrough - Version 6

This document provides a walkthrough of the project repository, current setup, and execution guidelines.

## Current Setup Walkthrough
1. **Root Directory**:
   * Contains `agy.exe` for agent orchestration.
   * `readme.md` documents directory rules and layout.
2. **Directory Roles**:
   * `memory/`: Tracks state, plan versions, tasks, and walkthroughs.
   * `log/`: Keeps chronological history (`turn_log.md`) and run diaries.
   * `security/`: Holds safety rules, including sensitive data masking (usernames, tokens, URLs) and Google Cloud Secret Manager policy.
   * `scripts/`: Holds automation and standard scripts.
   * `doc/`: Holds scopes, reports, and manuals.
   * `web/`: Next.js web application root (utilizing the Next.js **App Router**), hosted on **Firebase App Hosting** with continuous deployment (CD) via **GitHub**.
   * `scratches/`: Temp files and experimental data.
   * `agents/`: Agent playground.

## Global Guidelines
* A persistent global configuration and instruction set is stored in **[fahem_guidelines.md](file:///C:/Users/hesh1/.gemini/antigravity-cli/knowledge/fahem_guidelines.md)**. This guides agents across different sessions and contains core conventions for this project.

## Revision History
* **v6.0** (2026-05-29): Added references to global guidelines configuration file.
* **v5.0** (2026-05-29): Added details for GitHub integration and automated deployment on Firebase App Hosting.
* **v4.0** (2026-05-29): Specified Next.js App Router and Firebase App Hosting structure.
* **v3.0** (2026-05-29): Updated web folder details to specify Firebase hosting.
* **v2.0** (2026-05-29): Updated for security guardrails (masking and GCP secrets).
* **v1.0** (2026-05-29): Initial walkthrough documentation.
