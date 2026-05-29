import os
import json
import httpx
import google.auth
from google.auth.transport.requests import Request

def create_template():
    print("Attempting to acquire GCP credentials...")
    try:
        credentials, project_id = google.auth.default(
            scopes=["https://www.googleapis.com/auth/cloud-platform"]
        )
        credentials.refresh(Request())
        token = credentials.token
        print(f"Acquired credentials successfully. Project: {project_id}")
    except Exception as e:
        print(f"Failed to acquire credentials: {e}")
        return

    project_id = project_id or "fahem-88d40"
    location = "us-central1"
    template_id = "fahem-default-template"

    # Define filter config payload
    filter_config = {
        "piAndJailbreakFilterSettings": {
            "filterEnforcement": "ENABLED"
        },
        "maliciousUriFilterSettings": {
            "filterEnforcement": "ENABLED"
        },
        "raiSettings": {
            "raiFilters": [
                { "filterType": "HATE_SPEECH", "confidenceLevel": "MEDIUM_AND_ABOVE" },
                { "filterType": "HARASSMENT", "confidenceLevel": "MEDIUM_AND_ABOVE" },
                { "filterType": "SEXUALLY_EXPLICIT", "confidenceLevel": "MEDIUM_AND_ABOVE" },
                { "filterType": "DANGEROUS", "confidenceLevel": "MEDIUM_AND_ABOVE" }
            ]
        },
        "sdpSettings": {
            "basicConfig": {
                "filterEnforcement": "ENABLED"
            }
        }
    }

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }

    # 1. Attempt PATCH request to update existing template (highly recommended since it already exists)
    patch_url = f"https://modelarmor.{location}.rep.googleapis.com/v1/projects/{project_id}/locations/{location}/templates/{template_id}?updateMask=filter_config"
    patch_payload = {
        "filterConfig": filter_config
    }

    print(f"Sending PATCH request to update Model Armor template '{template_id}' with Sensitive Data Protection (SDP)...")
    try:
        res = httpx.patch(patch_url, json=patch_payload, headers=headers, timeout=15.0)
        print(f"PATCH Status Code: {res.status_code}")
        if res.status_code in [200, 201]:
            print("Successfully updated template via PATCH!")
            print(json.dumps(res.json(), indent=2))
            return
        else:
            print(f"PATCH failed or not supported. Response: {res.text}")
    except Exception as e:
        print(f"PATCH request failed: {e}")

    # Try second variant of PATCH wrapping in template object
    patch_payload_v2 = {
        "name": f"projects/{project_id}/locations/{location}/templates/{template_id}",
        "filterConfig": filter_config
    }
    print("Attempting PATCH v2 wrapping payload inside template properties...")
    try:
        res = httpx.patch(patch_url, json=patch_payload_v2, headers=headers, timeout=15.0)
        print(f"PATCH v2 Status Code: {res.status_code}")
        if res.status_code in [200, 201]:
            print("Successfully updated template via PATCH v2!")
            print(json.dumps(res.json(), indent=2))
            return
    except Exception as e:
        print(f"PATCH v2 request failed: {e}")

    # 2. Fallback to POST if PATCH was not successful (e.g. template doesn't exist yet)
    post_url = f"https://modelarmor.{location}.rep.googleapis.com/v1/projects/{project_id}/locations/{location}/templates?templateId={template_id}"
    post_payload = {
        "filterConfig": filter_config
    }
    print(f"Sending POST request as fallback to create Model Armor template '{template_id}'...")
    try:
        res = httpx.post(post_url, json=post_payload, headers=headers, timeout=15.0)
        print(f"POST Status Code: {res.status_code}")
        print("POST Response payload:")
        print(json.dumps(res.json(), indent=2))
    except Exception as e:
        print(f"POST request failed: {e}")

if __name__ == "__main__":
    create_template()
