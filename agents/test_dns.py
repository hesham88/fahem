import sys
import os

# Add current folder to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from tools import get_mongodb_uri, resolve_srv_to_mongodb_uri

print("Raw MONGODB_URI in env.local:")
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "web", ".env.local")
if not os.path.exists(env_path):
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "web", ".env.local")

if os.path.exists(env_path):
    with open(env_path, "r") as f:
        for line in f:
            if line.startswith("MONGODB_URI="):
                print(line.strip())

print("\nResolved MongoDB URI:")
print(get_mongodb_uri())
