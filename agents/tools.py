import os
import json
import urllib.request
import urllib.parse

def resolve_via_doh(name: str, rtype: str) -> list:
    """Helper to query DNS-over-HTTPS JSON API as a secure port 443 fallback when standard DNS is blocked."""
    endpoints = [
        f"https://dns.google/resolve?name={urllib.parse.quote(name)}&type={urllib.parse.quote(rtype)}",
        f"https://cloudflare-dns.com/dns-query?name={urllib.parse.quote(name)}&type={urllib.parse.quote(rtype)}"
    ]
    for url in endpoints:
        try:
            req = urllib.request.Request(
                url,
                headers={"Accept": "application/dns-json", "User-Agent": "FahemDoHResolver/1.0"}
            )
            with urllib.request.urlopen(req, timeout=2.5) as response:
                data = json.loads(response.read().decode('utf-8'))
                answers = data.get("Answer", [])
                if answers:
                    return answers
        except Exception:
            continue
    return []

def resolve_srv_to_mongodb_uri(uri: str) -> str:
    """Converts a mongodb+srv:// connection string to a standard mongodb:// string by resolving SRV records using public DNS."""
    if not uri:
        return uri
    uri = uri.strip()
    is_gcp = os.environ.get("K_SERVICE") is not None or os.environ.get("GOOGLE_CLOUD_PROJECT") is not None
    if not is_gcp:
        uri = uri.replace("fahemcluster-pri.trf718.mongodb.net", "fahemcluster.trf718.mongodb.net")
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

        targets = []
        txt_options = {}

        # 1. Attempt DNS-over-HTTPS (DoH) first (extremely reliable and safe from blocking/hanging in GCP Cloud Run sandbox)
        try:
            srv_answers = resolve_via_doh(f"_mongodb._tcp.{host}", "SRV")
            for ans in srv_answers:
                data = ans.get("data", "").strip()
                # Format: "Priority Weight Port Target" e.g., "0 0 27017 cluster0.mongodb.net."
                parts = data.split()
                if len(parts) >= 4:
                    port = parts[2]
                    target = parts[3]
                    if target.endswith("."):
                        target = target[:-1]
                    targets.append(f"{target}:{port}")

            if targets:
                # Also pull TXT options via DoH
                txt_answers = resolve_via_doh(host, "TXT")
                for ans in txt_answers:
                    data = ans.get("data", "").strip().strip('"')
                    for param in data.split("&"):
                        if "=" in param:
                            k, v = param.split("=", 1)
                            txt_options[k.strip()] = v.strip()
        except Exception:
            pass

        # 2. Fallback to standard DNS library resolution if DoH did not find any targets (e.g. in offline local environment)
        if not targets:
            try:
                import dns.resolver
                resolver = dns.resolver.Resolver()
                resolver.timeout = 1.5
                resolver.lifetime = 1.5
                srv_records = resolver.resolve(f"_mongodb._tcp.{host}", "SRV")
                for rec in srv_records:
                    target = str(rec.target)
                    if target.endswith("."):
                        target = target[:-1]
                    targets.append(f"{target}:{rec.port}")

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
            except Exception:
                pass

        if not targets:
            # If both resolutions fail completely, return original to avoid loss of detail
            return uri

        resolved_hosts = ",".join(targets)

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

        # Safeguard for local environment: -pri hosts are internal VPC peering only.
        is_gcp = os.environ.get("K_SERVICE") is not None or os.environ.get("GOOGLE_CLOUD_PROJECT") is not None
        if not is_gcp and "-pri" in resolved_hosts:
            return uri

        resolved_uri = f"mongodb://{creds_part}{resolved_hosts}{final_db_part}"
        return resolved_uri
    except Exception as e:
        # Fallback to original URI if resolution fails
        return uri

_cached_mongodb_uris = {}

def get_mongodb_uri(read_only: bool = False) -> str:
    """Resolves the MongoDB connection string from environment or local configurations.
    
    If read_only=True, it prioritizes a read-only credential to enforce the Principle of Least Privilege.
    """
    global _cached_mongodb_uris
    cache_key = "readonly" if read_only else "write"
    if cache_key in _cached_mongodb_uris:
        return _cached_mongodb_uris[cache_key]

    # 1. Prioritize read-only environment variables if requested
    if read_only:
        uri = os.environ.get("MONGODB_READONLY_URI") or os.environ.get("MONGODB_URI_READONLY")
        if uri:
            res = resolve_srv_to_mongodb_uri(uri.strip())
            _cached_mongodb_uris[cache_key] = res
            return res

    # 2. Standard full-privilege environment variable (or fallback read-only)
    uri = os.environ.get("MONGODB_URI")
    if uri:
        res = resolve_srv_to_mongodb_uri(uri.strip())
        _cached_mongodb_uris[cache_key] = res
        return res
    
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
                        res = resolve_srv_to_mongodb_uri(val.strip())
                        _cached_mongodb_uris[cache_key] = res
                        return res
                val = data.get("MONGODB_URI", "")
                if val:
                    res = resolve_srv_to_mongodb_uri(val.strip())
                    _cached_mongodb_uris[cache_key] = res
                    return res
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
                            res = resolve_srv_to_mongodb_uri(val)
                            _cached_mongodb_uris[cache_key] = res
                            return res
                    if line.startswith("MONGODB_URI="):
                        val = line.split("=", 1)[1].strip().strip('"').strip("'")
                        if val:
                            res = resolve_srv_to_mongodb_uri(val)
                            _cached_mongodb_uris[cache_key] = res
                            return res
    except Exception:
        pass
        
    res = "mongodb://localhost:27017"
    _cached_mongodb_uris[cache_key] = res
    return res


_cached_mongodb_clients = {}

from pymongo import MongoClient

class _NoCloseMongoClient(MongoClient):
    def close(self):
        # Ignore close to maintain persistent connection pool
        pass

def get_cached_mongodb_client(read_only: bool = False) -> MongoClient:
    """Returns a globally cached, connection-pooled MongoClient instance.
    
    This avoids the severe latency of recreating TCP and TLS handshakes on every request.
    """
    global _cached_mongodb_clients
    cache_key = "readonly" if read_only else "write"
    if cache_key in _cached_mongodb_clients:
        return _cached_mongodb_clients[cache_key]
        
    uri = get_mongodb_uri(read_only=read_only)
    client = _NoCloseMongoClient(uri, serverSelectionTimeoutMS=5000)
    _cached_mongodb_clients[cache_key] = client
    return client


