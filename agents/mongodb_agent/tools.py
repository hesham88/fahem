import os
import json
from pymongo import MongoClient
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

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
        query_params["tlsAllowInvalidCertificates"] = "true"

        # Reconstruct query string
        merged_query = "&".join([f"{k}={v}" for k, v in query_params.items()])
        final_db_part = f"{path}?{merged_query}" if merged_query else path

        resolved_uri = f"mongodb://{creds_part}{resolved_hosts}{final_db_part}"
        return resolved_uri
    except Exception:
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
        micro_dir = os.path.dirname(os.path.abspath(__file__))
        agents_dir = os.path.dirname(micro_dir)
        secrets_path = os.path.join(os.path.dirname(agents_dir), "ignore", "mongodb_secrets.json")
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
        
    return "mongodb://localhost:27017"

# Initialize MongoDB Connection safely using our robust URI resolver
MONGO_URI = get_mongodb_uri()
if not MONGO_URI:
    raise RuntimeError("CRITICAL_DB_UNAVAILABLE: System authorization keys missing. Operational lifecycle blocked.")

client = MongoClient(MONGO_URI)
try:
    db = client.get_default_database()
    if db is None:
        db = client["fahem"]
except Exception:
    db = client["fahem"]

# Input Contracts matching our master specifications
class ExtractPersistenceInput(BaseModel):
    extracted_book_profile: Dict[str, Any] = Field(description="Complete structural JSON output from extraction workflows.")

class StudentPerformanceQuery(BaseModel):
    grade_tier: str = Field(description="Target student grade level filter constraint pattern.")
    subject_filter: str = Field(description="Target academic subject taxonomy tracking identity marker.")

class HybridVectorQuery(BaseModel):
    dense_vector: List[float] = Field(description="768-dimension float32 array tracking semantic intent from user prompts.")
    subject_id: str = Field(description="Target discipline scope limitation index value.")
    grade: str = Field(description="Target cohort boundary metric mapping index.")

# -------------------------------------------------------------
# SPECIFIED DECLARATIVE DATABASE MCP TOOLS
# -------------------------------------------------------------

def persist_extracted_textbook_catalog(payload: ExtractPersistenceInput) -> str:
    """Stores high-fidelity structural data configurations straight into active collections."""
    try:
        collection = db.curriculum_directory
        result = collection.insert_one(payload.extracted_book_profile)
        return f"SUCCESS: Academic schema committed and indexed under reference identity object: {result.inserted_id}"
    except Exception as error:
        return f"FAILURE: Data persistence aborted due to execution error: {str(error)}"

def execute_student_insight_aggregation(query: StudentPerformanceQuery) -> List[Dict[str, Any]]:
    """Analyzes student metrics using high-performance database aggregation components."""
    try:
        pipeline = [
            {"$match": {"grade": query.grade_tier, "subject_id": query.subject_filter}},
            {"$group": {
                "_id": "$concept_id",
                "average_proficiency": {"$avg": "$checkpoint_score"},
                "total_evaluation_attempts": {"$sum": 1},
                "tracked_misconceptions": {"$push": "$primary_error_tag"}
            }},
            {"$sort": {"average_proficiency": 1}}, # Highlights weakest topics first to adjust training plans
            {"$limit": 5}
        ]
        return list(db.student_performance_tracking.aggregate(pipeline))
    except Exception as error:
        return [{"error": f"Aggregation loop aborted due to critical error trace: {str(error)}"}]

def execute_atlas_hybrid_vector_search(spec: HybridVectorQuery) -> List[Dict[str, Any]]:
    """Runs a semantic lookup against question collections using dense Atlas indexes."""
    try:
        pipeline = [
            {
                "$vectorSearch": {
                    "index": "academic_vector_search_index",
                    "path": "embedding",
                    "queryVector": spec.dense_vector,
                    "numCandidates": 40,
                    "limit": 5,
                    "filter": {
                        "$and": [
                            {"subject_id": {"$eq": spec.subject_id}},
                            {"grade": {"$eq": spec.grade}}
                        ]
                    }
                }
            },
            {
                "$project": {
                    "_id": 1,
                    "question_text": 1,
                    "correct_answer": 1,
                    "target_page": 1,
                    "search_relevance_score": {"$meta": "vectorSearchScore"}
                }
            }
        ]
        return list(db.question_bank.aggregate(pipeline))
    except Exception as error:
        return [{"error": f"Atlas Vector search worker failed on execution path: {str(error)}"}]
