# Task List - Version 54
**Timestamp**: 2026-05-29T23:25:00+03:00

## Task Progress Board

| Task ID | Description | Folder | Status | Assigned To | Comments |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TSK-001** | Initialize directory structure | Root | Completed | Agent | `memory`, `log`, `doc`, `scratches`, `plan`, `screenshots`, `agents`, `web`, `readme.md` |
| **TSK-002** | Configure security guidelines & log structure | Root/security/log | Completed | Agent | Set up `security/README.md`, `log/turn_log.md` |
| **TSK-003** | Define masking & secret policies | security | Completed | Agent | Created `security/guardrails_v4.md` (masking usernames/secrets, GCP Secrets Integration, Pre-commit checks) |
| **TSK-004** | Create persistent global guidelines | CLI Knowledge | Completed | Agent | Saved global rules file `fahem_guidelines.md` in the CLI knowledge path |
| **TSK-005** | Initialize local Git and set user config | Root | Completed | Agent | Initialized local git repo, configured name to `hesham88` and email to `hesham1988@gmail.com` |
| **TSK-006** | Link local repo to GitHub repository | Root | Completed | Agent | Added remote origin `https://github.com/hesham88/fahem.git` |
| **TSK-007** | Design pre-commit automated scan script | scripts | Completed | Agent | Created compliance evaluator agent script `evaluate_compliance.py` (checks rules, leaks, MongoDB tracks) |
| **TSK-008** | Bootstrap Next.js web application (App Router) | web | Completed | Agent | Scaffolded Next.js boilerplate inside `web` without Tailwind CSS |
| **TSK-009** | Define custom Vanilla CSS design system | web | Completed | Agent | Setup paper-like background styling and primary colors (blue, orange, yellow, gold) in `globals.css` |
| **TSK-010** | Configure Firebase App Hosting settings | web | Completed | Agent | Setup `apphosting.yaml` and configuration |
| **TSK-011** | Integrate GitHub auto-deployment setup | web/CI-CD | In Progress | User / Agent | Link GitHub repository to Firebase App Hosting for CD; push commit changes |
| **TSK-012** | Scaffold ADK Multi-Agent playground | agents | Completed | Agent | Set up ADK agents directory configuration, tool files, coordinator, and sub-agents |
| **TSK-013** | Integrate MongoDB MCP tools in ADK Agents | agents | Completed | Agent | Map and register the local MongoDB MCP server tools to the agent, verified run successfully |
| **TSK-014** | Configure ignore folder & root gitignore | Root | Completed | Agent | Set up root `.gitignore` blocking `ignore/` directory from version control |
| **TSK-015** | Develop automation scripts | scripts | Completed | Agent | Compliance evaluation script is fully automated and prints markdown summaries |
| **TSK-016** | Implement Google Authentication Landing Page | web/auth | Completed | Agent | Created glassmorphic login screen, navbar, floating spheres, and Auth redirect guard |
| **TSK-017** | Implement Sourcing Engine UI & RTL/LTR localization | web/dashboard | Completed | Agent | Localized all controls in Sourcing Engine panel, added layout direction reversing styles |
| **TSK-018** | Support multiple super admins & dynamic standalone path resolution | web/api | Completed | Agent | Modified check/route.ts to split admins, and agent/route.ts to search recursively |
| **TSK-019** | Deploy MongoDB MCP service to Cloud Run | web/agents | Completed | Agent | Deployed containerized ADK API Server with MongoDB MCP to Cloud Run in `us-east4` |
| **TSK-020** | Enforce Private Cloud Run Access & OAuth2 ID token auth | web/agents | Completed | Agent | Configured `--no-allow-unauthenticated` on Cloud Run and added Google OAuth2 / OIDC token injection |
| **TSK-021** | Rename microservice folder and deploy as fahem-agent | web/agents | Completed | Agent | Renamed directory `mongodb_microservice` to `fahem-agent` and completed deployment |
| **TSK-022** | Synchronize package-lock.json peer dependencies | web | Completed | Agent | Pin exact versions (`kerberos@2.2.2`, `mongodb-client-encryption@6.5.0`, `node-addon-api@6.1.0`) in package.json and add .npmrc to sync lockfile |
| **TSK-023** | Resolve Python spawning ENOENT on Windows/Linux host environments | web/api | Completed | Agent | Implement robust python executable detection algorithm (`getPythonCommand`) to locate python |
| **TSK-024** | Migrate API routes to native TypeScript to resolve serverless platform-spawning ENOENT errors on Firebase App Hosting | web/api | Completed | Agent | Migrated both `/api/db-metadata` and `/api/agent` to pure Node.js/TypeScript using `@google/genai` and native `"mongodb"` driver. |
| **TSK-025** | Fix 403 Forbidden HTTP error with dual-strategy OIDC token retrieval | web/api | Completed | Agent | Implemented GCP Metadata Server fetching with google-auth-library fallback in Next.js API route to secure private microservice. |

## Revisions History
* **v54.0** (2026-05-29T23:25:00+03:00): Improved `insert_user_report` parameterized tool signature to support custom report fields (`name`, `email`, `subject`, `description`, `timestamp`) dynamically with auto-fallbacks, resolving model tool-selection mismatches. Upgraded `before_tool_callback` in `guardrails.py` to support dynamic user-identity extraction fallbacks from tool arguments and nested insert documents to prevent unauthorized false-positive blocks during writes.
* **v53.0** (2026-05-30T00:10:42.148062): Improve guardrails.py before_agent_callback to unpack serialized JSON context, populating user session environment variables for delegated tool authorization fallback
* **v52.0** (2026-05-29T23:18:59.043323): Fix secure_tools insert_user_report tool execution to use insert-many
* **v51.0** (2026-05-29T22:49:55.752161): Fix app module root_agent ImportError to resolve Cloud Run orchestration crash
* **v50.0** (2026-05-29T22:19:31.334397): Resolve apphosting.yaml secret manager configuration mismatch by excluding MONGODB_AGENT_URL routing endpoint and reverting to plain deployment value
* **v49.0** (2026-05-29T22:12:06.484433): Implement unique username selection flow in onboarding and fix state persistence loop
* **v45.0** (2026-05-29T08:15:00+03:00): Fixed the 403 Forbidden HTTP error by introducing a highly robust dual-strategy OIDC token retrieval mechanism in the Next.js `/api/agent` route (fetching directly from the GCP Metadata Server first, with a fallback to `google-auth-library`), ensuring seamless authenticated service-to-service communication with the private `fahem-agent` Cloud Run container. Marked TSK-025 as Completed.
* **v44.0** (2026-05-29T07:53:00+03:00): Migrated both `/api/db-metadata` and `/api/agent` API routes to native TypeScript. `/api/db-metadata` connects directly to MongoDB via the native `"mongodb"` driver to fetch collections, sizes, and indexes. `/api/agent` implements the multi-agent Guardrail and Presenter/Orchestrator natively using `@google/genai` (Gemini SDK), secure OIDC fetching for service-to-service authentications inside Node.js, and direct fetch POST calls to Cloud Run, fully resolving serverless platform-spawning `spawn python ENOENT` bottlenecks and successfully building Next.js in 8.0s with zero errors or warnings.
* **v43.0** (2026-05-29T07:40:00+03:00): Resolved the `spawn python ENOENT` API route error by implementing a platform-agnostic, robust Python executable locator `getPythonCommand()` in `/api/agent/route.ts` that searches for both local Windows custom paths (`C:\Python313\python.exe`, `C:\Windows\py.exe`) and Linux standard PATH variables. Marked TSK-023 as Completed.
* **v42.0** (2026-05-29T07:31:00+03:00): Pinned exact required versions of peer and optional dependencies (`kerberos@2.2.2`, `mongodb-client-encryption@6.5.0`, and `node-addon-api@6.1.0`) in `web/package.json` and introduced a `web/.npmrc` file with `legacy-peer-deps=true` and `strict-peer-deps=false` configurations. Ran `npm install` inside the `web` folder to generate a clean, fully-synchronized, platform-agnostic `package-lock.json` file. Successfully compiled the Next.js production build locally.
* **v41.0** (2026-05-29T07:25:00+03:00): Synchronize package-lock.json peer and optional dependencies (kerberos, mongodb-client-encryption, node-addon-api) inside `web/package.json` and force-regenerate lockfile to resolve Firebase App Hosting `npm ci` out-of-sync dependency errors. Successfully compiled Next.js build locally and pushed to GitHub main branch.
* **v40.0** (2026-05-29T07:20:00+03:00): Rename the MongoDB MCP microservice folder name to `fahem-agent` in `web/agents/` and deploy the private service under the exact name `fahem-agent` to Cloud Run in the `us-east4` region. Update `.env.local` URL configuration and complete E2E integration verification.
* **v39.0** (2026-05-29T07:16:00+03:00): Enforce private deployment of MongoDB MCP Cloud Run microservice using `--no-allow-unauthenticated`. Implement standard GCP OIDC ID token authentication for Orchestrator-to-Microservice communication, ensuring dockerization, private routing, and history-compliance constraints.
* **v38.0** (2026-05-29T07:12:00+03:00): Deploy MongoDB MCP agent microservice on Cloud Run targeting `us-east4` region. Update multi-agent orchestration workflow to hit deployed endpoint, ensuring full security and audit logging compliance with zero overrides or deletes.
