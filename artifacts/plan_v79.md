# 🌌 Fahem Platform Master Plan - Version 79
**Timestamp**: 2026-06-05T04:21:00Z
**Phase**: Phase 25: Crawler Database Decoupling and GCP Cloud Run Routing Proxy Alignment  
**AI Core Model Specification**: Gemini 3.5 Flash  

---

## 🏛️ 1. Vision & Executive Summary

Fahem ("AI Tutors in Your Pocket") is a state-of-the-art agentic educational platform. This version of the Master Plan focuses on **resolving production crawler connection timeouts** by decoupling database mutations from serverless frontend dynamic IP spaces. All production crawl operations are now routed through OIDC-authenticated backend service calls to GCP Cloud Run, which safely tunnels operations inside the secure VPC network.

---

## 🏛️ 2. Dynamic Swarm & Orchestration Topology

We continue using the hierarchical coordinator-worker topology on Google ADK 2.0. The crawler logic is fully executed in the Cloud Run python container using FastAPI background tasks.

---

## 💾 3. Resolved Crawler & Ingestion Connection Path

1. **Frontend Router (`web/src/app/api/admin/crawl/route.ts`)**:
   - Delegates polling and triggering requests directly to Cloud Run if running in the production environment.
   - Preserves local child-process spawning for standard sandbox offline development.
2. **Backend Agent (`agents/services.py`)**:
   - Exposes `/admin/crawl` endpoints protected by OIDC Bearer Token verification.
   - Spawns crawler as a background thread, recording its active PID securely in the central MongoDB `crawl_jobs` collection.
3. **Atlas Connections (`scripts/async_crawler.py` & `scripts/ingestion/utils.py`)**:
   - Safe VPC tunneling when standard `-pri` private Atlas host strings are detected on Cloud Run, eliminating DNS connection hangs.

---

## 🎯 4. Quality Gates & Validation Status

- **Git Author Verification**: PASS (hesham88 <hesham1988@gmail.com>).
- **Compliance Scan**: PASS (0 active findings).
