import dns.resolver
import os
import re

def test():
    uri = os.environ.get("MONGODB_URI")
    if not uri:
        print("Error: MONGODB_URI environment variable is not set. Please set it before running this test script.")
        return
    match = re.search(r"mongodb\+srv://[^/]*@([^/?]+)", uri)
    if not match:
        print("Error: Could not parse host from MONGODB_URI.")
        return
    host = match.group(1)
    print("Testing with system default resolver...")
    try:
        resolver = dns.resolver.Resolver()
        srv_records = resolver.resolve(f"_mongodb._tcp.{host}", "SRV")
        for rec in srv_records:
            print(f"Target: {rec.target}, Port: {rec.port}")
    except Exception as e:
        print("System default resolver failed:", e)

if __name__ == "__main__":
    test()
