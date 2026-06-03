# 🌌 Fahem Swarm Platform: Master ADK 2.0 Integration & Architectural Blueprint

**Document Reference**: `FAHEM-SWARM-METAFRAMEWORK-2026-FINAL-COMPREHENSIVE`  
**Core Model Standard**: `gemini-3.1-flash-lite` Exclusively  
**Database Protocol**: MongoDB Atlas Model Context Protocol (MCP)  
**Hosting Infrastructure**: Google Cloud Platform Cloud Run Services & Jobs + Firebase App Hosting  
**Primary Author**: `hesham88` <`hesham1988@gmail.com`>

---

## 🏛️ 1. Educational Pedagogy & Design Foundations

Fahem represents a paradigm shift in digital education. Rather than acting as a simple Q&A chatbot or textbook search engine, it integrates state-of-the-art cognitive frameworks directly into multi-agent workflows to promote active learning, deep understanding, and high information retention.

```
+-----------------------------------------------------------------------------------+
|                           FAHEM PEDAGOGICAL TRIAD                                 |
+-----------------------------------------------------------------------------------+
|  1. Cognitive Load Theory (CLT)                                                    |
|     - Minimizes extraneous load through clean, progressive disclosure.            |
|     - Split-screen workspace prevents split-attention effects.                    |
|     - Chunks knowledge under <500 tokens to preserve working memory.              |
+-----------------------------------------------------------------------------------+
|  2. Contextual Teaching & Learning (CTL)                                          |
|     - Anchors abstract formulas and laws (e.g., matrices, equilibrium) in         |
|       rich, real-world, high-fidelity physical scenarios.                         |
|     - Relates classroom curriculum directly to lived experience.                 |
+-----------------------------------------------------------------------------------+
|  3. Bounded Autodidactism (Heutagogy)                                             |
|     - Guides students along self-directed learning paths.                         |
|     - Promotes exploration but sets healthy boundaries with active recall gates. |
|     - Awards Cognitive Tokens and levels for active participation over rote paste.|
+-----------------------------------------------------------------------------------+
```

### A. Integrated Learning Modes
- **Constructive & Active**: Paste is prevented on practice input panels. Students must physically type out their formulations, forcing motor-cognitive synthesis.
- **Collaborative Swarm**: Multiple agents work together in a synchronized worker mesh to provide critique, summaries, or personalized mock questions.
- **Inquiry-Based & Reflective**: Students are encouraged to self-correct during the Adaptive Critique Loop rather than receiving direct, flat answers.

---

## 🏛️ 2. Dynamic Swarm & Orchestration Topology

Fahem's future architecture uses a **hierarchical coordinator-worker** topology built on ADK 2.0's dynamic state-machine graph elements (`Workflow` and `Node` classes).

```mermaid
graph TD
    User([Student Chat Window]) -->|OIDC JWT / WebSocket| Companion[Companion Node: Coordinator]
    
    subgraph ADK 2.0 Dynamic Graph Swarm
        Companion -->|Handoff / Workflow Node| Practice[Practice Agent Workflow]
        Companion -->|Parallel Tool Call| Quiz[Quiz Agent: Parallel Chapter Fanout]
        Companion -->|Handoff / Tool Node| Planner[Planner Agent: Study Scheduling]
        Companion -->|Direct Tool Hook| Zatona[Zatona Agent: Synthesis Expert]
        Companion -->|MCP Call| Insights[Insights Agent: Aggregate Metrics]
    end

    subgraph Practice Agent Sub-Tree
        Practice --> MCQ[MCQ Sub-agent]
        Practice --> Text[Text Practice Sub-agent]
        Practice --> Oral[Oral Practice Sub-agent]
    end

    subgraph Critique Loop Workflow
        Text --> Gen[Generator: Propose Score]
        Gen --> Crit[Critique: Vertex AI Search / Fact Checker]
        Crit -->|Score < 0.8 & iter < 3| Gen
        Crit -->|Score >= 0.8 or iter == 3| Term[Termination Gate: Lock Session State]
    end

    subgraph Data & Grounding Layer
        Insights -->|Exposes Tools| MCP[MongoDB Atlas MCP Server]
        Crit -->|Grounded Lookups| Vertex[Vertex AI Search Data Store]
        MCP -->|Aggregation Pipelines| Atlas[(MongoDB Atlas Cluster)]
    end
    
    style Companion fill:#f3e8ee,stroke:#9d4edd,stroke-width:2px;
    style Critique Loop fill:#e0f2fe,stroke:#0284c7,stroke-width:1px;
    style Practice Agent Sub-Tree fill:#fef3c7,stroke:#d97706,stroke-width:1px;
```

### A. Core Agent Specifications (Running exclusively on gemini-3.1-flash-lite)

1. **Companion (Coordinator Node)**:
   * **Role**: Root conversational entry point. Holds global session context.
   * **Behavior**: Evaluates prompt intent. If a student asks for active practicing, it performs an ADK graph handoff to the `Practice Agent` workflow. If they ask for administrative reports or statistics, it delegates to the `Insights Agent`.
   * **Prompt Safety Hook**: Registers custom logic via ADK's native `before_model_callback` hooks to intercept inputs, scan for injections, mask local username paths (`hesh1`), and block non-academic content.

2. **Practice Agent (Multi-turn ReAct Sub-Tree)**:
   * **MCQ Sub-agent**: Dynamically fetches page-linked questions matching the active subject.
   * **Text Practice Sub-agent**: Handles long-form questions, writing states safely to the database context.
   * **Oral Practice Sub-agent**: Configured using ADK's `Runner.run_live()` over WebSockets to establish real-time voice streaming evaluations.

3. **Zatona Agent (Synthesis Expert)**:
   * **Role**: Hyper-dense summarizer and study guide generator.
   * **Parameters**: Runs on high-context `gemini-3.1-flash-lite`, absorbing entire chapters to build formula sheets, concepts lists, and multi-level mindmaps.

4. **Quiz Agent (Parallel Engine Pattern)**:
   * **Behavior**: Instead of querying chapters sequentially, it utilizes multi-threaded Python worker pools to query and synthesize question profiles from distinct textbook chapters concurrently, merging them into a balanced quiz sheet.

---

## 🔄 3. Adaptive Critique Loop (Deterministic Iteration Workflow)

To prevent hallucinated feedback and ensure high-quality, pedagogical corrections for open-ended text answers, the system executes a strict multi-agent feedback loop:

```
[Student Input] ──> [Generator Node]
                         │
                         ▼
                   [Critique Node] <── (Grounded via Vertex AI Search & MongoDB Book Schemas)
                         │
         ┌────────────────┴────────────────┐
         ▼ (Score < 0.80 & Iter < 3)        ▼ (Score >= 0.80 or Iter == 3)
 [Loop Back: Provide Hint]        [Termination Gate: Write Session State]
```

1. **Step 1: Generation**: The Generator Node evaluates the student's answer and proposes a raw grading payload (`{ score: float, strength: str, weaknesses: list }`).
2. **Step 2: Verification (Critique)**: The Critique Node interceptor performs a hybrid grounding lookup (queries the Vertex AI Search Data Store for page-level textual facts and checks MongoDB `books` schemas for mathematical formulas/laws). It matches the generator's grade against the actual curriculum.
3. **Step 3: Gated Execution**:
   * **Condition A (Iteration < 3 and Quality Score < 0.80)**: The critique rejects the grade, constructs a precise, localized hint (e.g., *"Take another look at the matrix inversion determinant criteria on page 14"*), and cycles back to the Generator.
   * **Condition B (Quality Score >= 0.80 or Iteration == 3)**: The loop terminates, commits the final grade to the database, and unlocks the session.

---

## 💾 4. MongoDB Atlas Database & Generic Ingestion Architecture

### A. Generic Asynchronous Ingestion & Library Exploration Process

To ingest academic documents cleanly without locking resources or blocking user interactions, we utilize an async, serverless streaming pattern incorporating an intelligent **Library Exploration Process**.

```
[Enters Library URL / Manual Upload] ──> [Library Exploration Process]
                                                    │
                                                    ▼
                                      [Cloud Run Ingestion Parser]
                                                    │
                                                    ▼
                                    [Gemini-3.1-flash-lite Extraction]
                                                    │
                                                    ▼
                                       [Hierarchical Path Stitching]
                                                    │
                                                    ▼
                                      [MongoDB Atlas Vector Embedding]
```

1. **Library Exploration & Metadata Mapping**:
   - The admin inputs a library URL (e.g., `https://openstax.org` - *active & available*, vs `https://ellibrary.moe.gov.eg` - *dimmed* to avoid licensing conflicts in competitions) or a student uploads a private PDF.
   - The **Library Exploration Process** analyzes the incoming directory structure, scanning for structural dependencies to automatically extract: **Subject, Textbook, Grade (if any), Book Type (core textbook vs. workbook), Author, Publisher, Year, and Language**.

2. **Hierarchical Storage Paths**:
   - Every library gets its own dedicated, hierarchical storage path in **Firebase Storage** to maintain extreme cleanliness and multi-tenant security:
     - `gs://fahem-academic-lake/libraries/[LibraryName]/[Subject]/[Grade]/[BookTitle]/`
     - Private student files are stored strictly under: `gs://fahem-academic-lake/user_uploads/[UserId]/[Date]_[FileName].pdf`
   - Real-time profile pictures are stored under: `gs://fahem-academic-lake/profile_pictures/[UserId].jpg` and get synced immediately upon change.

3. **Stream Parsing & Vector Embeddings**:
   - The Cloud Run job **never downloads the PDF bytes**. Instead, it transmits the secure document stream link directly to the **Gemini API** via native file URI access, asking the model to build the complete catalog.
   - Gemini extracts chapters, concepts, formulas, rules, laws, and important code blocks.
   - Text chunks are parsed under `<500 tokens` to minimize cognitive load (CLT).
   - Vector embeddings are generated via Vertex AI's text-embedding API and saved to MongoDB Atlas, enabling immediate, high-fidelity hybrid vector searches.

4. **Vertex AI Search & AI Mode Integration**:
   - For every library imported, the ingestion agent automatically provisions and populates a **Google Cloud AI Application Site Search** data store.
   - It sets up Vertex AI Search in **AI Mode**, exposing a high-fidelity semantic search API that allows agents to ground query responses directly in page-level school book references.

---

### B. MongoDB Collection Schemas

We implement a balanced normalized-embedded collection hierarchy inside MongoDB Atlas:

#### 1. Collection: `subjects`
Holds national/global educational subjects:
```json
{
  "_id": "subj_algebra_stats",
  "name": "Algebra and Statistics",
  "emoji": "📊",
  "grade_levels": ["Grade 10", "Grade 11", "Grade 12"]
}
```

#### 2. Collection: `books`
Separates core textbook volumes from supplementary question manuals:
```json
{
  "_id": "book_openstax_alg_g10_t1",
  "subject_id": "subj_algebra_stats",
  "title": "College Algebra 2e",
  "grade": "Grade 10",
  "term": "Term 1",
  "year": "2026",
  "language": "en",
  "book_type": "core", 
  "source_url": "https://openstax.org/details/books/college-algebra-2e",
  "storage_path": "gs://fahem-academic-lake/libraries/openstax/Math/Grade_10/college-algebra-2e.pdf",
  "chapters": [
    {
      "id": "ch_1",
      "title": "Linear Equations and Matrices",
      "page_start": 4,
      "page_end": 28,
      "concepts": ["Matrix Inversion", "Determinants", "Cramer's Rule"]
    }
  ],
  "keywords": ["matrix", "determinant", "linear system", "vector space"]
}
```

#### 3. Collection: `question_bank`
Contains curriculum questions linked back to chapters with vector embeddings for semantic matchmaking:
```json
{
  "_id": "q_mat_09832",
  "book_id": "book_openstax_alg_g10_t1",
  "chapter_id": "ch_1",
  "page_reference": 14,
  "type": "MCQ", 
  "complexity_rating": "intermediate",
  "question_text": "Given a matrix A where det(A) = 0, what can be inferred about its inverse?",
  "distractors": [
    "The inverse is equal to its transpose.",
    "The inverse is an identity matrix.",
    "The inverse can be found using Cramer's rule."
  ],
  "correct_answer": "The matrix does not possess an inverse.",
  "pedagogical_intent": "Testing understanding of singular matrices and inverse criteria.",
  "embedding": [0.0123, -0.0456, 0.2389, 0.7182]
}
```

---

## 🛠️ 5. MongoDB Atlas MCP Declarative Tools

To decouple database operations from LLM agent instructions, we expose all database ingestion, semantic query matching, and statistical aggregates as standardized **Model Context Protocol (MCP) tools** running on our custom MongoDB MCP server.

### Tool 1: Structured Catalog Ingestor (`ingest_extracted_metadata`)
Inserts parsed structured JSON book catalogs into the database:
```python
from mcp.server import Server
from pymongo import MongoClient

mcp_server = Server("fahem-mongodb-mcp")
client = MongoClient("mongodb+srv://...") # Resolved via GCP Secret Manager
db = client.fahem_academic

@mcp_server.tool(name="ingest_extracted_metadata", 
                 description="Stores structured academic data models returned by Gemini extraction workers.")
def ingest_extracted_metadata(book_profile_json: dict) -> str:
    result = db.books.insert_one(book_profile_json)
    return f"Success: Academic entity verified and locked with ID: {result.inserted_id}"
```

### Tool 2: Student Insight Analyzer (`generate_student_insight_report`)
Aggregates performance scores database-side to extract topic vulnerabilities and misconceptions:
```python
@mcp_server.tool(name="generate_student_insight_report", 
                 description="Aggregates student performance metrics grouped by grade and subject parameters.")
def generate_student_insight_report(grade_tier: str, subject_id: str) -> list:
    pipeline = [
        {"$match": {"grade": grade_tier, "subject_id": subject_id}},
        {"$group": {
            "_id": "$topic_id",
            "average_score": {"$avg": "$session_score"},
            "total_attempts": {"$sum": 1},
            "common_misconceptions": {"$push": "$primary_error_tag"}
        }},
        {"$sort": {"average_score": 1}}, # Highlight weakest concepts first
        {"$limit": 5}
    ]
    return list(db.student_sessions.aggregate(pipeline))
```

### Tool 3: Hybrid Library Explorer (`explore_academic_library`)
Performs a hybrid search combining MongoDB Vector Search with hard filters:
```python
@mcp_server.tool(name="explore_academic_library", 
                 description="Performs vector-based semantic search across core textbook chapters and keywords.")
def explore_academic_library(query_vector: list, subject_filter: str) -> list:
    search_query = [
        {
            "$vectorSearch": {
                "index": "vector_index_spec",
                "path": "embedding",
                "queryVector": query_vector,
                "numCandidates": 50,
                "limit": 5
            }
        },
        {"$match": {"subject_id": subject_filter}}
    ]
    return list(db.question_bank.aggregate(search_query))
```

---

## 💾 6. State-of-the-Art Memory & Onboarding Continuity

To ensure onboarding variables, localized user configurations, and checkpoint records survive application reloads, we avoid storing states inside volatile in-memory agent instance properties. Instead, we implement a robust **transaction state** using the ADK context wrapper serialized back to the database.

```python
from google.adk.tools.base_tool import tool
from google.adk.tools.base_tool import ToolContext

@tool
def update_onboarding_checkpoint(context: ToolContext, step_name: str, gathered_payload: dict) -> str:
    """Updates the onboarding session state transactionally inside the ADK execution wrapper."""
    current_state = context.state.get("onboarding_data", {})
    current_state[step_name] = gathered_payload
    current_state["last_active_checkpoint"] = step_name
    context.state["onboarding_data"] = current_state
    return f"State synchronized up to step: {step_name}. Safe to transition across views."
```

### Onboarding Logic Guards & SMS Verification Hook

```
                               [ ONBOARDING INITIALIZATION ]
                                             │
                                             ▼
                              Query user_profiles by Profile ID
                                             │
                                       [ Is phone_verified: true? ]
                                       /                        \
                              (Yes)   /                          \ (No)
                                     ▼                            ▼
                       [ BYPASS SMS VERIFICATION ]        [ Display SMS Verification Screen ]
                       Direct Handoff to Welcome           Enforce Verification Code Loop
```

1. **Verify State First**: When an onboarding session begins, the system immediately queries the `user_profiles` collection.
2. **Bypass Check**: If the profile contains `phone_verified: true`, the system **completely bypasses** the SMS verification step, transitioning the user straight to the avatar selection and main panel.
3. **Bypass Exception**: The verification bypass remains active unless the user explicitly clicks a "Reset Session" button.

---

## 🛡️ 7. Judge Whitelist & Admin Approval Cycle

To facilitate seamless review by hackathon and academic competition judges without requiring annoying mobile or SMS verification gates, we utilize a secure **Judge Whitelist Strategy** with a strict admin approval cycle.

```
                         [ USER OR JUDGE INITIATES SIGN-IN ]
                                         │
                                         ▼
                            Is user email whitelisted?
                            /                        \
                   (Yes)   /                          \ (No)
                          ▼                            ▼
            [ ASSIGN STAR JUDGE BADGE ]      [ SUPERADMIN APPROVAL CYCLE ]
            - Glow gold badge in sidebar.    - Holds state in 'pending_approval'
            - Bypass SMS OTP verification.   - Superadmins manually promote or
            - Grant unlimited CLT Tokens.      require standard registration steps.
```

- **Whitelist Accessibility**: Whitelisted user emails (specifically judges) are automatically matched against our `whitelisted_judges` collection on initial OAuth callback.
- **Judge Badge**: Approved judges immediately receive a glowing gold `⭐ JUDGE` badge displayed prominently next to their avatar in the sidebar, verifying their elevated credentials.
- **Admin Approval**: Standard guest users seeking elevated rights or access to private libraries enter a **superadmin approval queue**. Superadmins can approve, dim, or block requests dynamically inside the admin panel.

---

## 🧪 8. Decoupled Asynchronous Telemetry & Eval Quality Gate

To keep the platform highly responsive and prevent thread lock or service delay under heavy classroom demand, **all telemetry harvesting, system logs, and metric aggregate pipelines are executed completely asynchronously**. 

### A. Non-blocking Async Ingest & Log Streams
Telemetry data (such as active cognitive token calculations and misconception risk updates) is shipped to MongoDB in background fire-and-forget streams. The UI continues to process state transitions without waiting for network ACK packets.

### B. Systematic Multi-Agent Evaluation Quality Gate
To prevent prompt drift and confirm tool-calling accuracy before code is deployed, we implement the **Three-Tier Evaluation Pyramid** inside the CI/CD pipeline using the CLI runner (`google-agents-cli eval run`):

```
                    /\
                   /  \   Tier 3: Human / Blind Expert Reviews
                  /----\
                 /      \  Tier 2: Trajectory & Integration (CLI Eval Run)
                /--------\
               /__________\ Tier 1: Component Checks (Valid JSON, Schema Errors)
```

* **Tier 1 (Component)**: Validates input/output boundaries. Corrupted or malicious inputs sent to the `text-practice` tool must trigger structured schema responses rather than leaking stack traces.
* **Tier 2 (Trajectory)**: Enforces that the agent invokes tools in the exact order required to fulfill the user's intent.
* **Tier 3 (Expert)**: Periodic blind grading of agent pedagogical responses by actual curriculum experts.

#### Dynamic Evaluation Test Case (`tests/eval/evalsets/basic.evalset.json`)
```json
{
  "test_cases": [
    {
      "input": "Can you quiz me on Grade 10 Arabic Grammar from the main student book?",
      "expected_trajectory": [
        "explore_academic_library",
        "fetch_book_chapters",
        "MCQ_Subagent_Invocation"
      ],
      "metrics_to_enforce": [
        "tool_trajectory_avg_score",
        "rubric_based_final_response_quality_v1",
        "hallucinations_v1"
      ],
      "thresholds": {
        "tool_trajectory_avg_score": 0.85,
        "rubric_based_final_response_quality_v1": 0.90
      }
    }
  ]
}
```

> [!IMPORTANT]
> **CI/CD Quality Gate**: Deployment pipelines automatically block master mergers unless the test suite completes successfully and achieves a minimum score of **0.85** on the trajectory validation and grounding evaluations.
