# Project Walkthrough - Version 12

This document provides a walkthrough of the project repository, current setup, and execution guidelines.

## Current Setup Walkthrough
1. **Root Directory**:
   * Contains `agy.exe` for agent orchestration.
   * `readme.md` documents directory rules and layout.
2. **Directory Roles**:
   * `memory/`: Tracks state, plan versions, tasks, and walkthroughs.
   * `log/`: Keeps chronological history (`turn_log.md`) and run diaries.
   * `security/`: Holds safety rules, including sensitive data masking (usernames, tokens, URLs), Google Cloud Secret Manager policy, pre-commit validation checklist, and authorized Git committer details.
   * `scripts/`: Holds automation and standard scripts.
   * `doc/`: Holds scopes, reports, and manuals.
   * `web/`: Next.js web application root (utilizing the Next.js **App Router**), hosted on **Firebase App Hosting** with continuous deployment (CD) via **GitHub**. Configured with Vanilla CSS styling system using a white creamish background and custom color palette (blue, orange, yellow, gold, white, black).
   * `scratches/`: Temp files and experimental data.
   * `agents/`: Agent playground.

## Git Configuration
* Local git user settings are configured to enforce the commit identity:
  * **Name**: `hesham88`
  * **Email**: `hesham1988@gmail.com`
* Git remote origin is configured to:
  * **URL**: `https://github.com/hesham88/fahem.git`

## Pre-Commit Controls
* Guidelines dictate that all files must be manually or automatically scanned before Git commit/push to guarantee zero leakage of usernames, API keys, or raw configurations. Secrets must first reside in Google Cloud Secret Manager.

## Global Guidelines (Persistent Cross-Session)
* The persistent cross-session global configuration and instruction set is stored in **[fahem_guidelines.md](file:///C:/Users/hesh1/.gemini/antigravity-cli/knowledge/fahem_guidelines.md)**. This is automatically scanned and referenced by the agent at the beginning of any session.

## Revision History
* **v12.0** (2026-05-29T01:23:26+03:00): Added design system aesthetics (cream paper background, color palette) documentation.
* **v11.0** (2026-05-29T01:18:19+03:00): Added audit timestamps to the revision history tracking.
* **v10.0** (2026-05-29T01:17:19+03:00): Clarified session-persistence mechanisms for global guidelines.
* **v9.0** (2026-05-29T01:16:17+03:00): Added pre-commit masking and secret validation notes.
* **v8.0** (2026-05-29T01:15:48+03:00): Added Git remote repository config description.
* **v7.0** (2026-05-29T01:15:15+03:00): Added local git repository walkthrough and user identity settings.
* **v6.0** (2026-05-29T01:14:12+03:00): Added references to global guidelines configuration file.
* **v5.0** (2026-05-29T01:13:27+03:00): Added details for GitHub integration and automated deployment on Firebase App Hosting.
* **v4.0** (2026-05-29T01:12:40+03:00): Specified Next.js App Router and Firebase App Hosting structure.
* **v3.0** (2026-05-29T01:12:21+03:00): Updated web folder details to specify Firebase hosting.
* **v2.0** (2026-05-29T01:12:05+03:00): Updated for security guardrails (masking and GCP secrets).
* **v1.0** (2026-05-29T01:05:15+03:00): Initial walkthrough documentation.
