import os
import sys
import time
import pymongo

_HERE = os.path.dirname(os.path.abspath(__file__))
_ROOT = os.path.dirname(_HERE)
sys.path.insert(0, _ROOT)
sys.path.insert(0, os.path.join(_ROOT, "agents"))

from tools import get_mongodb_uri
uri = get_mongodb_uri()

print("Testing direct connection (without monkeypatch)...")
t0 = time.time()
try:
    client = pymongo.MongoClient(uri, serverSelectionTimeoutMS=10000)
    client.admin.command("ping")
    print(f"Direct connection succeeded in {time.time() - t0:.2f}s!")
    print("Databases:", client.list_database_names())
    client.close()
except Exception as e:
    print(f"Direct connection failed after {time.time() - t0:.2f}s: {e}")

print("\nTesting connection with socket monkeypatch...")
import socket
_original_getaddrinfo = socket.getaddrinfo
def _patched_getaddrinfo(host, port, *args, **kwargs):
    if host == "fahemcluster-shard-00-00.trf718.mongodb.net":
        return _original_getaddrinfo("34.140.20.199", port, *args, **kwargs)
    if host == "fahemcluster-shard-00-01.trf718.mongodb.net":
        return _original_getaddrinfo("34.156.214.113", port, *args, **kwargs)
    if host == "fahemcluster-shard-00-02.trf718.mongodb.net":
        return _original_getaddrinfo("34.78.109.234", port, *args, **kwargs)
    return _original_getaddrinfo(host, port, *args, **kwargs)
socket.getaddrinfo = _patched_getaddrinfo

t0 = time.time()
try:
    client = pymongo.MongoClient(uri, serverSelectionTimeoutMS=10000)
    client.admin.command("ping")
    print(f"Monkeypatched connection succeeded in {time.time() - t0:.2f}s!")
    print("Databases:", client.list_database_names())
    client.close()
except Exception as e:
    print(f"Monkeypatched connection failed after {time.time() - t0:.2f}s: {e}")
