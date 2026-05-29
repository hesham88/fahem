import os
import json

def resolve_srv_to_mongodb_uri(uri: str) -> str:
    """Converts a mongodb+srv:// connection string to a standard mongodb:// string by resolving SRV records using public DNS."""
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
        try:
            resolver = dns.resolver.Resolver()
            srv_records = resolver.resolve(f"_mongodb._tcp.{host}", "SRV")
        except Exception:
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

        # Resolve TXT records to dynamically get connection options (like replicaSet and authSource)
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

        # Merge TXT options into query params (so replicaSet is dynamically fetched)
        for k, v in txt_options.items():
            if k not in query_params:
                query_params[k] = v

        # Ensure ssl/tls is set
        if "ssl" not in query_params and "tls" not in query_params:
            query_params["ssl"] = "true"
        query_params["tlsAllowInvalidCertificates"] = "true"

        # Reconstruct query string
        merged_query = "&".join([f"{k}={v}" for k, v in query_params.items()])
        final_db_part = f"{path}?{merged_query}" if merged_query else path

        resolved_uri = f"mongodb://{creds_part}{resolved_hosts}{final_db_part}"
        return resolved_uri
    except Exception as e:
        # Fallback to original URI if resolution fails
        return uri

def get_mongodb_uri(read_only: bool = False) -> str:
    """Resolves the MongoDB connection string from environment or local configurations.
    
    If read_only=True, it prioritizes a read-only credential to enforce the Principle of Least Privilege.
    """
    # 1. Prioritize read-only environment variables if requested
    if read_only:
        uri = os.environ.get("MONGODB_READONLY_URI") or os.environ.get("MONGODB_URI_READONLY")
        if uri:
            return resolve_srv_to_mongodb_uri(uri.strip())

    # 2. Standard full-privilege environment variable (or fallback read-only)
    uri = os.environ.get("MONGODB_URI")
    if uri:
        return resolve_srv_to_mongodb_uri(uri.strip())
    
    # 3. Local ignored secrets file
    try:
        # Resolve path relative to agents/ directory (checking both workspace root and web/ nested levels)
        agents_dir = os.path.dirname(os.path.abspath(__file__))
        secrets_path = os.path.join(os.path.dirname(agents_dir), "ignore", "mongodb_secrets.json")
        if not os.path.exists(secrets_path):
            secrets_path = os.path.join(os.path.dirname(os.path.dirname(agents_dir)), "ignore", "mongodb_secrets.json")
            
        if os.path.exists(secrets_path):
            with open(secrets_path, "r") as f:
                data = json.load(f)
                if read_only:
                    val = data.get("MONGODB_READONLY_URI") or data.get("MONGODB_URI_READONLY")
                    if val:
                        return resolve_srv_to_mongodb_uri(val.strip())
                val = data.get("MONGODB_URI", "")
                if val:
                    return resolve_srv_to_mongodb_uri(val.strip())
    except Exception:
        pass
    
    # 4. Local Next.js env file
    try:
        env_path = os.path.join(os.path.dirname(agents_dir), "web", ".env.local")
        if not os.path.exists(env_path):
            env_path = os.path.join(os.path.dirname(agents_dir), ".env.local")
            
        if os.path.exists(env_path):
            with open(env_path, "r") as f:
                for line in f:
                    line = line.strip()
                    if read_only and (line.startswith("MONGODB_READONLY_URI=") or line.startswith("MONGODB_URI_READONLY=")):
                        val = line.split("=", 1)[1].strip().strip('"').strip("'")
                        if val:
                            return resolve_srv_to_mongodb_uri(val)
                    if line.startswith("MONGODB_URI="):
                        val = line.split("=", 1)[1].strip().strip('"').strip("'")
                        if val:
                            return resolve_srv_to_mongodb_uri(val)
    except Exception:
        pass
        
    return "mongodb://localhost:27017"

