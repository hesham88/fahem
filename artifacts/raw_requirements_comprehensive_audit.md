# 🌌 Fahem Swarm Platform: Comprehensive Raw Requirements Audit & Gap Analysis

**Document Reference**: `FAHEM-RAW-REQUIREMENTS-AUDIT-2026`  
**Core Model Standard**: `gemini-3.1-flash-lite` (Exclusively for main workflows)  
**Advanced Model Standards**: `gemini-3.1-flash-tts-preview` (TTS), `gemini-3.1-flash-live-preview` (Oral Streaming), `deep-research-preview-04-2026` (Zatoona Summary)  
**Database Protocol**: MongoDB Atlas Model Context Protocol (MCP)  
**Role**: Reviewer and Critique Coding Agent (Codebase Untouched)  

---

## 📋 1. Consolidated & Grouped Raw Requirements Master List

This section consolidates all 1170 lines of stream-of-consciousness chat transcripts and logs from `doc/raw_requirments.txt` into a unified, unique, and highly structured catalog.

### 🏛️ Group A: Educational Pedagogy & Design System
1. **CLT & CTL Integration**: Implement a balanced approach merging **Cognitive Load Theory (CLT)** (preventing cognitive overload through split-screen layout, small 500-token text chunks, and pasting blocks) and **Contextual Teaching & Learning (CTL)** (anchoring curriculum topics, rules, and laws in real-world scenarios).
2. **Heutagogy (Bounded Autodidactic Activities)**: Empower student-directed learning with bounded limits, awarding progress badges, levels, and cognitive tokens for actual participation.
3. **Core Active Learning Modes**: Visual and behavioral indicators must support constructive, collaborative, interactive, reflective, and inquiry-based learning.
4. **Public Feature Card Migration**: Relocate complex visual modules (e.g., **Interactive Multi-Agent Pipeline & DAG Workflow**, **Active Security & Guardrail Configurations**) to the public landing page as 8 small, brief "Why Choose Fahem?" cards.
5. **Freemium & Premium Modeling**: Showcase benefits of the Freemium model alongside the power of the premium advanced AI academic workspace on the landing page.
6. **Accessibility / Whitelist Bypass**: Provide a friction-free evaluation portal on the landing page for judges (accepting `@google.com`, `@mongodb.com`, and `@devpost.com`) to bypass SMS verification and instantly load a pre-hydrated demo session.

### ⚙️ Group B: Generic Ingestion Studio & Crawler Engine
7. **Generic Ingestion Pipeline**: Ingestion must handle any web URL or manual file upload, initiating crawling, harvesting, metadata extraction, splitting, vectorization, and MongoDB storage.
8. **Recursive Deep Crawling**: Crawler must fetch pages recursively deep into site hierarchies (no shallow limits like Max Depth = 3 which truncate lists) to find all matching PDFs.
9. **Crawler Directory Tree Viewer**: Render crawl outputs in real-time as a directory explorer tree where administrators can select-all or cherry-pick specific files to import.
10. **OpenStax & MOE Curriculums**: Support `https://openstax.org/` (fully active) and `https://ellibrary.moe.gov.eg/` (dimmed for license compliance).
11. **Duplication & Loop Checks**: Before downloading, verify if a book or page hash matches existing records. If an identical copy exists, skip downloading but check if it requires re-indexing or re-vectorizing.
12. **Hierarchical Storage Sync**: Organise downloaded physical PDFs cleanly in Firebase Storage under: `gs://fahem-academic-lake/libraries/[LibraryName]/[Subject]/[Grade]/[BookTitle]/`.
13. **Asynchronous Progress Studio**: The Ingestion Studio must live in a separate tab under Admin Controls and display async progress timelines: `[CRAWLING]` ➡️ `[HARVESTING]` ➡️ `[EXPLORING]` ➡️ `[AI SEARCH SYNC]` ➡️ `[CHUNKING & ANALYSIS]` ➡️ `[DATABASE INGEST]`. Show queue speed, items remaining, and an ETA formatted in seconds, minutes, and hours.
14. **GCP Vertex AI Search Integration**: Auto-provision and populate Google Cloud Vertex AI Search data stores in **AI Mode** upon book ingest.
15. **MongoDB MCP Embedding & Vector Search**: Every page must be formatted, embedded, indexed, and stored inside MongoDB Atlas using MCP tools, preserving structural metadata (rules, formulas, tables, titles, concepts).
16. **User Uploads vs. Admin Uploads**:
    * **Admin Uploads**: Saved to `/MOE Library/` or `/Textbooks/` in Firebase Storage and committed as public curriculum libraries for all users.
    * **User Uploads**: Saved strictly under `user_uploads/[UserId]/` and indexed as private files visible only to that student. Allow up to 10 files, max 20MB per file, and 100MB total.

### 📖 Group C: Academic Workspace & Book Viewer
17. **High-Fidelity Book Page View**: Scraping must capture layout structures (boxed rules, formulas, laws, multi-column text) so that book pages read like the original PDF rather than flat placeholder text.
18. **Bilingual Text Alignment**: Natively handle RTL layout for Arabic curriculum pages and LTR for English/Math books.
19. **SEO-Friendly Direct Page Navigation**: Allow users to share links and navigate directly to unique URLs using routing variables, e.g., `/en/[bookId]/page/[pageNum]`.
20. **Conceptual Outline Mind Map**: Render a collapsable, hierarchical list next to the Table of Contents depicting chapters, titles, and underlying concepts in the book.
21. **Subject Color Coding**: Implement a color system where each subject is assigned a unique theme color. This color must apply across book cards, dashboard headings, and indicators for visual structure.

### 🎙️ Group D: Multimodal Speech & Audio Layer
22. **Natural Voice TTS**: Leverage `gemini-3.1-flash-tts-preview` for voice synthesis, fixing all robotic tones, double-playback repeating bugs, latency delays, and mid-sentence audio cuts.
23. **Emoticon Skipping**: The audio model must skip pictographs, emojis, and emoticons (e.g. `:)`, `;-)`) to read pure, continuous speech.
24. **Speech-to-Text (STT)**: Use standard Web Speech API browser integration (`webkitSpeechRecognition`) for fast client-side transcripts.
25. **Egyptian Arabic Default**: Default Arabic synthesis and companion voice responses to Egyptian Arabic pronunciation.
26. **Oral Practice & Live Feedback Arena**:
    * Core streaming powered by `gemini-3.1-flash-live-preview`.
    * Question audio plays automatically. Once it finishes reading, the mic triggers to record the user's response.
    * Allow the student to interrupt the question TTS at any point by hitting the microphone toggle.
    * Output a live performance scorecard grading Pronunciation, Confidence, Accuracy, and Structure (0–100%).

### 💬 Group E: Advanced Swarm Companion & Chat UX
27. **Dual-Screen Layout**: Floating compact overlay OR full-screen expansion.
28. **Full-Screen Chat Refinement**: Center the chat window in full-screen mode to fit the optimal reading view of the eyes instead of stretching content to extreme margins.
29. **Fixed Floating Activation Button**: Lock the floating chat button in place. The message composer must position and resize itself relative to layout bounds.
30. **In-Style Selection Highlighting**: Enable users to highlight paragraphs or formulas inside the book reader to trigger quick action bubbles (e.g., `/explain` or `/summary`) in the companion sidebar.
31. **Autocomplete Mentions**: Support typing `@` (subjects), `#` (books), or `/` (commands like `/explain`, `/summary`) inside the chat composition box to trigger autocomplete menus.
32. **Dynamic Suggestions**: Chat suggestion chips must update dynamically based on conversation history, active textbook topics, and user interest.
33. **Zatoona Deep Research**: Implement the comprehensive study-synthesis agent utilizing `deep-research-preview-04-2026` to generate detailed multi-chapter summaries.
34. **Conversation Renaming**: Fix the session rename bug that freezes or fails to save modified titles.
35. **Chat-based User Feedback**: Enable the companion to gather user feedback or bug reports through an inline form inside the chat panel, pushing entries to MongoDB via MCP tools upon submission.

### 🏆 Group F: Practice Workstation & Assessment Arena
36. **Gamified Infinite Practice**: Allow students to resume or start new sessions, selecting either broad subject umbrellas, specific books, chapters, or concepts (multiple selections allowed).
37. **Infinite Practice Types**: MCQ, text response, and oral speech tests. Practice sessions run infinitely until the user manually stops.
38. **Scope-Bound Quizzes**: Create real exam-like assessments limited by time or questions, testing comprehension across the entire course syllabus.
39. **Practice History & Audits**: Log and persist all practice questions, student responses, explanations, audio metrics, and LLM token usage inside MongoDB Atlas.
40. **Active Recall Quest Server Fix**: Correct the server connection timeouts when launching active recall game modules.

### 👥 Group G: Social Interaction Layer
41. **Social Groups & Forums**: Build fully functional study groups, threads, and peer replies.
42. **Real-Time Peer Chat**: Repair real-time push notifications between active users to eliminate page refreshing.
43. **Unique Keys Safeguard**: Solve duplicate key errors in React lists (e.g., `user_super_1` duplicates in `SocialPanel.tsx`) that crash client-side rendering.

### 🛡️ Group H: Admin Console Security, Whitelisting & Approvals
44. **Admin Panel Cleaning**: Strip Active Security, Multi-agent workflows, Harvesters, and toolsets from the standard admin view. Integrate them into public landing cards or the Activity Trail.
45. **Superadmin Operational Logs**: Refactor administrative logs into a compact, scrollable, searchable, and filtered "Global Operational Activity Trail" under system operations.
46. **Superadmin & Admin Approvals**:
    * Standard admins can only draft configurations, trigger crawls, or draft uploads.
    * Committing ingestion pipelines or saving security modifications requires Superadmin approval.
    * Provide a superadmin review queue for pending admin changes and admin candidates.
    * Superadmins can also approve/deny new Admin candidates.
47. **Identity Secret Storage**: Secure all superadmin identities and critical API keys inside Google Cloud Secret Manager.
48. **Security Sliders**: Position controls for cognitive token caps, upload size limits, and security guardrails prominently at the top of the Admin dashboard.

---

## 📊 2. Gap Analysis & Technical Critique Report

Below is the current implementation status of each requirement group, detailing what is **Functional**, **Partially Implemented**, or **Missing/Deficient**.

| ID | Requirement Category | Status | Location / Files | Current Code Condition & Critique |
| :--- | :--- | :---: | :--- | :--- |
| **G-A** | **Pedagogy & Design (CLT/CTL)** | <span style="color:orange">**Partial**</span> | `web/src/app/[locale]/page.tsx`<br>`web/src/components/StickyChat.tsx` | CLT and Heutagogy variables exist as default static fallbacks. The Interactive DAG and Guardrail cards still reside in the Admin panel and need to be moved to "Why Choose Fahem" public cards. Whitelisted judge bypass is implemented for `judge.evaluation@fahem.edu` but lacks MongoDB/wildcard domain checks. |
| **G-B** | **Generic Ingestion & Crawler** | <span style="color:red">**Deficient**</span> | `agents/main.py`<br>`web/src/app/api/admin/crawl/route.ts` | Crawler is very shallow and fails on complex sites. The Ingestion Studio is prone to freezes (stuck at 5% or 49%). Firebase Storage permissions throw `403 Forbidden/Unauthorized` on file uploads. Google Cloud Vertex AI Search provisioning does not trigger in **AI Mode**. |
| **G-C** | **Academic Workspace Viewer** | <span style="color:red">**Deficient**</span> | `web/src/app/[locale]/home/page.tsx`<br>`web/src/app/api/books/pages/route.ts` | Book pages view displays hardcoded placeholder text instead of real parsed PDF pages. Layout formats, boxed rules, and formulas do not render properly. Mind map outline is missing or exists as an unstable SVG graph. Color system for subjects is not standardized. |
| **G-D** | **Multimodal Speech (TTS/STT)** | <span style="color:orange">**Partial**</span> | `web/src/app/api/audio/tts/route.ts`<br>`web/src/components/StickyChat.tsx` | TTS endpoint successfully uses `gemini-3.1-flash-tts-preview` with emoticon filters, but users report speech repetition and cuts. Oral practice is broken (throws connection failure). Real-time rubric grades are static (0%). Egyptian Arabic is not defaulted. |
| **G-E** | **Advanced Swarm Companion** | <span style="color:red">**Deficient**</span> | `web/src/components/StickyChat.tsx`<br>`agents/agent_communications.py` | Full-screen chat stretches excessively (violating reading view comfort). Floating composer overlaps or jitters. Autocomplete mentions (`@`, `#`, `/`), dynamic suggestion chips, and inline feedback forms are missing. Session renaming fails due to backend sync errors. |
| **G-F** | **Practice Workstation** | <span style="color:orange">**Partial**</span> | `web/src/components/dashboard/PracticePanel.tsx` | UI tabs for practice exist, but history tracking, question audit logging, and token calculations do not write back to MongoDB. Active Recall Quest fails to launch due to server timeouts. |
| **G-G** | **Social Forums & Push** | <span style="color:orange">**Partial**</span> | `web/src/components/dashboard/SocialPanel.tsx` | Basic groups and threads are structured, but live peer chat push notifications are broken (forcing manual page reload). React rendering crashes due to duplicate keys (e.g., `user_super_1`). |
| **H-H** | **Admin Security & Approvals** | <span style="color:red">**Deficient**</span> | `web/src/components/AdminSecurityDashboard.tsx`<br>`agents/services.py` | Standard admins can make direct writes without superadmin approval. Dual admin/superadmin change approval workflows (`admin_change_requests`) are not connected to the UI. Secrets are in plain-text `.env.local` instead of GCP Secret Manager. |

---

## 🏛️ 3. Critical Remediation Plan

To resolve these blockers, subsequent **code-writing agents** must execute the following remediation steps sequentially:

### Phase 1: Firebase Storage Rules & Upload Repairs (Highest Priority)
* **Problem**: PDF uploads from the Curriculum Studio fail with `403 Forbidden` unauthorized errors.
* **Remediation**:
  1. Revise Firebase Storage security rules to allow read/write access to authenticated users under `/MOE Library/`, `/Textbooks/`, and `/user_uploads/{userId}/`.
  2. Modify client-side upload handlers to distinguish between Admin-driven curriculum library imports and private student uploads (`user_uploads/[UserId]/`).

### Phase 2: Ingestion Studio & Recursive Crawler Revamp
* **Problem**: Crawler fails to find files, subject mappings are incorrect, and jobs freeze.
* **Remediation**:
  1. Upgrade crawler algorithms in the Cloud Run container to execute deep recursive discovery (removing depth caps).
  2. Implement OpenStax API integration to map books to correct subject categories dynamically, resolving the misalignment where all books fall under "Math".
  3. Format ETA calculations to dynamically scale from seconds to minutes and hours.
  4. Ensure every ingested book page is processed, parsed for layout structures (formulas, rules, laws), and saved directly to the database.

### Phase 3: Speech, Oral Practice, and TTS Repairs
* **Problem**: Robotic speech, repeating audio cuts, and broken Oral Practice connections.
* **Remediation**:
  1. Standardize TTS playbacks on `gemini-3.1-flash-tts-preview` and integrate `gemini-3.1-flash-live-preview` for Oral stream matching.
  2. Implement an audio manager that cancels running speak requests on mic click (interruption).
  3. Default synthesis voices to Egyptian Arabic. Connect live grading rubrics (Pronunciation, Confidence, Accuracy, Structure) to real-time speech analytics payloads.

### Phase 4: Companion UI & Autocomplete Mentions
* **Problem**: Stretched full-screen views, chat rename freezes, and missing mentions.
* **Remediation**:
  1. Adjust full-screen chat container styling to center content with a maximum reading-view width (e.g., `max-width: 800px; margin: 0 auto;`).
  2. Implement mention dropdowns matching `@` (subjects), `#` (books), and `/` (commands).
  3. Resolve the MongoDB state synchronisation block to fix the Chat Renaming freeze.

### Phase 5: Superadmin Dual-Approval Workflows & Security
* **Problem**: Admin changes are committed instantly without superadmin consent.
* **Remediation**:
  1. Connect UI actions performed by standard admins to `admin_change_requests` inside MongoDB/`local_db.json`.
  2. Expose the "Pending Admin Approvals" panel to Superadmins only, permitting them to approve/deny admin configuration shifts or candidate applications.
  3. Shift credentials to Google Cloud Secret Manager.

---
*This report represents the absolute source of truth regarding raw project requirements and functional alignment. Coding agents should proceed strictly in accordance with this roadmap to deliver an enterprise-compliant, visually stunning, and pedagogically grounded tutoring platform.*


  ──────
  ### 📋 Executive Summary of Grouped Requirements

  I have parsed and consolidated all feedback into 8 core functional groups:

  • Group A: Educational Pedagogy & Design: Balance CLT (Cognitive Load Theory) with CTL (Contextual
  Teaching) and Heutagogy. Migrate the multi-agent pipeline and security guardrail console from
  standard admin tabs to 8 public landing cards in the "Why Choose Fahem" section.
  • Group B: Generic Ingestion Studio & Crawler: Allow generic ingestion from any URL or manual
  upload. Build recursive, non-shallow crawlers, directory tree previews (real-time async node
  mapping), and prevent re-downloading duplicate PDFs. Fix Firebase Storage  403 Forbidden
  permission blocks and split admin public uploads from private user uploads.
  • Group C: Academic Workspace & Book Viewer: Implement real OCR page processing that preserves
  layout formats, boxed formulas, and laws. Render collapsable list-based conceptual mind maps next
  to the Table of Contents. Introduce distinct subject-based color themes.
  • Group D: Multimodal Speech & Audio Layer: Standardize on  gemini-3.1-flash-tts-preview  for
  voice synthesis (skipping emoticons, fixing cuts/repetitions) and default to Egyptian Arabic. For
  Oral Practice, stream via  gemini-3.1-flash-live-preview  with automatic recording triggers and
  rubric reporting.
  • Group E: Advanced Swarm Companion & Chat UX: Style full-screen companion expansions to have
  centered, readable margins. Lock the floating activator button, implement autocomplete mentions (
  @  subjects,  #  books,  /  commands), and resolve renaming freezes.
  • Group F: Practice Workstation & Assessment Arena: Offer infinite, gamified practice types (MCQ,
  text, oral) with multiple-topic selection support. Record all session metrics and token histories
  to MongoDB. Solve server timeouts for the Active Recall Quest.
  • Group G: Social Forums & Push: Provide robust social groups, threads, and peer replies. Resolve
  React key duplication crashes and fix live peer chat push notifications.
  • Group H: Admin Console Security, Whitelisting & Approvals: Strip administrative logs and
  specialist tools from standard views. Limit standard admins to drafting and crawling; require
  Superadmin authentication via GCP Secret Manager to commit final ingestion pipelines or modify
  token thresholds.
  ──────
  ### 📊 Gap Analysis Highlights (Current Implementation)

  • 🟢 Functional / Configured:
      • Speech-to-Text: Client-side SpeechRecognition Web APIs are fully operational and local.
      • Text-to-Speech:  gemini-3.1-flash-tts-preview  is configured with regex-based emoticon
      filtering.
      • Judge Whitelist Gate: The  judge.evaluation@fahem.edu  bypass handles local simulation
      fallbacks and launches administrative console audit tools automatically.
  • 🟡 Partially Implemented:
      • Practice/Assessment: Standard layout panels are in place, but practice sessions, challenge
      logs, and telemetry history do not write back or aggregate inside MongoDB.
      • Social Panels: Basic groups and threads are structured, but live push notifications are
      broken, and duplicate React keys (e.g.,  user_super_1 ) occasionally block rendering.
  • 🔴 Missing / Deficient (Blockers):
      • Upload Authorizations: Firebase Storage permissions trigger  403 storage/unauthorized
      errors on both private and admin uploads.
      • Shallow Crawler: Crawlers are too shallow, sometimes return 0 results on dynamic pages, and
      are stuck at low percentages.
      • Fake Workspace Data: Textbook page browser views load static placeholder text rather than
      actual PDF contents, and the visual SVG mind map is unstable.
      • Superadmin Workflows: Non-superadmins can write direct changes to core collections without
      going through the queue approvals.


  Please refer to the detailed raw_requirements_comprehensive_audit.md file inside your project folder
for the step-by-step
  remediation plan that your code-writing companion agent should follow next.
