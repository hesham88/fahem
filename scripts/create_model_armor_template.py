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

    url = f"https://modelarmor.{location}.rep.googleapis.com/v1/projects/{project_id}/locations/{location}/templates?templateId={template_id}"
    
    payload = {
        "filterConfig": {
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
            }
        }
    }

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    }

    print(f"Sending POST request to create Model Armor template '{template_id}'...")
    try:
        res = httpx.post(url, json=payload, headers=headers, timeout=15.0)
        print(f"Status Code: {res.status_code}")
        print("Response payload:")
        print(json.dumps(res.json(), indent=2))
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    create_template()
