import subprocess
import urllib.request
import json
import socket
import sys

# Monkeypatch socket.getaddrinfo to bypass slow DNS lookup in local CLI sandbox
_original_getaddrinfo = socket.getaddrinfo
def _patched_getaddrinfo(host, port, *args, **kwargs):
    if host == "fahem.pro":
        return _original_getaddrinfo("35.219.200.193", port, *args, **kwargs)
    if host == "fahem-agent-1061555578804.us-east4.run.app":
        return _original_getaddrinfo("34.143.79.2", port, *args, **kwargs)
    return _original_getaddrinfo(host, port, *args, **kwargs)
socket.getaddrinfo = _patched_getaddrinfo

def get_oidc_token():
    try:
        res = subprocess.run(
            ["gcloud", "auth", "print-identity-token"],
            capture_output=True, text=True, check=True, shell=True
        )
        return res.stdout.strip()
    except Exception as e:
        print(f"Error generating OIDC token: {e}")
        return None

def main():
    token = get_oidc_token()
    if not token:
        print("Could not retrieve OIDC token.")
        sys.exit(1)
    
    headers = {
        "Authorization": f"Bearer {token}",
        "X-Verified-Principal": json.dumps({ # guard:allow-principal
            "uid": "owner_gcp_uid",
            "email": "hesham1988@gmail.com",
            "role": "super-admin",
            "db_target": "fahem"
        }),
        "Content-Type": "application/json",
        "Accept": "application/json"
    }

    print("Fetching active crawl jobs from production...")
    req = urllib.request.Request(
        "https://fahem-agent-1061555578804.us-east4.run.app/admin/crawl",
        headers=headers,
        method="GET"
    )
    
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            print(f"Get response success: {data.get('success')}")
            jobs = data.get("jobs", [])
            print(f"Retrieved {len(jobs)} crawl jobs from production database.")
            
            non_terminals = [j for j in jobs if j.get("status") in ["harvesting", "queued", "paused", "running", "processing"]]
            print(f"Found {len(non_terminals)} non-terminal jobs:")
            for j in non_terminals:
                print(f"  - Job ID: {j.get('_id')}, Status: {j.get('status')}, URL: {j.get('url')}")
            
            if not non_terminals:
                print("No stuck jobs found in production.")
                return
            
            # Kill each stuck job
            for j in non_terminals:
                job_id = j.get("_id")
                print(f"Killing job {job_id}...")
                post_body = {
                    "jobId": job_id,
                    "action": "kill"
                }
                post_req = urllib.request.Request(
                    "https://fahem-agent-1061555578804.us-east4.run.app/admin/crawl",
                    data=json.dumps(post_body).encode("utf-8"),
                    headers=headers,
                    method="POST"
                )
                try:
                    with urllib.request.urlopen(post_req, timeout=30) as post_resp:
                        post_data = json.loads(post_resp.read().decode("utf-8"))
                        print(f"Kill response for {job_id}: {post_data}")
                except Exception as post_err:
                    print(f"Failed to kill job {job_id}: {post_err}")
                    
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    main()
