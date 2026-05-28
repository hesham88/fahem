# Google Cloud Rapid Agent Hackathon - FAQ

## Key Architecture & Tool Questions

* **Agent Builder & Studio**: "Google Cloud Agent Builder" and "Agent Platform -> Studio" are the same product (in mid-transition of branding). Studio is the Agent Builder interface.
* **Orchestration**: Agent Builder or the code-first Agent Development Kit (ADK) are the required primary orchestrators. Third-party orchestrators like LangChain, LangGraph, or LlamaIndex shouldn't be the primary orchestrators.
* **Credits**: Google Cloud credits cover native Google Cloud services (Vertex AI, Gemini, Cloud Run, Secret Manager, Agent Builder, etc.). They do not cover partner billing unless subscribed to through the Google Cloud Marketplace for unified billing (e.g. MongoDB Atlas).
* **AI Coding Tools**: Only Google Cloud AI tools (Gemini, Antigravity) are permitted for the dev workflow and repository. Non-Google AI coding assistants or competing third-party agents are not permitted.

* **Datasets**: Pre-loaded mock data or public datasets are expected. Volume/scale of data is not graded; multi-step reasoning is key.
* **Hosted App accessibility**: Sandbox demo with preloaded data is acceptable. No production OAuth flows or private logins required.
