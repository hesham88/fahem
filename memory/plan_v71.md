# Project Plan - Version 71
**Timestamp**: 2026-05-31T06:55:00+03:00

## Objective
Develop a production-grade multi-agent system using the Google Agent Development Kit (ADK) in **Python** that integrates the **MongoDB MCP server** to solve database challenges, featuring a Next.js (App Router) frontend hosted on Firebase App Hosting. This project is built for the **Google Cloud Rapid Agent Hackathon (MongoDB Track)** under strict security, masking, and timestamped compliance auditing rules.

## Project Scope
* **Context**: Google Cloud Rapid Agent Hackathon (ending June 11, 2026).
* **Track**: MongoDB Partner Track.
* **Goal**: Build a functional agent using `google-adk` programmatically integrated with the MongoDB MCP server, paired with a web dashboard for execution and visualization.
* **Tech Stack**:
  * AI Model: Gemini 3.5 Flash (via Gemini API / google-adk).
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
14. **Phase 14: Google Cloud reCAPTCHA Enterprise Integration** (Completed)
    * Load the Google Cloud reCAPTCHA Enterprise JavaScript API with site key `6LfT9wQtAAAAAFElDHZ9ddSZHbKzMZx2-IO7PLKV` on form/action pages.
    * Execute the client-side `grecaptcha.enterprise.execute` call upon login and sensitive submit actions to generate risk assessment tokens.
    * Implement server-side verification using the private `google-cloud-recaptcha-enterprise` Python SDK/Node SDK to create risk assessments and verify score viability.
    * Update local and production configurations to securely bind the enterprise credentials.
15. **Phase 15: Premium Animated Loading Circle & Ambient Spheres** (Completed)
    * Define slow, hardware-accelerated floating keyframe animations in `globals.css` using GPU-optimal transformations (`translate3d`) to move the blurred background ambient spheres dynamically.
    * Upgrade the landing page loading screen under `if (loading)` in `web/src/app/[locale]/page.tsx` with a dual-ring concentric glowing glassmorphic loading spinner, pulsing central `FiCpu` logo, and text pulse glow.
    * Implement matching loading overlays on the user profile loading screen (`if (loading)` in `profile/[username]/page.tsx`) and the home dashboard loading screen (`if (loadingUser || loadingProfile)` in `home/page.tsx`) to guarantee absolute visual cohesion and premium feel.
    * Add the floating ambient spheres dynamically behind the loading interface to ensure immersive depth from the first moment of loading.
16. **Phase 16: Conversational Onboarding Amnesia Loop Fix & Verification** (Completed)
    * Audit Next.js server-side route proxies and locate amnesia caching mechanisms.
    * Disable caching on `/api/agent` and proxy request handlers by adding `cache: "no-store"` to the fetch config options in `proxyRequest`.
    * Eliminate chat amnesia where consecutive turns (such as Turn 2 after Turn 1) forgot preceding answers.
    * Implement programmatically sequenced verification scripts to validate state transition continuity, username availability check tool integration, and a production compilation build pass.
17. **Phase 17: Floating Study Companion Chat History & Persistent Sessions Integration** (Completed)
    * Extract "Saved Chats" history panels and the "New Chat" initializer from the vertical dashboard sidebar menu.
    * Integrate session states, session deletion overlays, and active multi-session management into the floating Fahem study companion (`StickyChat.tsx`).
    * Implement a modern glassmorphic Clock/History slide-out drawer inside the companion bubble, with automated streaming-refresh hooks and dynamic RTL text layouts.
18. **Phase 18: Conversational Onboarding Usability, Places API, and Premium Avatar Selection** (Completed)
    * Refactor onboarding suggestions parsing inside `getQuickReplies` function in `page.tsx` to strictly use the `currentOnboardingStep` React state instead of buggy substring keyword checks, preventing out-of-context random replies.
    * Implement an interactive, debounced autocomplete search dropdown inside the onboarding overlay footer when `currentOnboardingStep === "school"`. Integrated rate-limiting and safe fetching calls to `/api/places/search`, showing address results with custom indicators.
    * Restore a fully premium avatar choice grid when `currentOnboardingStep === "avatar"`, categorized dynamically into Vectors, Animals, Tech, and Premium with active glow transitions, dynamic global localization mirroring (LTR/RTL), selected avatar node preview, and "Confirm & Complete" submission.
    * Verify comprehensive workspace type-safety and execute build compilation check via production Next.js compiler with zero errors.
19. **Phase 19: Multilingual Firebase Phone Sign-In Authentication** (Completed)
    * Integrate secure, interactive Firebase client-side `RecaptchaVerifier` supporting visible `normal` sizing to satisfy robust fraud prevention standards.
    * Add support for 2-step phone auth flow (Step 1: Enter phone number and complete reCAPTCHA, Step 2: Receive and verify 6-digit SMS pin).
    * Synchronize 18 new phone auth localization labels, warnings, and success actions across all 7 language dictionary configurations (`ar`, `en`, `es`, `fr`, `de`, `it`, `zh`).
    * Implement a specialized dictionary synchronization helper script (`scripts/sync_dictionaries.py`) and pass the strict `validate_i18n.py` sanity checkers with 100% compliance.
    * Enforce strict `dir="ltr"` text alignment on input and digit boxes inside RTL locales (Arabic) to ensure intuitive typing direction.
    * Validate production compilation of Next.js static and dynamic assets under dynamic server setups with zero errors.
20. **Phase 20: Google reCAPTCHA Badge Overlap & UI Alignment Resolution** (Completed)
    * Identify visual collision between the injected Google Cloud reCAPTCHA Enterprise badge iframe container and the floating glassmorphic study companion (`StickyChat.tsx`) in LTR locales.
    * Diagnose Arabic RTL layout collisions where the badge was hidden underneath the main navigation sidebar panel.
    * Implement global Vanilla CSS overrides targeting `.grecaptcha-badge` with visibility, opacity, and pointer-events rules to securely hide the floating visual element.
    * Ensure complete compliance with Google reCAPTCHA terms by maintaining clear protection disclosures on the application forms.
    * Execute full local and production compilations to verify error-free deployment.

## Revisions History
* **v71.0** (2026-05-31T06:55:00+03:00): Solved the reCAPTCHA floating badge overlap bug by implementing a global CSS override, improving LTR/RTL aesthetic parity without affecting risk assessment operations.
* **v70.0** (2026-05-31T06:30:00+03:00): Implemented secure multilingual Firebase Phone Sign-In Authentication, integrated visible reCAPTCHA verifiers, completed dictionary synchronizations, passed 100% i18n checks, and compiled clean production Next.js build.
* **v69.0** (2026-05-31T06:15:00+03:00): Implemented the missing avatar selection grid overlay, resolved random conversational suggestions, integrated robust autocomplete Google Places school search UI, and verified a successful Next.js build compilation.
* **v68.0** (2026-05-31T05:53:00+03:00): Cleaned up dashboard side panel layout and padding by integrating "Saved Chats" and "New Chat" directly into the floating `StickyChat` companion UI. Added robust session states, dynamic RTL alignments, and session deletion operations.
* **v67.0** (2026-05-31T05:32:00+03:00): Resolved Next.js aggressive GET caching, fixing conversational onboarding amnesia and looping. Created multi-turn programmatic verification and verified a clean production compilation build.
