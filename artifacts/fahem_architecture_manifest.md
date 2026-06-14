# 🌟 Fahem AI: Localized Curriculum Multi-Agent AI Tutor
## Architectural Manifest, Implementation Anatomy, and Security Blueprint

Fahem (Arabic for **"Comprehending"**) is an enterprise-grade, localized curriculum multi-agent AI tutor tailored strictly to local school curricula. The platform combines state-of-the-art multimodal reasoning, specialized cognitive management, and an enterprise-grade compliance-first architecture. 

Fahem is engineered and built over the **Google Agent Development Kit (ADK) 2.0 in Python**, utilizing multiple Google Cloud Platform (GCP) services and integrating through a secured **MongoDB Model Context Protocol (MCP)** server/SDK layer to a scalable, modular **MongoDB Atlas** database. The platform operates as a microservice architecture partitioned into distinct intelligent layers to ensure clean execution, strict boundary control, and enterprise-grade performance.

---

## 🏗️ 1. Global System Architecture

Fahem utilizes a decoupled, zero-trust backend and serverless frontend architecture:

```mermaid
graph TD
    User[Client Browser]
    NextJS[Firebase App Hosting<br/>Next.js Frontend]
    SecretMgr[GCP Secret Manager]
    CloudArmor[Google Cloud Armor<br/>Edge Firewall]
    LB[External HTTP Load Balancer<br/>Serverless NEG]
    CloudRun[GCP Cloud Run<br/>fahem-agent Python ADK]
    ModelArmor[Google Cloud Model Armor]
    VPCTunnel[Secure VPC Tunneling / Peering]
    MongoDBAtlas[(MongoDB Atlas Cluster)]

    User -->|Secure HTTPS| CloudArmor
    CloudArmor --> LB
    LB -->|Render Layout & Authenticate| NextJS
    NextJS <-->|GCP Secret Bindings| SecretMgr
    NextJS -->|OIDC Auth Token| LB
    LB --> CloudRun
    CloudRun <-->|Pre-flight Sanitization| ModelArmor
    CloudRun <-->|Private Network Path| VPCTunnel
    VPCTunnel <-->|MCP Database Operations| MongoDBAtlas
```

### Architectural Components:
1. **Web Frontend (`web/`)**: Built on the **Next.js App Router (TypeScript)**, styled with clean, custom Vanilla CSS variables for logical right-to-left (RTL) / left-to-right (LTR) bidirectional layouts. It is hosted securely on **Firebase App Hosting** with OIDC service account identity bindings and Google-branded Firebase Authentication.
2. **Multi-Agent Backend Microservice (`agents/`)**: Programmed via the **Google Agent Development Kit (ADK) 2.0 in Python**, containerized using Docker, and deployed on **Google Cloud Run** in private mode (`--no-allow-unauthenticated`).
3. **Model Context Protocol (MCP) Server**: Connects the Python ADK agents directly to MongoDB Atlas collections using high-level, parameterized tool representations, preventing raw database access from the client or main orchestrator threads.
4. **Perimeter Security Firewall**: Google Cloud Armor protects HTTP endpoints against DDoS and OWASP-top threats. Google Cloud Model Armor operates as a pre-flight prompt safety firewall.

---

## 📥 2. The Ingestion Pipeline (`ingestion_v2`)

The curriculum ingestion engine operates as an automated, asynchronous, sequential pipeline dedicated to harvesting educational textbooks and transforming their layouts into high-performance vector indices optimized for Retrieval-Augmented Generation (RAG).

```mermaid
graph TD
    PDF[Raw Textbook PDF] --> F[Stage 1: Fetcher <br/> job_fetch.py]
    F -->|Progress: 5% - 25%| S[Stage 2: OCR & Layout <br/> job_struct.py]
    S -->|Progress: 25% - 55%| T[Stage 3: Translation <br/> job_translate.py]
    T -->|Progress: 55% - 80%| A[Stage 4: Assemble & Cover <br/> job_assemble.py]
    A -->|Progress: 80% - 85%| E[Stage 5: Threaded Embed <br/> job_embed.py]
    E -->|Progress: 85% - 100%| Final[Ingestion Completed <br/> MongoDB Atlas Ready]
```

### Multimodal Crawling & Classification:
- **Wagtail CMS & Catalog Adapters**: Directly integrates with Wagtail APIs (e.g. OpenStax) or the Egyptian Ministry of Education (MOE) portals, automatically resolving relative paths and de-duplicating catalog lists.
- **Multilingual Subject Auto-Classifier**: Runs a full-word token-matching engine based on Unicode regular expressions to split file metadata into clean word sets:
  ```python
  words = set(re.findall(r'[a-z\u0600-\u06ff]+', title_or_filename.lower()))
  ```
  It automatically categorizes textbook structures into curriculum scopes (e.g., Computer Science, Pure Mathematics, Physics & Chemistry, Arabic Grammar, Business, Social Sciences).

### The Five Ingestion Stages:
1. **Stage 1: Fetcher (`job_fetch.py`)**: Fetches target PDFs, performs MD5 integrity checks, and extracts native Table of Contents (TOC) bookmarks via `doc.get_toc()`.
2. **Stage 2: Layout OCR (`job_struct.py`)**: Rasterizes PDF pages into PNG buffers. It invokes the Google Vision API via `gemini-2.5-flash` with a strict Pydantic schema structure (`PageStructure`) to recover layout grids, isolating headers, paragraphs, lists, mathematical formulas, and callout matrices.
3. **Stage 3: Translation (`job_translate.py`)**: Applies key-based machine translation over parsed layouts in parallel, populating a dual Arabic/English representation under the page's `i18n` metadata.
4. **Stage 4: Outlines Compilation & DB Finalizer (`job_assemble.py`)**: Clusters pages dynamically based on chapter boundaries. It utilizes Pillow to automatically render premium, glassmorphic cover designs based on subject-specific palettes and synthesizes spatial navigation Mind Maps.
5. **Stage 5: Threaded Embed (`job_embed.py`)**: 
   - Launches a concurrent `ThreadPoolExecutor` (gated at `max_workers = 3` to bypass Gemini API rate-limits) to process textbook pages in parallel.
   - Prepends breadcrumb paths (e.g. `Chapter 2 › Section 2.3 › `) to chunks, maintaining topological context.
   - Extracts 3072-dimensional semantic embeddings using `gemini-embedding-2`.
   - **API Safety Fallback**: All API calls are wrapped in robust exception catchers. If an API call fails, the system logs the error and falls back to deterministic SHA256 offline hashing to prevent pipeline lockups.
   - Synchronizes final payloads to MongoDB Atlas using thread-safe write locks (`db_write_lock`).

---

## 🤖 3. The Agentic Ecosystem

Rather than relying on brittle, monolithic prompts, Fahem utilizes an explicit multi-agent configuration governed by the Google ADK 2.0 framework. Agents are isolated specialists acting as cooperative nodes, coordinated by a single primary user-facing orchestrator.

```mermaid
graph TD
    Prompt[User Input] --> Orch[Orchestrator Agent <br/> fahem_companion]
    Orch -->|Baseline Configurations| Onboard[Onboarding Agent]
    Orch -->|Deep Textbook Retrieval & Citations| Acad[Academic Agent]
    Orch -->|Dynamic Testing & Grading| Quiz[Quiz Agent]
    Orch -->|Learning Curves & Telemetry| Insights[Insights & Analytical Agent]
    Orch -->|Interactive Summarizations| Zatona[Zatona Agent]

    subgraph Inline Guards
        Orch -.->|Pre/Post-flight Callbacks| Guard[Guardrail Agent]
    end
    
    Acad -->|Page-Granular Search| RAG[rag_tool]
    RAG <--> MongoDB[(MongoDB Atlas)]
```

### Specialized Swarm Specialist Agents:
1. **Orchestrator Agent (`fahem_companion`)**:
   - The primary system state machine, instantiated as a central `LlmAgent` in `agents/agent.py`.
   - It maintains short-term conversational context, parses user intents, and dynamically executes programmatic routing across the agent cluster.
   - **Typed Autocomplete References**: Resolves autocomplete triggers passed by the UI, such as `@` for subject routing, `#` for textbook/chapter scoping, and `/` for command macros (e.g. `/practice`, `/summarize`, `/plan`).
2. **Onboarding Agent (`onboarding_agent`)**:
   - Welcomes the student, aggregates starting educational configurations (grade level, learning track, languages, starting curriculum nodes), and registers progress states transactionally inside the ADK state context.
3. **Academic Agent (`academic_agent`)**:
   - The core educational engine, packaged as a subservient `AgentTool(academic_agent)`.
   - Houses curriculum metadata, queries textbook structures using page-granular `rag_tool` context, and provides step-by-step pedagogical guidance.
   - **Anti-Hallucination Citations**: Formats citations strictly as `[book_id:pPageNum]` (e.g., `[book_math_12:p42]`). The Next.js book reader intercepts these tokens and renders them as clickable interactive anchors, jumping the student instantly to that exact textbook page.
4. **Quiz Agent (`quiz_agent`)**:
   - Manages dynamic student testing, evaluates structural answer sheets, and computes grade performance metrics.
   - It dynamically shifts testing strategies, difficulty thresholds, and question selections based on rolling performance and cognitive load indicators.
5. **Guardrail Agent (Inline & Callback Layers)**:
   - A distributed firewall mechanism operating within ADK's `before_agent_callback`, `before_model_callback`, `before_tool_callback`, `after_tool_callback`, and `on_tool_error_callback`.
   - It filters prompt injections, masks sensitive variables, intercepts raw database queries, and blocks unauthorized operations.
6. **Insights & Analytical Agent (`insights_agent`)**:
   - Evaluates rolling student session telemetry, interaction footprints, and quiz history.
   - Predicts student learning curves, calculates retention intervals, and highlights hidden performance gaps or recommended study focal areas.

---

## 💾 4. Multi-Agent Memory Management

Fahem implements a robust tiered memory matrix that ensures seamless continuity as a student pivots across different specialists.

```
                   ┌──────────────────────────────────────┐
                   │    Short-Term State Buffers          │
                   │    (GCP Cloud Run Server Context)    │
                   └──────────────────┬───────────────────┘
                                      │ Synced via ADK
                                      ▼
                   ┌──────────────────────────────────────┐
                   │  Monkeypatched ADK Service Factory   │
                   │  - Intercepts default memory builders│
                   │  - Redirects state to MongoDB Atlas │
                   └──────────────────┬───────────────────┘
                                      │ Programmatic Writes
                                      ▼
                   ┌──────────────────────────────────────┐
                   │   MongoDB Atlas Persistent Matrix    │
                   │  (chat_sessions, companion_sessions, │
                   │   reading_sessions, token_telemetry) │
                   └──────────────────────────────────────┘
```

- **Short-Term Context**: Maintained in active memory buffers during execution turns inside the ADK `ToolContext` (`context.state`).
- **Long-Term Memory Persistence**: Cross-agent chat sequences, onboarding parameters, study milestones, quiz analytics, and telemetry streams are transactionally written back to persistent MongoDB Atlas collections.
- **Service Factory Monkeypatching**:
  To enforce MongoDB-backed state synchronization and bypass volatile ephemeral file systems, the system overrides the core Google ADK service factory builders programmatically:
  ```python
  import google.adk.cli.utils.service_factory as sf
  from mongo_services import MongoSessionService, MongoMemoryService
  
  sf.create_session_service_from_options = lambda *a, **kw: MongoSessionService()
  sf.create_memory_service_from_options = lambda *a, **kw: MongoMemoryService()
  ```
  This guarantees that all ADK memory allocations and session handoffs are transactionally anchored to the MongoDB database.

---

## 🔒 5. Agentic Coding Environment Guards & Sandbox Security

To prevent toxic model drift, security overrides, or malicious database manipulation, Fahem implements strict execution constraints on its agent contexts:

* **Patched DB Drivers**:
  The system monkeypatches `pymongo.mongo_client.MongoClient` to intercept all collection and database lookups. Any call that attempts to target database boundaries outside of the approved list (`fahem` or `fahem_sandbox`) is programmatically intercepted and routed to sandboxed environments.
* **Strict Collection Whitelist**:
  All database operations are checked against an immutable collection schema whitelist:
  ```python
  ALLOWED_COLLECTIONS = {
      "users", "user_profiles", "subjects", "books", "book_pages",
      "curricula", "crawl_jobs", "ingestion_jobs", "chat_sessions", 
      "companion_sessions", "social_groups", "reports", "token_telemetry",
      "audit_logs", "reading_sessions", "notifications", "group_assignments"
  }
  ```
  Attempting to execute tools over unlisted, system-critical collections throws an immediate, fail-closed `PermissionError`.
* **Identity-Gated Writes & No Raw Mutations**:
  - The backend strictly forbids direct database mutations using unparameterized raw query strings.
  - All database write commands are routed through high-level parameterized tools exposed by the MCP server (e.g. `insert_user_report` mapping validated inputs).
  - Write operations check active context parameters; unauthenticated attempts or requests from users with exhausted token credit balances are blocked instantly.

---

## 🌐 6. Orchestration & Workflow Topology

The system operates as an event-driven deterministic state machine wrapped around stochastic AI agents. When a student enters a query, the workflow executes the following precise pathway:

```
[Student Input]
      │
      ▼
┌──────────────────────────────────────────────┐
│ Ingress & Perimeter Firewall                 │
│ - Cloud Armor WAF & Rate-Limiting Check      │
│ - Model Armor Pre-flight Prompt Sanitizer    │
└─────────────────────┬────────────────────────┘
                      │ Safe Payload Only
                      ▼
┌──────────────────────────────────────────────┐
│ State & Intent Analysis (Orchestrator)       │
│ - Hydrate short-term memory from MongoDB    │
│ - Parse autocompletes (@, #) and commands (/)│
└─────────────────────┬────────────────────────┘
                      │ Resolved Route
                      ▼
            ┌─────────┴─────────┐
            ▼                   ▼
┌───────────────────────┐ ┌───────────────────────┐
│ Academic Agent        │ │ Quiz Agent            │
│ - Trigger RAG Tool    │ │ - Check score history │
│ - Inject textbook docs│ │ - Pull questions      │
│ - Format citations    │ │ - Adjust difficulty   │
└───────────┬───────────┘ └───────────┬───────────┘
            │                         │
            └─────────┬───────────────┘
                      │ Execution Complete
                      ▼
┌──────────────────────────────────────────────┐
│ Safety Convergence                           │
│ - Sanitize response (mask paths/keys)        │
│ - Check output guardrail firewalls           │
│ - Append [INTENT: ...] tokens if needed      │
└─────────────────────┬────────────────────────┘
                      │ Fully Safe
                      ▼
[Next.js Interactive Presentation Client]
```

1. **Ingress and Firewalls**: User inputs are intercepted at the perimeter by Google Cloud Armor and verified by Model Armor to strip injection vectors or credentials.
2. **State and Intent Analysis**: The Orchestrator (`fahem_companion`) recovers the student's historical timeline from MongoDB, parses any explicit commands (e.g. `/practice` or `/summarize`), and resolves active subject/book filters.
3. **Dynamic Routing**:
   - Content Questions -> Academic Agent (loads page-granular vector context from the RAG database).
   - Testing/Practice -> Quiz Agent (manages grading, assessment states).
   - Summarization -> Zatona Agent.
   - Mind-maps / Navigations -> Dispatches creation tools to build structural `[INTENT: ...]` tokens for frontend rendering.
4. **Safety Convergence**: The response passes through output guardrails, masking absolute system paths (e.g. `hesh1` -> `***USER***`) and preventing raw URLs or untrusted external domains from returning to the client.

---

## 🛡️ 7. Compliance, Security, and Enterprise Hardening

Fahem is built from the ground up with a compliance-first, zero-trust posture:

* **VPC Tunneling and Database Isolation**:
  The MongoDB database layer is completely isolated from the open web. Communication between the Google Cloud Run microservice containers and the MongoDB Atlas clusters occurs exclusively through secure, private **VPC Peering Tunnels**, guaranteeing that student profiles, telemetry footprints, and school logs never cross public internet routes.
* **Google Cloud Armor**:
  Deployed at the External HTTP Load Balancer level. Mitigates DDoS attacks and blocks standard web vulnerabilities (SQLi, XSS, RCE, LFI) using Google's OWASP preconfigured rules. Enforces **brute-force rate limiting** restricted to **100 requests per minute** per client IP, blocking offending IPs for 5 minutes under threat.
* **Google Cloud Model Armor**:
  Sanitizes prompts at the foundational model layer, blocking jailbreak attempts, toxic content generation, and system instructions bypass before they reach the core orchestrator.
* **Pre-Commit Compliance Sweeper (`scripts/evaluate_compliance.py`)**:
  An automated auditor executing verification loops:
  - Verifies local repository committer configuration strictly matches: `hesham88` <`hesham1988@gmail.com`>.
  - Audits files for raw API keys, local path strings, or unmasked credentials.
  - Ensures no unapproved third-party AI assistant dependencies exist in the workspace, generating dated reports under `/doc`.

---

## 🚀 8. Setup, Installation, and Run Instructions

Follow these instructions to set up, configure, and execute the Fahem project locally.

### Prerequisite Environment:
Ensure your computer has the following tools installed:
- **Python 3.11+**
- **Node.js 18+ (with npm)**
- **Docker Desktop** (optional, for containerization)
- **Git**

---

### 1. Setting Up the Next.js Frontend Locally

1. Open your terminal and navigate to the frontend directory:
   ```bash
   cd web
   ```
2. Install the necessary project dependencies:
   ```bash
   npm install
   ```
3. Configure the local environment variables. Create a `.env.local` file inside the `web` folder and define your credentials securely:
   ```env
   # Gemini API Credentials
   GEMINI_API_KEY=your_gemini_api_key_here
   GEMINI_MODEL=gemini-2.5-flash
   
   # MongoDB Atlas Connection URI
   MONGODB_URI=mongodb+srv://your_username:your_password@your-cluster.mongodb.net/fahem
   ```
4. Run the local development server:
   ```bash
   npm run dev
   ```
5. Open your web browser and navigate to: **[http://localhost:3000](http://localhost:3000)**

---

### 2. Setting Up and Running the Python ADK Agent Locally

1. Open a new terminal window and navigate to the `agents` folder:
   ```bash
   cd agents
   ```
2. Create an isolated Python virtual environment:
   ```bash
   python -m venv venv
   ```
3. Activate the virtual environment:
   - **On Windows (PowerShell)**:
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```
   - **On Linux / macOS**:
     ```bash
     source venv/bin/activate
     ```
4. Install all backend and Google ADK dependencies:
   ```bash
   pip install -r requirements.txt
   ```
5. Set the required local environment variables in your terminal session:
   - **On Windows (PowerShell)**:
     ```powershell
     $env:GEMINI_API_KEY="your-key"
     $env:MONGODB_URI="mongodb+srv://your_username:your_password@your-cluster.mongodb.net/fahem"
     $env:GEMINI_MODEL="gemini-2.5-flash"
     ```
   - **On Linux / macOS**:
     ```bash
     export GEMINI_API_KEY="your-key"
     export MONGODB_URI="mongodb+srv://your_username:your_password@your-cluster.mongodb.net/fahem"
     export GEMINI_MODEL="gemini-2.5-flash"
     ```
6. Execute the agent locally by running the CLI runner with a custom educational query:
   ```bash
   python main.py "Explain the core variables in computer science and start a short practice quiz."
   ```

---

### 3. Running the Sequential Ingestion Pipeline Locally

To ingest custom textbook assets, parse their layouts, and vectorize pages:
1. Activate your backend virtual environment.
2. Run the pipeline test suite or trigger individual stages inside `agents/ingestion_v2/`:
   ```bash
   # Run the full pipeline simulation v2
   python ingestion_v2/test_pipeline_v2.py
   ```
3. Custom uploads can be managed via the Admin Dashboard in the web viewer, which invokes background subprocesses running:
   ```bash
   python ingestion_v2/job_fetch.py
   python ingestion_v2/job_struct.py
   python ingestion_v2/job_translate.py
   python ingestion_v2/job_assemble.py
   python ingestion_v2/job_embed.py
   ```

---

### 4. Running the Automated Compliance & Security Sweeper

To guarantee the workspace contains no plaintext secrets, local path leakages, or Git identity violations before making any version control commits:
1. Navigate to the project root directory.
2. Run the compliance script:
   ```bash
   python scripts/evaluate_compliance.py
   ```
3. A comprehensive, dated markdown report detailing audit outcomes, warnings, and success matrices will be generated and saved under the `doc/` directory.

---

### 5. Deployment Guidelines & Docker Containerization

To package the Python ADK backend service into a production-ready docker container:
1. Build the Docker container image locally:
   ```bash
   docker build -t gcr.io/fahem-88d40/fahem-agent:latest ./agents
   ```
2. Deploy the container image to Google Cloud Run:
   ```bash
   gcloud run deploy fahem-agent `
     --image gcr.io/fahem-88d40/fahem-agent:latest `
     --region us-east4 `
     --no-allow-unauthenticated `
     --vpc-egress private-ranges-only `
     --set-env-vars="GEMINI_MODEL=gemini-2.5-flash,GCP_PROJECT=fahem-88d40"
   ```
   > [!IMPORTANT]
   > The private routing flag `--no-allow-unauthenticated` must always be enforced in production. The Next.js frontend will communicate securely via authenticated service-to-service OIDC tokens.
