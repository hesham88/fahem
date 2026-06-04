# Project Walkthrough - Version 76
**Timestamp**: 2026-06-04T07:45:00.000000+03:00

This document provides an updated walkthrough of the project repository, current setup, and execution guidelines including our recent optimizations and fixes in Version 76.

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
   * `scripts/`: Holds automation and standard scripts. Includes the automated `evaluate_compliance.py` audit script.
   * `doc/`: Holds Google Cloud Rapid Agent Hackathon PDF documents, rules, resources, and FAQ manuals, plus compliance audit reports.
   * `web/`: Next.js web application root (utilizing the Next.js **App Router**), hosted on **Firebase App Hosting** with continuous deployment (CD) via **GitHub**. Configured with Vanilla CSS styling system using a white creamish background and custom color palette (blue, orange, yellow, gold, white, black) in `src/app/globals.css`.
     * **Modular Subcomponents**: 
       * Split the large monolithic `home/page.tsx` file into dedicated modular panel components under `web/src/components/dashboard/`:
         * `SettingsPanel.tsx`: Reactive profile picture base64 uploader, localized username changes, and real-time MongoDB settings sync.
         * `PracticePanel.tsx`: Implements the "Active Recall Quest Station" gamified study hub with interactive modes (MCQ, Written, Oral), custom timers, and paste blocker.
         * `UserAccountsPanel.tsx`: Provides role configuration capabilities for superadmins and whitelist credentials for external judges.
         * `QuizPanel.tsx`: Standard assessment suite and trivia cards.
         * `ZatonaPanel.tsx`: High-speed abstract condenser and summaries builder.
         * `LibraryPanel.tsx`, `SocialPanel.tsx`, `StudyPlanPanel.tsx`, `TimetablePanel.tsx`.
     * **Onboarding Redirection Auto-Bypass**: 
       * Added instant client-side bypass checks in `page.tsx`'s client auth lifecycle.
       * Completion states are cached inside `localStorage` scoped by user identity, completely circumventing write-propagation lags on high-frequency auth states.
     * **Self-Healing Local DB helper imports**:
       * Restored missing `saveLocalDb` imports inside `/api/books/pages/route.ts` and `/api/localDbHelper.ts`, ensuring 100% build pass.
     * **Onboarding Avatar Base64 File Uploader**: Integrated into `web/src/app/[locale]/home/page.tsx`.
       * **Interactive Upload Field**: Provides responsive bilingual select fields using pure custom CSS-styled file tags.
       * **Size Guard Boundaries**: Reads file contents via `FileReader` and serializes into Base64 formats with strict checks blocking elements above `2MB` to enforce data and networking efficiency.
     * **Real-Time Active Typing Indicators**:
       * **Subscription Hooks**: Dynamically hooks real-time Firestore listeners subscribing to `/active_boards/{activeBoardId}/typing` collections. 
       * **Input Publishing**: Attaches debounce listeners publishing current user input state flags to active chat boards, with proper cleanups on blur/unmount to clear ghost active entries.
       * **Dynamic Visualizations**: Render glowing bouncing animated dots powered by hardware-accelerated transitions and `@keyframes typing-bounce` added directly in standard templates.
     * **reCAPTCHA Floating Badge Overlap Fix**: Added global CSS overrides to `src/app/globals.css` targeting `.grecaptcha-badge`.
       * **Collision Elimination**: Setting `visibility: hidden !important; opacity: 0 !important; pointer-events: none !important;` hides Google's reCAPTCHA v3/Enterprise badge container completely. This eliminates visual overlap with our custom glassmorphic study companion floating icon (`StickyChat.tsx`) on English/LTR viewports, and prevents the badge from sliding under or getting hidden behind the collapsible sidebar on Arabic/RTL viewports.
       * **Functional Integrity**: reCAPTCHA client-side hooks, token generation callbacks, and server-side risk assessments on Login and Report submit forms remain 100% active and secure.
     * **Firebase Phone Sign-In**: Inside `src/app/[locale]/page.tsx`, a sleek, cream-paper tab toggler allows users to transition between Google and Phone Authentication.
       * **Interactive reCAPTCHA Verifier**: Mounts a visible `normal` Firebase `RecaptchaVerifier` container dynamically below the phone field to secure code generation, avoiding server-side Next.js hydration errors.
       * **Two-Step Verification**: Handles Step 1 (phone submission and reCAPTCHA completion) and Step 2 (6-digit PIN verification) smoothly with intuitive transitions, inline warnings, and loading indicators.
       * **Layout Forcing**: Applies `dir="ltr"` and `text-align: left/center` properties on phone input and digit boxes to ensure highly legible typing directions, even under RTL Arabic configurations.
       * **Multilingual i18n Synchronization**: All 18 newly introduced phone auth labels, descriptions, errors, and button loading text have been fully synced across all 7 supported dictionaries (`ar`, `en`, `es`, `fr`, `de`, `it`, `zh`).
     * **Conversational Onboarding Amnesia Fix**: Inside `src/app/api/proxy.ts`, the fetch configurations in `proxyRequest` incorporate `cache: "no-store"` to prevent Next.js from caching dynamic agent-to-backend proxies. This ensures consecutive onboarding turns load full context from Cloud Run/MongoDB correctly.
     * **Step-Strict Quick Replies (Bug Fix)**: Inside `src/app/[locale]/home/page.tsx`, the `getQuickReplies` function has been refactored to determine quick reply chips strictly based on the `currentOnboardingStep` React state, rather than parsing substring occurrences in message text. This guarantees out-of-context replies are completely avoided.
     * **Google Places School Search UI**: When `currentOnboardingStep === "school"`, the default text input field is accompanied by a floating glassmorphic autocomplete panel. As the user types, debounced fetch requests are sent to the local `/api/places/search` wrapper endpoint. Results are presented in an elegant list with icons (🏫 for schools, Address markers) and a fallback bypass button.
     * **Categorized Avatar Choice Grid**: When `currentOnboardingStep === "avatar"`, an immersive selection interface overlays the chat footer. Avatars are split into categories (Vectors, Animals, Tech, Premium) with dynamic filters, active glowing selection borders, hover expansions, visual selected avatar previews, and a confirm button.
     * **Mobile Collapsible Drawer & Header**: Inside `page.tsx` and `globals.css`, the mobile layout is structured with a sticky header `.mobile-header` at the top of the viewport (visible only on screens `< 900px`). It features a hamburger menu button that controls `isMobileSidebarOpen` state in React. When clicked, it toggles a glass-blur overlay `.sidebar-backdrop` and slides in the sidebar drawer `.sidebar` from the left (LTR) or right (RTL), making the interface highly accessible, readable, and efficient on mobile screens. A close button (`FiX`) inside the logo area allows easy collapse.
     * **Animated Circle Loading Page**: The loading screens across the web application (including the landing page loading check, user profile loading, and main home dashboard loading overlay) have been upgraded to present a highly premium, unified circular loader:
       * **Concentric Spinner Rings**: Incorporates three concentric circular glassmorphic rings (`.loader-ring-outer`, `.loader-ring-middle`, `.loader-ring-inner`) revolving in alternate directions at varying rates using cubic-bezier motion curves.
       * **Central CPU Icon**: Features a floating center glass node holding a glowing `FiCpu` icon that dynamically shifts colors from brand-blue (`--primary`) to sunset-orange (`--secondary`) with micro-rotations.
       * **Glow-Pulse Text**: Features an interactive pulsing text label (`.loader-text-glow`) with text shadow and letter spacing.
       * **Ambient Floating Spheres**: Embedded directly behind the loading interface to ensure immersive depth from the first moment of loading.
     * **Floating Study Companion & Chat Session History Panel**: 
       * **Dashboard Sidebar Cleanup**: The redundant "Saved Chats Sidebar Section" container is completely purged. This solves all overlapping and text cut issues in the sidebar, removing any vertical scrolling overhead and maintaining a pristine, compact list of navigation options.
       * **`StickyChat.tsx` Integration**: All conversational history and chat triggers are encapsulated in the floating companion window:
         * **Persistent Sessions & Methods**: Built reactive hooks for `sessions`, `currentSessionId`, `fetchSessions()`, `loadSession(id)`, `deleteSession(id)`, and `startNewChat()`.
         * **Clock Header Button Drawer**: Tapping the premium Clock/History icon in the companion's glass navbar smoothly slides in a transparent, glassmorphic panel overlay listing all active/past sessions.
         * **Stream Hooks & Dynamic Auto-Refresh**: Message-sending routines (`handleSendMessage`) now capture dynamic `SessionId` tags directly from the Gemini ADK stream metadata to update the active session ID, auto-refreshing the saved sessions list immediately on response complete.
         * **LTR / RTL Visual Alignments**: Fully optimized positioning offsets, translation drawers, active selection indicators, and deletion icons to automatically align to the dynamic global page direction (`dir === "rtl"` for Arabic, `ltr` for English).

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
* **v76.0** (2026-06-04T07:45:00.000000+03:00): Documented Phase 24 requirements audit, modular subcomponent checks, automated compliance passes, and secure push procedures.
* **v75.0** (2026-06-04T07:20:00.000000+03:00): Documented Phase 23 optimizations, requirements checks, and post-deployment live smoke testing guidelines.
