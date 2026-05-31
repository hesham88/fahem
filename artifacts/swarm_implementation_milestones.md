# 🗺️ Fahem Multi-Agent Swarm: Comprehensive Implementation Plan

This document outlines the systematic, step-by-step blueprint and milestones to build, test, and deploy **Fahem's "AI Tutors in Your Pocket" Multi-Agent Swarm**. 

---

## 🎯 Implementation Phases & Critical Milestones

```
 [ MILESTONE 1 ] ──────> [ MILESTONE 2 ] ──────> [ MILESTONE 3 ]
 Seed Core Schemas      Ingestion & Extractor    MongoDB Search &
 & Onboarding States     Serverless Pipelines     Aggregates Tuning
        │
        ▼
 [ MILESTONE 4 ] ──────> [ MILESTONE 5 ] ──────> [ MILESTONE 6 ]
 Multi-Agent Swarm &     Real-time Social Core    Agent Evaluation &
 Critique Loops          & Credit Quota Gates     Administrative Console
```

---

## 🏗️ Detailed Step-by-Step Breakdown

### 📍 Milestone 1: Core Database Seeding & Persistent Onboarding (Ready for Setup)
1. **Clean up Workspace Mock Data**:
   * Location: `web/src/` and `agents/`
   * Action: Purge all temporary mock variables, placeholder dictionaries, and hardcoded local objects. Establish strict dynamic queries pointing directly to active MongoDB Collections.
2. **Subject Metadata Seeding**:
   * Collection: `subjects`
   * Action: Run a Python seeding script to inject the official list of 50+ subjects (including icons, localization labels, terms, and grade associations).
3. **Persistent Onboarding & Memory Gating**:
   * Collection: `onboarding_sessions`
   * Logic: Ensure the onboarding flow stores incremental stages (e.g., school name autocomplete search outputs, selected avatar category grids).
   * Fix: Prevent amnesia by saving the verified phone flag state, so navigations or locale toggles do not reset verified statuses.
4. **Visual Overrides & Layout Fixes**:
   * Location: `web/src/app/globals.css`
   * Action: Override RTL layout properties using logical CSS rules (`margin-inline-start`, `flex-direction: row-reverse`) to prevent navigation header collisions in Arabic mode.

---

### 📍 Milestone 2: Serverless Ingestion & Extraction Pipelines (Phase 1 & 2)
1. **Small-Scale Verification Sandbox**:
   * Location: `scratches/`
   * Action: Set up a dedicated workspace directory `scratches/ingestion_sandbox/` containing a single test Grade 11 Biology PDF.
2. **Automated Discovery & Scraping**:
   * Logic: Crawler discovers unstructured PDFs inside specified folders of **Firebase Storage** (acting as the raw textbook bucket).
   * Event Trigger: File creations write events to Eventarc/Cloud Logging.
3. **Serverless No-Download Extractor Job**:
   * Target: GCP Cloud Run Async Job / Cloud Function.
   * Execution Flow: Passes the direct Firebase Storage public URL string directly to **Gemini 1.5 Pro API** (skipping heavy memory file downloads).
   * Parsing Goal: Extract chapters, page ranges, keywords, mathematical/scientific formulas, mindmaps, titles, and test questions.
4. **Structured Compilation**:
   * Action: Gemini compiles structured JSON arrays and executes bulk writes into the MongoDB collections: `website_metadata`, `books`, and `book_pages`.

---

### 📍 Milestone 3: MongoDB-Only Search & Analytical Aggregates
1. **Vector Index Configuration**:
   * Target Collection: `book_pages`
   * Action: Configure a native MongoDB Atlas Vector Search Index on the `embedding` path using `cosine` similarity.
2. **In-Database Page-Level Retrieval**:
   * Logic: The agent performs dynamic vector lookups directly in the database during student chats, fetching the closest matching page content and real page citations.
3. **Advanced Admin Analytical Pipelines**:
   * Target Collection: `token_telemetry` and `user_activities`
   * Aggregation 1 (Active User Diagnostics): Groups session active times, total API credits used, and average system usage.
   * Aggregation 2 (Concept Gap Analyst): Aggregates user activities across quizzes, sorting and identifying concepts with average scores $< 60\%$ to flag a student's weakest areas.
4. **Administrative Console Integration**:
   * UI Dashboard: Build highly interactive visual charts, grid tables, and status meters mapping credit pools, ingestion job queues, and security warnings.

---

### 📍 Milestone 4: Multi-Agent Swarm & The Critique Loop
1. **The central Coordinator Companion**:
   * Logic: Build the main orchestrator agent that receives user queries, parses intents, and delegates to the appropriate specialized expert subagent in the "Agent Garden".
2. **Review & Critique Loop (Practice Subagents)**:
   * **MCQ Agent**: Generates contextual multiple-choice questions.
   * **Text-Practice Agent**: Receives handwritten photos or typed text. Implements native **copy-paste blocking on input fields** to stimulate active writing.
   * **Critique Subagent (The Loop)**: Cross-references the student's answer with textbook semantic page records. If the answer lacks detail, it provides constructive critique and loops back to prompt further input.
3. **Specialized Academic Session Agents**:
   * **Planner Agent**: Generates study schedules and tracks completion statuses.
   * **Quiz Agent**: Conducts timed exams based on subjects and concepts.
   * **Zatona Agent**: Compiles high-density, rich-structured explanations, formula summaries, and mindmaps.

---

### 📍 Milestone 5: Real-Time Social Core & Credit Quotas
1. **Real-time Event Delivery**:
   * Pipeline: Set up Firestore snapshot listeners to drive instant message delivery and typing indicators on active discussion rooms.
2. **Push Notification Infrastructure**:
   * Integration: Register Firebase Cloud Messaging (FCM) service workers to dispatch instant, system-wide pushed companion alerts.
3. **Social Protection, Privacy, & Visibility Gating**:
   * Features: Parent-Child linkage, friends list, and direct user blocking aggregates.
   * Safety Scans: Implement background moderation triggers to scan and filter out non-academic uploads.
4. **Tiered User Profile Gating**:
   * Models: Define limits (Basic, Premium, Elite) in `users` metadata and enforce decrement calculations in `token_telemetry` hooks.

---

### 📍 Milestone 6: System Evaluation & Launch Control
1. **Benchmark Test Set Configuration**:
   * File: `eval_set.json`
   * Data: Curate 15 target question-answer test sets representing typical student prompts across grades.
2. **Evaluation Execution (`agents-cli eval run`)**:
   * Automation: Execute CLI evaluations to measure and grade agent outputs:
     * **Citation Quality**: Do the page numbers in citations accurately match the target PDF page?
     * **Hallucination Metric**: Are facts 100% grounded in the extracted database records?
   * Verification: Compare results across prompt configurations to guarantee zero degradation.
3. **Public Deployment**:
   * Action: Clean, compile, and push code to remote repositories to trigger production builds with zero compilation warnings.

---

## 🔍 Planning Verification Sandbox Steps (Immediate Actions)

Before triggering large-scale ingestion loops or multi-agent networks, we will perform small, isolated verification tests:

1. **Step A**: Seed 3 subjects and 1 textbook metadata profile manually into MongoDB.
2. **Step B**: Upload a single PDF page to Firebase Storage and execute the serverless Gemini parsing script to verify extraction accuracy.
3. **Step C**: Verify the vector indexing and return citation formats on a single test query.
4. **Step D**: Confirm persistent onboarding session resumes after changing interface language locales.
