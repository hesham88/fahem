# 🧠 Fahem Multi-Agent Swarm: Master ADK Integration & Reflection Blueprint

This document presents a comprehensive, high-fidelity architectural blueprint and technical master plan for **Fahem ("AI Tutors in Your Pocket")**, aligning your extensive requirements directly with the **Google Agent Development Kit (ADK) standards**, the **Model Context Protocol (MCP)**, and the **ADK Production Readiness Framework** parsed and synthesized from the five attached PDF manuals:

1. *Architecting AI Agents with Google ADK: A Comprehensive Guide*
2. *ADK Agent Production Readiness Framework: From Prototype to Enterprise Operations*
3. *The Architect's Guide to AI Agent Memory: From Moments to Milestones*
4. *The ADK Orchestration Primer: Designing Collaborative AI Teams*
5. *Architectural Design Document: Complex Multi-Agent Orchestration System*

---

## 🧭 1. Reflective Analysis of the ADK Ecosystem

### A. google-agents-cli & Manifest Detection
Through interactive testing and source-code introspection of the global `0.2.1` installation, we discovered the core mechanisms of `google-agents-cli`:
* **Project Discovery Hook**: The CLI searches for an `agents-cli-manifest.yaml` in the current directory or its parents. If absent, it falls back to parsing a `pyproject.toml` containing a `[tool.agents-cli]` section. If neither is found, it defaults to programmatic mode and reports that no project was found.
* **Available Agent Templates**: The CLI bundles three core scaffolding templates:
  1. `adk`: A standard single-agent project designed for direct reasoning tasks.
  2. `adk_a2a` (*Agent-to-Agent*): Engineered for collaborative delegation, facilitating high-density agent-as-a-tool topologies.
  3. `agentic_rag`: Pre-configured with ingestion, chunking, and search parameters.
* **Available CLI Checks**:
  * `google-agents-cli lint`: Automates code quality gates using `ruff check .`, `ruff format . --check`, `codespell` (for spelling validation), `ty check` (type checkers), and optional `mypy` static typing checks.
  * `google-agents-cli eval run`: Runs structured, programmatic model evaluations against a mock user test set (`evalset.json`), scoring outputs across key metrics like safety, tool trajectory, and response grounding.
  * `google-agents-cli eval compare`: Performs side-by-side analysis of evaluation scores to prevent prompt drift.
  * `google-agents-cli eval optimize`: Leverages the **GEPA (Gradient-free Evaluation and Prompt Optimization)** framework to automatically refine agent instructions.

### B. Understanding Fahem's Future Vision
Fahem is transitioning from a programmatic database explorer into a **pocket-sized swarm of AI Tutors**. 
* **The Problem**: Egyptian students need grounded, curriculum-aligned answers, study plans, oral practice, and collaborative features without heavy downloads or unrelated, non-educational distractions.
* **The Solution**: An orchestrator companion that acts as the entry router ("The CEO"), delegating tasks to a garden of specialized agents (MCQ, Text Practice, Oral, Planner, Quiz, Zatona, and Insights) using MongoDB Atlas as the primary semantic, session, and compliance layer.

---

## 🏛️ 2. Complex Multi-Agent Orchestration Architecture

To achieve zero prompt bloat and prevent non-deterministic failures, we map the agent spectrum according to strict ADK primitives:

```
                          [ WORKSPACE CLIENT (Next.js & Firebase) ]
                                              │
                                              ▼ (OIDC JWT Auth)
                       [ ROOT COORDINATOR / COMPANION LLM AGENT ]
                                              │
                       ┌───────────────────────┼───────────────────────┐
                       ▼ (Handoff)             ▼ (Agent-as-a-Tool)     ▼ (Graph Node)
               [ PRACTICE AGENT ]       [ INSIGHTS AGENT ]         [ ADK WORKFLOW MANAGER ]
             (Adaptive Critique Loop)    (MongoDB MCP Telemetry)   (Sequential / Parallel Nodes)
                       │                                               │
            ┌──────────┴──────────┐                            ┌───────┴───────┐
            ▼                     ▼                            ▼               ▼
       [ MCQ Agent ]       [ Text Agent ]               [ Quiz Agent ]  [ Planner Agent ]
        (Task Mode)         (Task Mode)                  (Task Mode)     (Task Mode)
```

### A. Core Agent Roles & Hierarchies
1. **The Root Coordinator Companion ("The CEO")**:
   * *Type*: **LLM Agent** using `Gemini 1.5 Pro`.
   * *Role*: Evaluates open-ended user requests (e.g., "Give me a mindmap for Chapter 3" or "Review my errors in Algebra") and dynamically routes control.
2. **Deterministic Workflow Managers**:
   * *Type*: **Workflow Agent** using ADK state-machine graphs.
   * *Role*: Manages multi-step processes like structured study plan creation or quiz generation sequentially or in parallel without LLM routing overhead.
3. **Specialist Workers (Agent-as-a-Tool)**:
   * *Type*: **Single-turn Task LLM Agents** configured as tools inside the parent agent's schema.
   * *MCQ Agent*: Generates tailored multiple-choice question sets.
   * *Text-Practice Agent*: Validates student's typed responses. 
   * *Oral Agent*: Handles voice-in, voice-out loops.
   * *Zatona Agent*: Compiles hyper-dense book mindmaps and formula sheets.
   * *Insights Agent*: Calls MongoDB MCP to fetch performance diagnostics.

### B. The Adaptive Review & Critique Loop Pattern
Used extensively in the **Text-Practice Agent** to enforce active learning:
1. **The Generator**: Evaluates the student's typed text or handwriting upload, proposing a grade and qualitative review.
2. **The Critique Subagent (Perfectionist)**: Cross-references the proposed feedback with the exact grounded textbook page. If key rules, formulas, or steps are missing, it rejects the grade, gives constructive critique, and loops back.
3. **Copy-Paste Block**: The frontend text input prevents standard copy-paste keyboard actions (`Ctrl+V` or context-menu paste) to force active recall.
4. **Deterministic Exit**: Set `max_iterations = 3`. If the student fails to meet the threshold by the third iteration, the loop terminates, saves the "Concept Gap" to MongoDB, and triggers a helpful breakdown.

---

## 💾 3. State-of-the-Art Agent Memory Management

Aligned with *"The Architect's Guide to AI Agent Memory,"* we establish a unified Three-Layer Memory architecture:

| Memory Layer | ADK Primitive | Technology | Purpose in Fahem |
| :--- | :--- | :--- | :--- |
| **Layer 1: Working** | `InMemorySessionService` | Python `session.state` (Dict) | Ephemeral variables, tool call outputs, and dialog turns active inside the current execution step. |
| **Layer 2: Persistent** | `DatabaseSessionService` | **MongoDB Atlas** (`onboarding_sessions`, `chat_history`) | Transcripts and states that survive page reloads and language toggles. |
| **Layer 3: Long-term** | `VertexAiMemoryBankService` | **MongoDB Atlas Vector Search** | Semantic vector storage of user achievements, failed concepts, and personalized settings. |

### 🔄 The Preload Memory Loop
Before every single execution turn:
1. The **`PreloadMemory` tool** intercept is executed.
2. It queries the Atlas Vector Search for the student's historical strengths and weaknesses (e.g., "Student struggles with Algebra page 14").
3. It preloads these facts directly into the root LLM agent's prompt context, ensuring continuous personalization across sessions.
4. **Persistent Onboarding**: When a user is in the onboarding flow, incomplete forms, chosen avatars, and phone verification states are saved continuously to `onboarding_sessions`. Switching locales or restarting the browser resumes the step exactly where they left off.

---

## 🗄️ 4. Exclusive MongoDB MCP Pipelines & Data Models

We design the entire data ingestion, analysis, and reporting layers to execute calculations **database-side** via PyMongo or the MongoDB MCP toolset, minimizing memory footprints.

### A. Data Models & Textbook Schema
We organize textbooks hierarchically inside MongoDB to accommodate grade-specific subjects:

```
  [ SUBJECTS COLLECTION ]
         │
         ├── 🌱 Agriculture & Entrepreneurship
         ├── 📊 Algebra & Statistics
         └── ... (50+ Subjects mapped)
                 │
                 ▼
  [ BOOKS COLLECTION ] (Core / Student Book vs. Supporting / Questions Book)
         │
         ├── bookId (UUID)
         ├── grade, subject, language, term, year, bookType
         └── ...
                 │
                 ▼
  [ BOOK_PAGES COLLECTION ]
         ├── _id (Public Web URL / Firebase Storage Public Link)
         ├── pageNumber (int)
         ├── bookId (Reference)
         ├── embedding (Array[1536]) ───> Vector Index
         └── content_summary: { chapters: [], formulas: [], titles: [], questions: [], mindmap: {} }
```

### B. MongoDB Aggregation Reporting Pipelines
We execute advanced analytics entirely in-database using high-performance aggregation pipelines:

#### Pipeline 1: "Concept Gap" Analyzer (User Weakness Report)
Aggregates student quiz activities, groups performance by concept, averages the scores, and sorts to highlight the weakest areas:
```python
gap_pipeline = [
    { "$match": { "userId": student_id, "type": "quiz" } },
    { "$group": {
        "_id": "$metadata.concept",
        "averageScore": { "$avg": "$metadata.score" },
        "totalAttempts": { "$sum": 1 },
        "incorrectAttempts": { "$sum": { "$cond": [{ "$lt": ["$metadata.score", 60] }, 1, 0] } }
    }},
    { "$sort": { "averageScore": 1 } }, # Weakest concepts first
    { "$limit": 5 }
]
gaps = list(db["user_activities"].aggregate(gap_pipeline))
```

#### Pipeline 2: Tiered Usage & Credit Quota Monitor
Calculates total API consumption and tracks remaining credits across Basic, Premium, and Elite profiles:
```python
credit_pipeline = [
    { "$match": { "userId": user_id } },
    { "$group": {
        "_id": "$userId",
        "totalCreditsUsed": { "$sum": "$creditsDeducted" },
        "apiCallsCount": { "$sum": 1 }
    }}
]
```

### C. Search & Magnetization Gating
* **The "Magnetize" Feature**: The student can "magnetize" (pin) a specific book, page, or subject to their Companion.
* **Database-Side Query Gating**: When a subject or page is magnetized, all vector search operations (`$vectorSearch` stage in aggregation) automatically append a strict `$match` filter restricting the context to that specific `bookId` or `pageNumber`. When released, the filter is removed, reverting to global search.

---

## ☁️ 5. Serverless No-Download Ingestion Loop (Phases 1 & 2)

To scale textbook parsing without downloading hundreds of gigabytes of PDFs into memory:

```
 [ Admin / User ] ───(Uploads PDF)───> [ Firebase Storage Bucket ]
                                                │
                                                ▼ (Event Trigger)
                                    [ Cloud Logging & Eventarc ]
                                                │
                                                ▼
                                    [ Async Cloud Run Parser Job ]
                                                │
                       (Passes URL Only)        ▼
                   ┌────────────────────────────┴──────────────────────────┐
                   ▼                                                       ▼
      [ Gemini 1.5 Pro API ]                                    [ Vertex AI Search ]
 (Parses, Chunks, Structurizes)                              (In-Memory Page Vectors)
                   │                                                       │
                   ├────────────────────────────┬──────────────────────────┘
                   ▼                            ▼
      [ MongoDB Atlas Collection ]     [ MongoDB Vector Search ]
      Collection: website_metadata      Index: page_embeddings
```

1. **Upload**: Textbooks uploaded by admins are placed in **Firebase Storage**.
2. **Trigger**: Eventarc routes a file-created log to an async **Cloud Run Parsing Job**.
3. **Parsing**: The job passes the public Firebase URL directly to the **Gemini 1.5 Pro API** (letting Gemini handle file parsing directly on Google's backbone, saving compute memory).
4. **Structured Mapping**: Gemini returns structured JSON containing chapters, formulas, titles, concepts, and questions, which are mapped directly to `book_pages` alongside embeddings generated via Gemini Embedding API.

---

## 🎨 6. UX Enhancements & RTL Header Layout Alignment

### A. RTL Header Bug Diagnostic
We reviewed the `globals.css` configuration and discovered a major CSS override conflict:
```css
[dir="rtl"] .glass-nav-links {
  flex-direction: row-reverse;
}
```
* **The Bug**: Setting `dir="rtl"` on the html/body tag naturally flips the layout direction and flows child flex elements from right to left. By applying `flex-direction: row-reverse` specifically under `[dir="rtl"]`, the CSS rules *reversed the reversal*, forcing elements back into LTR and causing the Navbar links to collide with the logo!
* **The Fix**: Remove the redundant `row-reverse` override and adopt CSS logical properties (`margin-inline-start`, `padding-inline-end`) which dynamically adapt alignments based on the document direction.

### B. Premium Layout Recommendations
* **Companion Full-Screen Mode**: Include a dynamic full-screen toggle for the Companion panel. This provides a focused distraction-free writing board for text practice and clear side-by-side reading layouts on mobile tablets.
* **Social Core Interactions**: Integrate Firestore snapshot listeners to deliver real-time messages and instant typing feedback. 
* **Academic Space Organization**:
  * *Library Tab*: Swipe gestures to move between textbook pages with clickable overlays on formulas or key terms.
  * *Companion Tab*: Dynamic "magnet" badge indicating pinned books.
  * *Social Tab*: Threaded topics, group chats, and parent-child permission grids.

---

## 🛠️ 7. Smart Administrative Monitoring Console

To provide ultimate system control and auditing capabilities, we design a dedicated **Admin Tab Dashboard**:

```
 ┌────────────────────────────────────────────────────────────────────────┐
 │ 📊 FAHEM SYSTEM LAUNCH CONTROL PANEL (ADMINISTRATION)                  │
 ├──────────────────────────┬──────────────────────────┬──────────────────┤
 │ 📁 INGESTION MONITOR     │ 🔋 USAGE & TELEMETRY     │ 🔒 COMPLIANCE    │
 │ Ingestion Queue: [3 Active]│ Credits Pools:           │ Safety Scan Status:│
 │ Speed: 1.4 MB/s          │ Basic:  452 Users        │ Active [100% OK] │
 │ Status: Ingesting Bio p.42│ Premium: 1,280 Users     │ Blocked Users: 4 │
 │ [Restart Ingestion]      │ Elite:   84 Users        │ [View Audit Logs]│
 ├──────────────────────────┴──────────────────────────┴──────────────────┤
 │ 🪵 ASYNC CLOUD RUN PIPELINE LOGS (REAL-TIME STREAM)                    │
 │ [18:02:11] EVENTARC: Triggered Cloud Run parser for Bio_G11_Term1.pdf  │
 │ [18:02:14] GEMINI API: Structural catalog parsing succeeded (140 pages)│
 │ [18:02:15] MONGO MCP: Bulk-writing 140 documents with vectors... SUCCESS│
 └────────────────────────────────────────────────────────────────────────┘
```

1. **Ingestion Queue & Status Meters**: Tracks active parser container states, throughput speeds, and database write successes.
2. **Quota telemetry**: Visualizes credit drawdowns, API failures, and user tiers usage.
3. **Security Auditing**: Real-time log monitoring of blocked actions, prompt injection attempts, and automated content-safety flags on shared user posts.

---

## 🧪 8. Agent Evaluation Framework & Quality Gates

To graduate Fahem from a prototype to a public-facing platform, we establish a quantified evaluation gate utilizing `google-agents-cli eval run`:

```
                       [ THE EVALUATION PYRAMID ]
                       
                        / \       OUTCOMES (Task/onboarding complete?)
                       /   \
                      /     \     REASONING (Did critique loop route correctly?)
                     /       \
                    /         \   TOOL PRECISION (MongoDB MCP params correct?)
                   /___________\
```

### A. The Test Benchmark (`eval_set.json`)
We curate a local benchmark containing 15-20 textbook question-answer pairs representing curriculum guidelines (e.g., Biology formulas, Algebra equations).

### B. Core Quality Metrics
During the `eval run` execution, agents are scored on three specialized rubrics:
1. **`tool_trajectory_avg_score`**: Measures the correctness of tool invocations (ensuring MongoDB MCP connect/find/aggregate tools are called sequentially without hallucinated paths).
2. **`hallucinations_v1`**: Validates that all answers provided by the agent are 100% grounded in the textbook page citations, scoring zero if facts are fabricated.
3. **`safety_v1`**: Scans inputs and responses for persona drift, content safety violations, or SQL/NoSQL injections.

> [!IMPORTANT]
> **Production Quality Gate**: No agent code will be deployed to GCP Cloud Run unless it completes 5-10 automated iteration loops and consistently scores **0.80 or higher** across all three core rubrics.

---

## 🚀 9. Step-by-Step Implementation Roadmap

We align our development lifecycle into clean, progressive milestones, starting with isolated local sandboxing:

### 📍 Milestone 1: Visual Layouts & Persistent Onboarding
* **Task A: CSS Layout Cleanup**: Remove `flex-direction: row-reverse` from `.glass-nav-links` under `[dir="rtl"]` in `globals.css` and configure CSS logical spacing to fix the Arabic header alignment.
* **Task B: Onboarding Persistence**: Write database updates to write state changes immediately to the `onboarding_sessions` collection. Ensure verified phone parameters are persisted across language switches.

### 📍 Milestone 2: Small-Scale Verification Sandbox
* **Task A: Sandbox Creation**: Build `scratches/ingestion_sandbox/` containing a single-page textbook PDF sample.
* **Task B: Pipeline verification script**: Create a python execution script to trigger the Gemini parsing API with a direct public URL, compile structured JSON, and execute bulk inserts into a test `book_pages` collection.
* **Task C: Index Verification**: Build the MongoDB Vector Index on the test collection and execute test queries to verify grounded citations.

### 📍 Milestone 3: Multi-Agent Scaffolding & Critique Loops
* **Task A: Coordinator Setup**: Refine `agents/orchestrator_agent` to route incoming user queries.
* **Task B: Critique Loop Development**: Scaffold the Generator and Critique subagents inside `agents/` using the ADK `WorkflowAgent` pattern with `max_iterations = 3`.
* **Task C: UI Copy-Paste Blocker**: Update the frontend text practice panels to prevent keyboard copy-paste commands.

### 📍 Milestone 4: Real-Time Social Layer & Credits Quotas
* **Task A: Firestore snapshot streams**: Integrate snapshot listeners on the frontend discussion rooms for realtime messaging and typing animations.
* **Task B: User Gating Queries**: Set up parent-child visibility checks and direct blocking queries in MongoDB.
* **Task C: Credit Quota hook**: Build trigger hooks to deduct credits and enforce Basic/Premium/Elite profile gates.

### 📍 Milestone 5: Monitoring Dashboards & Quality Evaluations
* **Task A: Admin Panel**: Build the administrative dashboard view in the frontend, wiring active collection aggregations for gap diagnostics and telemetry.
* **Task B: Automated CLI Evaluation**: Set up the `eval_set.json` file and execute `google-agents-cli eval run` to optimize prompts and verify the **0.80 Quality Gate**.

---

### 💬 Discussion & Feedback Request
To maintain absolute transparency and adhere to our team protocols, we request your review of the architecture. Specifically:
1. Do you prefer having the **Vector Index** entirely managed within **MongoDB Atlas Vector Search**, or do you want to keep a hybrid model using **Vertex AI Search Converse API**?
2. Are you aligned with the 50+ subjects list and the core/supporting textbook taxonomy?
3. Once we align on these decisions, we can immediately begin **Milestone 1** (visual navbar RTL fix & onboarding database wiring) and **Milestone 2** (the ingestion sandbox test run)!
