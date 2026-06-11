# 🤖 Fahem AI: Multi-Agent Core Backend (ADK 2.0)

Welcome to the backend core of **Fahem AI**. This directory contains the implementation of our programmatic multi-agent swarm, structured ingestion pipelines, safety guardrail callbacks, and MongoDB Atlas persistence layers. 

Built using the **Google Agent Development Kit (ADK) 2.0 in Python**, this microservice is deployed as a secure, containerized instance (`fahem-agent`) on **Google Cloud Run** inside the `us-east4` region.

---

## 🏗️ Core Architecture & Agent Swarm

Rather than utilizing single, general-purpose prompts, Fahem organizes specialized, isolated agents that work in coordination via a structured state machine. 

```mermaid
graph TD
    %% Define Agents
    Orchestrator["Orchestrator Agent<br/>(fahem_companion)"]
    Onboarding["Onboarding Agent<br/>(onboarding_agent)"]
    Academic["Academic Agent<br/>(academic_agent)"]
    Quiz["Quiz Agent<br/>(quiz_agent)"]
    Insights["Insights & Analytics Agent<br/>(insights_agent)"]
    Guardrail["Guardrail Agent<br/>(callbacks & validations)"]

    %% Flow Relationships
    Input[/"Student Input<br/>(@subject, #book, /command)"/] --> Guardrail
    Guardrail -->|Sanitized Request| Orchestrator
    
    Orchestrator <-->|Session Handshake| Onboarding
    Orchestrator <-->|Curriculum RAG Tool| Academic
    Orchestrator <-->|Rolling Assessment| Quiz
    Orchestrator <-->|Telemetry Analytics| Insights
    
    Academic -->|Clickable Citations| Output[/"Formatted Stream Output<br/>(Socratic guidance)"/]
    Quiz -->|Grading Metrics| Output
    Onboarding -->|Timeline Registration| Output
    Insights -->|Retention Forecasting| Output
```

### 1. Agent Roles & Specializations

* **Orchestrator Agent (`fahem_companion` in [agent.py](file:///C:/Users/hesh1/Desktop/fahem/agents/agent.py))**:
  - The central coordinator and student-facing chat hub.
  - Dynamically routes student intents to the correct specialist subagent.
  - Resolves autocomplete symbol inputs:
    - `@`: Direct subject routing (e.g. `@math`, `@physics`).
    - `#`: Scopes context to specific textbooks or chapters.
    - `/`: Invokes macro actions (e.g. `/practice` routes to Quiz, `/summarize` or `/plan` routes to Academic).

* **Onboarding Agent (`onboarding_agent` in [onboarding_agent/](file:///C:/Users/hesh1/Desktop/fahem/agents/onboarding_agent/))**:
  - A friendly conversational onboarding workflow that queries the student's grade, learning goals, track, and starting curriculum nodes.
  - Generates their initial student profile and persists it transactionally to the database timeline.

* **Academic Agent (`academic_agent` in [academic_agent/](file:///C:/Users/hesh1/Desktop/fahem/agents/academic_agent/))**:
  - Delivers localized step-by-step Socratic teaching rather than just blurting out answers.
  - Invokes `rag_tool` to perform high-fidelity vector search over embedded official textbooks.
  - Formats textbook deep-link citations exactly as `[book_id:pPageNum]` (e.g., `[book_intro_python:p24]`), which the Next.js UI intercepts to open the textbook reading room on that exact page.

* **Quiz Agent (`quiz_agent` in [quiz_agent/](file:///C:/Users/hesh1/Desktop/fahem/agents/quiz_agent/))**:
  - Formulates practice sessions tailored to the student's current sub-chapter or topic.
  - Dynamically evaluates open-ended or structured student responses, returning real-time feedback and computing a rolling quiz score.
  - Auto-adjusts questions difficulty dynamically based on historical cognitive telemetry.

* **Insights & Analytical Agent (`insights_agent` in [insights_agent/](file:///C:/Users/hesh1/Desktop/fahem/agents/insights_agent/))**:
  - Processes telemetry footprints (`reading_sessions`, `chat_sessions`, `quiz_results`) using advanced analytics to forecast retention decay and identify learning gaps.

---

## 🔒 Security Sandboxing & Guardrail Callbacks

Security in Fahem AI is enforced programmatically before inputs hit the LLM and after outputs are generated:

### 1. The Guardrail Agent Hook Pipeline ([guardrails.py](file:///C:/Users/hesh1/Desktop/fahem/agents/guardrails.py))
We plug custom callbacks directly into the Google ADK 2.0 lifecycle hooks:
* `before_agent_callback`: Validates active session permissions, student tokens, and credits.
* `before_model_callback`: Scans and blocks prompt injection or jailbreak attempts.
* `before_tool_callback` & `after_tool_callback`: Sanitizes tool inputs and outputs.
* `on_tool_error_callback`: Intercepts system exceptions, preventing raw stack traces or configuration routes from leaking back to the user.

### 2. Database Isolation & Client Patching
* **Database Sandboxing**: To completely eliminate unauthorized modifications, we programmatically patch `pymongo.mongo_client.MongoClient`. Attempting to access collections outside of the approved list (`users`, `books`, `book_pages`, `chat_sessions`, etc.) or write to unauthorized DB boundaries throws an immediate `PermissionError`.
* **Private Sandboxed Routing**: Direct DB mutations are disallowed. Data edits must go through strictly parameterized, identity-gated tools (e.g. [secure_tools.py](file:///C:/Users/hesh1/Desktop/fahem/agents/secure_tools.py)) that enforce a "fail-closed" posture.

---

## 💾 Multi-Agent Memory & Service Factory Monkeypatching

To bypass volatile in-memory storage and guarantee perfect state synchronization across multiple horizontal Cloud Run instances, we override the default session builders inside the Google ADK:

```python
import google.adk.cli.utils.service_factory as sf
from mongo_services import MongoSessionService, MongoMemoryService

# Force MongoDB-backed persistence for ADK 2.0 State Engines
sf.create_session_service_from_options = lambda *a, **kw: MongoSessionService()
sf.create_memory_service_from_options = lambda *a, **kw: MongoMemoryService()
```

* **Short-Term Context**: Retained within the active execution turn's `ToolContext`.
* **Long-Term Memory**: Transcripts, timelines, student records, and chat histories are written transactionally into MongoDB Atlas.
* **Offline Fallbacks (`local_db.json`)**: If the MongoDB Atlas cluster is unreachable, or during offline local development, the ADK automatically falls back to reading/writing from a local database representation, ensuring perfect offline workspace parity.

---

## 📁 Directory Layout

```
agents/
├── academic_agent/          # Specialist node for curriculum RAG and teaching
├── onboarding_agent/        # Node for student onboarding and initialization
├── quiz_agent/              # Handles practice session synthesis and assessment
├── insights_agent/          # Evaluates student performance telemetry
├── guardrail_agent/         # Scans for policy compliance and security checks
├── ingestion_v2/            # Multi-stage asynchronous textbook ingestion pipeline
├── agent.py                 # Core fahem_companion Orchestrator workflow
├── main.py                  # CLI runner and local execution entry point
├── tools.py                 # Standard tools (e.g. Google Search, DB checks)
├── secure_tools.py          # Identity-gated, whitelisted DB write operations
├── guardrails.py            # ADK callback pipeline for safety pre-flight checks
├── mongo_services.py        # MongoDB memory and session service overrides
├── mongodb_engine.py        # Patched DB client sandboxing and operations
├── requirements.txt         # Python dependencies
└── Dockerfile               # Production container definition
```

---

## 🚀 Local Setup & Execution

### 1. Prerequisites
- **Python 3.11+** installed locally.
- A running MongoDB instance (or local sandbox JSON fallback is utilized automatically).

### 2. Virtual Environment Configuration
From the `agents/` folder, run:
```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows PowerShell:
.\venv\Scripts\Activate.ps1
# macOS / Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Environment Variables Setup
Create an `.env.local` inside the `agents/` folder (or rely on the parent/sibling ones) with:
```env
GEMINI_API_KEY="your-gemini-api-key"
GEMINI_MODEL="gemini-3.1-flash"
MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/fahem"
```

### 4. Running the Agent Locally
Test the orchestrator with a manual prompt via:
```bash
python main.py "Explain chapter 2 from physics, and then give me a 2-question quiz."
```

---

## 🐳 Dockerization & Production Deployment

To package and deploy the backend microservice to **Google Cloud Run**:

```bash
# 1. Build the production Docker image locally
docker build -t gcr.io/fahem-88d40/fahem-agent:latest ./agents

# 2. Push and Deploy to Google Cloud Run
gcloud run deploy fahem-agent \
  --image gcr.io/fahem-88d40/fahem-agent:latest \
  --region us-east4 \
  --no-allow-unauthenticated \
  --vpc-egress private-ranges-only \
  --set-env-vars="GEMINI_MODEL=gemini-3.1-flash,GCP_PROJECT=fahem-88d40"
```

> [!IMPORTANT]
> The `--no-allow-unauthenticated` flag is strictly mandatory. The Next.js frontend will use secure OIDC identity-token handshakes to sign requests on behalf of verified, authenticated users.
