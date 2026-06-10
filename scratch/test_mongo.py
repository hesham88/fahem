import os
import sys
import socket

# Print IP resolution of MongoDB host names
for host in [
    "fahemcluster-shard-00-00.trf718.mongodb.net",
    "fahemcluster-shard-00-01.trf718.mongodb.net",
    "fahemcluster-shard-00-02.trf718.mongodb.net",
    "fahemcluster.trf718.mongodb.net"
]:
    try:
        print(f"Resolving {host}...")
        ips = socket.getaddrinfo(host, 27017)
        print(f"Resolved {host} to: {ips}")
    except Exception as e:
        print(f"Failed to resolve {host}: {e}")

_HERE = os.path.dirname(os.path.abspath(__file__))
_ROOT = os.path.dirname(_HERE)
sys.path.insert(0, _ROOT)
sys.path.insert(0, os.path.join(_ROOT, "agents"))
try:
    from tools import get_mongodb_uri
    print("URI:", get_mongodb_uri())
except Exception as e:
    print("Failed to get URI:", e)
