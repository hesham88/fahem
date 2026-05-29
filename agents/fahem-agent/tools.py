import os
import json

def resolve_srv_to_mongodb_uri(uri: str) -> str:
    """Converts a mongodb+srv:// connection string to a standard mongodb:// string by resolving SRV records."""
    if not uri:
        return uri
    uri = uri.strip()
    if not uri.startswith("mongodb+srv://"):
        return uri
    try:
        rest = uri[len("mongodb+srv://"):]
        if "@" in rest:
            creds, host_and_params = rest.split("@", 1)
            creds_part = creds + "@"
        else:
            creds_part = ""
            host_and_params = rest

        if "/" in host_and_params:
            host, db_and_params = host_and_params.split("/", 1)
            db_part = "/" + db_and_params
        else:
            host = host_and_params
            db_part = "/"

        if "?" in host:
            host, params = host.split("?", 1)
            db_part = "/?" + params

        host = host.strip()

        import dns.resolver
        resolver = dns.resolver.Resolver(configure=False)
        resolver.nameservers = ["8.8.8.8", "8.8.4.4"]
        srv_records = resolver.resolve(f"_mongodb._tcp.{host}", "SRV")

        targets = []
        for rec in srv_records:
            target = str(rec.target)
            if target.endswith("."):
                target = target[:-1]
            targets.append(f"{target}:{rec.port}")

        if not targets:
            return uri

        resolved_hosts = ",".join(targets)

        # Resolve TXT records to dynamically get connection options (like replicaSet)
        txt_options = {}
        try:
            txt_records = resolver.resolve(host, "TXT")
            for txt in txt_records:
                rec_str = "".join([s.decode("utf-8") if isinstance(s, bytes) else str(s) for s in txt.strings])
                for param in rec_str.split("&"):
                    if "=" in param:
                        k, v = param.split("=", 1)
                        txt_options[k.strip()] = v.strip()
        except Exception:
            pass

        # Split path and query from db_part
        if "?" in db_part:
            path, query_str = db_part.split("?", 1)
        else:
            path = db_part
            query_str = ""

        # Parse existing query params
        query_params = {}
        if query_str:
            for param in query_str.split("&"):
                if "=" in param:
                    k, v = param.split("=", 1)
                    query_params[k.strip()] = v.strip()

        # Merge TXT options into query params
        for k, v in txt_options.items():
            if k not in query_params:
                query_params[k] = v

        if "ssl" not in query_params and "tls" not in query_params:
            query_params["ssl"] = "true"

        # Reconstruct query string
        merged_query = "&".join([f"{k}={v}" for k, v in query_params.items()])
        final_db_part = f"{path}?{merged_query}" if merged_query else path

        resolved_uri = f"mongodb://{creds_part}{resolved_hosts}{final_db_part}"
        return resolved_uri
    except Exception:
        return uri

def get_mongodb_uri() -> str:
    """Resolves the MongoDB connection string from environment or local configurations."""
    uri = os.environ.get("MONGODB_URI")
    if uri:
        return resolve_srv_to_mongodb_uri(uri.strip())
    
    try:
        micro_dir = os.path.dirname(os.path.abspath(__file__))
        agents_dir = os.path.dirname(micro_dir)
        secrets_path = os.path.join(os.path.dirname(agents_dir), "ignore", "mongodb_secrets.json")
        if os.path.exists(secrets_path):
            with open(secrets_path, "r") as f:
                data = json.load(f)
                val = data.get("MONGODB_URI", "")
                if val:
                    return resolve_srv_to_mongodb_uri(val.strip())
    except Exception:
        pass
        
    return "mongodb://localhost:27017"
