#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
FC8.5 — Cloud Run Job dispatch for the ingestion worker.

The legacy ingestion path ran job_fetch.py as an in-process daemon thread/subprocess
inside the request-scoped API service. A 973-page book takes ~45 min, so ANY instance
replacement in that window (a deploy/revision swap, a health-check restart, or a scale
event) killed the thread mid-run — observed as two accounting jobs frozen for 91 min,
both dying at the same instant when the container recycled. `--min-instances=1` does not
help: a warm *count* of 1 does not pin the *same* container across a revision change.

This dispatches each ingestion to a dedicated **Cloud Run Job** (`fahem-ingest-worker`),
which runs to completion independently of the API service lifecycle and is retried by
Cloud Run on failure. The book payload is passed as the INGEST_PAYLOAD env override on
the execution; job_fetch.py reads it from the environment.
"""

import os
import json
import logging

logger = logging.getLogger("ingestion.job_trigger")

# Resolved from the API service's environment, with the deployed defaults as fallback.
_PROJECT = os.environ.get("GCP_PROJECT") or os.environ.get("GOOGLE_CLOUD_PROJECT") or "fahem-88d40"
_REGION = os.environ.get("GCP_REGION") or os.environ.get("CLOUD_RUN_REGION") or "us-east4"
_JOB_NAME = os.environ.get("INGEST_JOB_NAME") or "fahem-ingest-worker"


def trigger_ingest_job(payload: dict) -> bool:
    """Triggers a Cloud Run Job execution to ingest one book. Returns True on a 2xx dispatch.

    The caller (run_ingest_in_background) falls back to the in-process subprocess path when
    this returns False, so a misconfiguration never silently drops an ingestion.
    """
    try:
        import google.auth
        from google.auth.transport.requests import Request as GoogleAuthRequest
        import requests
    except Exception as e:
        logger.error(f"[Ingestion Trigger] job dispatch deps missing ({e}); cannot use Cloud Run Job")
        return False

    try:
        creds, _ = google.auth.default(scopes=["https://www.googleapis.com/auth/cloud-platform"])
        creds.refresh(GoogleAuthRequest())
        token = creds.token
        if not token:
            logger.error("[Ingestion Trigger] no access token from default credentials")
            return False

        url = (
            f"https://run.googleapis.com/v2/projects/{_PROJECT}"
            f"/locations/{_REGION}/jobs/{_JOB_NAME}:run"
        )
        body = {
            "overrides": {
                "containerOverrides": [
                    {"env": [{"name": "INGEST_PAYLOAD", "value": json.dumps(payload)}]}
                ],
                "taskCount": 1,
            }
        }
        resp = requests.post(
            url,
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
            data=json.dumps(body),
            timeout=20,
        )
        if 200 <= resp.status_code < 300:
            logger.info(
                f"[Ingestion Trigger] Cloud Run Job '{_JOB_NAME}' execution started for "
                f"book_id={payload.get('book_id')} (db_target={payload.get('db_target')})"
            )
            return True
        logger.error(
            f"[Ingestion Trigger] Cloud Run Job dispatch failed: HTTP {resp.status_code} {resp.text[:300]}"
        )
        return False
    except Exception as e:
        logger.error(f"[Ingestion Trigger] Cloud Run Job dispatch raised: {e}", exc_info=True)
        return False
