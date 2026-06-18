# 🌌 Fahem Platform Master Plan - Version 82
**Timestamp**: 2026-06-18T04:55:32+03:00
**Phase**: Phase 28: Resolving TOC Chapter Regressions, Robotic Chat, Citations, and UI Latency Skeletons
**Core Model Specification**: Gemini 3.5 Flash (High)

---

## 🏛️ 1. Vision & Executive Summary

Fahem ("AI Tutors in Your Pocket") is a high-premium agentic educational platform. This version of the Master Plan focuses on resolving four critical interface and workflow regressions identified on the live platform (`fahem.pro`):
1. **Table of Contents (TOC) Granularity Regression**: The TOC was displaying coarse "Section 1 to Section 6" titles instead of true granular book chapters and topics. We corrected `buildTOC` inside `LibraryPanel.tsx` to prioritize rich database-ingested subjects structure (`richBook.chapters`) over coarse reader structure (`selectedBookReader.chapters`).
2. **Robotic Chat History Formatting**: Persisted session chats carried enriched RAG prompts instead of friendly user queries. We updated the API backend (`web/src/app/api/agent/route.ts`) to extract and persist `user_query` (passed directly from `StickyChat.tsx` query input), reverting the format to friendly, clean user questions.
3. **Companion Citation Deep-Linking Navigation**: Inline citations like `[pN]` in the StickyChat companion were failing to navigate. We added a reactive fallback that maps the page navigation event to the active book context if no explicit book filter is selected in the workspace.
4. **Knowledge Library and Book Page Viewer Latency**: Perceived delays during data retrieval from MongoDB have been addressed by injecting ultra-premium shimmering loading skeleton screens in both the book catalog grid and the page viewer, ensuring immediate interactive visual feedback.
5. **D-CRAWL-CTRL Sweep Gate Fix**: Resolved a replication lag race condition in local/CI test sweeps (`scripts/reexec_dbox.py`) by allowing the sandbox demo persona token to propagate across Atlas replicas, ensuring 11/11 tests pass green.

---

## 🏛️ 2. Dynamic Swarm & Orchestration Topology

We continue using the hierarchical coordinator-worker topology on Google ADK 2.0. Dynamic data query pathways use OIDC authenticated headers to route Next.js API endpoint calls to the FastAPI agent microservice hosted on GCP Cloud Run.

---

## 💾 3. Core Alignments in Version 82

1. **Table of Contents (TOC) Prioritization**:
   - Refactored `buildTOC` in `web/src/components/dashboard/LibraryPanel.tsx` to first match on the dynamic subjects book list (`richBook.chapters`) which contains the complete 164-chapter detail tree.
   - Falls back to `selectedBookReader`'s coarse chapters list only if the matched database book is missing or unpopulated.

2. **Robotic Chat History Stripping & Persistence**:
   - Modified `web/src/components/StickyChat.tsx` to include `user_query` (the clean question text) in the request body payload.
   - Updated `web/src/app/api/agent/route.ts` to retrieve and save `chatHistoryUserMessage` into MongoDB sessions and user activity logs, eliminating system-enriched prompt payloads.

3. **Page Citations Target Resolution**:
   - Swapped out empty string fallback with `bookContext?.book_id || bookContext?.book?._id || bookContext?.book?.id || ""` inside `StickyChat.tsx`'s inline parser, successfully routing `[pN]` links to the active book view.

4. **Premium Shimmering Skeleton Indicators**:
   - Injected elegant shimmering CSS skeleton blocks in `LibraryPanel.tsx` for book lists (`isLoading`) and page retrievals (`loadingBookPages`), maintaining modern premium glassmorphism aesthetics.

5. **Sandbox Lag Gates**:
   - Introduced a `time.sleep(2.5)` delay in `scripts/reexec_dbox.py` to prevent unauthorized gateway exceptions due to MongoDB write-to-read replica delays.

---

## 🎯 4. Quality Gates & Validation Status

- **Git Author Verification**: PASS (hesham88 <hesham1988@gmail.com>).
- **Sweep Test Verification**: PASS (11/11 active assertions green).
- **Design Guidelines compliance**: PASS (Strict Logical properties, Vanilla CSS variables, responsive grids).
