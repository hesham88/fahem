import google.auth
from google.auth.transport.requests import Request
from google.oauth2 import id_token
import httpx
import json

cloud_run_url = "https://fahem-agent-1061555578804.us-east4.run.app"
url = f"{cloud_run_url}/user/list"

print("Generating GCP identity token...")
try:
    # Get default credentials
    credentials, project_id = google.auth.default()
    
    # Request an identity token for the Cloud Run URL
    auth_req = Request()
    credentials.refresh(auth_req)
    
    # Generate OIDC ID token
    import google.oauth2.id_token
    token = google.oauth2.id_token.fetch_id_token(auth_req, cloud_run_url)
    
    print("Identity token generated successfully!")
    
    headers = {
        "Accept": "application/json",
        "Authorization": f"Bearer {token}"
    }
    
    print("Querying Cloud Run user list (authenticated)...")
    res = httpx.get(url, headers=headers, timeout=10.0)
    print("Status code:", res.status_code)
    try:
        print(json.dumps(res.json(), indent=2))
    except Exception:
        print("Response text:", res.text)
        
except Exception as e:
    print("Failed with authentication error:", e)
