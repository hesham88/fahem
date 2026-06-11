# 🌟 Fahem: Localized Curriculum Multi-Agent AI Tutor
## Programmatic Swarm Architecture, Ingestion Pipelines, and Enterprise Guardrails

Fahem (Arabic for **"Comprehending"**) is a state-of-the-art, secure, localized curriculum multi-agent AI tutor designed for students and educators. Tailored strictly to local school curricula, the platform combines premium visual design, deep Retrieval-Augmented Generation (RAG) over official textbook layouts, and an enterprise-grade compliance-first architectural framework. 

Fahem is engineered over the programmatic **Google Agent Development Kit (ADK) 2.0 in Python**, utilizing multiple **Google Cloud Platform (GCP)** services, and integrating through a secured **MongoDB Model Context Protocol (MCP)** server/SDK layer to a highly scalable, isolated **MongoDB Atlas** database.

---

## 🏗️ Technical Architecture & Ecosystem

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

### 1. Web Frontend (`web/`)
- Built on the **Next.js App Router (TypeScript)** and hosted securely on **Firebase App Hosting** for continuous deployment (CD).
- Styled with modern, highly performant Vanilla CSS variables supporting responsive, dynamic bidirectional layout mirroring based on localized language selections (e.g. English `ltr` / Arabic `rtl`).
- Integrates with **Firebase Authentication** supporting official Google-branded Sign-In workflows.
- Coordinates session validations and fetches secure OIDC identity-token fallbacks to securely route requests to the private backend.

### 2. Multi-Agent Backend Microservice (`agents/`)
- A containerized Python service deployed to **Google Cloud Run** in the `us-east4` region under the name `fahem-agent`.
- Built on the programmatic **Google Agent Development Kit (ADK) 2.0 in Python**.
- Enforces strict private routing (`--no-allow-unauthenticated`), requiring secure, non-anonymous OIDC identity verification.
- Integrates a secured **MongoDB Model Context Protocol (MCP)** server to execute secure collections queries, layout fetches, and analytical traces.

---

## 📥 The Ingestion Pipeline (`ingestion_v2`)

To parse official textbook structures, Fahem features an automated, asynchronous, sequential 5-stage ingestion pipeline. This pipeline fetches documents, extracts their reading outlines, translates content blocks, and builds a high-performance vector index optimized for Retrieval-Augmented Generation (RAG).

```mermaid
graph TD
    PDF[Raw Textbook PDF] --> F[Stage 1: Fetcher <br/> job_fetch.py]
    F -->|Progress: 5% - 25%| S[Stage 2: OCR & Layout <br/> job_struct.py]
    S -->|Progress: 25% - 55%| T[Stage 3: Translation <br/> job_translate.py]
    T -->|Progress: 55% - 80%| A[Stage 4: Assemble & Cover <br/> job_assemble.py]
    A -->|Progress: 80% - 85%| E[Stage 5: Threaded Embed <br/> job_embed.py]
    E -->|Progress: 85% - 100%| Final[Ingestion Completed <br/> MongoDB Atlas Ready]
```

* **Fetcher (`job_fetch.py`)**: Fetches raw textbook PDFs, validates MD5 integrity, and extracts native Table of Contents (TOC) bookmarks (`doc.get_toc()`).
* **Layout OCR (`job_struct.py`)**: Rasterizes PDF pages into standard PNG buffers. It invokes the Google Vision API via `gemini-3.1-flash` with a strict Pydantic schema (`PageStructure`) to recover layout grids, paragraph blocks, mathematical formula overlays, and tables.
* **Translation (`job_translate.py`)**: Applies key-based translation concurrently using `gemini-3.1-flash`, keeping layouts intact and mapping dual Arabic/English representations under the page's `i18n` metadata dictionary.
* **Outlines Compilation & DB Finalizer (`job_assemble.py`)**: Chapter-clusters pages, uses Pillow to generate custom premium glassmorphic cover designs based on subject-specific color palettes, and constructs spatial Mind Maps.
* **Parallel Threaded Embed (`job_embed.py`)**:
  - Launches a concurrent `ThreadPoolExecutor` (gated at `max_workers=3` to avoid Gemini rate limits) to embed pages in parallel.
  - Prepends parent breadcrumb headers (e.g., `Chapter 3 › Section 3.2 › `) to chunks, maintaining topological context.
  - Extracts 3072-dimensional vector representations using `gemini-embedding-2`.
  - **Try-Except Fallback Resilience**: All API requests are wrapped in exception catchers. If an API call fails or times out, the system automatically falls back to deterministic SHA256 offline hashing, guaranteeing the pipeline continues to run smoothly.
  - Synchronizes final records safely to MongoDB Atlas using thread-safe write locks (`db_write_lock`).

---

## 🤖 The Agentic Ecosystem

Rather than relying on brittle monolithic prompts, Fahem operates an explicit multi-agent configuration on Google ADK 2.0. The ecosystem is composed of isolated, specialized agents working cooperatively:

1. **Orchestrator Agent (`fahem_companion`)**:
   - The primary system state machine, coordinate-hub, and student-facing brain (`agents/agent.py`).
   - Evaluates short-term session state, ingests historical context, and routes queries dynamically across specialized nodes.
   - **Typed Autocomplete References**: Resolves autocomplete inputs from the UI, such as `@` for subject routing, `#` for textbook/chapter scoping, and `/` for command macros (e.g. `/practice`, `/summarize`, `/plan`).
2. **Onboarding Agent (`onboarding_agent`)**:
   - Gathers student configuration data (grade level, learning track, languages, starting curriculum nodes) and transactionally writes progress metrics to the persistent timeline.
3. **Academic Agent (`academic_agent`)**:
   - Coordinates curriculum content, handles deep textbook querying via high-fidelity `rag_tool` vector searches, and guides students step-by-step with localized pedagogical methods.
   - **Clickable Deep-Link Citations**: Citations are formatted strictly as `[book_id:pPageNum]` (e.g. `[book_intro_python:p24]`). The Next.js frontend intercepts these tokens and renders them as clickable deep-link anchors, jumping the reader panel instantly to that exact page inside the textbook.
4. **Quiz Agent (`quiz_agent`)**:
   - Administers practice questions, evaluates structural student answers, and computes rolling grading metrics.
   - Dynamically shifts difficulty ranges and assessment structures based on student performance.
5. **Guardrail Agent (Inline & Callback Layers)**:
   - Formed as callback hooks in `agents/guardrails.py` running on ADK's `before_agent_callback`, `before_model_callback`, `before_tool_callback`, `after_tool_callback`, and `on_tool_error_callback`.
   - Protects the system from prompt injection and jailbreak attempts, checks credit-based quotas, masks local server-paths (e.g. `hesh1` -> `***USER***`), and isolates database targeting.
6. **Insights & Analytical Agent (`insights_agent`)**:
   - Analyzes student telemetry (`reading_sessions`, `token_telemetry`) to predict cognitive learning curves, forecast retention, and highlight performance gaps.

---

## 💾 Multi-Agent Memory Management

Fahem utilizes a tiered memory matrix:
- **Short-Term Context**: Retained in active memory buffers during execution turns inside the ADK `ToolContext`.
- **Long-Term Memory Persistence**: Cross-agent timelines, chat histories, quiz results, and telemetry traces are transactionally archived inside persistent MongoDB Atlas collections.
- **Service Factory Monkeypatching**:
  To guarantee complete continuity and bypass volatile server systems, the system overrides Google ADK's default memory builders to force MongoDB-backed storage:
  ```python
  import google.adk.cli.utils.service_factory as sf
  from mongo_services import MongoSessionService, MongoMemoryService
  
  sf.create_session_service_from_options = lambda *a, **kw: MongoSessionService()
  sf.create_memory_service_from_options = lambda *a, **kw: MongoMemoryService()
  ```
  All agent states and session handoffs are thus persistent, unified, and securely stored in MongoDB Atlas.

---

## 🔒 Sandboxes, Environment Guards, and Database Isolation

To prevent toxic prompt injection, unauthorized database manipulation, or model drift, Fahem enforces absolute sandboxed execution contexts:

* **Patched DB Clients**: Programmatically intercepts `pymongo.mongo_client.MongoClient` lookups. Any attempt to target database boundaries outside of the approved list (`fahem` or `fahem_sandbox`) is instantly blocked and routed to sandbox environments.
* **Collection Whitelist**: All database operations are checked against an immutable whitelist (e.g., `users`, `books`, `book_pages`, `chat_sessions`, `audit_logs`). Attempting to read or write to unlisted collections throws an immediate `PermissionError`.
* **Identity-Gated Writes & No Raw Mutations**:
  - Direct database mutation writing using raw strings is strictly banned.
  - All writes must delegate through parameterized MCP tools (e.g. `insert_user_report` in `secure_tools.py`) mapping validated inputs.
  - Writes check active context parameters; unauthenticated calls or requests from users with exhausted token credit balances are rejected under a fail-closed policy.

---

## 🌐 Orchestration & Workflow Topology

The system operates as an event-driven deterministic state machine wrapped around stochastic AI agents, executing the following precise pathways:

1. **Ingress and Firewalls**: User queries hit the ingress gateway, immediately checked by Cloud Armor and pre-flight sanitized by Google Cloud Model Armor.
2. **State and Intent Analysis**: The Orchestrator (`fahem_companion`) recovers the student's historical memory from MongoDB, resolves active autocompletes, and parses commands.
3. **Dynamic Routing**: Dispatches specialized specialist nodes (Academic, Quiz, Onboarding, Insights, Zatona) depending on intent, injecting vectorized textbook context if content questions are asked.
4. **Safety Convergence**: The response passes through output filters, masking system secrets and internal paths, before formatting safe outputs for the interactive client.

---

## 🛡️ Enterprise Hardening, Compliance, and Security

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

## 🚀 Setup, Installation, and Run Instructions

Ensure your computer has the following tools installed:
- **Python 3.11+**
- **Node.js 18+ (with npm)**
- **Docker Desktop** (optional, for containerization)
- **Git**

---

### 1. Setting Up the Next.js Frontend Locally

1. Navigate to the frontend directory:
   ```bash
   cd web
   ```
2. Install the project dependencies:
   ```bash
   npm install
   ```
3. Create a `.env.local` file inside the `web` directory and configure the environment keys:
   ```env
   # Gemini API Credentials
   GEMINI_API_KEY=your_gemini_api_key_here
   GEMINI_MODEL=gemini-3.1-flash
   
   # MongoDB Atlas Connection URI
   MONGODB_URI=mongodb+srv://your_username:your_password@your-cluster.mongodb.net/fahem
   ```
4. Run the local Next.js development server:
   ```bash
   npm run dev
   ```
5. Open your browser and navigate to: **[http://localhost:3000](http://localhost:3000)**

---

### 2. Setting Up and Running the Python ADK Agent Locally

1. Navigate to the `agents` folder:
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
5. Set local development environment variables:
   - **On Windows (PowerShell)**:
     ```powershell
     $env:GEMINI_API_KEY="your-key"
     $env:MONGODB_URI="mongodb+srv://your_username:your_password@your-cluster.mongodb.net/fahem"
     $env:GEMINI_MODEL="gemini-3.1-flash"
     ```
   - **On Linux / macOS**:
     ```bash
     export GEMINI_API_KEY="your-key"
     export MONGODB_URI="mongodb+srv://your_username:your_password@your-cluster.mongodb.net/fahem"
     export GEMINI_MODEL="gemini-3.1-flash"
     ```
6. Run the agent locally by invoking the command-line script:
   ```bash
   python main.py "Explain the core variables in computer science and start a short practice quiz."
   ```

---

### 3. Running the Sequential Ingestion Pipeline Locally

To test layout OCR, translation, and vector embeddings locally:
1. Activate your backend virtual environment.
2. Run the sequential ingestion test pipeline script:
   ```bash
   python ingestion_v2/test_pipeline_v2.py
   ```
3. Individual stages can be executed sequentially or triggered in the background by the web admin panel:
   ```bash
   python ingestion_v2/job_fetch.py
   python ingestion_v2/job_struct.py
   python ingestion_v2/job_translate.py
   python ingestion_v2/job_assemble.py
   python ingestion_v2/job_embed.py
   ```

---

### 4. Running the Automated Compliance Security Sweeper

To scan the workspace for plaintext keys, unauthorized competitor keywords, or local path leakage before pushing changes to Git:
1. Open a terminal at the project root directory.
2. Run the compliance auditor script:
   ```bash
   python scripts/evaluate_compliance.py
   ```
3. A dated audit report will be compiled and saved under the `doc/` folder.

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
     --set-env-vars="GEMINI_MODEL=gemini-3.1-flash,GCP_PROJECT=fahem-88d40"
   ```
   > [!IMPORTANT]
   > The private routing flag `--no-allow-unauthenticated` must always be enforced in production. The Next.js frontend will communicate securely via authenticated service-to-service OIDC tokens.
