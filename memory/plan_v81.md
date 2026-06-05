# 🌌 Fahem Platform Master Plan - Version 81
**Timestamp**: 2026-06-05T05:35:00Z
**Phase**: Phase 27: Crawler DNS SRV Integration and Stream Inheritance
**AI Core Model Specification**: Gemini 1.5 Pro / 3.5 Flash  

---

## 🏛️ 1. Vision & Executive Summary

Fahem ("AI Tutors in Your Pocket") is a state-of-the-art agentic educational platform. This version of the Master Plan focuses on resolving the **Curriculum Ingestion Crawler/Explorer freezes** on production (GCP Cloud Run) permanently. We identified and addressed two major structural flaws:
1. **MongoDB DNS SRV Hangs**: Standard `mongodb+srv://` DNS SRV resolution can hang or fail in the Cloud Run private VPC. While the parent service resolved this using public DNS resolvers in `tools.py`, the child process `async_crawler.py` was previously doing direct DNS connection attempts, causing silent hangs/failures.
2. **Lack of Startup Visibility**: Swapping subprocess streams to `DEVNULL` hid critical initialization tracebacks. By switching to stream inheritance (`stdout=None`, `stderr=None`), we prevent OS pipe-buffer freezes permanently while preserving full container logging.

---

## 🏛️ 2. Dynamic Swarm & Orchestration Topology

We continue using the hierarchical coordinator-worker topology on Google ADK 2.0. The crawler logic is fully executed in the Cloud Run python container using FastAPI background tasks.

---

## 💾 3. Core Alignments in Version 81

1. **DNS SRV Integration in async_crawler.py**:
   - Updated `get_mongodb_uri()` in `scripts/async_crawler.py` to dynamically import and use `tools.py`'s SRV resolution logic.
   - Ensures the child process benefits from robust public-resolver fallbacks, eliminating connection hangs under GCP Cloud Run.

2. **Subprocess Stream Inheritance (`stdout=None, stderr=None`)**:
   - Refactored `agents/services.py` to pass `stdout=None` and `stderr=None` to the spawned `async_crawler.py` subprocess.
   - Entirely bypasses pipe buffer limitations (which previously froze the process on `subprocess.PIPE`) and routes stdout/stderr directly to container logging for complete diagnostic tracebacks.

3. **Traceback Capture & Printing**:
   - Added explicit error logging and Python tracebacks in the MongoDB update block of `async_crawler.py`.
   - Propagates MongoDB-related connection failures directly to `sys.stderr` for rapid visibility.

---

## 🎯 4. Quality Gates & Validation Status

- **Git Author Verification**: PASS (hesham88 <hesham1988@gmail.com>).
- **Compliance Scan**: PASS (0 active findings).
