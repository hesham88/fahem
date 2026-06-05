# 🌌 Fahem Platform Master Plan - Version 80
**Timestamp**: 2026-06-05T05:10:00Z
**Phase**: Phase 26: Staging/Delivery Configuration Enforcement and Crawler OS Buffer Fix  
**AI Core Model Specification**: Gemini 1.5 Pro / 3.5 Flash  

---

## 🏛️ 1. Vision & Executive Summary

Fahem ("AI Tutors in Your Pocket") is a state-of-the-art agentic educational platform. This version of the Master Plan focuses on **enforcing a staging/delivery database configuration locally**, **completely removing hardcoded mock assets**, and **permanently resolving background crawler process freezes** to guarantee smooth, deep recursive web scraping and ingestion on GCP Cloud Run.

---

## 🏛️ 2. Dynamic Swarm & Orchestration Topology

We continue using the hierarchical coordinator-worker topology on Google ADK 2.0. The crawler logic is fully executed in the Cloud Run python container using FastAPI background tasks.

---

## 💾 3. Core Alignments in Version 80

1. **Complete Removal of Mock Biology Asset**:
   - The mock asset ("My Biology Summary Notes - Chapter 2") has been completely scrubbed from `web/src/app/[locale]/home/page.tsx` and has 0 references in the local JSON database or codebase.
   - Deploying and pushing this change ensures that the live app no longer displays the hardcoded card.

2. **Global Staging/Delivery DB Enforcement**:
   - Modified `isLocalEnv()` inside `web/src/app/api/localDbHelper.ts` to permanently return `false`.
   - Bypasses all local JSON offline file fallbacks, forcing the application to use the staging/delivery configuration (direct MongoDB Atlas Private VPC connection on Cloud Run, and secure routing proxy locally).

3. **Crawler Subprocess OS Buffer Saturation Fix**:
   - Identified that the background crawler froze because the previous commit `a7736c1` utilized `subprocess.PIPE` for `stdout` and `stderr` but never consumed them. This caused the OS pipe buffer to saturate and block crawler execution after a few logging statements.
   - Refactored `agents/services.py` to use `subprocess.DEVNULL` for `stdout` and `stderr`. This safely discards logs at the OS level, eliminating pipe saturation while allowing the crawler to write progress logs directly to MongoDB `crawl_jobs` without any risk of freezing.

---

## 🎯 4. Quality Gates & Validation Status

- **Git Author Verification**: PASS (hesham88 <hesham1988@gmail.com>).
- **Compliance Scan**: PASS (0 active findings).
