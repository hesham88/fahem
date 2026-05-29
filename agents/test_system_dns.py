import dns.resolver

def test():
    host = "fahemcluster.trf718.mongodb.net"
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
