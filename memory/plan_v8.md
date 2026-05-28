# Project Plan - Version 8

## Objective
Initialize the project infrastructure, layout, automation scripts, and next-generation Next.js web application hosted on Firebase App Hosting (using Next.js App Router) for the **Fahem** project under global guidelines, git/GitHub repo mapping, and strict security rules.

## Phases
1. **Phase 1: Project Initialization & Global Guidelines** (Completed)
   * Setup workspace directory structure
   * Define security guardrails, sensitive masking rules, and workflows
   * Establish turn-logging system
   * Setup global project guidelines in the CLI persistent knowledge folder (`C:\Users\hesh1\.gemini\antigravity-cli\knowledge\fahem_guidelines.md`) for cross-session access.
   * Initialize local Git repository, configure remote to GitHub repository **`fahem`**, and enforce committer identity constraints.
2. **Phase 2: Automation Scripts & Secret Manager Integration Setup** (In Progress)
   * Setup scripts for automation
   * Configure Google Cloud Secret Manager integration and mock templates for local environment
3. **Phase 3: Next.js & Firebase App Hosting Development**
   * Bootstrap Next.js web application inside the `web/` folder using the **App Router**
   * Configure **Firebase App Hosting** settings (`apphosting.yaml`) for server-side rendering (SSR) frameworks
   * Configure the GitHub repository linkage to trigger auto-deployment to Firebase App Hosting on commits/merges.
4. **Phase 4: Agent Playground & Integration**
   * Configure agent configurations and testing environments in `agents/`

## Revisions History
* **v8.0** (2026-05-29): Git remote origin set to `https://github.com/hesham88/fahem.git`.
* **v7.0** (2026-05-29): Git repository initialized locally and user committer identity constraints configured.
* **v6.0** (2026-05-29): Added persistent global guidance setup in the CLI knowledge folder.
* **v5.0** (2026-05-29): Specified GitHub repository integration to auto-deploy commits to Firebase App Hosting.
* **v4.0** (2026-05-29): Specified Next.js App Router and Firebase App Hosting (apphosting.yaml) as the runtime and framework hosting targets.
* **v3.0** (2026-05-29): Specified Firebase Hosting as the hosting solution for the Next.js web app.
* **v2.0** (2026-05-29): Added Google Cloud Secret Manager integration and data masking constraints.
* **v1.0** (2026-05-29): Initial plan structure created.
