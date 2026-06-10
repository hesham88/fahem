import socket
import time

shards = {
    "shard-00-00": "34.140.20.199",
    "shard-00-01": "34.156.214.113",
    "shard-00-02": "34.78.109.234",
}

for name, ip in shards.items():
    print(f"Testing TCP connection to {name} ({ip}:27017)...")
    t0 = time.time()
    try:
        s = socket.create_connection((ip, 27017), timeout=5)
        print(f"  Connected successfully in {time.time() - t0:.2f}s!")
        s.close()
    except Exception as e:
        print(f"  Failed after {time.time() - t0:.2f}s: {e}")
