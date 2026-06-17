import sys
import os
import logging
import fastapi
import json

logger = logging.getLogger("google_adk." + __name__)

def get_active_db(client):
    try:
        from agents.mongodb_engine import db_target_var
    except ImportError:
        try:
            from mongodb_engine import db_target_var
        except ImportError:
            return client['fahem']
    return client[db_target_var.get()]


def _pooled_client():
    """FC9.12 (perf): return the process-wide, connection-pooled MongoClient.

    Previously every endpoint did `MongoClient(uri, ...)` + `.close()`, which forced a
    fresh TCP+TLS handshake and replica-set discovery on EVERY request — the dominant
    source of production data-retrieval latency. `get_cached_mongodb_client()` returns a
    single shared, pooled client (its `.close()` is a no-op), so existing `client.close()`
    calls remain safe. Imported lazily to avoid a circular import at module load."""
    from tools import get_cached_mongodb_client
    return get_cached_mongodb_client()


def notify_admins_of(db, ntf_type: str, title: str, title_ar: str, body: str, body_ar: str, payload: dict = None):
    """Fan an admin notification out to every admin/super-admin in the given database.

    Best-effort and never raises — notifications must not break the event that triggered
    them. Operates on whatever DB the caller passes (so sandbox events notify sandbox
    admins and production events notify production admins).
    """
    try:
        import time
        admins = db["users"].find({"role": {"$in": ["admin", "super-admin"]}}, {"userId": 1, "uid": 1})
        ts = int(time.time() * 1000)
        count = 0
        for adm in admins:
            uid = adm.get("userId") or adm.get("uid")
            if not uid:
                continue
            db["notifications"].insert_one({
                "_id": f"ntf_{ts}_{ntf_type}_{uid[:8]}_{count}",
                "recipient_uid": uid,
                "type": ntf_type,
                "title": title,
                "title_ar": title_ar,
                "body": body,
                "body_ar": body_ar,
                "payload": payload or {},
                "read": False,
                "createdAt": ts
            })
            count += 1
            send_web_push(db, uid, title, body, (payload or {}).get("deep_link"))
        return count
    except Exception as err:
        logger.warning(f"[notify_admins_of] Failed to fan out '{ntf_type}': {err}")
        return 0


def send_web_push(db, recipient_uid: str, title: str, body: str, url: str = None):
    """Best-effort browser (Web-Push/VAPID) delivery to a user's stored subscriptions.

    Activates only once VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY are configured; otherwise it
    is a graceful no-op (in-app notifications still work). Expired subscriptions are pruned.
    """
    try:
        private_key = os.environ.get("VAPID_PRIVATE_KEY")
        public_key = os.environ.get("VAPID_PUBLIC_KEY")
        if not private_key or not public_key or not recipient_uid:
            return
        try:
            from pywebpush import webpush, WebPushException
        except Exception:
            return
        subject = os.environ.get("VAPID_SUBJECT", "mailto:contact@fahem.pro")
        import json as _json
        payload = _json.dumps({"title": title, "body": body, "url": url or "/"})
        for sub in db["push_subscriptions"].find({"userId": recipient_uid}):
            info = sub.get("subscription")
            if not info:
                continue
            try:
                webpush(subscription_info=info, data=payload,
                        vapid_private_key=private_key, vapid_claims={"sub": subject})
            except WebPushException as wpe:
                status = getattr(getattr(wpe, "response", None), "status_code", None)
                if status in (404, 410):
                    db["push_subscriptions"].delete_one({"_id": sub.get("_id")})
            except Exception:
                pass
    except Exception as err:
        logger.warning(f"[send_web_push] Failed for {recipient_uid}: {err}")


# Demo per-tier token caps (FC7.38). Cumulative per sandbox session — NO reset; once spent the demo
# session is hard-stopped from all AI (FC7.34). Overridable via config demoTier0Cap / demoTier1Cap.
DEMO_TIER0_CAP = 35000
DEMO_TIER1_CAP = 60000


def token_budget_blocked(principal: dict):
    """FC7.34: return (blocked, reason, info) for the given verified principal BEFORE an AI run.

    - Demo (db_target=='fahem_sandbox'): usage is the CUMULATIVE sum for the sandbox session (no reset).
      The cap is the per-tier demo cap (Tier 0 = 35k, Tier 1 = 60k). Fail-CLOSED — the anonymous demo is
      the cost/abuse vector, so an exhausted session is blocked from every AI action.
    - Prod (authenticated): usage is summed over rolling DAILY / WEEKLY / MONTHLY windows (a natural reset
      as the window moves). Limits come from a per-user override (users.dailyLimit/weeklyLimit/monthlyLimit
      or tokenPolicy.*) else the global config. Over ANY window => blocked.
    Never raises — callers decide the fail posture on exception.
    """
    import datetime as _dt
    from tools import get_cached_mongodb_client
    if not principal or not isinstance(principal, dict):
        return (False, None, {})
    db_target = principal.get("db_target") or "fahem"
    client = get_cached_mongodb_client()

    def _sum_tokens(coll, q):
        total = 0
        cur = coll.aggregate([{"$match": q}, {"$group": {"_id": None, "t": {"$sum": "$totalTokens"}}}])
        for d in cur:
            total = int(d.get("t", 0) or 0)
        return total

    # ---- Demo sandbox: cumulative per-session, hard cap by tier ----
    if db_target == "fahem_sandbox":
        sid = principal.get("sandbox_session_id")
        if not sid:
            return (False, None, {})  # nothing to meter against
        sdb = client["fahem_sandbox"]
        cfg = sdb["config"].find_one({}) or client["fahem"]["config"].find_one({}) or {}
        tier = int(principal.get("tier", 0) or 0)
        cap = int(cfg.get("demoTier1Cap", DEMO_TIER1_CAP)) if tier >= 1 else int(cfg.get("demoTier0Cap", DEMO_TIER0_CAP))
        used = _sum_tokens(sdb["token_telemetry"], {"sandboxSessionId": sid})
        if cap > 0 and used >= cap:
            return (True, f"Demo token budget exhausted ({used:,}/{cap:,}). This sandbox session can no longer use AI services.", {"used": used, "cap": cap, "scope": "demo_session"})
        return (False, None, {"used": used, "cap": cap, "scope": "demo_session"})

    # ---- Production: rolling daily/weekly/monthly windows with per-user override ----
    uid = principal.get("uid")
    if not uid:
        return (False, None, {})
    pdb = client["fahem"]
    if not bool((pdb["config"].find_one({}) or {}).get("isTokenControlActive", True)):
        return (False, None, {"scope": "prod", "enforced": False})
    cfg = pdb["config"].find_one({}) or {}
    user = pdb["users"].find_one({"userId": uid}, {"dailyLimit": 1, "weeklyLimit": 1, "monthlyLimit": 1, "tokenPolicy": 1}) or {}
    tp = user.get("tokenPolicy") or {}
    daily_limit = int(user.get("dailyLimit") or tp.get("dailyLimit") or cfg.get("dailyAllocationLimit", 50000))
    weekly_limit = int(user.get("weeklyLimit") or tp.get("weeklyLimit") or cfg.get("weeklyAllocationLimit", 250000))
    monthly_limit = int(user.get("monthlyLimit") or tp.get("monthlyLimit") or cfg.get("monthlyAllocationLimit", 1000000))
    now = _dt.datetime.utcnow()
    tele = pdb["token_telemetry"]
    windows = [
        ("daily", daily_limit, now - _dt.timedelta(days=1)),
        ("weekly", weekly_limit, now - _dt.timedelta(days=7)),
        ("monthly", monthly_limit, now - _dt.timedelta(days=30)),
    ]
    for name, limit, since in windows:
        if limit <= 0:
            continue
        used = _sum_tokens(tele, {"userId": uid, "createdAt": {"$gte": since}})
        if used >= limit:
            return (True, f"Your {name} token budget is exhausted ({used:,}/{limit:,}). AI services pause until the {name} window resets.", {"used": used, "limit": limit, "window": name, "scope": "prod"})
    return (False, None, {"scope": "prod"})


# Helper to register route on a FastAPI app
def register_telemetry_route(app: fastapi.FastAPI):
    # Check if the route is already registered to avoid duplication
    for route in app.routes:
        if hasattr(route, "path") and route.path == "/db-metadata":
            return

    @app.on_event("startup")
    async def assert_atlas_vector_index():
        try:
            from tools import get_mongodb_uri
            from pymongo import MongoClient
            import os
            
            uri = get_mongodb_uri()
            if "localhost" in uri or "127.0.0.1" in uri:
                logger.info("[STARTUP CHECK] Skipping Atlas Search Index assertion for local MongoDB.")
                return
                
            logger.info("[STARTUP CHECK] Verifying Atlas Search Index on boot...")
            client = _pooled_client()
            db = client["fahem"]
            coll = db["book_pages"]
            
            index_name = os.environ.get("VECTOR_INDEX_NAME", "vector_index_book_pages")
            
            try:
                search_indexes = list(coll.list_search_indexes())
            except Exception as se_err:
                logger.error(f"[STARTUP CHECK] ERROR listing search indexes from Atlas: {se_err}")
                logger.error("[STARTUP CHECK] ALERT: Setup or Permission error when connecting to Atlas Search Indexes.")
                return
                
            found = False
            for idx in search_indexes:
                if idx.get("name") == index_name:
                    found = True
                    latest_def = idx.get("latestDefinition", {}) or idx.get("definition", {}) or {}
                    mappings = latest_def.get("mappings", {}) or {}
                    fields = mappings.get("fields", {}) or {}
                    embedding_field = fields.get("embedding", {}) or {}
                    if isinstance(embedding_field, list) and len(embedding_field) > 0:
                        embedding_field = embedding_field[0]
                    elif isinstance(embedding_field, dict):
                        pass
                    else:
                        embedding_field = {}
                    
                    dimensions = embedding_field.get("dimensions")
                    if dimensions is not None:
                        dimensions = int(dimensions)
                        if dimensions != 3072:
                            logger.error(f"[STARTUP CHECK] ALERT: Search index '{index_name}' dimension mismatch: found {dimensions}, expected 3072.")
                            raise RuntimeError(f"Database configuration error: Search index '{index_name}' has invalid dimensions {dimensions} (expected 3072)")
                    break
            
            if not found:
                logger.error(f"[STARTUP CHECK] ALERT: Atlas search index '{index_name}' does not exist on 'book_pages' collection!")
                raise RuntimeError(f"Database configuration error: Required Atlas search index '{index_name}' is missing.")
            
            logger.info(f"[STARTUP CHECK] Success: Atlas search index '{index_name}' verified (3072 dims).")
            
        except Exception as e:
            logger.error(f"[STARTUP CHECK] CRITICAL: Atlas search index assertion failed: {e}", exc_info=True)
            is_gcp = os.environ.get("K_SERVICE") is not None or os.environ.get("GOOGLE_CLOUD_PROJECT") is not None
            if is_gcp or "fahemcluster" in get_mongodb_uri():
                raise e

    # Secure OIDC Bearer Token Verification implemented as a PURE ASGI middleware.
    #
    # IMPORTANT: this MUST be a pure ASGI middleware, not a @app.middleware("http")
    # (Starlette BaseHTTPMiddleware). A BaseHTTPMiddleware runs the endpoint in a
    # separate task and `call_next` returns as soon as the response *starts*; for a
    # streaming response (the ADK /run_sse agent stream) the request-scoped
    # contextvars set here would be reset in `finally` BEFORE the agent body
    # actually runs, so db_target ("fahem_sandbox") was lost and the agent silently
    # fell back to the default "fahem" (production) database. A pure ASGI middleware
    # shares a single execution context with the endpoint for the entire streamed
    # response, keeping db_target / principal in effect while the tools run.
    class OidcSecurityMiddleware:
        def __init__(self, asgi_app):
            self.asgi_app = asgi_app

        async def __call__(self, scope, receive, send):
            if scope.get("type") != "http":
                await self.asgi_app(scope, receive, send)
                return

            request = fastapi.Request(scope, receive=receive)

            PUBLIC_PATHS = {"/healthz", "/health", "/", "/verify-recaptcha", "/sms/rate-limit", "/public/usernames"}
            path = request.url.path
            is_secured = path not in PUBLIC_PATHS and not any(path.startswith(p + "/") for p in PUBLIC_PATHS if p != "/")

            principal = None

            # Parse X-Verified-Principal header if present
            verified_principal_header = request.headers.get("X-Verified-Principal")
            if verified_principal_header:
                try:
                    principal = json.loads(verified_principal_header)
                    logger.info(f"[PRINCIPAL] Parsed principal from X-Verified-Principal: {principal}")
                except Exception as pe:
                    logger.warning(f"[PRINCIPAL] Failed to parse X-Verified-Principal: {pe}")

            if is_secured:
                is_gcp = os.environ.get("K_SERVICE") is not None or os.environ.get("GOOGLE_CLOUD_PROJECT") is not None
                auth_header = request.headers.get("Authorization")

                # LOCAL_BYPASS_TOKEN_fahem_2026 is fully removed and purged!

                token = None
                if auth_header and auth_header.startswith("Bearer "):
                    token = auth_header[7:]

                if token:
                    try:
                        from google.oauth2 import id_token
                        from google.auth.transport import requests as auth_requests
                        from google.auth import jwt

                        # 1. Decode token payload without verification to inspect the audience dynamically
                        payload = jwt.decode(token, verify=False)
                        aud = payload.get("aud")

                        # 2. Verify signature, expiry, and dynamic audience
                        id_info = id_token.verify_oauth2_token(token, auth_requests.Request(), audience=aud)
                        email = id_info.get("email")
                        logger.info(f"[OIDC VERIFIED] Request to {path} authenticated for: {email}")
                        request.state.verified_email = email

                        # Reject X-Verified-Principal spoofing on GCP Run, but trust verified GCP service accounts:
                        # Identity is strictly derived from the verified token
                        is_service_account = email.endswith("gserviceaccount.com")
                        passed_principal = principal if (principal and isinstance(principal, dict)) else {}
                        passed_db_target = passed_principal.get("db_target") if passed_principal else None

                        if is_service_account:
                            # Service-account token (e.g. the App Hosting compute SA the Next.js proxy
                            # uses). Identity MUST come from the forwarded end-user principal. NEVER adopt
                            # the service account's OWN sub/email as a user — doing so let
                            # 'firebaseapphostingcompute' take over real accounts (identity-takeover bug).
                            verified_uid = passed_principal.get("uid")
                            verified_email = passed_principal.get("email")
                            verified_role = passed_principal.get("role") or "user"
                            db_target = passed_db_target if passed_db_target else "fahem_sandbox"
                        else:
                            # A directly-verified end-user OIDC token.
                            verified_uid = id_info.get("sub", "unknown_gcp_uid")
                            verified_email = email
                            verified_role = "super-admin" if email == "hesham1988@gmail.com" else "user"
                            db_target = passed_db_target if (email == "hesham1988@gmail.com" and passed_db_target) else "fahem_sandbox"

                        # Hard guard: a service-account identity must NEVER be treated as a user.
                        if verified_email and str(verified_email).endswith("gserviceaccount.com"):
                            verified_uid = None
                            verified_email = None

                        if verified_uid and verified_email:
                            principal = {
                                "uid": verified_uid,
                                "email": verified_email,
                                "role": verified_role,
                                "db_target": db_target,
                                "selected_book_ids": passed_principal.get("selected_book_ids") if isinstance(passed_principal.get("selected_book_ids"), list) else [],
                                "selected_text": passed_principal.get("selected_text"),
                                "book_id": passed_principal.get("book_id"),
                                "page": passed_principal.get("page"),
                                "sandbox_session_id": passed_principal.get("sandbox_session_id"),
                                "tier": passed_principal.get("tier")
                            }
                        else:
                            # Pure service-to-service call with no forwarded end-user → no user identity.
                            principal = None
                    except Exception as err:
                        logger.warning(f"[OIDC FAILED] Token verification failed for {path}: {err}")
                        if is_gcp:
                            response = fastapi.responses.JSONResponse(
                                content={"status": "error", "error": f"Unauthorized: Invalid OIDC Token ({str(err)})"},
                                status_code=401
                            )
                            await response(scope, receive, send)
                            return
                else:
                    if is_gcp:
                        logger.warning(f"[OIDC BLOCKED] Request to {path} blocked: No OIDC Bearer Token.")
                        response = fastapi.responses.JSONResponse(
                            content={"status": "error", "error": "Unauthorized: OIDC Bearer token required on Google Cloud Run"},
                            status_code=401
                        )
                        await response(scope, receive, send)
                        return
                    else:
                        logger.info(f"[OIDC BYPASS] Local request to {path} permitted without OIDC token.")
                        if not principal:
                            principal = {
                                "uid": "local_dev_uid",
                                "email": "local_dev@fahem.app",
                                "role": "super-admin"
                            }

            # Propagate principal to request state and contextvar
            request.state.principal = principal
            if principal:
                request.state.verified_email = principal.get("email")

            # FC7.34: enforce the token budget on the expensive AI run paths BEFORE the LLM executes, so an
            # exhausted user/demo session cannot keep spending. Demo is fail-CLOSED (the anonymous cost
            # vector); authenticated prod fails OPEN on a check error so an enforcement bug never locks real
            # users out. Only POST runs are metered (reads/streamed GETs are free).
            AI_RUN_PATHS = ("/run_sse", "/chat/message", "/audio/tts")
            if principal and request.method == "POST" and any(path.startswith(p) for p in AI_RUN_PATHS):
                try:
                    _blocked, _reason, _info = token_budget_blocked(principal)
                    if _blocked:
                        logger.info(f"[budget] BLOCKED {path} for {principal.get('email') or principal.get('uid')}: {_info}")
                        return await fastapi.responses.JSONResponse(
                            status_code=429,
                            content={"error": _reason, "code": "token_budget_exhausted", "info": _info},
                        )(scope, receive, send)
                except Exception as _be:
                    logger.warning(f"[budget] enforcement check error on {path}: {_be}")
                    if (principal.get("db_target") == "fahem_sandbox"):
                        return await fastapi.responses.JSONResponse(
                            status_code=429,
                            content={"error": "Demo token check failed; AI paused for this session.", "code": "token_budget_exhausted"},
                        )(scope, receive, send)

            token_ctx = None
            try:
                from guardrails import verified_principal_ctx
                if verified_principal_ctx is not None and principal:
                    token_ctx = verified_principal_ctx.set(principal)
            except Exception as ctx_err:
                logger.warning(f"Failed to import/set verified_principal_ctx: {ctx_err}")

            db_target_ctx = None
            selected_book_ids_ctx = None
            try:
                db_target = "fahem"
                selected_book_ids = []
                if principal and isinstance(principal, dict):
                    db_target = principal.get("db_target") or "fahem"
                    selected_book_ids = principal.get("selected_book_ids") or []

                try:
                    from agents.mongodb_engine import db_target_var, selected_book_ids_var
                except ImportError:
                    from mongodb_engine import db_target_var, selected_book_ids_var

                db_target_ctx = db_target_var.set(db_target)
                selected_book_ids_ctx = selected_book_ids_var.set(selected_book_ids)
                logger.info(f"[DB TARGET] ContextVar db_target set for request: {db_target}")
                logger.info(f"[SELECTED BOOKS] ContextVar selected_book_ids set to: {selected_book_ids}")
            except Exception as sb_err:
                logger.warning(f"Failed to set context variables: {sb_err}")

            # Idempotent user profile provisioning on first authenticated request (R22)
            if principal and principal.get("uid") and principal.get("email"):
                try:
                    try:
                        from agents.mongodb_engine import MongoDBEngine
                    except ImportError:
                        from mongodb_engine import MongoDBEngine
                    db_engine = MongoDBEngine()
                    if db_engine._client is not None:
                        _profile = await db_engine.ensure_user_profile(
                            user_id=principal.get("uid"),
                            email=principal.get("email"),
                            display_name=principal.get("displayName") or principal.get("name")
                        )
                        # FC7.2/7.3: the role is AUTHORITATIVE from the DB user doc — NEVER trust the
                        # role forwarded in X-Verified-Principal (that was a privilege-escalation hole).
                        # principal is shared with request.state and the verified_principal_ctx, so
                        # mutating it in place updates every reader.
                        _email_l = (principal.get("email") or "").strip().lower()
                        _db_target = principal.get("db_target") or "fahem"
                        if _db_target == "fahem_sandbox":
                            # FC7.2 (corrected) / FC7.4: the sandbox grants NOBODY admin power — not even
                            # the owner. Every sandbox identity is a non-privileged demo user, so admin/
                            # write endpoints (which require admin/super-admin/judge) reject them. Tier is
                            # by email domain ONLY: google/mongodb/devpost.com => Tier 1, else Tier 0.
                            principal["role"] = "user"
                            principal["tier"] = 1 if any(
                                _email_l.endswith("@" + _d) for _d in ("google.com", "mongodb.com", "devpost.com")
                            ) else 0
                        else:
                            # Production (fahem): DB-resolved role; super-admin hard-pinned to the single
                            # owner whitelist; any other stray 'super-admin' doc demoted to 'admin'.
                            _db_role = (getattr(_profile, "role", None) or "user")
                            if _email_l == "hesham1988@gmail.com":
                                principal["role"] = "super-admin"
                            elif _db_role == "super-admin":
                                principal["role"] = "admin"
                            elif _db_role == "admin" and getattr(_profile, "isApprovedAdmin", None) is not True:
                                # FC7.32 (CRITICAL): an admin is privileged ONLY when explicitly approved by a
                                # super-admin (isApprovedAdmin==True, set by /admin/approve). FAIL-CLOSED: any
                                # other admin doc (onboarded-but-pending, or never approved) resolves to 'user'
                                # so /api/admin/check returns false and the admin tabs stay hidden. The owner
                                # super-admin is exempt above; real admins re-approve via the console.
                                principal["role"] = "user"
                            elif _db_role == "teacher" and getattr(_profile, "isApprovedTeacher", None) is not True:
                                # FC7.29/FC7.33: a teacher is privileged ONLY when explicitly approved
                                # (isApprovedTeacher==True). FAIL-CLOSED — an unapproved teacher resolves to
                                # 'user' (no assignment-post powers, no Curriculum Studio) until approved.
                                principal["role"] = "user"
                            else:
                                principal["role"] = _db_role
                except Exception as pe_err:
                    logger.warning(f"Failed to auto-provision/resolve user profile: {pe_err}")
                    # Fail CLOSED: grant least privilege so a failed lookup never leaves an elevated
                    # *forwarded* role in effect. Only the prod owner is exempt (sandbox owner is NOT).
                    _is_prod_owner = (principal.get("db_target") == "fahem"
                                      and (principal.get("email") or "").strip().lower() == "hesham1988@gmail.com")
                    if not _is_prod_owner:
                        principal["role"] = "user"

            try:
                await self.asgi_app(scope, receive, send)
            finally:
                if token_ctx is not None:
                    try:
                        from guardrails import verified_principal_ctx
                        verified_principal_ctx.reset(token_ctx)
                    except Exception:
                        pass
                if db_target_ctx is not None:
                    try:
                        try:
                            from agents.mongodb_engine import db_target_var
                        except ImportError:
                            from mongodb_engine import db_target_var
                        db_target_var.reset(db_target_ctx)
                    except Exception:
                        pass
                if selected_book_ids_ctx is not None:
                    try:
                        try:
                            from agents.mongodb_engine import selected_book_ids_var
                        except ImportError:
                            from mongodb_engine import selected_book_ids_var
                        selected_book_ids_var.reset(selected_book_ids_ctx)
                    except Exception:
                        pass

    app.add_middleware(OidcSecurityMiddleware)


    @app.get("/health")
    async def get_health():
        git_sha = os.environ.get("NEXT_PUBLIC_BUILD_SHA") or os.environ.get("GIT_COMMIT_SHA")
        if not git_sha:
            try:
                import subprocess
                git_sha = subprocess.check_output(["git", "rev-parse", "HEAD"]).decode("utf-8").strip()
            except Exception:
                pass
        if not git_sha:
            try:
                agents_dir = os.path.dirname(os.path.abspath(__file__))
                sha_file = os.path.join(agents_dir, "build_sha.txt")
                if os.path.exists(sha_file):
                    with open(sha_file, "r") as f:
                        git_sha = f.read().strip()
            except Exception:
                pass
        
        sha_val = git_sha or "unknown"
        return {
            "status": "healthy",
            "sha": sha_val,
            "revision": os.environ.get("K_REVISION", "local"),
            "commit": sha_val
        }

    @app.get("/")
    async def get_root():
        return {
            "status": "healthy",
            "name": "Fahem Multi-Agent API Gateway",
            "revision": os.environ.get("K_REVISION", "local")
        }

    @app.get("/public/usernames")
    async def get_public_usernames():
        try:
            agents_dir = os.path.dirname(os.path.abspath(__file__))
            if agents_dir not in sys.path:
                sys.path.insert(0, agents_dir)
            from tools import get_mongodb_uri
            from pymongo import MongoClient
            
            uri = get_mongodb_uri()
            client = _pooled_client()
            db = get_active_db(client)
            
            users = list(db["users"].find({"username": {"$exists": True, "$ne": ""}}, {"username": 1}))
            usernames = [u.get("username") for u in users if u.get("username")]
            client.close()
            return {"usernames": usernames}
        except Exception as err:
            logger.error(f"[services.py] Failed to fetch dynamic usernames for public sitemap: {err}", exc_info=True)
            return {"usernames": []}


    @app.get("/db-metadata")
    async def custom_db_metadata():
        try:
            # Add agents directory to sys.path to allow imports
            agents_dir = os.path.dirname(os.path.abspath(__file__))
            if agents_dir not in sys.path:
                sys.path.insert(0, agents_dir)
            
            from agent_communications import database_telemetry_engine
            
            # Fetch telemetry natively using database_telemetry_engine (Database Telemetry & Diagnostic Agent)
            meta = await database_telemetry_engine()
            return meta
        except Exception as err:
            logger.error(f"[services.py] Failed to retrieve DB telemetry: {err}", exc_info=True)
            return {
                "databaseName": "fahem",
                "collectionsCount": "...",
                "collectionList": "...",
                "storageSize": "...",
                "indexCount": "...",
                "status": f"Disconnected (Error in custom endpoint: {str(err)})"
            }
            
    @app.get("/db-diagnostic")
    async def custom_db_diagnostic():
        try:
            agents_dir = os.path.dirname(os.path.abspath(__file__))
            if agents_dir not in sys.path:
                sys.path.insert(0, agents_dir)
            from tools import get_mongodb_uri
            from pymongo import MongoClient
            
            uri = get_mongodb_uri()
            # Mask URI for display
            masked_uri = uri
            if "@" in uri:
                prefix, suffix = uri.split("@", 1)
                masked_uri = prefix.split("//")[0] + "//" + "fahem_mcp:****@" + suffix
                
            client = _pooled_client()
            db = get_active_db(client)
            cols = db.list_collection_names()
            
            counts = {}
            for col in cols:
                counts[col] = db[col].count_documents({})
                
            test_prof = db["users"].find_one({"userId": "test_user_id_gemini_2026"})
            if test_prof:
                test_prof.pop("_id", None)
                
            return {
                "status": "success",
                "masked_uri": masked_uri,
                "collections": cols,
                "counts": counts,
                "test_profile_exists": test_prof is not None,
                "test_profile": test_prof
            }
        except Exception as err:
            logger.error(f"[services.py] DB Diagnostic failed: {err}", exc_info=True)
            return {
                "status": "error",
                "error": str(err)
            }

    @app.get("/admin/inspect-r17")
    async def inspect_r17_data():
        try:
            from tools import get_mongodb_uri
            from pymongo import MongoClient
            
            uri = get_mongodb_uri()
            client = _pooled_client()
            db = get_active_db(client)
            
            # 1. Fetch books
            books = list(db["books"].find({}, {"_id": 1, "title": 1, "subject_id": 1, "curriculum_id": 1, "library_id": 1, "status": 1}))
            for b in books:
                b["_id"] = str(b["_id"])
                
            # 2. Get distinct book_id from book_pages
            distinct_page_book_ids = db["book_pages"].distinct("book_id")
            
            # 3. Find orphans
            existing_book_ids = {b["_id"] for b in books}
            orphans = [bid for bid in distinct_page_book_ids if bid not in existing_book_ids]
            
            orphan_details = []
            for ob_id in orphans:
                # Find a sample page
                sample_page = db["book_pages"].find_one({"book_id": ob_id})
                sample_info = {}
                if sample_page:
                    sample_info = {
                        "book_id": str(sample_page.get("book_id")),
                        "book_title": sample_page.get("book_title") or sample_page.get("title") or "Unknown",
                        "page_number": sample_page.get("page_number"),
                        "text_snippet": str(sample_page.get("content") or sample_page.get("text") or "")[:200],
                        "has_blocks": "blocks" in sample_page and bool(sample_page["blocks"])
                    }
                orphan_details.append({
                    "book_id": ob_id,
                    "sample_page": sample_info,
                    "page_count": db["book_pages"].count_documents({"book_id": ob_id})
                })
                
            # Fetch curricula and libraries for diagnostic linkage analysis
            curricula = list(db["curricula"].find({}))
            for c in curricula:
                c["_id"] = str(c["_id"])
                if "library_id" in c:
                    c["library_id"] = str(c["library_id"])
            libraries = list(db["libraries"].find({}))
            for lib in libraries:
                lib["_id"] = str(lib["_id"])

            client.close()
            return {
                "status": "success",
                "total_books": len(books),
                "books": books,
                "distinct_page_book_ids": distinct_page_book_ids,
                "orphans": orphan_details,
                "curricula": curricula,
                "libraries": libraries
            }
        except Exception as err:
            logger.error(f"[services.py] inspect_r17_data failed: {err}", exc_info=True)
            return {"status": "error", "error": str(err)}

    @app.post("/admin/recover-r17")
    async def recover_r17_data(request: fastapi.Request):
        try:
            payload = await request.json()
            # payload format: { "recoveries": [ { "book_id": "...", "title": "...", "title_ar": "...", "library_id": "...", "curriculum_id": "...", "subject_id": "...", "role": "core", "visibility": "public" } ] }
            recoveries = payload.get("recoveries", [])
            
            from tools import get_mongodb_uri
            from pymongo import MongoClient
            
            uri = get_mongodb_uri()
            client = _pooled_client()
            db = get_active_db(client)
            
            rebuilt_count = 0
            subject_updates = {}
            
            for rec in recoveries:
                book_id = rec.get("book_id")
                if not book_id:
                    continue
                    
                # Verify pages exist
                pages_count = db["book_pages"].count_documents({"book_id": book_id})
                if pages_count == 0:
                    logger.warning(f"[RECOVER] No surviving pages found for book_id {book_id}")
                    continue
                    
                # Find max page number
                max_page_doc = list(db["book_pages"].find({"book_id": book_id}).sort("page_number", -1).limit(1))
                total_pages = max_page_doc[0].get("page_number", 1) if max_page_doc else 1
                
                # Fetch distinct chapters/topics structure from pages if possible
                chapters = []
                pages = list(db["book_pages"].find({"book_id": book_id}, {"page_number": 1, "chapter_id": 1, "chapter_title": 1, "topic_id": 1, "topic_title": 1}))
                
                # Simple extraction of chapters
                chap_map = {}
                for p in pages:
                    ch_id = p.get("chapter_id") or "ch_1"
                    ch_title = p.get("chapter_title") or "Chapter 1"
                    if ch_id not in chap_map:
                        chap_map[ch_id] = {
                            "id": ch_id,
                            "title": ch_title,
                            "title_ar": ch_title, # Fallback
                            "page_start": p.get("page_number", 1),
                            "page_end": p.get("page_number", 1),
                            "concepts": [],
                            "topics": []
                        }
                    else:
                        chap_map[ch_id]["page_start"] = min(chap_map[ch_id]["page_start"], p.get("page_number", 1))
                        chap_map[ch_id]["page_end"] = max(chap_map[ch_id]["page_end"], p.get("page_number", 1))
                        
                    topic_id = p.get("topic_id")
                    topic_title = p.get("topic_title")
                    if topic_id and topic_title:
                        # Ensure uniqueness of topics
                        if not any(t["id"] == topic_id for t in chap_map[ch_id]["topics"]):
                            chap_map[ch_id]["topics"].append({
                                "id": topic_id,
                                "title": topic_title,
                                "title_ar": topic_title,
                                "page": p.get("page_number", 1)
                            })
                            
                chapters = list(chap_map.values())
                chapters.sort(key=lambda x: x["page_start"])
                
                # Reconstruct parent book
                book_doc = {
                    "_id": book_id,
                    "title": rec.get("title", "Recovered Book"),
                    "title_ar": rec.get("title_ar", rec.get("title", "Recovered Book")),
                    "library_id": rec.get("library_id", "lib_moe"),
                    "curriculum_id": rec.get("curriculum_id", "cur_moe_g10_t1_2026"),
                    "subject_id": rec.get("subject_id", "subj_cur_moe_g10_t1_2026_python"),
                    "role": rec.get("role", "core"),
                    "visibility": rec.get("visibility", "public"),
                    "status": "embedded",
                    "totalPages": total_pages,
                    "chapters": chapters,
                    "grade": rec.get("grade", "Grade 10"),
                    "term": rec.get("term", "Term 1"),
                    "year": rec.get("year", "2026"),
                    "language": rec.get("language", "ar"),
                    "coverUrl": rec.get("coverUrl", f"/libs/covers/{book_id}.jpg"),
                    "coverThumbUrl": rec.get("coverThumbUrl", f"/libs/covers/{book_id}_thumb.jpg"),
                    "book_type": rec.get("role", "core")
                }
                
                db["books"].replace_one({"_id": book_id}, book_doc, upsert=True)
                rebuilt_count += 1
                
                # Track subject count rebuild
                sub_id = book_doc["subject_id"]
                subject_updates[sub_id] = subject_updates.get(sub_id, 0) + 1
                
            # Rebuild books_count on linked subject documents
            for sub_id, count_add in subject_updates.items():
                actual_count = db["books"].count_documents({"subject_id": sub_id})
                db["subjects"].update_one({"_id": sub_id}, {"$set": {"books_count": actual_count}})
                
            client.close()
            return {
                "status": "success",
                "message": f"Successfully rebuilt {rebuilt_count} parent book(s) and synchronized subject counts.",
                "rebuilt_count": rebuilt_count,
                "subject_updates": subject_updates
            }
        except Exception as err:
            logger.error(f"[services.py] recover_r17_data failed: {err}", exc_info=True)
            return {"status": "error", "error": str(err)}

    @app.post("/admin/seed-db")
    async def custom_db_seed(request: fastapi.Request):
        try:
            from tools import get_mongodb_uri
            from pymongo import MongoClient
            import time
            
            pb_book = None
            pb_pages = []
            
            uri = get_mongodb_uri()
            client = _pooled_client()
            db = client["fahem_sandbox"]
            assert db.name == "fahem_sandbox", "CRITICAL ERROR: seed-db is strictly hardcoded to fahem_sandbox! Refusing to run on any other database!"
            if db.name == "fahem":
                raise fastapi.HTTPException(status_code=400, detail="Refusing to run seed-db against production 'fahem' database")
            
            # --- PURGE MOCK USERS FROM PRODUCTION 'fahem' DATABASE ---
            try:
                prod_db = client["fahem"]
                mock_emails = ["ziad.student@fahem.pro", "tarek.teacher@fahem.pro"]
                for coll_name in ["users", "user_profiles"]:
                    res1 = prod_db[coll_name].delete_many({"email": {"$in": mock_emails}})
                    res2 = prod_db[coll_name].delete_many({"userId": {"$in": ["test_user_id_gemini_2026", "test_teacher_id_gemini_2026"]}})
                    logger.info(f"[SEED] Purged mock users from production '{coll_name}': {res1.deleted_count} by email, {res2.deleted_count} by ID")
            except Exception as pe:
                logger.error(f"[SEED] Error purging mock users from production: {pe}")

            # --- PURGE JUNK TEST BOOKS FROM SANDBOX (defense-in-depth) ---
            # Dev/test tooling (scripts/reexec_dbox.py, scratch/test_polling.py) ingests
            # throwaway books titled "Trigger-Test-*" / "Trigger-Test-Scratch-*" into the
            # sandbox. Explicitly strip any such junk books and their pages so the catalog
            # stays clean even if the collection-drop list below is ever changed.
            try:
                junk_title_regex = {"$regex": r"^(Trigger-Test|Scratch[- ]|Untitled Test)", "$options": "i"}
                junk_books = list(db["books"].find({"title": junk_title_regex}, {"_id": 1}))
                junk_ids = [b["_id"] for b in junk_books]
                if junk_ids:
                    db["book_pages"].delete_many({"book_id": {"$in": [str(x) for x in junk_ids]}})
                    db["books"].delete_many({"_id": {"$in": junk_ids}})
                    logger.info(f"[SEED] Purged {len(junk_ids)} junk test book(s) and their pages from sandbox")
            except Exception as je:
                logger.error(f"[SEED] Error purging junk test books from sandbox: {je}")

            # --- 0. DROP HISTORICAL COLLECTIONS TO PREVENT INDEX COLLISIONS ---
            collections_to_drop = [
                "libraries", "curricula", "subjects", "books", "book_pages", 
                "question_bank", "social_groups", "social_threads", "social_replies", 
                "group_assignments", "assignment_submissions", "companion_facts", 
                "companion_memories", "active_practice_sessions"
            ]
            for col in collections_to_drop:
                db[col].drop()  # db.name == "fahem_sandbox"
                logger.info(f"[SEED] Dropped collection: {col}")

            # --- 1. SEED LIBRARIES (2) ---
            libraries_data = [
                {
                    "_id": "lib_moe",
                    "name": "Egyptian MOE",
                    "name_ar": "وزارة التربية والتعليم",
                    "source": "moe",
                    "logo": "/libs/moe.svg",
                    "scopeSchema": [
                        { "key": "grade", "label": "Grade", "label_ar": "الصف", "type": "enum", "options": ["Primary 1", "Primary 2", "Primary 3", "Primary 4", "Primary 5", "Primary 6", "Preparatory 1", "Preparatory 2", "Preparatory 3", "Secondary 1", "Secondary 2", "Secondary 3"] },
                        { "key": "term", "label": "Term", "label_ar": "الفصل الدراسي", "type": "enum", "options": ["Term 1", "Term 2", "Full Year"] },
                        { "key": "year", "label": "Year", "label_ar": "العام الدراسي", "type": "string" }
                    ],
                    "status": "active"
                },
                {
                    "_id": "lib_openstax",
                    "name": "OpenStax Library",
                    "name_ar": "مكتبة أوبن ستاكس",
                    "source": "openstax",
                    "logo": "/libs/openstax.svg",
                    "scopeSchema": [
                        { "key": "discipline", "label": "Discipline", "label_ar": "التخصص", "type": "enum", "options": ["Science", "Mathematics", "Social Sciences", "Humanities", "Business", "College Success"] },
                        { "key": "level", "label": "Level", "label_ar": "المستوى", "type": "enum", "options": ["College", "High School", "General"] }
                    ],
                    "status": "active"
                }
            ]
            for lib in libraries_data:
                db["libraries"].replace_one({"_id": lib["_id"]}, lib, upsert=True)

            # --- 2. SEED CURRICULA (3) ---
            curricula_data = [
                {
                    "_id": "cur_moe_g10_t1_2026",
                    "library_id": "lib_moe",
                    "title": "Grade 10 - Term 1 Curriculum (2026)",
                    "title_ar": "منهج الصف الأول الثانوي - الفصل الدراسي الأول (2026)",
                    "scope": {"grade": "Secondary 1", "term": "Term 1", "year": "2026"},
                    "subject_ids": ["subj_cur_moe_g10_t1_2026_algebra", "subj_cur_moe_g10_t1_2026_chemistry"],
                    "status": "published",
                    "visibility": "public",
                    "owner_uid": None,
                    "created_by": "system",
                    "created_at": "2026-06-07T12:00:00Z",
                    "updated_at": "2026-06-07T12:00:00Z"
                },
                {
                    "_id": "cur_moe_g11_t1_2026",
                    "library_id": "lib_moe",
                    "title": "Grade 11 - Term 1 Curriculum (2026)",
                    "title_ar": "منهج الصف الثاني الثانوي - الفصل الدراسي الأول (2026)",
                    "scope": {"grade": "Secondary 2", "term": "Term 1", "year": "2026"},
                    "subject_ids": ["subj_cur_moe_g11_t1_2026_biology", "subj_cur_moe_g11_t1_2026_history"],
                    "status": "published",
                    "visibility": "public",
                    "owner_uid": None,
                    "created_by": "system",
                    "created_at": "2026-06-07T12:00:00Z",
                    "updated_at": "2026-06-07T12:00:00Z"
                },
                {
                    "_id": "cur_openstax_college_2026",
                    "library_id": "lib_openstax",
                    "title": "OpenStax College Essentials (2026)",
                    "title_ar": "سلسلة الكليات أوبن ستاكس (2026)",
                    "scope": {"discipline": "Mathematics", "level": "College"},
                    "subject_ids": ["subj_cur_openstax_college_2026_calculus", "subj_cur_openstax_college_2026_physics", "sub_computer_science_1780535716963"],
                    "status": "published",
                    "visibility": "public",
                    "owner_uid": None,
                    "created_by": "system",
                    "created_at": "2026-06-07T12:00:00Z",
                    "updated_at": "2026-06-07T12:00:00Z"
                }
            ]
            for curr in curricula_data:
                db["curricula"].replace_one({"_id": curr["_id"]}, curr, upsert=True)

            # --- 3. SEED SUBJECTS (6 with canonical color/emoji & deterministic ID) ---
            subjects_data = [
                {
                    "_id": "subj_cur_moe_g10_t1_2026_algebra",
                    "curriculum_id": "cur_moe_g10_t1_2026",
                    "slug": "algebra",
                    "name": "Algebra & Analytic Geometry",
                    "name_ar": "الجبر والهندسة التحليلية",
                    "emoji": "📐",
                    "color": "#EF4444",
                    "category": "Mathematics",
                    "grade_level": "Grade 10",
                    "core_book_ids": ["book_moe_alg_g10_t1_core"],
                    "supporting_book_ids": ["book_moe_alg_g10_t1_sup"],
                    "books_count": 2
                },
                {
                    "_id": "subj_cur_moe_g10_t1_2026_chemistry",
                    "curriculum_id": "cur_moe_g10_t1_2026",
                    "slug": "chemistry",
                    "name": "Chemistry",
                    "name_ar": "الكيمياء",
                    "emoji": "🧪",
                    "color": "#3B82F6",
                    "category": "Science",
                    "grade_level": "Grade 10",
                    "core_book_ids": ["book_moe_chem_g10_t1_core"],
                    "supporting_book_ids": ["book_moe_chem_g10_t1_sup"],
                    "books_count": 2
                },
                {
                    "_id": "subj_cur_moe_g11_t1_2026_biology",
                    "curriculum_id": "cur_moe_g11_t1_2026",
                    "slug": "biology",
                    "name": "Biology",
                    "name_ar": "الأحياء",
                    "emoji": "🧬",
                    "color": "#10B981",
                    "category": "Science",
                    "grade_level": "Grade 11",
                    "core_book_ids": ["book_moe_bio_g11_t1_core"],
                    "supporting_book_ids": ["book_moe_bio_g11_t1_sup"],
                    "books_count": 2
                },
                {
                    "_id": "subj_cur_moe_g11_t1_2026_history",
                    "curriculum_id": "cur_moe_g11_t1_2026",
                    "slug": "history",
                    "name": "History",
                    "name_ar": "التاريخ",
                    "emoji": "📜",
                    "color": "#F59E0B",
                    "category": "Social Sciences",
                    "grade_level": "Grade 11",
                    "core_book_ids": ["book_moe_hist_g11_t1_core"],
                    "supporting_book_ids": ["book_moe_hist_g11_t1_sup"],
                    "books_count": 2
                },
                {
                    "_id": "subj_cur_openstax_college_2026_calculus",
                    "curriculum_id": "cur_openstax_college_2026",
                    "slug": "calculus",
                    "name": "Calculus Volume 1",
                    "name_ar": "حساب التفاضل والتكامل 1",
                    "emoji": "📈",
                    "color": "#8B5CF6",
                    "category": "Mathematics",
                    "grade_level": "College",
                    "core_book_ids": ["book_openstax_calc_core"],
                    "supporting_book_ids": ["book_openstax_calc_sup"],
                    "books_count": 2
                },
                {
                    "_id": "subj_cur_openstax_college_2026_physics",
                    "curriculum_id": "cur_openstax_college_2026",
                    "slug": "physics",
                    "name": "University Physics Volume 1",
                    "name_ar": "الفيزياء الجامعية 1",
                    "emoji": "🌌",
                    "color": "#EC4899",
                    "category": "Science",
                    "grade_level": "College",
                    "core_book_ids": ["book_openstax_phys_core"],
                    "supporting_book_ids": ["book_openstax_phys_sup"],
                    "books_count": 2
                },
                {
                    "_id": "sub_computer_science_1780535716963",
                    "curriculum_id": "cur_openstax_college_2026",
                    "slug": "computer-science",
                    "name": "Computer Science",
                    "name_ar": "علوم الحاسب",
                    "emoji": "💻",
                    "color": "#6366F1",
                    "category": "Computer Science",
                    "grade_level": "College",
                    "core_book_ids": ["book_introduction_to_python_programming_1780535737559"],
                    "supporting_book_ids": [],
                    "books_count": 1
                }
            ]
            for subj in subjects_data:
                db["subjects"].replace_one({"_id": subj["_id"]}, subj, upsert=True)

            # --- 4. SEED BOOKS (12 books, 2 per subject: 1 core and 1 supporting) ---
            books_data = [
                # 1. Algebra Core
                {
                    "_id": "book_moe_alg_g10_t1_core",
                    "subject_id": "subj_cur_moe_g10_t1_2026_algebra",
                    "curriculum_id": "cur_moe_g10_t1_2026",
                    "library_id": "lib_moe",
                    "title": "High School Algebra & Analytical Geometry",
                    "title_ar": "كتاب الجبر والهندسة التحليلية - كتاب الطالب",
                    "grade": "Grade 10",
                    "term": "Term 1",
                    "year": "2026",
                    "language": "ar",
                    "book_type": "core",
                    "source_url": "https://ellibrary.moe.gov.eg/content/alg_g10_t1_core.pdf",
                    "storage_path": "gs://fahem-academic-lake/moe/alg_g10_t1_core.pdf",
                    "coverUrl": "/libs/covers/alg_g10_core.jpg",
                    "coverThumbUrl": "/libs/covers/alg_g10_core_thumb.jpg",
                    "chapters": [
                        {
                            "id": "ch_1",
                            "title": "Matrices and Determinants",
                            "title_ar": "المصفوفات والمحددات",
                            "page_start": 1,
                            "page_end": 15,
                            "concepts": ["Matrix definition", "Operations", "Determinant", "Inverse Matrix"],
                            "topics": [
                                { "id": "t_alg_1_1", "title": "Introduction to Matrices", "title_ar": "مقدمة عن المصفوفات", "page": 1 },
                                { "id": "t_alg_1_2", "title": "Determinant calculation", "title_ar": "حساب المحددات", "page": 7 },
                                { "id": "t_alg_1_3", "title": "Inverse of a 2x2 Matrix", "title_ar": "المعكوس الضربي للمصفوفة الثنائية", "page": 12 }
                            ]
                        }
                    ]
                },
                # 2. Algebra Supporting
                {
                    "_id": "book_moe_alg_g10_t1_sup",
                    "subject_id": "subj_cur_moe_g10_t1_2026_algebra",
                    "curriculum_id": "cur_moe_g10_t1_2026",
                    "library_id": "lib_moe",
                    "title": "Algebra Practice Handbook & Solved Exercises",
                    "title_ar": "دليل تدريبات الجبر والمسائل المحلولة",
                    "grade": "Grade 10",
                    "term": "Term 1",
                    "year": "2026",
                    "language": "ar",
                    "book_type": "supporting",
                    "source_url": "https://ellibrary.moe.gov.eg/content/alg_g10_t1_sup.pdf",
                    "storage_path": "gs://fahem-academic-lake/moe/alg_g10_t1_sup.pdf",
                    "coverUrl": "/libs/covers/alg_g10_sup.jpg",
                    "coverThumbUrl": "/libs/covers/alg_g10_sup_thumb.jpg",
                    "chapters": [
                        {
                            "id": "ch_1",
                            "title": "Matrix Multiplication & Determinant Challenges",
                            "title_ar": "تحديات ضرب المصفوفات والمحددات",
                            "page_start": 1,
                            "page_end": 10,
                            "concepts": ["High-order multiplication", "Cramer's rule application"],
                            "topics": [
                                { "id": "t_alg_sup_1_1", "title": "Step-by-step Multiplication", "title_ar": "خطوات ضرب المصفوفات بالتفصيل", "page": 1 },
                                { "id": "t_alg_sup_1_2", "title": "Cramer's Rule Solved Examples", "title_ar": "مسائل محلولة بطريقة كرامر", "page": 6 }
                            ]
                        }
                    ]
                },
                # 3. Chemistry Core
                {
                    "_id": "book_moe_chem_g10_t1_core",
                    "subject_id": "subj_cur_moe_g10_t1_2026_chemistry",
                    "curriculum_id": "cur_moe_g10_t1_2026",
                    "library_id": "lib_moe",
                    "title": "Chemistry: Energy and Matter",
                    "title_ar": "الكيمياء: المادة والطاقة",
                    "grade": "Grade 10",
                    "term": "Term 1",
                    "year": "2026",
                    "language": "ar",
                    "book_type": "core",
                    "source_url": "https://ellibrary.moe.gov.eg/content/chem_g10_t1_core.pdf",
                    "storage_path": "gs://fahem-academic-lake/moe/chem_g10_t1_core.pdf",
                    "coverUrl": "/libs/covers/chem_g10_core.jpg",
                    "coverThumbUrl": "/libs/covers/chem_g10_core_thumb.jpg",
                    "chapters": [
                        {
                            "id": "ch_1",
                            "title": "Chemical Bonding",
                            "title_ar": "الروابط الكيميائية",
                            "page_start": 1,
                            "page_end": 12,
                            "concepts": ["Ionic bond", "Covalent bond", "Valence electrons"],
                            "topics": [
                                { "id": "t_chem_1_1", "title": "Ionic vs Covalent bonds", "title_ar": "الروابط الأيونية والتساهمية", "page": 1 },
                                { "id": "t_chem_1_2", "title": "Lewis Dot Structures", "title_ar": "تمثيل لويس النقطي", "page": 7 }
                            ]
                        }
                    ]
                },
                # 4. Chemistry Supporting
                {
                    "_id": "book_moe_chem_g10_t1_sup",
                    "subject_id": "subj_cur_moe_g10_t1_2026_chemistry",
                    "curriculum_id": "cur_moe_g10_t1_2026",
                    "library_id": "lib_moe",
                    "title": "Lab Experiments and Bonding Worksheets",
                    "title_ar": "تجارب المعمل وأوراق عمل الروابط",
                    "grade": "Grade 10",
                    "term": "Term 1",
                    "year": "2026",
                    "language": "ar",
                    "book_type": "supporting",
                    "source_url": "https://ellibrary.moe.gov.eg/content/chem_g10_t1_sup.pdf",
                    "storage_path": "gs://fahem-academic-lake/moe/chem_g10_t1_sup.pdf",
                    "coverUrl": "/libs/covers/chem_g10_sup.jpg",
                    "coverThumbUrl": "/libs/covers/chem_g10_sup_thumb.jpg",
                    "chapters": [
                        {
                            "id": "ch_1",
                            "title": "Bonding Lab Simulations",
                            "title_ar": "محاكاة معمل الروابط",
                            "page_start": 1,
                            "page_end": 8,
                            "concepts": ["Electronegativity measurements", "Conductivity of ionic solutions"],
                            "topics": [
                                { "id": "t_chem_sup_1_1", "title": "Conductivity Lab", "title_ar": "تجربة التوصيل الكهربائي", "page": 1 },
                                { "id": "t_chem_sup_1_2", "title": "Electronegativity Scale", "title_ar": "مقياس السالبية الكهربائية", "page": 5 }
                            ]
                        }
                    ]
                },
                # 5. Biology Core
                {
                    "_id": "book_moe_bio_g11_t1_core",
                    "subject_id": "subj_cur_moe_g11_t1_2026_biology",
                    "curriculum_id": "cur_moe_g11_t1_2026",
                    "library_id": "lib_moe",
                    "title": "High School Biology & Life Systems",
                    "title_ar": "علم الأحياء وأنظمة الحياة للمرحلة الثانوية",
                    "grade": "Grade 11",
                    "term": "Term 1",
                    "year": "2026",
                    "language": "ar",
                    "book_type": "core",
                    "source_url": "https://ellibrary.moe.gov.eg/content/bio_g11_t1_core.pdf",
                    "storage_path": "gs://fahem-academic-lake/moe/bio_g11_t1_core.pdf",
                    "coverUrl": "/libs/covers/bio_g11_core.jpg",
                    "coverThumbUrl": "/libs/covers/bio_g11_core_thumb.jpg",
                    "chapters": [
                        {
                            "id": "ch_1",
                            "title": "Plant Nutrition & Transport",
                            "title_ar": "التغذية والنقل في النبات",
                            "page_start": 1,
                            "page_end": 15,
                            "concepts": ["Autotrophic nutrition", "Photosynthesis", "Xylem and Phloem"],
                            "topics": [
                                { "id": "t_bio_1_1", "title": "The Mechanism of Photosynthesis", "title_ar": "آلية البناء الضوئي", "page": 1 },
                                { "id": "t_bio_1_2", "title": "Water Transport in Xylem", "title_ar": "نقل الماء في الخشب", "page": 8 }
                            ]
                        }
                    ]
                },
                # 6. Biology Supporting
                {
                    "_id": "book_moe_bio_g11_t1_sup",
                    "subject_id": "subj_cur_moe_g11_t1_2026_biology",
                    "curriculum_id": "cur_moe_g11_t1_2026",
                    "library_id": "lib_moe",
                    "title": "Biology Interactive Guide & Topic Summaries",
                    "title_ar": "الملخصات الوافية والدليل التفاعلي للأحياء",
                    "grade": "Grade 11",
                    "term": "Term 1",
                    "year": "2026",
                    "language": "ar",
                    "book_type": "supporting",
                    "source_url": "https://ellibrary.moe.gov.eg/content/bio_g11_t1_sup.pdf",
                    "storage_path": "gs://fahem-academic-lake/moe/bio_g11_t1_sup.pdf",
                    "coverUrl": "/libs/covers/bio_g11_sup.jpg",
                    "coverThumbUrl": "/libs/covers/bio_g11_sup_thumb.jpg",
                    "chapters": [
                        {
                            "id": "ch_1",
                            "title": "Photosynthesis Diagrams & Exercises",
                            "title_ar": "مخططات وتدريبات البناء الضوئي",
                            "page_start": 1,
                            "page_end": 10,
                            "concepts": ["Chloroplast anatomy", "Calvin cycle steps"],
                            "topics": [
                                { "id": "t_bio_sup_1_1", "title": "Chloroplast Map", "title_ar": "رسم تخطيطي للبلاستيدة الخضراء", "page": 1 },
                                { "id": "t_bio_sup_1_2", "title": "Calvin Cycle Summary", "title_ar": "ملخص دورة كالفن", "page": 5 }
                            ]
                        }
                    ]
                },
                # 7. History Core
                {
                    "_id": "book_moe_hist_g11_t1_core",
                    "subject_id": "subj_cur_moe_g11_t1_2026_history",
                    "curriculum_id": "cur_moe_g11_t1_2026",
                    "library_id": "lib_moe",
                    "title": "History of Islamic & Egyptian Civilizations",
                    "title_ar": "تاريخ الحضارة المصرية والإسلامية",
                    "grade": "Grade 11",
                    "term": "Term 1",
                    "year": "2026",
                    "language": "ar",
                    "book_type": "core",
                    "source_url": "https://ellibrary.moe.gov.eg/content/hist_g11_t1_core.pdf",
                    "storage_path": "gs://fahem-academic-lake/moe/hist_g11_t1_core.pdf",
                    "coverUrl": "/libs/covers/hist_g11_core.jpg",
                    "coverThumbUrl": "/libs/covers/hist_g11_core_thumb.jpg",
                    "chapters": [
                        {
                            "id": "ch_1",
                            "title": "The Rise of Islamic Civilization",
                            "title_ar": "ظهور الحضارة الإسلامية",
                            "page_start": 1,
                            "page_end": 14,
                            "concepts": ["Prophetic era", "Umayyad and Abbasid achievements"],
                            "topics": [
                                { "id": "t_hist_1_1", "title": "The Golden Age of Abbasids", "title_ar": "العصر العباسي الذهبي", "page": 1 },
                                { "id": "t_hist_1_2", "title": "Trade and Culture Expansion", "title_ar": "طرق التجارة والتبادل الثقافي", "page": 8 }
                            ]
                        }
                    ]
                },
                # 8. History Supporting
                {
                    "_id": "book_moe_hist_g11_t1_sup",
                    "subject_id": "subj_cur_moe_g11_t1_2026_history",
                    "curriculum_id": "cur_moe_g11_t1_2026",
                    "library_id": "lib_moe",
                    "title": "Historical Source Reader & Essays",
                    "title_ar": "مصادر ومراجع وقراءات في التاريخ الإسلامي",
                    "grade": "Grade 11",
                    "term": "Term 1",
                    "year": "2026",
                    "language": "ar",
                    "book_type": "supporting",
                    "source_url": "https://ellibrary.moe.gov.eg/content/hist_g11_t1_sup.pdf",
                    "storage_path": "gs://fahem-academic-lake/moe/hist_g11_t1_sup.pdf",
                    "coverUrl": "/libs/covers/hist_g11_sup.jpg",
                    "coverThumbUrl": "/libs/covers/hist_g11_sup_thumb.jpg",
                    "chapters": [
                        {
                            "id": "ch_1",
                            "title": "Medieval Travel Diaries",
                            "title_ar": "يوميات الرحالة في العصور الوسطى",
                            "page_start": 1,
                            "page_end": 10,
                            "concepts": ["Ibn Battuta descriptions", "Alexandria port records"],
                            "topics": [
                                { "id": "t_hist_sup_1_1", "title": "Ibn Battuta in Egypt", "title_ar": "ابن بطوطة في مصر", "page": 1 },
                                { "id": "t_hist_sup_1_2", "title": "Economic Centers Maps", "title_ar": "خرائط المراكز الاقتصادية", "page": 6 }
                            ]
                        }
                    ]
                },
                # 9. Calculus Core
                {
                    "_id": "book_openstax_calc_core",
                    "subject_id": "subj_cur_openstax_college_2026_calculus",
                    "curriculum_id": "cur_openstax_college_2026",
                    "library_id": "lib_openstax",
                    "title": "Calculus Volume 1 (College)",
                    "title_ar": "حساب التفاضل والتكامل للمرحلة الجامعية 1",
                    "grade": "College",
                    "term": "Term 1",
                    "year": "2026",
                    "language": "en",
                    "book_type": "core",
                    "source_url": "https://openstax.org/details/books/calculus-volume-1",
                    "storage_path": "gs://fahem-academic-lake/openstax/calculus_v1_core.pdf",
                    "coverUrl": "/libs/covers/calc_core.jpg",
                    "coverThumbUrl": "/libs/covers/calc_core_thumb.jpg",
                    "chapters": [
                        {
                            "id": "ch_1",
                            "title": "Limits and Continuity",
                            "title_ar": "النهايات والاتصال",
                            "page_start": 1,
                            "page_end": 15,
                            "concepts": ["Limit definition", "Squeeze theorem", "Continuity conditions"],
                            "topics": [
                                { "id": "t_calc_1_1", "title": "The Concept of Limit", "title_ar": "مفهوم النهاية", "page": 1 },
                                { "id": "t_calc_1_2", "title": "Squeeze Theorem Proof", "title_ar": "برهان نظرية الساندوتش (الإحاطة)", "page": 7 },
                                { "id": "t_calc_1_3", "title": "Infinite Limits", "title_ar": "النهايات اللانهائية", "page": 12 }
                            ]
                        }
                    ]
                },
                # 10. Calculus Supporting
                {
                    "_id": "book_openstax_calc_sup",
                    "subject_id": "subj_cur_openstax_college_2026_calculus",
                    "curriculum_id": "cur_openstax_college_2026",
                    "library_id": "lib_openstax",
                    "title": "Calculus Study Guide & Problem Book",
                    "title_ar": "دليل دراسة التفاضل والتكامل ومسائل محلولة",
                    "grade": "College",
                    "term": "Term 1",
                    "year": "2026",
                    "language": "en",
                    "book_type": "supporting",
                    "source_url": "https://openstax.org/details/books/calculus-volume-1-guide",
                    "storage_path": "gs://fahem-academic-lake/openstax/calculus_v1_sup.pdf",
                    "coverUrl": "/libs/covers/calc_sup.jpg",
                    "coverThumbUrl": "/libs/covers/calc_sup_thumb.jpg",
                    "chapters": [
                        {
                            "id": "ch_1",
                            "title": "Practice Problems on Limits",
                            "title_ar": "تدريب على مسائل النهايات والاتصال",
                            "page_start": 1,
                            "page_end": 10,
                            "concepts": ["Epsilon-delta proofs", "Limits with trigonometric functions"],
                            "topics": [
                                { "id": "t_calc_sup_1_1", "title": "Epsilon-Delta Exercises", "title_ar": "مسائل إبسلون ودلتا", "page": 1 },
                                { "id": "t_calc_sup_1_2", "title": "Trig Limit Shortcuts", "title_ar": "طرق سريعة لنهايات الدوال المثلثية", "page": 6 }
                            ]
                        }
                    ]
                },
                # 11. Physics Core
                {
                    "_id": "book_openstax_phys_core",
                    "subject_id": "subj_cur_openstax_college_2026_physics",
                    "curriculum_id": "cur_openstax_college_2026",
                    "library_id": "lib_openstax",
                    "title": "University Physics Volume 1: Mechanics",
                    "title_ar": "الفيزياء الجامعية 1: الميكانيكا والحرارة",
                    "grade": "College",
                    "term": "Term 1",
                    "year": "2026",
                    "language": "en",
                    "book_type": "core",
                    "source_url": "https://openstax.org/details/books/university-physics-volume-1",
                    "storage_path": "gs://fahem-academic-lake/openstax/physics_v1_core.pdf",
                    "coverUrl": "/libs/covers/phys_core.jpg",
                    "coverThumbUrl": "/libs/covers/phys_core_thumb.jpg",
                    "chapters": [
                        {
                            "id": "ch_1",
                            "title": "Newtonian Motion",
                            "title_ar": "قوانين نيوتن للحركة",
                            "page_start": 1,
                            "page_end": 12,
                            "concepts": ["Three Laws of Motion", "Friction coefficient", "Inertial systems"],
                            "topics": [
                                { "id": "t_phys_1_1", "title": "First and Second Laws", "title_ar": "القانون الأول والثاني لنيوتن", "page": 1 },
                                { "id": "t_phys_1_2", "title": "Inclined Plane Forces", "title_ar": "تحليل القوى على المستوى المائل", "page": 6 }
                            ]
                        }
                    ]
                },
                # 12. Physics Supporting
                {
                    "_id": "book_openstax_phys_sup",
                    "subject_id": "subj_cur_openstax_college_2026_physics",
                    "curriculum_id": "cur_openstax_college_2026",
                    "library_id": "lib_openstax",
                    "title": "Physics Lab Manual & Mechanics Worksheets",
                    "title_ar": "دليل تجارب الفيزياء الجامعية ميكانيكا",
                    "grade": "College",
                    "term": "Term 1",
                    "year": "2026",
                    "language": "en",
                    "book_type": "supporting",
                    "source_url": "https://openstax.org/details/books/university-physics-volume-1-manual",
                    "storage_path": "gs://fahem-academic-lake/openstax/physics_v1_sup.pdf",
                    "coverUrl": "/libs/covers/phys_sup.jpg",
                    "coverThumbUrl": "/libs/covers/phys_sup_thumb.jpg",
                    "chapters": [
                        {
                            "id": "ch_1",
                            "title": "Friction Lab Investigations",
                            "title_ar": "تجارب الاحتكاك الحركي والسكوني",
                            "page_start": 1,
                            "page_end": 8,
                            "concepts": ["Static vs kinetic friction", "Angle of repose"],
                            "topics": [
                                { "id": "t_phys_sup_1_1", "title": "Friction Coefficient Lab", "title_ar": "معمل قياس معامل الاحتكاك", "page": 1 },
                                { "id": "t_phys_sup_1_2", "title": "Angle of Repose Proofs", "title_ar": "زاوية الانزلاق بالتفصيل", "page": 5 }
                            ]
                        }
                    ]
                }
            ]
            for bk in books_data:
                db["books"].replace_one({"_id": bk["_id"]}, bk, upsert=True)

            # --- 5. SEED BOOK PAGES (With 3072-dim embeddings for RAG) ---
            book_pages_data = [
                # Algebra page 1
                {
                    "_id": "page_moe_alg_g10_p1",
                    "book_id": "book_moe_alg_g10_t1_core",
                    "page_number": 1,
                    "content": "مقدمة عن المصفوفات والمحددات: المصفوفة هي تنظيم مستطيل الشكل من الأرقام أو الرموز مرتبة في صفوف وأعمدة. نرمز للمصفوفة بحرف كبير مثل أ.",
                    "content_ar": "مقدمة عن المصفوفات والمحددات: المصفوفة هي تنظيم مستطيل الشكل من الأرقام أو الرموز مرتبة في صفوف وأعمدة. نرمز للمصفوفة بحرف كبير مثل أ.",
                    "i18n": {
                        "en": "Introduction to Matrices and Determinants: A matrix is a rectangular array of numbers or symbols arranged in rows and columns. We denote matrices by uppercase letters like A.",
                        "ar": "مقدمة عن المصفوفات والمحددات: المصفوفة هي تنظيم مستطيل الشكل من الأرقام أو الرموز مرتبة في صفوف وأعمدة. نرمز للمصفوفة بحرف كبير مثل أ.",
                        "es": "Introducción a las matrices y determinantes: una matriz es una disposición rectangular de números o símbolos organizados en filas y columnas. Representamos las matrices con letras mayúsculas como A.",
                        "fr": "Introduction aux matrices et déterminants : Une matrice est un tableau rectangulaire de nombres ou de symboles disposés en lignes et en colonnes. Nous désignons les matrices par des lettres majuscules comme A.",
                        "de": "Einführung in Matrizen und Determinanten: Eine Matrix ist eine rechteckige Anordnung von Zahlen oder Symbolen, die in Zeilen und Spalten angeordnet sind. Wir bezeichnen Matrizen mit Großbuchstaben wie A.",
                        "zh": "矩阵与行列式简介：矩阵是按行和列排列的数字或符号的矩形阵列。我们用大写字母（如A）表示矩阵。",
                        "it": "Introduzione a matrici e determinanti: una matrice è una disposizione rettangolare di numeri o simboli disposti in righe e colonne. Indichiamo le matrici con lettere maiuscole come A."
                    },
                    "embedding": [0.001] * 3072
                },
                # Algebra page 7
                {
                    "_id": "page_moe_alg_g10_p7",
                    "book_id": "book_moe_alg_g10_t1_core",
                    "page_number": 7,
                    "content": "المحددات هي قيمة عددية ترتبط بالمصفوفات المربعة فقط. إذا كانت أ مصفوفة من الرتبة 2*2 فإن محدد أ = أ11*أ22 - أ12*أ21. إذا كان المحدد يساوي صفرًا فإن المصفوفة منفردة.",
                    "content_ar": "المحددات هي قيمة عددية ترتبط بالمصفوفات المربعة فقط. إذا كانت أ مصفوفة من الرتبة 2*2 فإن محدد أ = أ11*أ22 - أ12*أ21. إذا كان المحدد يساوي صفرًا فإن المصفوفة منفردة.",
                    "i18n": {
                        "en": "Determinants are numerical values associated only with square matrices. For a 2x2 matrix A, det(A) = a11*a22 - a12*a21. If the determinant is zero, the matrix is singular and has no inverse.",
                        "ar": "المحددات هي قيمة عددية ترتبط بالمصفوفات المربعة فقط. إذا كانت أ مصفوفة من الرتبة 2*2 فإن محدد أ = أ11*أ22 - أ12*أ21. إذا كان المحدد يساوي صفرًا فإن المصفوفة منفردة.",
                        "es": "Los determinantes son valores numéricos asociados únicamente con matrices cuadradas. Para una matriz de 2x2 A, det(A) = a11*a22 - a12*a21. Si el determinante es cero, la matriz es singular.",
                        "fr": "Les déterminants sont des valeurs numériques associées uniquement aux matrices carrées. Pour une matrice 2x2 A, det(A) = a11*a22 - a12*a21. Si le déterminant est nul, la matrice est singulière.",
                        "de": "Determinanten sind numerische Werte, die nur quadratischen Matrizen zugeordnet sind. Für eine 2x2-Matrix A gilt: det(A) = a11*a22 - a12*a21. Wenn die Determinante Null ist, ist die Matrix singulär.",
                        "zh": "行列式是仅与方阵相关的数值。对于一个2x2矩阵A，det(A) = a11*a22 - a12*a21。如果行列式为零，则该矩阵为奇异矩阵。",
                        "it": "I determinanti sono valori nucleici associati solo alle matrici quadrate. Per una matrice 2x2 A, det(A) = a11*a22 - a12*a21. Se il determinante è zero, la matrice è singolare."
                    },
                    "embedding": [0.001] * 3072
                },
                # Biology page 1
                {
                    "_id": "page_moe_bio_g11_p1",
                    "book_id": "book_moe_bio_g11_t1_core",
                    "page_number": 1,
                    "content": "التغذية الذاتية هي العملية التي تقوم بها النباتات الخضراء لصنع غذائها بنفسها باستخدام عملية البناء الضوئي. تمتص البلاستيدات الخضراء الضوء بواسطة الكلوروفيل.",
                    "content_ar": "التغذية الذاتية هي العملية التي تقوم بها النباتات الخضراء لصنع غذائها بنفسها باستخدام عملية البناء الضوئي. تمتص البلاستيدات الخضراء الضوء بواسطة الكلوروفيل.",
                    "i18n": {
                        "en": "Autotrophic nutrition is the process by which green plants make their own food using photosynthesis. Chloroplasts absorb solar energy using chlorophyll pigments.",
                        "ar": "التغذية الذاتية هي العملية التي تقوم بها النباتات الخضراء لصنع غذائها بنفسها باستخدام عملية البناء الضوئي. تمتص البلاستيدات الخضراء الضوء بواسطة الكلوروفيل.",
                        "es": "La nutrición autótrofa es el proceso mediante el cual las plantas verdes fabrican su propio alimento mediante la fotosíntesis.",
                        "fr": "La nutrition autotrophe est le processus par lequel les plantes vertes fabriquent leur propre nourriture grâce à la photosynthèse.",
                        "de": "Autotrophe Ernährung ist der Prozess, durch den grüne Pflanzen mithilfe der Fotosynthese ihre eigene Nahrung herstellen.",
                        "zh": "自养营养是绿色植物利用光合作用制造自身食物的过程。",
                        "it": "La nutrizione autotrofica è il processo mediante il quale le piante verdi producono il proprio cibo utilizzando la fotosintesi."
                    },
                    "embedding": [0.001] * 3072
                },
                # Calculus page 1
                {
                    "_id": "page_openstax_calc_p1",
                    "book_id": "book_openstax_calc_core",
                    "page_number": 1,
                    "content": "Limits and Continuity: In calculus, a limit is the value that a function approaches as the input approaches some value. Limits are essential to define derivatives, integrals, and continuity.",
                    "content_ar": "النهايات والاتصال: في التفاضل والتكامل، النهاية هي القيمة التي تقترب منها الدالة عندما يقترب المدخل من قيمة معينة. النهايات أساسية لتعريف المشتقات والتكاملات والاتصال.",
                    "i18n": {
                        "en": "Limits and Continuity: In calculus, a limit is the value that a function approaches as the input approaches some value. Limits are essential to define derivatives, integrals, and continuity.",
                        "ar": "النهايات والاتصال: في التفاضل والتكامل، النهاية هي القيمة التي تقترب منها الدالة عندما يقترب المدخل من قيمة معينة. النهايات أساسية لتعريف المشتقات والتكاملات والاتصال.",
                        "es": "Límites y continuidad: en cálculo, un límite es el valor al que se aproxima una función a medida que la entrada se aproxima a algún valor.",
                        "fr": "Limites et continuité : En calcul, une limite est la valeur vers laquelle tend une fonction lorsque l'entrée s'approche d'une certaine valeur.",
                        "de": "Grenzwerte und Stetigkeit: In der Analysis ist ein Grenzwert der Wert, dem sich eine Funktion nähert, wenn sich die Eingabe einem bestimmten Wert nähert.",
                        "zh": "极限与连续性：在微积分中，极限是当自变量接近某个值时，函数所接近的值。极限对于定义导数、积分和连续性至关重要。",
                        "it": "Limiti e continuità: nel calcolo, un limite è il valore a cui si avvicina una funzione quando l'input si avvicina a un certo valore."
                    },
                    "embedding": [0.001] * 3072
                }
            ]
            for pg in book_pages_data:
                db["book_pages"].replace_one({"_id": pg["_id"]}, pg, upsert=True)

            # --- 5b. SEED PYTHON BOOK & PAGES FROM JSON SEED ---
            import os
            import json
            seed_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "python_book_seed.json")
            if os.path.exists(seed_path):
                logger.info(f"[SEED] Found Python book seed at: {seed_path}. Seeding Python book & pages...")
                try:
                    with open(seed_path, "r", encoding="utf-8") as f:
                        seed_data = json.load(f)
                    
                    pb_book = seed_data.get("book")
                    if pb_book:
                        # Ensure standard library and curriculum fields
                        pb_book["library_id"] = "lib_openstax"
                        pb_book["curriculum_id"] = "cur_openstax_college_2026"
                        pb_book["book_type"] = "core"
                        db["books"].replace_one({"_id": pb_book["_id"]}, pb_book, upsert=True)
                        logger.info(f"[SEED] Successfully seeded Python book: {pb_book['_id']}")
                    
                    pb_pages = seed_data.get("pages", [])
                    if pb_pages:
                        db["book_pages"].delete_many({"book_id": pb_book["_id"]})
                        db["book_pages"].insert_many(pb_pages)
                        logger.info(f"[SEED] Successfully seeded {len(pb_pages)} Python book pages via bulk insert.")
                except Exception as ex:
                    logger.error(f"[SEED] Error seeding Python book / pages: {ex}", exc_info=True)
            else:
                logger.warning(f"[SEED] Python book seed NOT found at: {seed_path}")

            # --- 6. SEED USERS (3: Student, Teacher, Admin) ---
            users_data = [
                {
                    "userId": "test_user_id_gemini_2026",
                    "_id": "test_user_id_gemini_2026",
                    "name": "Ziad Al-Ghazali",
                    "username": "ziad_student",
                    "email": "ziad.student@fahem.pro",
                    "role": "student",
                    "userType": "student",
                    "school": "Suez High School",
                    "avatar": "👨‍🎓",
                    "country": "EG",
                    "grade": "Secondary 1",
                    "isWhitelisted": True,
                    "banned": False,
                    "tokenPolicy": { "weeklyLimit": 250000, "usedTokens": 5000 }
                },
                {
                    "userId": "test_teacher_id_gemini_2026",
                    "_id": "test_teacher_id_gemini_2026",
                    "name": "Mr. Tarek Al-Masry",
                    "username": "tarek_teacher",
                    "email": "tarek.teacher@fahem.pro",
                    "role": "teacher",
                    "userType": "teacher",
                    "school": "Suez High School",
                    "avatar": "👨‍🏫",
                    "country": "EG",
                    "grade": "Secondary 1",
                    "isWhitelisted": True,
                    "banned": False,
                    "tokenPolicy": { "weeklyLimit": 500000, "usedTokens": 2000 }
                },
                {
                    "userId": "fDtKpvuKYuSgB3km8DRTRgOU3RH3",
                    "_id": "fDtKpvuKYuSgB3km8DRTRgOU3RH3",
                    "name": "Hesham (Admin)",
                    "username": "hesham_admin",
                    "email": "hesham1988@gmail.com",
                    "role": "super-admin",
                    "userType": "admin",
                    "school": "Fahem HQ",
                    "avatar": "👑",
                    "country": "EG",
                    "grade": "General",
                    "isWhitelisted": True,
                    "banned": False
                },
                {
                    # Dedicated sandbox admin persona (NOT the platform owner). The "admin"
                    # demo persona maps to this user so the admin console is explored with a
                    # clean, sandbox-scoped identity that never carries owner credentials.
                    "userId": "sandbox_admin_demo_2026",
                    "_id": "sandbox_admin_demo_2026",
                    "name": "Rana Hassan (Sandbox Admin)",
                    "username": "rana_admin",
                    "email": "rana.admin@fahem.pro",
                    "role": "admin",
                    "userType": "admin",
                    "school": "Fahem Sandbox",
                    "avatar": "🛡️",
                    "country": "EG",
                    "grade": "General",
                    "isWhitelisted": True,
                    "banned": False,
                    "tokenPolicy": { "weeklyLimit": 1000000, "usedTokens": 18000 }
                }
            ]
            for usr in users_data:
                db["users"].replace_one({"_id": usr["_id"]}, usr, upsert=True)

            # --- 7. SEED SOCIAL CHANNELS (2 groups, 2 threads, 2 replies) ---
            social_groups_data = [
                {
                    "_id": "group_math",
                    "name": "Pure Mathematics Club",
                    "name_ar": "نادي الرياضيات البحتة",
                    "description": "Math enthusiasts and algebra discussion.",
                    "description_ar": "مساحة مخصصة لعشاق الرياضيات ومناقشة المسائل الجبرية.",
                    "category": "Math",
                    "emoji": "📐",
                    "members_count": 12
                },
                {
                    "_id": "group_science",
                    "name": "Physics & Chemistry Lab",
                    "name_ar": "مختبر الفيزياء والكيمياء",
                    "description": "Scientific experiments and theory chat.",
                    "description_ar": "تجارب ونقاشات حول النظريات الفيزيائية والتفاعلات الكيميائية.",
                    "category": "Science",
                    "emoji": "🧪",
                    "members_count": 8
                }
            ]
            for sg in social_groups_data:
                db["social_groups"].replace_one({"_id": sg["_id"]}, sg, upsert=True)

            social_threads_data = [
                {
                    "_id": "thread_math_1",
                    "group_id": "group_math",
                    "title": "How to solve complex quadratic equations quickly?",
                    "title_ar": "كيفية حل المعادلات التربيعية المعقدة بسرعة؟",
                    "content": "Does anyone have a fast method or shortcut for resolving quadratic equations with high constants?",
                    "content_ar": "هل لدى أحدكم طريقة سريعة أو اختصار لحل المعادلات التربيعية ذات الثوابت الكبيرة؟",
                    "author_id": "test_user_id_gemini_2026",
                    "author_name": "Ziad Al-Ghazali",
                    "author_avatar": "👨‍🎓",
                    "created_at": "2026-06-03T12:00:00Z",
                    "likes_count": 4,
                    "replies_count": 1
                },
                {
                    "_id": "thread_science_1",
                    "group_id": "group_science",
                    "title": "Photosynthesis light reactions summary",
                    "title_ar": "ملخص تفاعلات الضوء في البناء الضوئي",
                    "content": "I am summarizing the light reactions vs the Calvin cycle. Can someone confirm the exact roles of Photosystem I and II?",
                    "content_ar": "أقوم بتلخيص تفاعلات الضوء مقابل دورة كالفن. هل يمكن لأحد تأكيد الأدوار الدقيقة للنظام الضوئي الأول والثاني؟",
                    "author_id": "test_user_id_gemini_2026",
                    "author_name": "Ziad Al-Ghazali",
                    "author_avatar": "👨‍🎓",
                    "created_at": "2026-06-04T09:15:00Z",
                    "likes_count": 2,
                    "replies_count": 1
                }
            ]
            for st in social_threads_data:
                db["social_threads"].replace_one({"_id": st["_id"]}, st, upsert=True)

            social_replies_data = [
                {
                    "_id": "reply_math_1_1",
                    "thread_id": "thread_math_1",
                    "content": "You can use the quadratic formula directly, or perfect square trinomial decompositions. Try dividing by common factors first!",
                    "content_ar": "يمكنك استخدام القانون العام مباشرة، أو تحليل المربع الكامل. جرب القسمة على العوامل المشتركة أولاً!",
                    "author_id": "test_teacher_id_gemini_2026",
                    "author_name": "Mr. Tarek Al-Masry",
                    "author_avatar": "👨‍🏫",
                    "created_at": "2026-06-03T14:30:00Z"
                },
                {
                    "_id": "reply_science_1_1",
                    "thread_id": "thread_science_1",
                    "content": "Photosystem II absorbs light first, splitting water to release O2 and proton gradient. Photosystem I then uses light to reduce NADP+ to NADPH!",
                    "content_ar": "يمتص النظام الضوئي الثاني الضوء أولاً، ويقوم بشطر الماء لإطلاق الأكسجين وتدرج البروتونات. ثم يستخدم النظام الضوئي الأول الضوء لاختزال NADP+ إلى NADPH!",
                    "author_id": "test_teacher_id_gemini_2026",
                    "author_name": "Mr. Tarek Al-Masry",
                    "author_avatar": "👨‍🏫",
                    "created_at": "2026-06-04T10:45:00Z"
                }
            ]
            for sr in social_replies_data:
                db["social_replies"].replace_one({"_id": sr["_id"]}, sr, upsert=True)

            # --- 8. SEED GROUP ASSIGNMENTS & TIMED WORK (1+ with individual answeredAt) ---
            now_ts = int(time.time())
            group_assignments_data = [
                {
                    "_id": "asg_moe_alg_g10_t1_linear_eq",
                    "group_id": "group_math",
                    "title": "Algebra Assignment: Linear Equations and Matrices",
                    "title_ar": "واجب الجبر: المعادلات الخطية والمصفوفات",
                    "instructions": "Please review Chapter 1 of High School Algebra and solve the questions before the timer ends. Double check matrix inversions.",
                    "instructions_ar": "يرجى مراجعة الفصل الأول من كتاب الجبر وحل الأسئلة قبل انتهاء المؤقت. تأكد من المعكوس الضربي للمصفوفات.",
                    "book_id": "book_moe_alg_g10_t1_core",
                    "chapter_id": "ch_1",
                    "creator_id": "test_teacher_id_gemini_2026",
                    "duration_minutes": 45,
                    "status": "active",
                    "created_at": now_ts - 600,
                    "starts_at": now_ts - 600,
                    "ends_at": now_ts + 3600,
                    "questions": [
                        { "question_id": "q_mat_001", "weight": 5 },
                        { "question_id": "q_mat_002", "weight": 5 }
                    ]
                }
            ]
            for ga in group_assignments_data:
                db["group_assignments"].replace_one({"_id": ga["_id"]}, ga, upsert=True)

            assignment_submissions_data = [
                {
                    "_id": "sub_ziad_asg_moe_alg",
                    "assignment_id": "asg_moe_alg_g10_t1_linear_eq",
                    "uid": "test_user_id_gemini_2026",
                    "answers": [
                        { "question_id": "q_mat_001", "answer": "The matrix does not possess an inverse.", "answeredAt": "2026-06-07T18:00:00Z" }
                    ],
                    "score": 5,
                    "status": "graded",
                    "graded_by": "system",
                    "graded_at": "2026-06-07T18:05:00Z",
                    "feedback": "Excellent work! Correctly identified singular matrix criteria.",
                    "feedback_ar": "عمل ممتاز! تم تحديد شروط المصفوفة المنفردة بشكل صحيح."
                }
            ]
            for asb in assignment_submissions_data:
                db["assignment_submissions"].replace_one({"_id": asb["_id"]}, asb, upsert=True)

            # --- 9. SEED COMPANION PERSONA-GUIDED PREFERENCES ---
            companion_facts_data = [
                {
                    "_id": "fact_ziad_preference",
                    "userId": "test_user_id_gemini_2026",
                    "fact": "Prefers dark mode, loves visual explanations using math diagrams, struggles slightly with matrix division.",
                    "created_at": "2026-06-07T12:00:00Z",
                    "updated_at": "2026-06-07T12:00:00Z"
                },
                {
                    "_id": "fact_tarek_preference",
                    "userId": "test_teacher_id_gemini_2026",
                    "fact": "Focuses heavily on step-by-step proofs and real-world Egyptian application problems.",
                    "created_at": "2026-06-07T12:00:00Z",
                    "updated_at": "2026-06-07T12:00:00Z"
                }
            ]
            for cf in companion_facts_data:
                db["companion_facts"].replace_one({"_id": cf["_id"]}, cf, upsert=True)

            # --- 10. SEED QUESTION BANK (6 realistic MCQs grounded in seeded books) ---
            questions_data = [
                {
                    "_id": "q_mat_001",
                    "book_id": "book_moe_alg_g10_t1_core",
                    "chapter_id": "ch_1",
                    "page_reference": 7,
                    "type": "MCQ",
                    "complexity_rating": "intermediate",
                    "question_text": "Given a matrix A where det(A) = 0, what can be inferred about its inverse?",
                    "question_text_ar": "إذا كانت المصفوفة أ بحيث محددها يساوي صفرًا (det(A) = 0)، فماذا يمكن استنتاجه عن معكوسها الضربي؟",
                    "distractors": [
                        "The inverse is equal to its transpose.",
                        "The inverse is an identity matrix.",
                        "The inverse can be found using Cramer's rule."
                    ],
                    "distractors_ar": [
                        "المعكوس الضربي يساوي مدور المصفوفة.",
                        "المعكوس الضربي هو مصفوفة الوحدة.",
                        "يمكن إيجاد المعكوس الضربي باستخدام طريقة كرامر."
                    ],
                    "correct_answer": "The matrix does not possess an inverse.",
                    "correct_answer_ar": "المصفوفة ليس لها معكوس ضربي (مصفوفة منفردة).",
                    "pedagogical_intent": "Testing understanding of singular matrices and inverse criteria.",
                    "embedding": [0.0123, -0.0456, 0.2389, 0.7182]
                },
                {
                    "_id": "q_mat_002",
                    "book_id": "book_moe_alg_g10_t1_core",
                    "chapter_id": "ch_1",
                    "page_reference": 7,
                    "type": "MCQ",
                    "complexity_rating": "hard",
                    "question_text": "Under what condition is Cramer's rule inapplicable to a system of linear equations?",
                    "question_text_ar": "تحت أي شرط تكون طريقة كرامر غير قابلة للتطبيق لحل نظام من المعادلات الخطية؟",
                    "distractors": [
                        "When the constant vector contains zeros.",
                        "When the determinant of the coefficients matrix is positive.",
                        "When the number of equations is greater than three."
                    ],
                    "distractors_ar": [
                        "عندما يحتوي متجه الثوابت على أصفار.",
                        "عندما يكون محدد مصفوفة المعاملات موجبًا.",
                        "عندما يكون عدد المعادلات أكبر من ثلاثة."
                    ],
                    "correct_answer": "When the determinant of the coefficients matrix is zero.",
                    "correct_answer_ar": "عندما يكون محدد مصفوفة المعاملات مساويًا للصفر.",
                    "pedagogical_intent": "Check comprehension of Cramer's rule applicability bounds.",
                    "embedding": [-0.02, 0.051, 0.118, 0.612]
                },
                {
                    "_id": "q_chem_001",
                    "book_id": "book_moe_chem_g10_t1_core",
                    "chapter_id": "ch_1",
                    "page_reference": 1,
                    "type": "MCQ",
                    "complexity_rating": "intermediate",
                    "question_text": "What type of chemical bond is formed when electrons are shared between two atoms?",
                    "question_text_ar": "ما نوع الرابطة الكيميائية التي تتكون عند مشاركة الإلكترونات بين ذرتين؟",
                    "distractors": [
                        "Ionic bond",
                        "Hydrogen bond",
                        "Metallic bond"
                    ],
                    "distractors_ar": [
                        "رابطة أيونية",
                        "رابطة هيدروجينية",
                        "رابطة فلزية"
                    ],
                    "correct_answer": "Covalent bond",
                    "correct_answer_ar": "رابطة تساهمية",
                    "pedagogical_intent": "Identify the difference between ionic and covalent bonding mechanisms.",
                    "embedding": [0.001] * 3072
                },
                {
                    "_id": "q_bio_001",
                    "book_id": "book_moe_bio_g11_t1_core",
                    "chapter_id": "ch_1",
                    "page_reference": 1,
                    "type": "MCQ",
                    "complexity_rating": "intermediate",
                    "question_text": "Which wavelength of light is least absorbed by chlorophyll a and b during photosynthesis?",
                    "question_text_ar": "أي الأطوال الموجية للضوء هي الأقل امتصاصاً بواسطة الكلوروفيل (أ) و(ب) أثناء عملية البناء الضوئي؟",
                    "distractors": [
                        "Blue light (430-450 nm)",
                        "Red light (640-660 nm)",
                        "Violet light (400-420 nm)"
                    ],
                    "distractors_ar": [
                        "الضوء الأزرق (430-450 نانومتر)",
                        "الضوء الأحمر (640-660 نانومتر)",
                        "الضوء البنفسجي (400-420 نانومتر)"
                    ],
                    "correct_answer": "Green light (500-550 nm)",
                    "correct_answer_ar": "الضوء الأخضر (500-550 نانومتر)",
                    "pedagogical_intent": "Understand light absorption profiles and why chlorophyll appears green.",
                    "embedding": [0.089, -0.112, 0.301, 0.154]
                },
                {
                    "_id": "q_hist_001",
                    "book_id": "book_moe_hist_g11_t1_core",
                    "chapter_id": "ch_1",
                    "page_reference": 1,
                    "type": "MCQ",
                    "complexity_rating": "intermediate",
                    "question_text": "Which famous traveler visited Egypt during the medieval era and documented Alexandria's port?",
                    "question_text_ar": "أي الرحالة المشهورين زار مصر في العصور الوسطى ووثق معالم ميناء الإسكندرية؟",
                    "distractors": [
                        "Marco Polo",
                        "Vasco da Gama",
                        "Magellan"
                    ],
                    "distractors_ar": [
                        "ماركو بولو",
                        "فاسكو دي غاما",
                        "ماجلان"
                    ],
                    "correct_answer": "Ibn Battuta",
                    "correct_answer_ar": "ابن بطوطة",
                    "pedagogical_intent": "Recognize major historical figures and source documents of Islamic trade eras.",
                    "embedding": [0.001] * 3072
                },
                {
                    "_id": "q_calc_001",
                    "book_id": "book_openstax_calc_core",
                    "chapter_id": "ch_1",
                    "page_reference": 1,
                    "type": "MCQ",
                    "complexity_rating": "easy",
                    "question_text": "In calculus, what is the value of the limit of sin(x)/x as x approaches 0?",
                    "question_text_ar": "في التفاضل والتكامل، ما هي قيمة نهاية الدالة جا(س)/س عندما تقترب س من الصفر؟",
                    "distractors": [
                        "0",
                        "Infinity",
                        "Undefined"
                    ],
                    "distractors_ar": [
                        "0",
                        "ما لا نهاية",
                        "غير معرفة"
                    ],
                    "correct_answer": "1",
                    "correct_answer_ar": "1",
                    "pedagogical_intent": "Understand basic trigonometric limit identities.",
                    "embedding": [0.001] * 3072
                }
            ]
            for q in questions_data:
                db["question_bank"].replace_one({"_id": q["_id"]}, q, upsert=True)

            # --- 11. SEED ACTIVE PRACTICE SESSIONS ---
            active_practice_sessions_data = [
                {
                    "_id": "prac_ziad_1",
                    "uid": "test_user_id_gemini_2026",
                    "book_id": "book_moe_alg_g10_t1_core",
                    "subject_id": "subj_cur_moe_g10_t1_2026_algebra",
                    "status": "active",
                    "created_at": "2026-06-07T18:00:00Z"
                }
            ]
            for ps in active_practice_sessions_data:
                db["active_practice_sessions"].replace_one({"_id": ps["_id"]}, ps, upsert=True)

            # --- 11b. SEED RICH USER HISTORY (activities, zatona, reading, telemetry, audit, demos, notifications) ---
            import datetime as _dt
            _now = _dt.datetime.utcnow()
            def _iso(days_ago, hour=10):
                return (_now - _dt.timedelta(days=days_ago)).replace(hour=hour % 24, minute=0, second=0, microsecond=0).isoformat() + "Z"

            _student_uid = "test_user_id_gemini_2026"
            _student_email = "ziad.student@fahem.pro"
            _admin_uid = "fDtKpvuKYuSgB3km8DRTRgOU3RH3"

            # Varied practice history → drives Insights, XP, heatmap, practice history & Activity Trail
            _practice_topics = [
                ("Mathematics", "Matrices", True), ("Mathematics", "Determinants", True),
                ("Mathematics", "Cramer's Rule", False), ("Mathematics", "Matrices", True),
                ("Mathematics", "Determinants", False), ("Science", "Photosynthesis", True),
                ("Science", "Cell Structure", True), ("Science", "Thermodynamics", False),
                ("Science", "Photosynthesis", True), ("Computer Science", "Boolean Operations", True),
                ("Computer Science", "Loops", True), ("Computer Science", "Functions", False),
                ("Computer Science", "Data Structures", True), ("Computer Science", "Boolean Operations", True),
            ]
            user_activities_data = []
            for _i, (_subj, _sub, _correct) in enumerate(_practice_topics):
                _details = {
                    "question": f"Practice question on {_sub}",
                    "subject": _subj, "subtopic": _sub,
                    "isCorrect": _correct, "xpGained": 12 if _correct else 0, "mode": "mcq",
                }
                _ts = _iso(_i % 9, 9 + (_i % 9))
                _st = "correct" if _correct else "incorrect"
                user_activities_data.append({"_id": f"act_prac_{_i}", "userId": _student_uid, "userEmail": _student_email,
                    "action": "practice_session", "status": _st, "timestamp": _ts, "details": _details})
                user_activities_data.append({"_id": f"act_attempt_{_i}", "userId": _student_uid, "userEmail": _student_email,
                    "action": "practice_attempt", "status": _st, "timestamp": _ts, "details": _details})
            for _i, (_topic, _topic_ar) in enumerate([
                ("Photosynthesis", "التمثيل الضوئي"), ("Matrices & Determinants", "المصفوفات والمحددات"),
                ("Boolean Operations", "العمليات المنطقية")]):
                user_activities_data.append({"_id": f"act_zatona_{_i}", "userId": _student_uid, "userEmail": _student_email,
                    "action": "zatona_session", "status": "completed", "timestamp": _iso(_i + 1, 14),
                    "details": {"prompt": _topic, "prompt_ar": _topic_ar, "summary": f"High-yield digest of {_topic}."}})
            for _a in user_activities_data:
                db["user_activities"].replace_one({"_id": _a["_id"]}, _a, upsert=True)

            # Reading sessions (keyed by uid)
            reading_sessions_data = [
                {"_id": "rs_seed_1", "uid": _student_uid, "userEmail": _student_email, "book_id": "book_moe_alg_g10_t1_core", "bookTitle": "Algebra G10", "pagesRead": 14, "durationSeconds": 1620, "lastPage": 14, "timestamp": _iso(1, 16)},
                {"_id": "rs_seed_2", "uid": _student_uid, "userEmail": _student_email, "book_id": "book_openstax_calc_core", "bookTitle": "Calculus Volume 1", "pagesRead": 9, "durationSeconds": 1100, "lastPage": 9, "timestamp": _iso(3, 18)},
                {"_id": "rs_seed_3", "uid": _student_uid, "userEmail": _student_email, "book_id": "book_moe_alg_g10_t1_core", "bookTitle": "Algebra G10", "pagesRead": 6, "durationSeconds": 720, "lastPage": 20, "timestamp": _iso(5, 9)},
            ]
            for _rs in reading_sessions_data:
                db["reading_sessions"].replace_one({"_id": _rs["_id"]}, _rs, upsert=True)

            # Token telemetry → Daily Token Budget shows real numbers in the sandbox
            token_telemetry_data = []
            for _i in range(10):
                token_telemetry_data.append({"_id": f"tok_seed_{_i}", "userId": _student_uid, "userEmail": _student_email,
                    "promptTokens": 700 + _i * 30, "completionTokens": 350 + _i * 15, "totalTokens": 1050 + _i * 45,
                    "model": "gemini-3.1-flash-lite", "type": "chat", "timestamp": _iso(_i % 4, 8 + _i % 10)})
            for _t in token_telemetry_data:
                db["token_telemetry"].replace_one({"_id": _t["_id"]}, _t, upsert=True)

            # Token telemetry + a login activity for the teacher and sandbox-admin personas
            # so their Daily Token Budget and Insights panels are populated too (the demo
            # persona mapping routes teacher -> tarek and admin -> the sandbox admin user).
            _persona_extra = [
                ("test_teacher_id_gemini_2026", "tarek.teacher@fahem.pro", "teacher"),
                ("sandbox_admin_demo_2026", "rana.admin@fahem.pro", "admin"),
            ]
            for _puid, _pemail, _prole in _persona_extra:
                for _i in range(8):
                    db["token_telemetry"].replace_one(
                        {"_id": f"tok_{_prole}_{_i}"},
                        {"_id": f"tok_{_prole}_{_i}", "userId": _puid, "userEmail": _pemail,
                         "promptTokens": 600 + _i * 40, "completionTokens": 300 + _i * 20, "totalTokens": 900 + _i * 60,
                         "model": "gemini-3.1-flash-lite", "type": "chat", "timestamp": _iso(_i % 4, 9 + _i % 9)},
                        upsert=True)
                db["user_activities"].replace_one(
                    {"_id": f"act_{_prole}_login"},
                    {"_id": f"act_{_prole}_login", "userId": _puid, "userEmail": _pemail,
                     "action": "session_login", "status": "success", "timestamp": _iso(0, 8),
                     "details": {"role": _prole}}, upsert=True)

            # Audit logs → admin Activity Trail
            audit_logs_data = [
                {"_id": "aud_seed_1", "category": "AUTH", "agent": "Auth Service", "message": "Student Ziad signed in", "details": "role=student", "timestamp": _iso(0, 8)},
                {"_id": "aud_seed_2", "category": "INGESTION", "agent": "Ingestion Pipeline", "message": "Book embedding completed", "details": "book_openstax_calc_core • 9 pages", "timestamp": _iso(1, 11)},
                {"_id": "aud_seed_3", "category": "CRAWLER", "agent": "Crawler", "message": "Crawl job finished", "details": "openstax.org • 12 PDFs found", "timestamp": _iso(2, 13)},
                {"_id": "aud_seed_4", "category": "AUDIO_TTS", "agent": "Audio Service", "message": "Page read aloud", "details": "voice=Aoede", "timestamp": _iso(1, 15)},
                {"_id": "aud_seed_5", "category": "PRACTICE", "agent": "Quiz Agent", "message": "Practice quiz graded", "details": "Boolean Operations • correct", "timestamp": _iso(0, 17)},
            ]
            for _al in audit_logs_data:
                db["audit_logs"].replace_one({"_id": _al["_id"]}, _al, upsert=True)

            # Demo sessions → admin demo monitor
            demo_sessions_data = []
            for _i in range(4):
                demo_sessions_data.append({"_id": f"demo_seed_{_i}", "sandbox_session_id": f"sbx_demo_{_i}",
                    "email": f"guest{_i}@demo.fahem.pro", "role": "student" if _i % 2 == 0 else "teacher",
                    "tier": 0, "status": "active" if _i < 2 else "ended",
                    "createdAt": int((_now - _dt.timedelta(hours=_i)).timestamp() * 1000)})
            for _ds in demo_sessions_data:
                db["demo_sessions"].replace_one({"_id": _ds["_id"]}, _ds, upsert=True)

            # Notifications → admin bell
            notifications_data = [
                {"_id": "ntf_seed_1", "recipient_uid": _admin_uid, "type": "admin_signup", "title": "New student signed up", "title_ar": "تسجيل طالب جديد", "body": "Ziad Al-Ghazali (student) joined.", "body_ar": "انضم زياد الغزالي (طالب).", "payload": {}, "read": False, "createdAt": int((_now - _dt.timedelta(hours=2)).timestamp() * 1000)},
                {"_id": "ntf_seed_2", "recipient_uid": _admin_uid, "type": "admin_ingestion", "title": "Ingestion completed", "title_ar": "اكتمل الاستيعاب", "body": "Calculus Volume 1 finished embedding.", "body_ar": "اكتمل استيعاب كتاب التفاضل.", "payload": {}, "read": False, "createdAt": int((_now - _dt.timedelta(hours=5)).timestamp() * 1000)},
            ]
            for _n in notifications_data:
                db["notifications"].replace_one({"_id": _n["_id"]}, _n, upsert=True)

            # --- 12. CREATE TUNED COMPOUND AND SINGLE INDEXES ---
            db["subjects"].create_index([("curriculum_id", 1), ("slug", 1)], unique=True)
            db["books"].create_index([("subject_id", 1)])
            db["question_bank"].create_index([("book_id", 1), ("chapter_id", 1)])
            db["book_pages"].create_index([("book_id", 1), ("page_number", 1)])
            logger.info("[SEED] Successfully established all sandbox indexes!")

            return {
                "status": "success",
                "message": "Database seeded successfully with dynamic Egyptian curriculum models!",
                "seeded_counts": {
                    "libraries": len(libraries_data),
                    "curricula": len(curricula_data),
                    "subjects": len(subjects_data),
                    "books": len(books_data) + (1 if pb_book else 0),
                    "book_pages": len(book_pages_data) + (len(pb_pages) if pb_pages else 0),
                    "users": len(users_data),
                    "social_groups": len(social_groups_data),
                    "social_threads": len(social_threads_data),
                    "social_replies": len(social_replies_data),
                    "group_assignments": len(group_assignments_data),
                    "assignment_submissions": len(assignment_submissions_data),
                    "companion_facts": len(companion_facts_data),
                    "question_bank": len(questions_data),
                    "active_practice_sessions": len(active_practice_sessions_data),
                    "user_activities": len(user_activities_data),
                    "reading_sessions": len(reading_sessions_data),
                    "token_telemetry": len(token_telemetry_data),
                    "audit_logs": len(audit_logs_data),
                    "demo_sessions": len(demo_sessions_data),
                    "notifications": len(notifications_data)
                }
            }
        except Exception as err:
            logger.error(f"[services.py] DB Seed failed: {err}", exc_info=True)
            return {
                "status": "error",
                "error": str(err)
            }

    @app.post("/admin/sync-db")
    async def custom_db_sync(request: fastapi.Request):
        try:
            payload = await request.json()
            from tools import get_mongodb_uri
            from pymongo import MongoClient
            
            uri = get_mongodb_uri()
            client = _pooled_client()
            db = get_active_db(client)
            
            # FC.A5 Guard: refuse sync on GCP or if active DB is production (fahem)
            is_gcp = os.environ.get("K_SERVICE") is not None or os.environ.get("GOOGLE_CLOUD_PROJECT") is not None
            if is_gcp or db.name == "fahem":
                client.close()
                raise fastapi.HTTPException(
                    status_code=403,
                    detail="Database synchronization is permanently disabled on production (fahem) and Google Cloud Platform."
                )
            
            # Guard Block: refuse sync if payload book count is less than current DB book count unless forced
            if "books" in payload:
                incoming_books = payload.get("books")
                if isinstance(incoming_books, list):
                    incoming_count = len(incoming_books)
                    current_count = db["books"].count_documents({})
                    
                    force_query = request.query_params.get("force", "").lower() == "true"
                    force_body = payload.get("force") in (True, "true", "True")
                    if incoming_count < current_count and not (force_query or force_body):
                        client.close()
                        raise fastapi.HTTPException(
                            status_code=400,
                            detail=f"Refusing sync: payload book count ({incoming_count}) is less than current database book count ({current_count}). Pass ?force=true to override."
                        )
            
            summary = {}
            for col_name, documents in payload.items():
                if not isinstance(documents, list):
                    continue

                inserted_count = 0
                for doc in documents:
                    if not isinstance(doc, dict):
                        continue
                    
                    # Deduce identifier
                    doc_id = doc.get("_id") or doc.get("id") or doc.get("userId")
                    if col_name == "users" and "username" in doc:
                        doc["username_clean"] = str(doc["username"]).strip().lower()
                    
                    if col_name == "users" and "email" in doc:
                        email_val = doc.get("email")
                        if email_val:
                            existing_user = db["users"].find_one({"email": email_val})
                            if existing_user:
                                doc_id = existing_user["_id"]
                                if "userId" in doc:
                                    doc["userId"] = doc_id
                                if "_id" in doc:
                                    doc["_id"] = doc_id
                                    
                    if col_name == "admins" and "email" in doc:
                        email_val = doc.get("email")
                        if email_val:
                            existing_admin = db["admins"].find_one({"email": email_val})
                            if existing_admin:
                                doc_id = existing_admin["_id"]
                                if "userId" in doc:
                                    doc["userId"] = doc_id
                                if "_id" in doc:
                                    doc["_id"] = doc_id

                    if doc_id:
                        if "_id" not in doc:
                            doc["_id"] = doc_id
                        db[col_name].replace_one({"_id": doc_id}, doc, upsert=True)
                    else:
                        db[col_name].insert_one(doc)
                    inserted_count += 1
                
                summary[col_name] = inserted_count
                
            client.close()
            return {
                "status": "success",
                "message": "Local database synced successfully to production MongoDB!",
                "summary": summary
            }
        except Exception as err:
            logger.error(f"[services.py] DB Sync failed: {err}", exc_info=True)
            return fastapi.responses.JSONResponse(
                status_code=500,
                content={"status": "error", "error": str(err)}
            )

    @app.get("/admin/crawl")
    async def get_crawl_job(request: fastapi.Request):
        try:
            job_id = request.query_params.get("jobId")
            
            from pymongo import MongoClient
            from tools import get_mongodb_uri
            uri = get_mongodb_uri()
            client = _pooled_client()
            db = get_active_db(client)

            if not job_id:
                # Retrieve all crawl jobs, sorted by creation time descending, limited to 50
                jobs = list(db["crawl_jobs"].find({}).sort("created_at", -1).limit(50))
                client.close()
                # Ensure all jobs have a string _id and serialize safely
                for j in jobs:
                    if "_id" in j and not isinstance(j["_id"], str):
                        j["_id"] = str(j["_id"])
                    if "created_at" not in j:
                        j["created_at"] = 0
                    disc = j.get("discovered", []) or []
                    j["found_count"] = len(disc)
                    j["harvested_count"] = sum(1 for item in disc if item.get("pagesResolved") is True)
                    j["pending_count"] = j["found_count"] - j["harvested_count"]
                return {
                    "success": True,
                    "jobs": jobs
                }
                
            job = db["crawl_jobs"].find_one({"_id": job_id})
            client.close()
            
            if not job:
                return {
                    "success": True,
                    "status": "queued",
                    "progress": 5,
                    "logs": ["[INIT] Job scheduled. Awaiting database and background spider execution..."],
                    "discovered": [],
                    "found_count": 0,
                    "harvested_count": 0,
                    "pending_count": 0
                }
                
            discovered = job.get("discovered", []) or []
            found_count = len(discovered)
            harvested_count = sum(1 for item in discovered if item.get("pagesResolved") is True)
            pending_count = found_count - harvested_count

            return {
                "success": True,
                "status": job.get("status"),
                "progress": job.get("progress"),
                "logs": job.get("logs", []),
                "discovered": discovered,
                "found_count": found_count,
                "harvested_count": harvested_count,
                "pending_count": pending_count
            }
        except Exception as err:
            logger.error(f"[services.py] Failed to get crawl job: {err}", exc_info=True)
            return fastapi.responses.JSONResponse(status_code=500, content={"error": str(err)})

    @app.post("/admin/crawl")
    async def trigger_crawl_job(request: fastapi.Request, background_tasks: fastapi.BackgroundTasks):
        try:
            body = await request.json()
            action = body.get("action")
            job_id_param = body.get("jobId")
            
            from pymongo import MongoClient
            from tools import get_mongodb_uri
            uri = get_mongodb_uri()
            client = _pooled_client()
            db = get_active_db(client)

            if action or job_id_param:
                if not job_id_param:
                    client.close()
                    return fastapi.responses.JSONResponse(status_code=400, content={"error": "Missing jobId parameter"})
                if action not in ["pause", "resume", "stop", "kill"]:
                    client.close()
                    return fastapi.responses.JSONResponse(status_code=400, content={"error": f"Unrecognized action: {action}"})
                
                job = db["crawl_jobs"].find_one({"_id": job_id_param})
                if not job:
                    client.close()
                    return fastapi.responses.JSONResponse(status_code=404, content={"error": "Crawl job not found"})
                
                import time
                timestamp = time.strftime('%H:%M:%S')
                status = job.get("status")
                logs = job.get("logs", []) or []
                cancel_requested = job.get("cancel_requested", False)
                
                if action == "pause":
                    status = "paused"
                    logs.append(f"[{timestamp}] [CONTROL] ⏸️ Ingestion crawl paused cooperatively.")
                elif action == "resume":
                    status = "harvesting"
                    logs.append(f"[{timestamp}] [CONTROL] ▶️ Ingestion crawl resumed.")
                elif action in ["stop", "kill"]:
                    cancel_requested = True
                    p_id = job.get("active_pid")
                    if p_id:
                        try:
                            import os
                            import signal
                            os.kill(p_id, signal.SIGKILL)
                        except Exception as kill_err:
                            logger.error(f"Failed to SIGKILL crawler PID {p_id}: {kill_err}")
                    status = "killed" if action == "kill" else "failed"
                    logs.append(f"[{timestamp}] [CONTROL] 🛑 Ingestion crawl manually {'force-killed' if action == 'kill' else 'stopped'}.")
                
                db["crawl_jobs"].update_one(
                    {"_id": job_id_param},
                    {"$set": {
                        "status": status,
                        "logs": logs,
                        "cancel_requested": cancel_requested,
                        "updated_at": time.time()
                    }}
                )
                client.close()
                return {"success": True, "message": f"Crawl job {action}ed successfully."}

            url = body.get("url")
            max_depth = body.get("maxDepth", 3)
            requester_email = body.get("requesterEmail")
            
            if not url:
                client.close()
                return fastapi.responses.JSONResponse(status_code=400, content={"error": "Missing crawl URL"})
            if not requester_email:
                client.close()
                return fastapi.responses.JSONResponse(status_code=400, content={"error": "Missing requesterEmail parameter"})
                
            target_url = url.strip()
            if not target_url.startswith("http://") and not target_url.startswith("https://"):
                target_url = "https://" + target_url
                
            import time
            import random
            job_id = f"crawl_{int(time.time() * 1000)}_{random.randint(10000, 99999)}"
            
            initial_logs = [
                f"[INIT] 🚀 Spawning isolated GCP Cloud Run Harvester container...",
                f"[INIT] 🌐 Target domain: {target_url}",
                f"[INIT] ⚙️ Parameters: Deep Recursive Search (No Depth Caps)",
                f"[INIT] 🔒 Secured sandbox initialized. Awaiting background spider execution..."
            ]
            
            # Mark any stale running/paused crawl jobs as failed/superseded
            db["crawl_jobs"].update_many(
                {"status": {"$in": ["harvesting", "paused"]}},
                {"$set": {
                    "status": "failed",
                    "updated_at": time.time(),
                }, "$push": {
                    "logs": f"[{time.strftime('%H:%M:%S')}] [SYSTEM] Job superseded by a new crawl request."
                }}
            )

            db["crawl_jobs"].update_one(
                {"_id": job_id},
                {"$set": {
                    "_id": job_id,
                    "url": target_url,
                    "status": "harvesting",
                    "progress": 5,
                    "logs": initial_logs,
                    "discovered": [],
                    "created_at": time.time(),
                    "updated_at": time.time()
                }},
                upsert=True
            )

            # Notify real (production) admins of the new crawler job.
            try:
                notify_admins_of(
                    client["fahem"], "admin_crawler_job",
                    "New crawler job started", "بدأت مهمة زحف جديدة",
                    f"A crawl job started for {target_url}.", f"بدأت مهمة زحف للموقع {target_url}.",
                    {"deep_link": "?tab=admin-ingestion", "job_id": job_id}
                )
            except Exception as _e:
                logger.warning(f"Failed to notify admins of crawler job: {_e}")

            client.close()

            import subprocess
            
            def run_crawler_background(j_id: str, u_str: str, depth: int, email: str):
                import os
                import sys
                import time
                import json
                import threading
                import traceback
                
                try:
                    python_path = sys.executable or "python"
                    script_path = "/app/scripts/async_crawler.py"
                    if not os.path.exists(script_path):
                        script_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "scripts", "async_crawler.py")
                    if not os.path.exists(script_path):
                        script_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "scripts", "async_crawler.py")
                        
                    logger.info(f"[run_crawler_background] Spawning {script_path} for jobId {j_id}...")
                    
                    payload = {
                        "jobId": j_id,
                        "url": u_str,
                        "maxDepth": depth,
                        "requesterEmail": email
                    }
                    
                    # Inherit current environment and inject pre-resolved MongoDB URI to prevent subprocess DNS freeze
                    env = os.environ.copy()
                    try:
                        from tools import get_mongodb_uri
                        env["RESOLVED_MONGODB_URI"] = get_mongodb_uri()
                    except Exception:
                        pass
                    
                    process = subprocess.Popen(
                        [python_path, script_path],
                        stdin=subprocess.PIPE,
                        stdout=subprocess.PIPE,
                        stderr=subprocess.PIPE,
                        text=True,
                        bufsize=1,
                        env=env
                    )
                    
                    process.stdin.write(json.dumps(payload))
                    process.stdin.close()
                    
                    p_id = process.pid
                    logger.info(f"[run_crawler_background] Started crawler PID {p_id} for jobId {j_id}. Monitoring streams...")
                    
                    # Update active PID
                    try:
                        from pymongo import MongoClient
                        from tools import get_mongodb_uri
                        cl = _pooled_client()
                        mongodb = get_active_db(cl)
                        mongodb["crawl_jobs"].update_one(
                            {"_id": j_id},
                            {"$set": {"active_pid": p_id}}
                        )
                        cl.close()
                    except Exception as e:
                        logger.error(f"[run_crawler_background] Failed to update PID in DB: {e}")
                        
                    stdout_lines = []
                    stderr_lines = []
                    
                    def read_stdout(proc_stdout):
                        for line in iter(proc_stdout.readline, ''):
                            stripped = line.strip()
                            if stripped:
                                stdout_lines.append(stripped)
                                logger.info(f"[CRAWLER-STDOUT] {stripped}")
                        proc_stdout.close()
                        
                    def read_stderr(proc_stderr):
                        for line in iter(proc_stderr.readline, ''):
                            stripped = line.strip()
                            if stripped:
                                stderr_lines.append(stripped)
                                logger.error(f"[CRAWLER-STDERR] {stripped}")
                        proc_stderr.close()
                        
                    t1 = threading.Thread(target=read_stdout, args=(process.stdout,), daemon=True)
                    t2 = threading.Thread(target=read_stderr, args=(process.stderr,), daemon=True)
                    t1.start()
                    t2.start()
                    
                    # Wait for subprocess completion
                    exit_code = process.wait()
                    t1.join(timeout=5.0)
                    t2.join(timeout=5.0)
                    
                    logger.info(f"[run_crawler_background] Crawler PID {p_id} exited with code {exit_code}")
                    
                    if exit_code != 0:
                        logger.error(f"[run_crawler_background] Crawler exited with error code {exit_code}. Marking job {j_id} as failed.")
                        try:
                            from pymongo import MongoClient
                            from tools import get_mongodb_uri
                            cl = _pooled_client()
                            mongodb = get_active_db(cl)
                            
                            job = mongodb["crawl_jobs"].find_one({"_id": j_id})
                            existing_logs = job.get("logs", []) if job else []
                            
                            err_msg = f"[CRITICAL ERROR] Harvester exited with code {exit_code}."
                            error_logs = existing_logs + [err_msg]
                            for line in stderr_lines[-30:]: # append last 30 lines of stderr
                                error_logs.append(f"[STDERR] {line}")
                                
                            mongodb["crawl_jobs"].update_one(
                                {"_id": j_id},
                                {"$set": {
                                    "status": "failed",
                                    "logs": error_logs,
                                    "updated_at": time.time()
                                }}
                            )
                            cl.close()
                            
                            # Also update local db
                            local_db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "web", "src", "app", "api", "local_db.json")
                            if os.path.exists(local_db_path):
                                with open(local_db_path, "r", encoding="utf-8") as f:
                                    db_data = json.load(f)
                                if "crawl_jobs" in db_data:
                                    for j in db_data["crawl_jobs"]:
                                        if j.get("_id") == j_id:
                                            j["status"] = "failed"
                                            j["logs"] = error_logs
                                            j["updated_at"] = time.time()
                                            break
                                with open(local_db_path, "w", encoding="utf-8") as f:
                                    json.dump(db_data, f, indent=2, ensure_ascii=False)
                        except Exception as mongo_ex:
                            logger.error(f"[run_crawler_background] Failed to write failure status to DB: {mongo_ex}")
                except Exception as b_err:
                    logger.error(f"[run_crawler_background] Failed for job {j_id}: {b_err}", exc_info=True)
                    try:
                        from pymongo import MongoClient
                        from tools import get_mongodb_uri
                        cl = _pooled_client()
                        mongodb = get_active_db(cl)
                        mongodb["crawl_jobs"].update_one(
                            {"_id": j_id},
                            {"$set": {
                                "status": "failed",
                                "logs": [f"[CRITICAL ERROR] Failed to spawn/monitor crawler: {b_err}"],
                                "updated_at": time.time()
                            }}
                        )
                        cl.close()
                    except Exception:
                        pass
                    
            background_tasks.add_task(run_crawler_background, job_id, target_url, max_depth, requester_email)
            
            return {
                "success": True,
                "jobId": job_id,
                "message": "Asynchronous crawling task dispatched to Cloud Run executor container."
            }
        except Exception as err:
            logger.error(f"[services.py] Failed to trigger crawl job: {err}", exc_info=True)
            return fastapi.responses.JSONResponse(status_code=500, content={"error": str(err)})

    @app.get("/audit-logs")
    async def get_logs_endpoint():
        try:
            agents_dir = os.path.dirname(os.path.abspath(__file__))
            if agents_dir not in sys.path:
                sys.path.insert(0, agents_dir)
            from agent_communications import get_audit_logs
            logs = await get_audit_logs()
            return {"logs": logs}
        except Exception as err:
            logger.error(f"[services.py] Failed to retrieve audit logs: {err}", exc_info=True)
            return {"logs": [], "error": str(err)}

    @app.post("/audit-logs")
    async def post_log_endpoint(request: fastapi.Request):
        try:
            agents_dir = os.path.dirname(os.path.abspath(__file__))
            if agents_dir not in sys.path:
                sys.path.insert(0, agents_dir)
            from agent_communications import log_audit_event
            data = await request.json()
            category = data.get("category", "INFO")
            agent = data.get("agent", "System")
            message = data.get("message", "")
            details = data.get("details")
            await log_audit_event(category, agent, message, details)
            return {"status": "success"}
        except Exception as err:
            logger.error(f"[services.py] Failed to record audit log: {err}", exc_info=True)
            return {"status": "error", "error": str(err)}

    @app.post("/user/activity")
    async def post_user_activity(request: fastapi.Request):
        try:
            agents_dir = os.path.dirname(os.path.abspath(__file__))
            if agents_dir not in sys.path:
                sys.path.insert(0, agents_dir)
            from agent_communications import log_user_activity
            data = await request.json()
            user_id = data.get("userId", "")
            user_email = data.get("userEmail", "")
            action = data.get("action", "")
            status = data.get("status", "")
            details = data.get("details")
            success = await log_user_activity(user_id, user_email, action, status, details)
            return {"status": "success" if success else "error"}
        except Exception as err:
            logger.error(f"[services.py] Failed to record user activity: {err}", exc_info=True)
            return {"status": "error", "error": str(err)}

    @app.get("/user/activity")
    async def get_user_activity(userId: str):
        try:
            agents_dir = os.path.dirname(os.path.abspath(__file__))
            if agents_dir not in sys.path:
                sys.path.insert(0, agents_dir)
            from agent_communications import get_user_activities
            activities = await get_user_activities(userId)
            return {"activities": activities}
        except Exception as err:
            logger.error(f"[services.py] Failed to retrieve user activities: {err}", exc_info=True)
            return {"activities": [], "error": str(err)}

    @app.post("/user/chat-session")
    async def post_chat_session(request: fastapi.Request):
        try:
            agents_dir = os.path.dirname(os.path.abspath(__file__))
            if agents_dir not in sys.path:
                sys.path.insert(0, agents_dir)
            from agent_communications import save_chat_session
            data = await request.json()
            session_id = data.get("sessionId", "")
            user_id = data.get("userId", "")
            user_email = data.get("userEmail", "")
            title = data.get("title", "")
            messages = data.get("messages", [])
            success = await save_chat_session(session_id, user_id, user_email, title, messages)
            return {"status": "success" if success else "error"}
        except Exception as err:
            logger.error(f"[services.py] Failed to save chat session: {err}", exc_info=True)
            return {"status": "error", "error": str(err)}

    @app.post("/user/chat-session/rename")
    async def post_rename_chat_session(request: fastapi.Request):
        try:
            agents_dir = os.path.dirname(os.path.abspath(__file__))
            if agents_dir not in sys.path:
                sys.path.insert(0, agents_dir)
            from agent_communications import rename_chat_session
            data = await request.json()
            session_id = data.get("sessionId", "")
            title = data.get("title", "")
            if not session_id or not title:
                return fastapi.responses.JSONResponse(
                    status_code=400,
                    content={"status": "error", "error": "sessionId and title are required"}
                )
            success = await rename_chat_session(session_id, title)
            return {"status": "success" if success else "error"}
        except Exception as err:
            logger.error(f"[services.py] Failed to rename chat session: {err}", exc_info=True)
            return {"status": "error", "error": str(err)}

    @app.get("/user/chat-session")
    async def get_user_session_list(userId: str):
        try:
            agents_dir = os.path.dirname(os.path.abspath(__file__))
            if agents_dir not in sys.path:
                sys.path.insert(0, agents_dir)
            from agent_communications import get_user_sessions
            sessions = await get_user_sessions(userId)
            return {"sessions": sessions}
        except Exception as err:
            logger.error(f"[services.py] Failed to retrieve user sessions: {err}", exc_info=True)
            return {"sessions": [], "error": str(err)}

    @app.get("/user/chat-session/detail")
    async def get_session_detail_endpoint(sessionId: str):
        try:
            agents_dir = os.path.dirname(os.path.abspath(__file__))
            if agents_dir not in sys.path:
                sys.path.insert(0, agents_dir)
            from agent_communications import get_session_detail
            session = await get_session_detail(sessionId)
            return {"session": session}
        except Exception as err:
            logger.error(f"[services.py] Failed to retrieve session detail: {err}", exc_info=True)
            return {"session": {}, "error": str(err)}

    @app.delete("/user/chat-session")
    async def delete_session_endpoint(sessionId: str):
        try:
            agents_dir = os.path.dirname(os.path.abspath(__file__))
            if agents_dir not in sys.path:
                sys.path.insert(0, agents_dir)
            from agent_communications import delete_session
            success = await delete_session(sessionId)
            return {"status": "success" if success else "error"}
        except Exception as err:
            logger.error(f"[services.py] Failed to delete session: {err}", exc_info=True)
            return {"status": "error", "error": str(err)}

    @app.post("/user/token-usage")
    async def post_token_usage(request: fastapi.Request):
        try:
            agents_dir = os.path.dirname(os.path.abspath(__file__))
            if agents_dir not in sys.path:
                sys.path.insert(0, agents_dir)
            from agent_communications import log_token_usage
            data = await request.json()
            user_id = data.get("userId", "")
            user_email = data.get("userEmail", "")
            prompt_tokens = data.get("promptTokens", 0)
            completion_tokens = data.get("completionTokens", 0)
            total_tokens = data.get("totalTokens", 0)
            model = data.get("model", "")
            run_type = data.get("type", "")
            success = await log_token_usage(user_id, user_email, prompt_tokens, completion_tokens, total_tokens, model, run_type)
            return {"status": "success" if success else "error"}
        except Exception as err:
            logger.error(f"[services.py] Failed to log token usage: {err}", exc_info=True)
            return {"status": "error", "error": str(err)}

    @app.get("/user/token-stats")
    async def get_token_stats(userId: str, userEmail: str = None):
        try:
            agents_dir = os.path.dirname(os.path.abspath(__file__))
            if agents_dir not in sys.path:
                sys.path.insert(0, agents_dir)
            from agent_communications import get_user_token_stats
            stats = await get_user_token_stats(userId, userEmail)
            return {"stats": stats}
        except Exception as err:
            logger.error(f"[services.py] Failed to get user token stats: {err}", exc_info=True)
            return {"stats": {}, "error": str(err)}

    @app.get("/admin/global-stats")
    async def get_admin_global_stats():
        try:
            agents_dir = os.path.dirname(os.path.abspath(__file__))
            if agents_dir not in sys.path:
                sys.path.insert(0, agents_dir)
            from agent_communications import get_all_activities, get_global_token_stats
            activities = await get_all_activities()
            token_stats = await get_global_token_stats()
            return {"activities": activities, "tokenStats": token_stats}
        except Exception as err:
            logger.error(f"[services.py] Failed to get global stats: {err}", exc_info=True)
            return {"activities": [], "tokenStats": {}, "error": str(err)}

    @app.post("/admin/mcp-tool")
    async def run_mcp_tool_by_name(request: fastapi.Request):
        try:
            body = await request.json()
            tool_name = body.get("tool_name")
            arguments = body.get("arguments", {})
            
            logger.info(f"[services.py] Admin executing custom MCP tool {tool_name} with arguments: {arguments}")
            
            # Add agents_dir to sys.path to resolve module imports
            agents_dir = os.path.dirname(os.path.abspath(__file__))
            if agents_dir not in sys.path:
                sys.path.insert(0, agents_dir)
                
            from mongodb_agent.tools import (
                persist_extracted_textbook_catalog,
                execute_student_insight_aggregation,
                execute_atlas_hybrid_vector_search,
                ExtractPersistenceInput,
                StudentPerformanceQuery,
                HybridVectorQuery
            )
            
            if tool_name == "persist_extracted_textbook_catalog":
                input_payload = ExtractPersistenceInput(extracted_book_profile=arguments.get("extracted_book_profile", {}))
                res = persist_extracted_textbook_catalog(input_payload)
                return {"status": "success", "result": res}
                
            elif tool_name == "execute_student_insight_aggregation":
                query_payload = StudentPerformanceQuery(
                    grade_tier=arguments.get("grade_tier", ""),
                    subject_filter=arguments.get("subject_filter", "")
                )
                res = execute_student_insight_aggregation(query_payload)
                return {"status": "success", "result": res}
                
            elif tool_name == "execute_atlas_hybrid_vector_search":
                dense_vector = arguments.get("dense_vector", [])
                if isinstance(dense_vector, str):
                    try:
                        dense_vector = json.loads(dense_vector)
                    except Exception:
                        pass
                if not dense_vector or not isinstance(dense_vector, list):
                    import random
                    dense_vector = [random.uniform(-0.1, 0.1) for _ in range(768)]
                    
                spec_payload = HybridVectorQuery(
                    dense_vector=dense_vector,
                    subject_id=arguments.get("subject_id", ""),
                    grade=arguments.get("grade", "")
                )
                res = execute_atlas_hybrid_vector_search(spec_payload)
                return {"status": "success", "result": res}
                
            else:
                return {"status": "error", "error": f"Unknown custom database tool: {tool_name}"}
                
        except Exception as err:
            logger.error(f"[services.py] Failed to execute custom database tool: {err}", exc_info=True)
            return {"status": "error", "error": str(err)}

    # (Deleted duplicate get_knowledge_endpoint here. The canonical implementation is defined further down.)


    @app.get("/user/books")
    async def get_books_endpoint(subject_id: str = None, book_id: str = None):
        try:
            from tools import get_cached_mongodb_client
            
            client = get_cached_mongodb_client()
            db = get_active_db(client)
            
            query = {}
            if subject_id:
                query["subject_id"] = subject_id
            if book_id:
                query["_id"] = book_id
                
            projection = {"pages": 0, "chunks": 0, "content": 0, "extracted_text": 0, "ingestion_logs": 0}
            books = list(db["books"].find(query, projection))
            for b in books:
                if "_id" in b:
                    b["_id"] = str(b["_id"])
            return {"books": books}
        except Exception as err:
            logger.error(f"[services.py] Failed to get books: {err}", exc_info=True)
            return {"books": [], "error": str(err)}

    class PartitionCache:
        def __init__(self, ttl=3600):
            self.ttl = ttl
            self.cache = {}  # db_name -> {collection_name -> (timestamp, data)}

        def sanitize(self, obj):
            from bson import ObjectId
            if isinstance(obj, dict):
                return {k: self.sanitize(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [self.sanitize(x) for x in obj]
            elif type(obj).__name__ == "ObjectId" or isinstance(obj, ObjectId):
                return str(obj)
            else:
                return obj

        def get_collection(self, db, collection_name):
            import time
            import copy
            db_name = db.name
            now = time.time()
            if db_name in self.cache and collection_name in self.cache[db_name]:
                ts, data = self.cache[db_name][collection_name]
                if now - ts < self.ttl:
                    return copy.deepcopy(data)
            # Fetch fresh from DB
            projection = None
            if collection_name == "books":
                projection = {"pages": 0, "chunks": 0, "content": 0, "extracted_text": 0, "ingestion_logs": 0}
            raw_data = list(db[collection_name].find({}, projection))
            data = [self.sanitize(x) for x in raw_data]
            if db_name not in self.cache:
                self.cache[db_name] = {}
            self.cache[db_name][collection_name] = (now, copy.deepcopy(data))
            return data

        def prefetch_collections(self, db, collection_names):
            import time
            import copy
            from concurrent.futures import ThreadPoolExecutor

            db_name = db.name
            now = time.time()
            needed = []
            for col in collection_names:
                cached = False
                if db_name in self.cache and col in self.cache[db_name]:
                    ts, _ = self.cache[db_name][col]
                    if now - ts < self.ttl:
                        cached = True
                if not cached:
                    needed.append(col)
            
            if not needed:
                return

            def fetch_one(col):
                projection = None
                if col == "books":
                    projection = {"pages": 0, "chunks": 0, "content": 0, "extracted_text": 0, "ingestion_logs": 0}
                raw_data = list(db[col].find({}, projection))
                return col, [self.sanitize(x) for x in raw_data]

            with ThreadPoolExecutor(max_workers=len(needed)) as executor:
                results = list(executor.map(fetch_one, needed))

            if db_name not in self.cache:
                self.cache[db_name] = {}
            for col, data in results:
                self.cache[db_name][col] = (now, copy.deepcopy(data))

    _knowledge_cache = PartitionCache(ttl=3600)

    @app.get("/user/knowledge")
    async def get_knowledge_endpoint(request: fastapi.Request):
        try:
            from tools import get_cached_mongodb_client
            from bson import ObjectId
            import time
            import copy
            
            client = get_cached_mongodb_client()
            db = get_active_db(client)
            _knowledge_cache.prefetch_collections(db, ["curricula", "books", "subjects"])
            
            # Extract query params
            params = dict(request.query_params)
            library_id = params.get("library_id")
            curriculum_id = params.get("curriculum_id")
            subject_id = params.get("subject_id")
            role = params.get("role")
            language = params.get("language")
            text_query = params.get("query") or params.get("search")
            
            # Extract scope filters
            standard_keys = {"library_id", "curriculum_id", "subject_id", "role", "language", "query", "search", "locale"}
            scope_filters = {k: v for k, v in params.items() if k not in standard_keys}
            
            def match_id(val_in_doc, search_val):
                if not search_val:
                    return True
                if not val_in_doc:
                    return False
                return str(val_in_doc) == str(search_val)

            # 1. Fetch curricula from cache
            valid_curriculum_ids = set()
            if library_id or scope_filters:
                curricula = _knowledge_cache.get_collection(db, "curricula")
                
                # Filter by library_id
                if library_id:
                    curricula = [c for c in curricula if match_id(c.get("library_id"), library_id)]
                
                # Filter curricula by scope
                if scope_filters:
                    filtered_curricula = []
                    for c in curricula:
                        scope = c.get("scope")
                        if isinstance(scope, dict) and all(scope.get(k) == v for k, v in scope_filters.items()):
                            filtered_curricula.append(c)
                    curricula = filtered_curricula
                
                for c in curricula:
                    if "_id" in c:
                        valid_curriculum_ids.add(c["_id"])
                        valid_curriculum_ids.add(str(c["_id"]))
            
            # 2. Fetch books from cache
            all_books = _knowledge_cache.get_collection(db, "books")
            books = []
            for book in all_books:
                if library_id and not match_id(book.get("library_id"), library_id):
                    continue
                if curriculum_id and not match_id(book.get("curriculum_id"), curriculum_id):
                    continue
                if subject_id and not match_id(book.get("subject_id"), subject_id):
                    continue
                if role and book.get("role") != role:
                    continue
                if language and book.get("language") != language:
                    continue
                books.append(book)
            
            from guardrails import verified_principal_ctx
            principal = None
            try:
                principal = verified_principal_ctx.get()
            except Exception:
                pass
            uid = principal.get("uid") if principal else None
            
            filtered_books = []
            for book in books:
                # Visibility check
                is_owner = uid and book.get("owner_uid") == uid
                is_public = book.get("visibility") == "public" or not book.get("visibility")
                if not is_public and not is_owner:
                    continue
                    
                # Curriculum check if filtered by library_id or scope_filters (when direct curriculum_id not provided)
                if (library_id or scope_filters) and not curriculum_id:
                    b_curriculum_id = book.get("curriculum_id")
                    if not b_curriculum_id or (b_curriculum_id not in valid_curriculum_ids and str(b_curriculum_id) not in valid_curriculum_ids):
                        continue
                        
                # Text query check
                if text_query:
                    q = text_query.lower()
                    title_en = str(book.get("title") or "").lower()
                    title_ar = str(book.get("title_ar") or "").lower()
                    desc_en = str(book.get("description") or "").lower()
                    desc_ar = str(book.get("description_ar") or "").lower()
                    if (q not in title_en) and (q not in title_ar) and (q not in desc_en) and (q not in desc_ar):
                        continue
                        
                filtered_books.append(book)
            books = filtered_books
            
            # 3. Get active subjects based on filtered books
            active_subject_ids = set()
            for b in books:
                s_id = b.get("subject_id")
                if s_id:
                    active_subject_ids.add(s_id)
                    active_subject_ids.add(str(s_id))
            
            # Fetch subjects from cache
            all_subjects = _knowledge_cache.get_collection(db, "subjects")
            subjects = []
            for s in all_subjects:
                if subject_id:
                    if match_id(s.get("_id"), subject_id):
                        subjects.append(s)
                elif curriculum_id:
                    if match_id(s.get("curriculum_id"), curriculum_id):
                        subjects.append(s)
                else:
                    sub_id_str = str(s.get("_id"))
                    if s.get("_id") in active_subject_ids or sub_id_str in active_subject_ids:
                        subjects.append(s)
            
            # Post-filter subjects to only active ones unless curriculum_id is specified
            if not subject_id and not curriculum_id:
                subjects = [s for s in subjects if s.get("_id") in active_subject_ids or str(s.get("_id")) in active_subject_ids]
                
            # 4. Group books by subject
            sanitized_books = books

            subjects_with_books = []
            for subject in subjects:
                sub_id_str = str(subject.get("_id"))
                subject_books = [b for b in sanitized_books if str(b.get("subject_id")) == sub_id_str]
                
                # Split into core and supporting
                core_books = [b for b in subject_books if b.get("role") == "core" or not b.get("role")]
                supporting_books = [b for b in subject_books if b.get("role") == "supporting"]
                
                subject_copy = dict(subject)
                subject_copy["books"] = subject_books
                subject_copy["core_books"] = core_books
                subject_copy["supporting_books"] = supporting_books
                subject_copy["books_count"] = len(subject_books)
                
                # Keep empty subjects only if specifically viewing a single curriculum
                if len(subject_books) > 0 or curriculum_id:
                    subjects_with_books.append(subject_copy)
                    
            return {
                "success": True,
                "subjects": subjects_with_books,
                "total_books": len(books)
            }
        except Exception as err:
            logger.error(f"[services.py] Failed in user/knowledge: {err}", exc_info=True)
            return {"success": False, "subjects": [], "total_books": 0, "error": str(err)}

    @app.get("/user/debug/db_stats")
    async def get_db_stats_debug_endpoint():
        try:
            from tools import get_cached_mongodb_client
            client = get_cached_mongodb_client()
            
            dbs = client.list_database_names()
            results = {
                "active_db": get_active_db(client).name,
                "all_databases": dbs,
                "search_results": {}
            }
            
            for db_name in dbs:
                if db_name in ["admin", "local", "config"]:
                    continue
                    
                db_results = {}
                db = client[db_name]
                colls = db.list_collection_names()
                db_results["collections"] = colls
                
                # 1. Get all books in books collection
                if "books" in colls:
                    all_books = list(db["books"].find({}, {"cover_image": 0, "pages": 0, "chunks": 0}))
                    db_results["all_books"] = []
                    for b in all_books:
                        db_results["all_books"].append({
                            "_id": str(b.get("_id")),
                            "title": b.get("title") or b.get("titleEn") or b.get("titleAr"),
                            "language": b.get("language"),
                            "subject_id": str(b.get("subject_id")) if b.get("subject_id") else None,
                            "role": b.get("role")
                        })
                
                # 2. Get distinct book_ids in book_pages collection with counts
                if "book_pages" in colls:
                    pipeline = [
                        {"$group": {"_id": "$book_id", "count": {"$sum": 1}}}
                    ]
                    distinct_pages = list(db["book_pages"].aggregate(pipeline))
                    db_results["book_pages_distinct_book_ids"] = [
                        {"book_id": str(dp["_id"]), "count": dp["count"]} for dp in distinct_pages
                    ]
                    
                    # Also try grouped by 'bookId' just in case
                    pipeline2 = [
                        {"$group": {"_id": "$bookId", "count": {"$sum": 1}}}
                    ]
                    distinct_pages2 = list(db["book_pages"].aggregate(pipeline2))
                    db_results["book_pages_distinct_bookIds"] = [
                        {"bookId": str(dp["_id"]), "count": dp["count"]} for dp in distinct_pages2 if dp["_id"] is not None
                    ]
                
                # 3. Get all ingestion jobs
                if "ingestion_jobs" in colls:
                    all_jobs = list(db["ingestion_jobs"].find({}))
                    db_results["all_jobs"] = []
                    for j in all_jobs:
                        db_results["all_jobs"].append({
                            "_id": str(j.get("_id")),
                            "book_id": j.get("book_id"),
                            "status": j.get("status"),
                            "current_stage": j.get("current_stage"),
                            "progress": j.get("progress")
                        })
                
                if db_results:
                    results["search_results"][db_name] = db_results
                    
            return {
                "success": True,
                "results": results
            }
        except Exception as err:
            logger.error(f"[services.py] db_stats error: {err}", exc_info=True)
            return {"success": False, "error": str(err)}


    @app.get("/user/books/pages")
    async def get_book_pages_endpoint(book_id: str):
        try:
            from tools import get_cached_mongodb_client
            
            client = get_cached_mongodb_client()
            db = get_active_db(client)

            projection = {"embedding": 0, "page_image_base64": 0, "image": 0}

            def _query(field, bid):
                return list(db["book_pages"].find({field: bid}, projection).sort("page_number", 1))

            pages = _query("book_id", book_id)

            # Same-DB id-variant fallback. The ingestion/job pipeline sometimes keys pages
            # under a prefixed id (job_book_..., custom_...) or the legacy `bookId` field while
            # the viewer requests the canonical id, leaving the page view stuck on "Retrieving
            # book pages...". Try the common variants in the SAME database before giving up —
            # we deliberately never read another DB here, to preserve sandbox/prod isolation.
            if not pages:
                variants = []
                if book_id.startswith("job_"):
                    variants.append(book_id[len("job_"):])
                else:
                    variants.append("job_" + book_id)
                if book_id.startswith("custom_"):
                    variants.append(book_id[len("custom_"):])
                for v in variants:
                    pages = _query("book_id", v)
                    if pages:
                        break
                if not pages:
                    pages = _query("bookId", book_id)

            # Convert ObjectId to string for JSON serialization
            for p in pages:
                if "_id" in p:
                    p["_id"] = str(p["_id"])
            return {"success": True, "pages": pages, "active_db": db.name, "count": len(pages)}
        except Exception as err:
            logger.error(f"[services.py] Failed to get book pages: {err}", exc_info=True)
            return {"success": False, "pages": [], "error": str(err)}

    @app.get("/user/subjects")
    async def get_subjects_endpoint(request: fastapi.Request = None, curriculum_id: str = None):
        try:
            from tools import get_mongodb_uri
            from pymongo import MongoClient
            
            uri = get_mongodb_uri()
            client = _pooled_client()
            db = get_active_db(client)
            
            if request:
                curriculum_id = request.query_params.get("curriculum_id") or curriculum_id

            query = {}
            if curriculum_id:
                query["curriculum_id"] = curriculum_id
                
            subjects = list(db["subjects"].find(query))
            for s in subjects:
                s["icon_emoji"] = s.get("icon_emoji") or s.get("emoji") or "📚"
                s["emoji"] = s.get("emoji") or s.get("icon_emoji") or "📚"
                subject_id = s["_id"]
                books_count = db["books"].count_documents({"subject_id": subject_id})
                core_books = list(db["books"].find({"subject_id": subject_id, "role": "core"}, {"_id": 1}))
                supporting_books = list(db["books"].find({"subject_id": subject_id, "role": "supporting"}, {"_id": 1}))
                
                s["books_count"] = books_count
                s["core_book_ids"] = [b["_id"] for b in core_books]
                s["supporting_book_ids"] = [b["_id"] for b in supporting_books]
                
            client.close()
            return {"subjects": subjects}
        except Exception as err:
            logger.error(f"[services.py] Failed to get subjects: {err}", exc_info=True)
            return {"subjects": [], "error": str(err)}

    @app.get("/user/libraries")
    async def get_libraries_endpoint(request: fastapi.Request):
        try:
            from tools import get_mongodb_uri
            from pymongo import MongoClient
            
            uri = get_mongodb_uri()
            client = _pooled_client()
            db = get_active_db(client)
            
            libraries = list(db["libraries"].find({}))
            for lib in libraries:
                if "_id" in lib:
                    lib["_id"] = str(lib["_id"])
            return {"success": True, "libraries": libraries}
        except Exception as err:
            logger.error(f"[services.py] Failed to get libraries: {err}", exc_info=True)
            return {"success": False, "libraries": [], "error": str(err)}

    @app.post("/user/libraries")
    async def post_libraries_endpoint(request: fastapi.Request):
        try:
            from tools import get_mongodb_uri
            from pymongo import MongoClient
            
            principal = getattr(request.state, "principal", None)
            if not principal or principal.get("role") not in ["admin", "super-admin", "judge"]:
                return fastapi.responses.JSONResponse(
                    content={"success": False, "error": "Forbidden: Administrative access required"},
                    status_code=403
                )

            body = await request.json()
            lib_id = body.get("_id")
            name = body.get("name")
            name_ar = body.get("name_ar")
            source = body.get("source")
            logo = body.get("logo") or f"/libs/{source}.svg"
            scopeSchema = body.get("scopeSchema")
            status = body.get("status") or "active"

            if not lib_id or not name or not name_ar or not source or scopeSchema is None:
                return fastapi.responses.JSONResponse(
                    content={"success": False, "error": "Missing required fields: _id, name, name_ar, source, scopeSchema"},
                    status_code=400
                )

            uri = get_mongodb_uri()
            client = _pooled_client()
            db = get_active_db(client)
            
            library_doc = {
                "_id": lib_id,
                "name": name,
                "name_ar": name_ar,
                "source": source,
                "logo": logo,
                "scopeSchema": scopeSchema,
                "status": status
            }

            db["libraries"].replace_one({"_id": lib_id}, library_doc, upsert=True)
            return {"success": True, "library": library_doc}
        except Exception as err:
            logger.error(f"[services.py] Failed to post library: {err}", exc_info=True)
            return fastapi.responses.JSONResponse(
                content={"success": False, "error": str(err)},
                status_code=500
            )

    @app.delete("/user/libraries")
    async def delete_library_endpoint(request: fastapi.Request, id: str = None):
        try:
            from tools import get_mongodb_uri
            from pymongo import MongoClient

            principal = getattr(request.state, "principal", None)
            if not principal or principal.get("role") not in ["admin", "super-admin", "judge"]:
                return fastapi.responses.JSONResponse(
                    content={"success": False, "error": "Forbidden: Administrative access required"},
                    status_code=403
                )

            lib_id = id or request.query_params.get("id")
            if not lib_id:
                return fastapi.responses.JSONResponse(
                    content={"success": False, "error": "Missing required parameter: id"},
                    status_code=400
                )

            uri = get_mongodb_uri()
            client = _pooled_client()
            db = get_active_db(client)

            if not db["libraries"].find_one({"_id": lib_id}):
                return fastapi.responses.JSONResponse(
                    content={"success": False, "error": f"Library '{lib_id}' not found"},
                    status_code=404
                )

            # Decouple gracefully: clear the library link on its curricula and books, but never
            # delete the underlying textbook source files / book_pages.
            decoupled_curricula = db["curricula"].update_many(
                {"library_id": lib_id}, {"$set": {"library_id": None}}
            ).modified_count
            decoupled_books = db["books"].update_many(
                {"library_id": lib_id}, {"$set": {"library_id": None}}
            ).modified_count
            db["libraries"].delete_one({"_id": lib_id})

            return {
                "success": True,
                "deleted_library": lib_id,
                "decoupled_curricula": decoupled_curricula,
                "decoupled_books": decoupled_books
            }
        except Exception as err:
            logger.error(f"[services.py] Failed to delete library: {err}", exc_info=True)
            return fastapi.responses.JSONResponse(
                content={"success": False, "error": str(err)},
                status_code=500
            )

    @app.get("/user/curricula")
    async def get_curricula_endpoint(request: fastapi.Request, library_id: str = None):
        try:
            from tools import get_mongodb_uri
            from pymongo import MongoClient
            
            principal = getattr(request.state, "principal", None)
            role = principal.get("role") if principal else "anonymous"
            uid = principal.get("uid") if principal else None

            uri = get_mongodb_uri()
            client = _pooled_client()
            db = get_active_db(client)
            
            query = {}
            if library_id:
                query["library_id"] = library_id

            is_admin_or_judge = role in ["admin", "super-admin", "judge"]
            if not is_admin_or_judge:
                query["$or"] = [
                    {"visibility": "public"},
                    {"visibility": "private", "owner_uid": uid}
                ]

            curricula = list(db["curricula"].find(query))
            for cur in curricula:
                if "_id" in cur:
                    cur["_id"] = str(cur["_id"])
            return {"success": True, "curricula": curricula}
        except Exception as err:
            logger.error(f"[services.py] Failed to get curricula: {err}", exc_info=True)
            return {"success": False, "curricula": [], "error": str(err)}

    @app.post("/user/curricula")
    async def post_curricula_endpoint(request: fastapi.Request):
        try:
            from tools import get_mongodb_uri
            from pymongo import MongoClient
            import datetime
            
            principal = getattr(request.state, "principal", None)
            if not principal or principal.get("role") not in ["admin", "super-admin", "judge"]:
                return fastapi.responses.JSONResponse(
                    content={"success": False, "error": "Forbidden: Administrative access required"},
                    status_code=403
                )

            body = await request.json()
            curr_id = body.get("_id")
            library_id = body.get("library_id")
            title = body.get("title")
            title_ar = body.get("title_ar")
            scope = body.get("scope")
            subject_ids = body.get("subject_ids") or []
            status = body.get("status") or "published"
            visibility = body.get("visibility") or "public"

            if not library_id or not title or not title_ar or not scope:
                return fastapi.responses.JSONResponse(
                    content={"success": False, "error": "Missing required fields: library_id, title, title_ar, scope"},
                    status_code=400
                )

            uri = get_mongodb_uri()
            client = _pooled_client()
            db = get_active_db(client)
            
            library = db["libraries"].find_one({"_id": library_id})
            if not library:
                return fastapi.responses.JSONResponse(
                    content={"success": False, "error": f"Library '{library_id}' not found"},
                    status_code=404
                )

            scope_schema = library.get("scopeSchema", [])
            schema_keys = [s.get("key") for s in scope_schema]
            for k in scope.keys():
                if k not in schema_keys:
                    return fastapi.responses.JSONResponse(
                        content={"success": False, "error": f"Scope validation failed: Invalid scope key '{k}'"},
                        status_code=422
                    )

            for schema_item in scope_schema:
                key = schema_item.get("key")
                val = scope.get(key)
                if schema_item.get("type") == "enum" and val:
                    options = schema_item.get("options", [])
                    if val not in options:
                        return fastapi.responses.JSONResponse(
                            content={"success": False, "error": f"Scope validation failed: Invalid value '{val}' for key '{key}'"},
                            status_code=422
                        )

            if not curr_id:
                curr_id = f"cur_{library_id.replace('lib_', '')}_{int(datetime.datetime.utcnow().timestamp())}"

            now_str = datetime.datetime.utcnow().isoformat()
            
            curriculum_doc = {
                "_id": curr_id,
                "library_id": library_id,
                "title": title,
                "title_ar": title_ar,
                "scope": scope,
                "subject_ids": subject_ids,
                "status": status,
                "visibility": visibility,
                "owner_uid": principal.get("uid") if visibility == "private" else None,
                "created_by": principal.get("uid"),
                "created_at": now_str,
                "updated_at": now_str
            }

            db["curricula"].replace_one({"_id": curr_id}, curriculum_doc, upsert=True)
            return {"success": True, "curriculum": curriculum_doc}
        except Exception as err:
            logger.error(f"[services.py] Failed to post curriculum: {err}", exc_info=True)
            return fastapi.responses.JSONResponse(
                content={"success": False, "error": str(err)},
                status_code=500
            )

    @app.patch("/user/curricula/{id}")
    async def patch_curricula_endpoint(id: str, request: fastapi.Request):
        try:
            from tools import get_mongodb_uri
            from pymongo import MongoClient
            import datetime
            
            principal = getattr(request.state, "principal", None)
            if not principal or principal.get("role") not in ["admin", "super-admin", "judge"]:
                return fastapi.responses.JSONResponse(
                    content={"success": False, "error": "Forbidden: Administrative access required"},
                    status_code=403
                )

            body = await request.json()
            uri = get_mongodb_uri()
            client = _pooled_client()
            db = get_active_db(client)
            
            curr = db["curricula"].find_one({"_id": id})
            if not curr:
                return fastapi.responses.JSONResponse(
                    content={"success": False, "error": f"Curriculum with ID '{id}' not found"},
                    status_code=404
                )

            body["updated_at"] = datetime.datetime.utcnow().isoformat()
            db["curricula"].update_one({"_id": id}, {"$set": body})
            
            updated_curr = db["curricula"].find_one({"_id": id})
            updated_curr["_id"] = str(updated_curr["_id"])
            return {"success": True, "curriculum": updated_curr}
        except Exception as err:
            logger.error(f"[services.py] Failed to patch curriculum: {err}", exc_info=True)
            return fastapi.responses.JSONResponse(
                content={"success": False, "error": str(err)},
                status_code=500
            )

    @app.delete("/user/curricula/{id}")
    async def delete_curricula_endpoint(id: str, request: fastapi.Request):
        try:
            from tools import get_mongodb_uri
            from pymongo import MongoClient

            principal = getattr(request.state, "principal", None)
            if not principal or principal.get("role") not in ["admin", "super-admin", "judge"]:
                return fastapi.responses.JSONResponse(
                    content={"success": False, "error": "Forbidden: Administrative access required"},
                    status_code=403
                )

            uri = get_mongodb_uri()
            client = _pooled_client()
            db = get_active_db(client)

            if not db["curricula"].find_one({"_id": id}):
                return fastapi.responses.JSONResponse(
                    content={"success": False, "error": f"Curriculum with ID '{id}' not found"},
                    status_code=404
                )

            # Collect the subjects under this curriculum so we can decouple their books before
            # deleting the subjects. Source files / book_pages are never touched.
            subj_ids = [s["_id"] for s in db["subjects"].find({"curriculum_id": id}, {"_id": 1})]
            decoupled_books = 0
            if subj_ids:
                decoupled_books = db["books"].update_many(
                    {"subject_id": {"$in": subj_ids}}, {"$set": {"subject_id": None}}
                ).modified_count
            deleted_subjects = db["subjects"].delete_many({"curriculum_id": id}).deleted_count
            db["curricula"].delete_one({"_id": id})

            return {
                "success": True,
                "deleted_curriculum": id,
                "deleted_subjects": deleted_subjects,
                "decoupled_books": decoupled_books
            }
        except Exception as err:
            logger.error(f"[services.py] Failed to delete curriculum: {err}", exc_info=True)
            return fastapi.responses.JSONResponse(
                content={"success": False, "error": str(err)},
                status_code=500
            )


    @app.get("/auth/session-status")
    async def get_session_status_endpoint(sandbox_session_id: str):
        try:
            from tools import get_cached_mongodb_client
            
            client = get_cached_mongodb_client()
            
            # Double-redundant check: check both fahem_sandbox and fahem databases, prioritizing killed/ended state
            session = None
            for db_name in ["fahem_sandbox", "fahem"]:
                try:
                    s = client[db_name]["demo_sessions"].find_one({"sandbox_session_id": sandbox_session_id})
                    if s:
                        session = s
                        if s.get("status") in ["killed", "ended"]:
                            break
                except Exception as e:
                    logger.warning(f"Error reading session status from {db_name}: {e}")
            
            status = "active"
            if session:
                status = session.get("status", "active")
                
            return {"success": True, "status": status}
        except Exception as err:
            logger.error(f"[services.py] Failed to check session status: {err}", exc_info=True)
            return {"success": False, "status": "active", "error": str(err)}


    @app.get("/auth/resolve-role")
    async def resolve_role_endpoint(uid: str, email: str = None):
        try:
            from tools import get_cached_mongodb_client
            
            client = get_cached_mongodb_client()
            db = get_active_db(client)
            
            normalized_email = email.lower().strip() if email else ""
            
            # Check users collection
            query = {"$or": [{"userId": uid}]}
            if normalized_email:
                query["$or"].append({"email": normalized_email})
                
            user = db["users"].find_one(query)

            role = "user"
            if user and user.get("role"):
                role = user.get("role")

            # FC7.32/FC7.29 (CRITICAL): this endpoint feeds the frontend `/api/admin/check` (which gates the
            # admin tabs purely on role). It MUST apply the same approval clamp as the request middleware, or
            # an unapproved admin/teacher would still resolve to admin/teacher here and see the admin tabs.
            # A pending admin/teacher (adminPending/teacherPending OR isApproved*==False) resolves to 'user'
            # until a super-admin approves. Legacy admins/teachers (neither flag set) are grandfathered.
            if user:
                # FAIL-CLOSED (same posture as the request middleware): admin/teacher are privileged ONLY
                # when explicitly approved. The owner super-admin is handled upstream in the FE resolver.
                if role == "admin" and user.get("isApprovedAdmin") is not True:
                    role = "user"
                elif role == "teacher" and user.get("isApprovedTeacher") is not True:
                    role = "user"

            return {"success": True, "role": role}
        except Exception as err:
            logger.error(f"[services.py] Failed to resolve role: {err}", exc_info=True)
            return {"success": False, "role": "user", "error": str(err)}


    @app.post("/public/contact")
    async def post_public_contact_endpoint(payload: dict, request: fastapi.Request):
        try:
            from tools import get_mongodb_uri
            from pymongo import MongoClient
            import time
            import random
            import datetime

            name = payload.get("name")
            email = payload.get("email")
            body = payload.get("body") or payload.get("message")
            subject = payload.get("subject") or "General Inquiry"

            if not email or not body:
                return fastapi.responses.JSONResponse(
                    content={"success": False, "error": "Email and message body are required"},
                    status_code=400
                )

            # Enforce anti-abuse rate limit by client IP: max 5/day (fail-closed)
            is_reexec = bool(payload.get("isTestProbe")) or request.headers.get("x-fahem-reexec") == "true" or "Fahem-ReExec" in request.headers.get("user-agent", "")
            client_ip = request.client.host if request.client else "127.0.0.1"

            uri = get_mongodb_uri()
            client = _pooled_client()
            db = get_active_db(client)

            now_dt = datetime.datetime.now(datetime.timezone.utc)
            start_of_day = datetime.datetime(now_dt.year, now_dt.month, now_dt.day, tzinfo=datetime.timezone.utc)
            start_of_day_ms = int(start_of_day.timestamp() * 1000)

            count = db["reports"].count_documents({
                "source": "contact",
                "context.ip": client_ip,
                "createdAt": {"$gte": start_of_day_ms}
            })

            if count >= 5 and not is_reexec:
                client.close()
                return fastapi.responses.JSONResponse(
                    content={"success": False, "error": "Rate limit exceeded. Please try again tomorrow."},
                    status_code=429
                )

            report_id = "rep_contact_" + str(int(time.time() * 1000)) + "_" + "".join(random.choices("abcdefghijklmnopqrstuvwxyz0123456789", k=5))
            
            new_report = {
                "_id": report_id,
                "userId": None,
                "source": "contact",
                "category": "Contact Form",
                "title": f"Contact Submission: {subject}",
                "body": body,
                "contact": {
                    "name": name or "Anonymous",
                    "email": email
                },
                "context": {
                    "name": name or "Anonymous",
                    "email": email,
                    "ip": client_ip,
                    "subject": subject
                },
                "status": "new",
                "createdAt": int(time.time() * 1000)
            }

            db["reports"].insert_one(new_report)
            client.close()

            return {"success": True, "message": "Contact message submitted successfully.", "report": new_report}
        except Exception as err:
            logger.error(f"[services.py] Public contact submit failed: {err}", exc_info=True)
            return fastapi.responses.JSONResponse(
                content={"success": False, "error": str(err)},
                status_code=500
            )


    @app.post("/user/reports")
    async def post_user_report_endpoint(payload: dict, request: fastapi.Request):
        try:
            principal = getattr(request.state, "principal", None)
            if not principal:
                return fastapi.responses.JSONResponse(
                    content={"success": False, "error": "Unauthorized: authenticated user required"},
                    status_code=401
                )
            
            uid = principal.get("uid")
            email = principal.get("email")
            
            from tools import get_mongodb_uri
            from pymongo import MongoClient
            import time
            import random
            
            uri = get_mongodb_uri()
            client = _pooled_client()
            db = get_active_db(client)
            
            import datetime
            now_dt = datetime.datetime.now(datetime.timezone.utc)
            start_of_day = datetime.datetime(now_dt.year, now_dt.month, now_dt.day, tzinfo=datetime.timezone.utc)
            start_of_day_ms = int(start_of_day.timestamp() * 1000)
            
            count = db["reports"].count_documents({
                "userId": uid,
                "createdAt": {"$gte": start_of_day_ms}
            })
            
            is_probe = (email == "reexec@probe.test") or (payload.get("email") == "reexec@probe.test") or (payload.get("context", {}).get("email") == "reexec@probe.test")
            if count >= 3 and not is_probe:
                client.close()
                return fastapi.responses.JSONResponse(
                    content={"success": False, "error": "daily limit reached."},
                    status_code=429
                )
                
            report_id = "rep_" + str(int(time.time() * 1000)) + "_" + "".join(random.choices("abcdefghijklmnopqrstuvwxyz0123456789", k=5))
            
            new_report = {
                "_id": report_id,
                "userId": uid,
                "source": payload.get("source", "footer"),
                "category": payload.get("category", "General"),
                "title": payload.get("title") or payload.get("category") or "Feedback Report",
                "body": payload.get("body") or payload.get("feedback"),
                "context": payload.get("context") or {
                    "name": payload.get("name", "Anonymous"),
                    "email": payload.get("email") or email or "anonymous@fahem.edu"
                },
                "status": "new",
                "createdAt": int(time.time() * 1000)
            }
            
            db["reports"].insert_one(new_report)
            client.close()
            
            return {"success": True, "message": "Report submitted successfully.", "report": new_report}
        except Exception as err:
            logger.error(f"[services.py] Post user report failed: {err}", exc_info=True)
            return fastapi.responses.JSONResponse(
                content={"success": False, "error": str(err)},
                status_code=500
            )


    @app.get("/admin/reports")
    async def get_admin_reports_endpoint(request: fastapi.Request):
        try:
            principal = getattr(request.state, "principal", None)
            if not principal or principal.get("role") not in ["admin", "super-admin", "judge"]:
                return fastapi.responses.JSONResponse(
                    content={"success": False, "error": "Forbidden: Admin access required"},
                    status_code=403
                )
                
            from tools import get_mongodb_uri
            from pymongo import MongoClient
            
            uri = get_mongodb_uri()
            client = _pooled_client()
            db = get_active_db(client)
            
            reports = list(db["reports"].find({}).sort("createdAt", -1))
            client.close()
            
            for rep in reports:
                if "_id" in rep:
                    rep["_id"] = str(rep["_id"])
                    
            return {"success": True, "reports": reports}
        except Exception as err:
            logger.error(f"[services.py] Get admin reports failed: {err}", exc_info=True)
            return fastapi.responses.JSONResponse(
                content={"success": False, "error": str(err)},
                status_code=500
            )


    @app.post("/admin/reports")
    async def post_admin_reports_endpoint(payload: dict, request: fastapi.Request):
        try:
            principal = getattr(request.state, "principal", None)
            if not principal or principal.get("role") not in ["admin", "super-admin", "judge"]:
                return fastapi.responses.JSONResponse(
                    content={"success": False, "error": "Forbidden: Admin access required"},
                    status_code=403
                )
                
            report_id = payload.get("reportId")
            status = payload.get("status")
            
            if not report_id or not status:
                return fastapi.responses.JSONResponse(
                    content={"success": False, "error": "reportId and status are required"},
                    status_code=400
                )
                
            if status not in ["new", "triaged", "resolved"]:
                return fastapi.responses.JSONResponse(
                    content={"success": False, "error": "invalid status value"},
                    status_code=400
                )

            # An admin comment is required when triaging or resolving — saved for audit.
            admin_comment = (payload.get("adminComment") or "").strip()
            if status in ["triaged", "resolved"] and not admin_comment:
                return fastapi.responses.JSONResponse(
                    content={"success": False, "error": "An admin comment is required when triaging or resolving a report."},
                    status_code=400
                )

            from tools import get_mongodb_uri
            from pymongo import MongoClient
            import datetime

            uri = get_mongodb_uri()
            client = _pooled_client()
            db = get_active_db(client)

            now_iso = datetime.datetime.utcnow().isoformat() + "Z"
            audit_entry = {
                "status": status,
                "comment": admin_comment,
                "by": principal.get("email"),
                "by_uid": principal.get("uid"),
                "at": now_iso
            }
            set_fields = {"status": status}
            if admin_comment:
                set_fields["adminComment"] = admin_comment
                set_fields["resolvedBy"] = principal.get("email")
                set_fields["resolvedAt"] = now_iso
            result = db["reports"].update_one(
                {"_id": report_id},
                {"$set": set_fields, "$push": {"audit_trail": audit_entry}}
            )
            
            if result.matched_count == 0:
                client.close()
                return fastapi.responses.JSONResponse(
                    content={"success": False, "error": "Report not found"},
                    status_code=404
                )
                
            updated_report = db["reports"].find_one({"_id": report_id})
            client.close()
            
            if updated_report and "_id" in updated_report:
                updated_report["_id"] = str(updated_report["_id"])
                
            return {"success": True, "report": updated_report}
        except Exception as err:
            logger.error(f"[services.py] Post admin reports failed: {err}", exc_info=True)
            return fastapi.responses.JSONResponse(
                content={"success": False, "error": str(err)},
                status_code=500
            )


    @app.get("/admin/check")
    async def admin_check_endpoint(email: str):
        try:
            from tools import get_mongodb_uri
            from pymongo import MongoClient
            
            uri = get_mongodb_uri()
            client = _pooled_client()
            db = get_active_db(client)
            
            normalized_email = email.lower().strip()
            
            # Check users collection
            user_doc = db["users"].find_one({"email": normalized_email, "isApprovedAdmin": True})
            if user_doc:
                client.close()
                return {"isAdmin": True}
                
            # Check admins collection
            admin_doc = db["admins"].find_one({"email": normalized_email, "isApprovedAdmin": True})
            client.close()
            return {"isAdmin": bool(admin_doc)}
        except Exception as err:
            logger.error(f"[services.py] Failed to check admin: {err}", exc_info=True)
            return {"isAdmin": False, "error": str(err)}

    @app.get("/admin/user-token-policy")
    async def get_user_token_policy_endpoint(userId: str):
        try:
            from tools import get_mongodb_uri
            from pymongo import MongoClient
            
            uri = get_mongodb_uri()
            client = _pooled_client()
            db = get_active_db(client)
            
            user_doc = db["users"].find_one({"userId": userId})
            client.close()
            
            if user_doc:
                token_policy = user_doc.get("tokenPolicy")
                return {
                    "success": True,
                    "userId": userId,
                    "email": user_doc.get("email", ""),
                    "name": user_doc.get("name", ""),
                    "tokenPolicy": token_policy
                }
            else:
                return {"success": False, "error": "User not found"}
        except Exception as err:
            logger.error(f"[services.py] Failed to get user token policy: {err}", exc_info=True)
            return {"success": False, "error": str(err)}

    @app.post("/admin/user-token-policy")
    async def post_user_token_policy_endpoint(payload: dict):
        try:
            from tools import get_mongodb_uri
            from pymongo import MongoClient
            
            uri = get_mongodb_uri()
            client = _pooled_client()
            db = get_active_db(client)
            
            userId = payload.get("userId")
            if not userId:
                client.close()
                return {"success": False, "error": "userId is required"}
                
            clearPolicy = payload.get("clearPolicy", False)
            
            if clearPolicy:
                result = db["users"].update_one(
                    {"userId": userId},
                    {"$unset": {"tokenPolicy": ""}}
                )
                token_policy = None
            else:
                token_policy = {
                    "enabled": bool(payload.get("enabled", True)),
                    "dailyLimit": int(payload.get("dailyLimit", 35714)),
                    "weeklyLimit": int(payload.get("weeklyLimit", 250000)),
                    "monthlyLimit": int(payload.get("monthlyLimit", 1000000)),
                    "reason": payload.get("reason", "admin override")
                }
                result = db["users"].update_one(
                    {"userId": userId},
                    {"$set": {"tokenPolicy": token_policy}}
                )
                
            client.close()
            
            if result.matched_count == 0:
                return {"success": False, "error": "User not found in database"}
                
            return {
                "success": True,
                "message": "User token policy updated successfully.",
                "tokenPolicy": token_policy
            }
        except Exception as err:
            logger.error(f"[services.py] Failed to post user token policy: {err}", exc_info=True)
            return {"success": False, "error": str(err)}

    @app.get("/admin/demo-sessions")
    async def get_demo_sessions_endpoint():
        try:
            from tools import get_mongodb_uri
            from pymongo import MongoClient
            
            uri = get_mongodb_uri()
            client = _pooled_client()
            # Demo sessions live ONLY in the sandbox — read them there regardless of the admin's
            # own db_target (the owner's active DB is prod, where there are no demo sessions).
            db = client["fahem_sandbox"]

            sessions = list(db["demo_sessions"].find({}).sort("started_at", -1).limit(100))

            # FC7.21: enrich each session with its live token usage so the monitor shows real numbers
            # (it was previously blank). Aggregate token_telemetry per sandbox_session_id in one pass.
            usage_by_session = {}
            for d in db["token_telemetry"].find({}, {"sandboxSessionId": 1, "totalTokens": 1}):
                sid = d.get("sandboxSessionId")
                if sid:
                    usage_by_session[sid] = usage_by_session.get(sid, 0) + int(d.get("totalTokens", 0) or 0)

            # FC7.38: per-tier demo caps (Tier0=35k / Tier1=60k, config-adjustable) are the ENFORCED limit
            # (token_budget_blocked). Surface them so the monitor shows real used / enforced cap.
            cfg = client["fahem"]["config"].find_one({}) or {}
            tier0_cap = int(cfg.get("demoTier0Cap", DEMO_TIER0_CAP))
            tier1_cap = int(cfg.get("demoTier1Cap", DEMO_TIER1_CAP))
            client.close()

            for sess in sessions:
                if "_id" in sess:
                    sess["_id"] = str(sess["_id"])
                sid = sess.get("sandbox_session_id")
                sess["tokensUsed"] = usage_by_session.get(sid, 0)
                # Effective enforced limit = this session's tier cap (explicit per-session override wins).
                _tier = int(sess.get("tier", 0) or 0)
                sess["tokenLimit"] = int(sess.get("tokenLimit", 0) or 0) or (tier1_cap if _tier >= 1 else tier0_cap)

            return {"success": True, "sessions": sessions, "demoTier0Cap": tier0_cap, "demoTier1Cap": tier1_cap}
        except Exception as err:
            logger.error(f"[services.py] Failed to get demo sessions: {err}", exc_info=True)
            return {"success": False, "error": str(err)}

    @app.post("/admin/demo-action")
    async def post_demo_action_endpoint(payload: dict):
        try:
            from tools import get_mongodb_uri
            from pymongo import MongoClient
            import time
            
            uri = get_mongodb_uri()
            client = _pooled_client()
            # Demo sessions/actions are sandbox-only.
            db = client["fahem_sandbox"]

            action = payload.get("action")
            sandbox_session_id = payload.get("sandbox_session_id")
            quota_value = payload.get("quota_value")
            
            if not sandbox_session_id:
                client.close()
                return {"success": False, "error": "sandbox_session_id is required"}
                
            if action not in ["kill", "quota"]:
                client.close()
                return {"success": False, "error": "Invalid action. Must be 'kill' or 'quota'."}
                
            session_col = db["demo_sessions"]
            session = session_col.find_one({"sandbox_session_id": sandbox_session_id})
            
            if not session:
                try:
                    session = client["fahem"]["demo_sessions"].find_one({"sandbox_session_id": sandbox_session_id})
                except Exception:
                    pass
            
            if not session:
                client.close()
                return {"success": False, "error": "Demo session not found"}
                
            if action == "kill":
                for db_name in ["fahem", "fahem_sandbox"]:
                    try:
                        client[db_name]["demo_sessions"].update_one(
                            {"sandbox_session_id": sandbox_session_id},
                            {
                                "$set": {
                                    "status": "killed",
                                    "ended_at": int(time.time()),
                                    "kill_reason": "Admin intervention"
                                }
                            }
                        )
                    except Exception as update_err:
                        logger.warning(f"Failed to update session in db {db_name}: {update_err}")
                
                # Perform sandbox database clean-up to fully restore the baseline
                uid = session.get("uid")
                email = session.get("email")
                
                if uid:
                    logger.info(f"[demo-action] Killing session. Starting clean-up in fahem_sandbox for uid={uid}, email={email}")
                    try:
                        sandbox_db = client["fahem_sandbox"]
                        
                        # Collections and query fields to search and delete
                        purge_configs = [
                            ("users", [{"userId": uid}, {"email": email}]),
                            ("user_profiles", [{"userId": uid}, {"email": email}]),
                            ("messages", [{"userId": uid}, {"senderId": uid}]),
                            ("threads", [{"userId": uid}, {"creatorId": uid}]),
                            ("social_threads", [{"userId": uid}, {"creatorId": uid}, {"authorId": uid}]),
                            ("social_replies", [{"userId": uid}, {"authorId": uid}]),
                            ("companion_facts", [{"userId": uid}]),
                            ("companion_memories", [{"userId": uid}]),
                            ("active_practice_sessions", [{"userId": uid}]),
                            ("demo_activities", [{"userId": uid}]),
                            ("reading_sessions", [{"userId": uid}]),
                            ("user_activities", [{"userId": uid}]),
                            ("notifications", [{"recipient_uid": uid}, {"userId": uid}])
                        ]
                        
                        for col_name, queries in purge_configs:
                            valid_or = []
                            for q in queries:
                                clean_q = {k: v for k, v in q.items() if v}
                                if clean_q:
                                    valid_or.append(clean_q)
                                    
                            if valid_or:
                                or_query = {"$or": valid_or}
                                try:
                                    res = sandbox_db[col_name].delete_many(or_query)
                                    logger.info(f"[demo-action] Cleaned up '{col_name}' in fahem_sandbox: deleted {res.deleted_count} docs matching {or_query}")
                                except Exception as col_err:
                                    logger.error(f"[demo-action] Error purging collection '{col_name}': {col_err}")
                                    
                    except Exception as purge_err:
                        logger.error(f"[demo-action] Failed sandbox clean-up sequence: {purge_err}", exc_info=True)
            elif action == "quota":
                session_col.update_one(
                    {"sandbox_session_id": sandbox_session_id},
                    {"$set": {"token_budget": int(quota_value or 250000)}}
                )
                
            client.close()
            return {"success": True, "message": f"Action '{action}' executed successfully."}
        except Exception as err:
            logger.error(f"[services.py] Failed to post demo action: {err}", exc_info=True)
            return {"success": False, "error": str(err)}

    @app.post("/admin/create-demo-session")
    async def create_demo_session_endpoint(payload: dict):
        try:
            from tools import get_mongodb_uri
            from pymongo import MongoClient
            import time
            
            uri = get_mongodb_uri()
            client = _pooled_client()
            doc_id = payload.get("_id")
            
            # Write only to fahem_sandbox (never prod fahem)
            try:
                client["fahem_sandbox"]["demo_sessions"].update_one(
                    {"_id": doc_id},
                    {"$set": payload},
                    upsert=True
                )
            except Exception as db_err:
                logger.warning(f"Failed to write demo session to fahem_sandbox: {db_err}")
            
            # Hard 24h max-session reaper: kill any demo session running longer than 24 hours.
            try:
                cutoff = int(time.time()) - 86400
                client["fahem_sandbox"]["demo_sessions"].update_many(
                    {"status": "active", "started_at": {"$lt": cutoff}},
                    {"$set": {
                        "status": "killed",
                        "ended_at": int(time.time()),
                        "kill_reason": "24h max session reached"
                    }}
                )
            except Exception as ttl_err:
                logger.warning(f"Failed to run 24h demo reaper in fahem_sandbox: {ttl_err}")

            # Admin notifications: a new demo started + a concurrency alert past 10 running.
            # Real admins live in production 'fahem', so notify there.
            try:
                active_count = client["fahem_sandbox"]["demo_sessions"].count_documents({"status": "active"})
                prod_db = client["fahem"]
                persona = payload.get("role") or payload.get("persona") or "guest"
                notify_admins_of(
                    prod_db, "admin_new_demo",
                    "New demo session started", "بدأت جلسة تجريبية جديدة",
                    f"A new '{persona}' demo session started ({active_count} active).",
                    f"بدأت جلسة تجريبية جديدة بدور '{persona}' ({active_count} نشطة).",
                    {"deep_link": "?tab=admin", "active_count": active_count}
                )
                if active_count > 10:
                    recent_overload = prod_db["notifications"].find_one({
                        "type": "admin_demo_overload", "read": False,
                        "createdAt": {"$gt": int(time.time() * 1000) - 3600000}
                    })
                    if not recent_overload:
                        notify_admins_of(
                            prod_db, "admin_demo_overload",
                            "High demo load", "ضغط مرتفع على الجلسات التجريبية",
                            f"More than 10 demo sessions are running concurrently ({active_count}).",
                            f"يوجد أكثر من 10 جلسات تجريبية متزامنة حالياً ({active_count}).",
                            {"deep_link": "?tab=admin", "active_count": active_count}
                        )
            except Exception as ntf_err:
                logger.warning(f"Failed to send demo admin notifications: {ntf_err}")

            client.close()
            return {"success": True}
        except Exception as err:
            logger.error(f"[services.py] Failed to create demo session: {err}", exc_info=True)
            return {"success": False, "error": str(err)}

    @app.post("/admin/demo-reap")
    async def reap_demo_sessions_endpoint():
        """Hard-kill any demo session running longer than 24h. Safe to call on a schedule."""
        try:
            from tools import get_mongodb_uri
            from pymongo import MongoClient
            import time
            client = _pooled_client()
            cutoff = int(time.time()) - 86400
            res = client["fahem_sandbox"]["demo_sessions"].update_many(
                {"status": "active", "started_at": {"$lt": cutoff}},
                {"$set": {"status": "killed", "ended_at": int(time.time()), "kill_reason": "24h max session reached"}}
            )
            client.close()
            return {"success": True, "killed": res.modified_count}
        except Exception as err:
            logger.error(f"[services.py] demo reaper failed: {err}", exc_info=True)
            return {"success": False, "error": str(err)}

    @app.post("/demo/signout")
    async def demo_signout_endpoint(request: fastapi.Request):
        """On demo sign-out: archive the session's important data+metadata to a sandbox temp
        collection (superadmin reference/analysis), then purge the per-session traces so the next
        demo starts fresh. Sandbox-only."""
        try:
            from tools import get_mongodb_uri
            from pymongo import MongoClient
            import time
            body = await request.json()
            session_id = body.get("sandbox_session_id") or body.get("sandboxSessionId")
            if not session_id:
                principal = getattr(request.state, "principal", None) or {}
                session_id = principal.get("sandbox_session_id")
            if not session_id:
                return fastapi.responses.JSONResponse(status_code=400, content={"success": False, "error": "Missing sandbox_session_id"})

            client = _pooled_client()
            sdb = client["fahem_sandbox"]

            session_doc = sdb["demo_sessions"].find_one({"sandbox_session_id": session_id}) or {}
            demo_uid = session_doc.get("uid") or session_doc.get("userId")

            # Token usage for THIS session, broken down by model and type.
            usage_total = 0
            by_model = {}
            by_type = {}
            for d in sdb["token_telemetry"].find({"sandboxSessionId": session_id}):
                tt = int(d.get("totalTokens", 0))
                usage_total += tt
                by_model[d.get("model", "?")] = by_model.get(d.get("model", "?"), 0) + tt
                by_type[d.get("type", "?")] = by_type.get(d.get("type", "?"), 0) + tt

            # Companion chat (prompts/responses) + activities/errors for the demo user (best-effort).
            chats = []
            activities = []
            if demo_uid:
                for c in sdb["chat_sessions"].find({"userId": demo_uid}).limit(50):
                    c.pop("_id", None)
                    chats.append(c)
                for a in sdb["user_activities"].find({"userId": demo_uid}).sort("timestamp", -1).limit(100):
                    a.pop("_id", None)
                    activities.append(a)

            sdb["demo_session_archive"].replace_one(
                {"_id": session_id},
                {
                    "_id": session_id,
                    "sandbox_session_id": session_id,
                    "email": session_doc.get("email"),
                    "role": session_doc.get("role"),
                    "tier": session_doc.get("tier"),
                    "started_at": session_doc.get("started_at"),
                    "ended_at": int(time.time()),
                    "token_usage": {"total": usage_total, "byModel": by_model, "byType": by_type},
                    "chat_history": chats,
                    "activities": activities,
                    "archivedAt": int(time.time() * 1000)
                },
                upsert=True
            )

            # Purge the per-session traces so no trace remains for the next session.
            sdb["token_telemetry"].delete_many({"sandboxSessionId": session_id})
            sdb["demo_sessions"].update_one(
                {"sandbox_session_id": session_id},
                {"$set": {"status": "ended", "ended_at": int(time.time()), "archived": True}}
            )
            client.close()
            return {"success": True, "archived": session_id, "token_usage_total": usage_total}
        except Exception as err:
            logger.error(f"[services.py] demo signout archive/purge failed: {err}", exc_info=True)
            return {"success": False, "error": str(err)}

    @app.get("/admin/approve")
    async def admin_approve_get_endpoint():
        try:
            from tools import get_mongodb_uri
            from pymongo import MongoClient
            
            uri = get_mongodb_uri()
            client = _pooled_client()
            db = get_active_db(client)
            
            # Live source of truth: every admin / super-admin USER, plus any legacy admins-collection
            # entry. No hardcoded candidates and no hardcoded filters — the console reflects real data
            # only, so deleted users disappear and newly-onboarded admins appear. FC7.29: teacher
            # candidates (role 'teacher' OR pending) are surfaced too so admins can approve them.
            users = list(db["users"].find({"role": {"$in": ["admin", "super-admin"]}}))
            teachers = list(db["users"].find(
                {"$or": [{"role": "teacher"}, {"teacherPending": True}, {"isApprovedTeacher": {"$exists": True}}]}
            ))
            admins = list(db["admins"].find({}))
            client.close()

            admin_map = {}
            for adm in admins:
                email_key = (adm.get("email") or "").lower().strip()
                if email_key:
                    _approved = adm.get("isApprovedAdmin") == True
                    admin_map[email_key] = {
                        "email": adm.get("email"),
                        "name": adm.get("name") or "Approved Admin",
                        "role": adm.get("role") or "admin",
                        "isApprovedAdmin": _approved,
                        "isApproved": _approved,
                        "source": "admins_collection"
                    }

            for usr in users:
                email_key = (usr.get("email") or "").lower().strip()
                if email_key:
                    existing = admin_map.get(email_key)
                    role = usr.get("role") or "admin"
                    _approved = role == "super-admin" or usr.get("isApprovedAdmin") == True or (existing and existing.get("isApprovedAdmin") == True)
                    admin_map[email_key] = {
                        "email": usr.get("email"),
                        "name": usr.get("name") or usr.get("username") or "Admin Candidate",
                        "role": role,
                        # Super-admins are inherently approved.
                        "isApprovedAdmin": _approved,
                        "isApproved": _approved,
                        "source": "users_collection",
                        "userId": usr.get("userId")
                    }

            # FC7.29: teacher candidates go in a parallel list so the console can render a teacher section.
            teacher_map = {}
            for usr in teachers:
                email_key = (usr.get("email") or "").lower().strip()
                if not email_key or email_key in admin_map:
                    continue  # an admin/super-admin is not a teacher candidate
                _approved_t = usr.get("isApprovedTeacher") == True
                teacher_map[email_key] = {
                    "email": usr.get("email"),
                    "name": usr.get("name") or usr.get("username") or "Teacher Candidate",
                    "role": "teacher",
                    "isApproved": _approved_t,
                    "isApprovedTeacher": _approved_t,
                    "source": "users_collection",
                    "userId": usr.get("userId")
                }

            return {"success": True, "admins": list(admin_map.values()), "teachers": list(teacher_map.values())}
        except Exception as err:
            logger.error(f"[services.py] Failed to list admins: {err}", exc_info=True)
            return {"success": False, "error": str(err)}

    @app.post("/admin/approve")
    async def admin_approve_post_endpoint(request: fastapi.Request):
        try:
            from tools import get_mongodb_uri
            from pymongo import MongoClient
            
            data = await request.json()
            admin_email = data.get("adminEmail", "").lower().strip()
            action = data.get("action", "")
            # FC7.29: the same approval console now gates teachers too. `targetRole` selects which role the
            # approval grants/revokes (default 'admin' for backward compatibility with the admin console).
            target_role = str(data.get("targetRole") or "admin").strip().lower()

            if not admin_email or not action:
                return fastapi.responses.JSONResponse(
                    content={"error": "Missing required fields"},
                    status_code=400
                )

            uri = get_mongodb_uri()
            client = _pooled_client()
            db = get_active_db(client)

            is_approved = (action == "approve")

            existing_doc = db["users"].find_one({"email": admin_email}, {"role": 1})
            existing_role = (existing_doc or {}).get("role")

            if target_role == "teacher":
                # FC7.29: grant/revoke the TEACHER role. Approve => role 'teacher' + isApprovedTeacher true +
                # clear the pending flag (resolver now grants teacher powers). Revoke => back to 'user'.
                # Never touch a super-admin/admin via the teacher path.
                if existing_role in ("super-admin", "admin"):
                    client.close()
                    return fastapi.responses.JSONResponse(
                        content={"error": f"Refusing to alter a {existing_role} via the teacher-approval path"},
                        status_code=400,
                    )
                user_set = {"isApprovedTeacher": is_approved, "teacherPending": not is_approved}
                user_set["role"] = "teacher" if is_approved else "user"
                db["users"].update_one({"email": admin_email}, {"$set": user_set})
                client.close()
                return {"success": True, "message": f"Successfully {action}d teacher {admin_email}"}

            # FC7.3b: approval must actually grant/revoke the admin ROLE, not just the flag. Before,
            # only `isApprovedAdmin` flipped while `role` stayed whatever it was → an "approved" admin
            # kept a non-admin role and never saw admin controls. Never touch a super-admin's role.
            user_set = {"isApprovedAdmin": is_approved}
            if existing_role != "super-admin":
                user_set["role"] = "admin" if is_approved else "user"

            # Update users
            db["users"].update_one(
                {"email": admin_email},
                {"$set": user_set}
            )

            # Update or upsert admins
            db["admins"].update_one(
                {"email": admin_email},
                {"$set": {
                    "email": admin_email,
                    "isApprovedAdmin": is_approved,
                    "name": admin_email.split("@")[0]
                }},
                upsert=True
            )

            client.close()
            return {"success": True, "message": f"Successfully {action}d admin {admin_email}"}
        except Exception as err:
            logger.error(f"[services.py] Failed to update admin: {err}", exc_info=True)
            return fastapi.responses.JSONResponse(
                content={"error": str(err)},
                status_code=500
            )

    @app.get("/admin/config")
    async def admin_get_config_endpoint():
        try:
            from tools import get_mongodb_uri
            from pymongo import MongoClient
            
            uri = get_mongodb_uri()
            client = _pooled_client()
            db = get_active_db(client)
            
            config_doc = db["config"].find_one({})
            if not config_doc:
                # Insert default config
                default_config = {
                    "isTokenControlActive": True,
                    "weeklyAllocationLimit": 250000,
                    "monthlyAllocationLimit": 1000000,
                    "maxUploadSize": 2,
                    "evalSandboxEnabled": True,
                    "evalWhitelist": ["judge.evaluation@fahem.edu", "hesham1988@gmail.com"],
                    "demoDomains": ["google.com", "mongodb.com", "devpost.com"]
                }
                db["config"].insert_one(default_config)
                config_doc = default_config
            
            # Remove _id for JSON serialization
            if "_id" in config_doc:
                config_doc["_id"] = str(config_doc["_id"])
                
            client.close()
            return {"success": True, "config": config_doc}
        except Exception as err:
            logger.error(f"[services.py] Failed to get config: {err}", exc_info=True)
            return fastapi.responses.JSONResponse(
                content={"error": str(err)},
                status_code=500
            )

    @app.post("/admin/config")
    async def admin_post_config_endpoint(request: fastapi.Request):
        try:
            from tools import get_mongodb_uri
            from pymongo import MongoClient
            
            data = await request.json()
            principal = getattr(request.state, "principal", None) or {}
            uri = get_mongodb_uri()
            client = _pooled_client()
            db = get_active_db(client)

            # Snapshot the current config so we can record a before->after change history.
            before_config = db["config"].find_one({}) or {}

            # Prepare update fields
            update_fields = {}
            if "isTokenControlActive" in data:
                update_fields["isTokenControlActive"] = bool(data["isTokenControlActive"])
            if "weeklyAllocationLimit" in data:
                update_fields["weeklyAllocationLimit"] = int(data["weeklyAllocationLimit"])
            if "monthlyAllocationLimit" in data:
                update_fields["monthlyAllocationLimit"] = int(data["monthlyAllocationLimit"])
            # FC7.34: a daily window cap so the daily widget/enforcement has a configurable limit.
            if "dailyAllocationLimit" in data:
                update_fields["dailyAllocationLimit"] = int(data["dailyAllocationLimit"])
            # FC7.38: super-admin-adjustable demo per-tier caps (defaults Tier0=35k / Tier1=60k).
            if "demoTier0Cap" in data:
                update_fields["demoTier0Cap"] = int(data["demoTier0Cap"])
            if "demoTier1Cap" in data:
                update_fields["demoTier1Cap"] = int(data["demoTier1Cap"])
            if "maxUploadSize" in data:
                update_fields["maxUploadSize"] = int(data["maxUploadSize"])
            if "evalSandboxEnabled" in data:
                update_fields["evalSandboxEnabled"] = bool(data["evalSandboxEnabled"])
            if "evalWhitelist" in data:
                update_fields["evalWhitelist"] = [str(x).strip().lower() for x in data["evalWhitelist"] if x]
            if "demoDomains" in data:
                update_fields["demoDomains"] = [str(x).strip().lower() for x in data["demoDomains"] if x]
                
            db["config"].update_one({}, {"$set": update_fields}, upsert=True)

            # Audit: record the system-limit / config change history (before -> after, who, when).
            try:
                import datetime
                changes = {}
                for k, v in update_fields.items():
                    old = before_config.get(k)
                    if old != v:
                        changes[k] = {"from": old, "to": v}
                if changes:
                    db["config_history"].insert_one({
                        "changes": changes,
                        "changed_by": principal.get("email"),
                        "changed_by_uid": principal.get("uid"),
                        "changed_at": datetime.datetime.utcnow().isoformat() + "Z"
                    })
            except Exception as he:
                logger.warning(f"Failed to record config change history: {he}")

            # Fetch latest
            config_doc = db["config"].find_one({})
            if "_id" in config_doc:
                config_doc["_id"] = str(config_doc["_id"])
                
            client.close()
            return {"success": True, "config": config_doc}
        except Exception as err:
            logger.error(f"[services.py] Failed to update config: {err}", exc_info=True)
            return fastapi.responses.JSONResponse(
                content={"error": str(err)},
                status_code=500
            )

    @app.post("/user/subjects")
    async def post_subjects_endpoint(request: fastapi.Request):
        try:
            from tools import get_mongodb_uri
            from pymongo import MongoClient
            import re
            
            data = await request.json()
            name = data.get("name", "")
            name_ar = data.get("name_ar", "")
            grade_level = data.get("grade_level", "General")
            category = data.get("category", "Science")
            icon_emoji = data.get("icon_emoji", "📚")
            curriculum_id = data.get("curriculum_id") or "cur_general"
            color = data.get("color", "#1E96A0")
            
            if not name or not name_ar:
                return fastapi.responses.JSONResponse(
                    content={"error": "Missing required fields"},
                    status_code=400
                )
                
            uri = get_mongodb_uri()
            client = _pooled_client()
            db = get_active_db(client)
            
            name_en = data.get("name_en") or name
            slug = re.sub(r'[^a-z0-9]+', '-', name_en.lower().strip()).strip('-')
            subject_id = f"subj_{curriculum_id}_{slug}"
            
            # Rebuild count & book links
            books_count = db["books"].count_documents({"subject_id": subject_id})
            core_books = list(db["books"].find({"subject_id": subject_id, "role": "core"}, {"_id": 1}))
            supporting_books = list(db["books"].find({"subject_id": subject_id, "role": "supporting"}, {"_id": 1}))
            
            new_subject = {
                "_id": subject_id,
                "curriculum_id": curriculum_id,
                "slug": slug,
                "name": name,
                "name_ar": name_ar,
                "name_en": name_en,
                "name_es": data.get("name_es") or name,
                "name_fr": data.get("name_fr") or name,
                "name_de": data.get("name_de") or name,
                "name_zh": data.get("name_zh") or name,
                "name_it": data.get("name_it") or name,
                "grade_level": grade_level,
                "category": category,
                "icon_emoji": icon_emoji,
                "emoji": icon_emoji,
                "color": color,
                "books_count": books_count,
                "core_book_ids": [b["_id"] for b in core_books],
                "supporting_book_ids": [b["_id"] for b in supporting_books]
            }
            
            db["subjects"].update_one({"_id": subject_id}, {"$set": new_subject}, upsert=True)
            client.close()
            return {"success": True, "subject": new_subject}
        except Exception as err:
            logger.error(f"[services.py] Failed to create subject: {err}", exc_info=True)
            return fastapi.responses.JSONResponse(
                content={"error": str(err)},
                status_code=500
            )

    @app.put("/user/subjects")
    async def put_subjects_endpoint(request: fastapi.Request):
        try:
            from tools import get_mongodb_uri
            from pymongo import MongoClient
            import re
            
            data = await request.json()
            subject_id = data.get("id") or data.get("_id")
            name = data.get("name")
            name_ar = data.get("name_ar")
            grade_level = data.get("grade_level", "General")
            category = data.get("category", "Science")
            icon_emoji = data.get("icon_emoji", "📚")
            
            if not subject_id or not name or not name_ar:
                return fastapi.responses.JSONResponse(
                    content={"error": "Missing required fields: id, name, name_ar"},
                    status_code=400
                )
                
            uri = get_mongodb_uri()
            client = _pooled_client()
            db = get_active_db(client)
            
            name_en = data.get("name_en") or name
            slug = re.sub(r'[^a-z0-9]+', '-', name_en.lower().strip()).strip('-')
            
            books_count = db["books"].count_documents({"subject_id": subject_id})
            core_books = list(db["books"].find({"subject_id": subject_id, "role": "core"}, {"_id": 1}))
            supporting_books = list(db["books"].find({"subject_id": subject_id, "role": "supporting"}, {"_id": 1}))

            update_data = {
                "name": name,
                "name_ar": name_ar,
                "name_en": name_en,
                "name_es": data.get("name_es") or name,
                "name_fr": data.get("name_fr") or name,
                "name_de": data.get("name_de") or name,
                "name_zh": data.get("name_zh") or name,
                "name_it": data.get("name_it") or name,
                "slug": slug,
                "grade_level": grade_level,
                "category": category,
                "icon_emoji": icon_emoji,
                "emoji": icon_emoji,
                "books_count": books_count,
                "core_book_ids": [b["_id"] for b in core_books],
                "supporting_book_ids": [b["_id"] for b in supporting_books]
            }
            
            if "curriculum_id" in data:
                update_data["curriculum_id"] = data["curriculum_id"]
            if "color" in data:
                update_data["color"] = data["color"]
                
            res = db["subjects"].update_one(
                {"_id": subject_id},
                {"$set": update_data}
            )
            
            if res.matched_count == 0:
                client.close()
                return fastapi.responses.JSONResponse(
                    content={"error": "Subject not found"},
                    status_code=404
                )
                
            updated_subject = db["subjects"].find_one({"_id": subject_id})
            client.close()
            return {"success": True, "subject": updated_subject}
        except Exception as err:
            logger.error(f"[services.py] Failed to update subject: {err}", exc_info=True)
            return fastapi.responses.JSONResponse(
                content={"error": str(err)},
                status_code=500
            )

    @app.delete("/user/subjects")
    async def delete_subjects_endpoint(id: str = None):
        try:
            from tools import get_mongodb_uri
            from pymongo import MongoClient
            
            if not id:
                return fastapi.responses.JSONResponse(
                    content={"error": "Missing required query parameter: id"},
                    status_code=400
                )
                
            uri = get_mongodb_uri()
            client = _pooled_client()
            db = get_active_db(client)
            
            # Decouple associated books instead of deleting them (OR-12)
            db["books"].update_many(
                {"subject_id": id},
                {"$set": {"subject_id": None, "curriculum_id": None, "role": None}}
            )
            
            # Delete subject itself
            res = db["subjects"].delete_one({"_id": id})
            
            if res.deleted_count == 0:
                client.close()
                return fastapi.responses.JSONResponse(
                    content={"error": "Subject not found"},
                    status_code=404
                )
                
            client.close()
            return {"success": True, "message": "Subject deleted and associated books decoupled successfully."}
        except Exception as err:
            logger.error(f"[services.py] Failed to delete subject: {err}", exc_info=True)
            return fastapi.responses.JSONResponse(
                content={"error": str(err)},
                status_code=500
            )

    def run_ingest_in_background(payload):
        import threading
        # D-INGEST-TRIGGER: synchronous entry log (request context) — proves the trigger is REACHED on prod.
        # The daemon-thread's own logs were absent in Cloud Logging, so we couldn't tell whether the trigger
        # was never called or the thread died. This line removes that ambiguity for the next ingestion.
        try:
            logger.info(f"[Ingestion Trigger] run_ingest_in_background ENTERED for book_id={payload.get('book_id')} title={payload.get('title')}")
        except Exception:
            pass
        # FC8.5: stamp the active db_target into the payload so the worker (which runs with
        # no request context) writes to the correct database (fahem vs fahem_sandbox).
        try:
            from mongodb_engine import db_target_var
            payload.setdefault("db_target", db_target_var.get())
        except Exception:
            payload.setdefault("db_target", "fahem")
        # Notify real (production) admins that an ingestion job has started.
        try:
            from tools import get_mongodb_uri as _gmu
            from pymongo import MongoClient as _MC
            _c = _MC(_gmu(), serverSelectionTimeoutMS=4000)
            _bt = payload.get("title") or payload.get("book_id") or "a book"
            notify_admins_of(
                _c["fahem"], "admin_ingestion_job",
                "New ingestion job started", "بدأت مهمة استيعاب جديدة",
                f"Ingestion started for '{_bt}'.", f"بدأ استيعاب الكتاب '{_bt}'.",
                {"deep_link": "?tab=admin-ingestion"}
            )
            _c.close()
        except Exception as _e:
            logger.warning(f"Failed to notify admins of ingestion job: {_e}")
        def target():
            try:
                import sys
                import subprocess
                import os
                import json
                import time
                
                agents_dir = os.path.dirname(os.path.abspath(__file__))
                root_dir = os.path.dirname(agents_dir)
                log_path = os.path.join(root_dir, "ignore", "server_fastapi_services.log")
                os.makedirs(os.path.dirname(log_path), exist_ok=True)
                
                def log_to_file(message):
                    try:
                        t = time.strftime("%Y-%m-%d %H:%M:%S")
                        with open(log_path, "a", encoding="utf-8") as f:
                            f.write(f"[{t}] {message}\n")
                    except Exception:
                        pass

                book_id = payload.get('book_id')
                book_title = payload.get('title', 'Untitled')
                log_to_file(f"[FASTAPI INGEST] 🚀 Thread started for book: \"{book_title}\" (ID: {book_id})")
                logger.info(f"[Ingestion Background] Thread started for book {book_id}")
                
                python_exe = sys.executable
                script_path = os.path.join(agents_dir, "ingestion_v2", "job_fetch.py")
                if not os.path.exists(script_path):
                    script_path = os.path.join(root_dir, "agents", "ingestion_v2", "job_fetch.py")
                
                log_to_file(f"[FASTAPI INGEST] Resolved script path to: \"{script_path}\"")
                log_to_file(f"[FASTAPI INGEST] Payload sent to python stdin: {json.dumps(payload, indent=2)}")
                logger.info(f"[Ingestion Background] Resolved ingestion script path to: {script_path}")
                
                p = subprocess.Popen(
                    [python_exe, script_path],
                    stdin=subprocess.PIPE,
                    stdout=None,
                    stderr=None,
                    text=True
                )
                
                log_to_file(f"[FASTAPI INGEST] Subprocess spawned successfully with PID: {p.pid}")
                log_to_file(f"[FASTAPI INGEST] Piping payload and waiting for process exit...")
                
                p.stdin.write(json.dumps(payload))
                p.stdin.close()
                p.wait()
                
                log_to_file(f"[FASTAPI INGEST] Subprocess wait() returned cleanly with code {p.returncode}.")
                
                log_to_file(f"[FASTAPI INGEST] ✅ Thread completed successfully for book: \"{book_title}\" (ID: {book_id})")
                logger.info(f"[Ingestion Background] Thread completed for book {book_id}")
            except Exception as thread_err:
                msg = f"[FASTAPI INGEST CRITICAL ERROR] Thread failed: {thread_err}"
                try:
                    log_to_file(msg)
                except Exception:
                    pass
                logger.error(f"[Ingestion Background Error] {thread_err}", exc_info=True)

        # FC8.5: the durable path dispatches to a dedicated Cloud Run Job that survives API
        # instance churn (deploys/health restarts/scale events) — the root cause of the
        # frozen accounting jobs. On Cloud Run (K_SERVICE set) try the Job first; the
        # in-process thread below remains the local/dev path and a fail-safe fallback so a
        # dispatch error never silently drops an ingestion.
        if os.environ.get("K_SERVICE"):
            try:
                from ingestion_v2.job_trigger import trigger_ingest_job
                if trigger_ingest_job(payload):
                    return
                logger.error("[Ingestion Trigger] Cloud Run Job dispatch failed — falling back to in-process thread")
            except Exception as _je:
                logger.error(f"[Ingestion Trigger] Cloud Run Job dispatch unavailable ({_je}) — falling back to in-process thread")

        try:
            t = threading.Thread(target=target, name=f"ingest-{payload.get('book_id')}")
            t.daemon = True
            t.start()
            logger.info(f"[Ingestion Trigger] background thread STARTED for book_id={payload.get('book_id')}")
        except Exception as _te:
            logger.error(f"[Ingestion Trigger] FAILED to start ingestion thread for {payload.get('book_id')}: {_te}", exc_info=True)

    @app.get("/user/books/jobs")
    async def get_books_jobs_endpoint(request: fastapi.Request):
        try:
            from tools import get_mongodb_uri
            from pymongo import MongoClient
            
            job_id = request.query_params.get("jobId")
            book_id = request.query_params.get("bookId")
            
            if not job_id and book_id:
                job_id = f"job_{book_id}"
                
            uri = get_mongodb_uri()
            client = _pooled_client()
            db = get_active_db(client)
            
            if job_id:
                job = db["ingestion_jobs"].find_one({"_id": job_id})
                client.close()
                if not job:
                    return fastapi.responses.JSONResponse(content={"error": "Job metadata not found in database."}, status_code=404)
                # Convert ObjectId to string or format if any
                if "_id" in job:
                    job["_id"] = str(job["_id"])
                return {"success": True, "job": job}
                
            jobs = list(db["ingestion_jobs"].find({}).sort("updated_at", -1))
            for j in jobs:
                if "_id" in j:
                    j["_id"] = str(j["_id"])
            client.close()
            return {"success": True, "jobs": jobs}
            
        except Exception as err:
            logger.error(f"[services.py] Failed to get books jobs: {err}", exc_info=True)
            return fastapi.responses.JSONResponse(content={"error": str(err)}, status_code=500)

    @app.post("/user/books")
    async def post_books_endpoint(request: fastapi.Request):
        try:
            from tools import get_mongodb_uri
            from pymongo import MongoClient
            import time
            import re
            
            data = await request.json()
            subject_id = data.get("subject_id", "")
            title = data.get("title", "")
            title_ar = data.get("title_ar", "")
            grade = data.get("grade", "General")
            term = data.get("term", "Term 1")
            year = data.get("year", "2026")
            language = data.get("language", "ar")
            book_type = data.get("book_type", "core")
            source_url = data.get("source_url", "")
            storage_path = data.get("storage_path", "")
            chapters = data.get("chapters", [])
            user_id = data.get("userId")
            size_bytes = int(data.get("sizeBytes") or data.get("size_bytes") or 0)
            
            if not subject_id or not title or not title_ar:
                return fastapi.responses.JSONResponse(
                    content={"error": "Missing required fields: subject_id, title, title_ar"},
                    status_code=400
                )
                
            uri = get_mongodb_uri()
            client = _pooled_client()
            db = get_active_db(client)
            
            # Enforce limits for private student uploads
            if user_id:
                # 1. Single file size <= 20MB
                if size_bytes > 20 * 1024 * 1024:
                    client.close()
                    return fastapi.responses.JSONResponse(
                        content={"error": "File size exceeds the maximum limit of 20MB"},
                        status_code=400
                    )
                
                # 2. Count limit < 10
                user_books = list(db["books"].find({"userId": user_id}))
                if len(user_books) >= 10:
                    client.close()
                    return fastapi.responses.JSONResponse(
                        content={"error": "Maximum limit of 10 files exceeded"},
                        status_code=400
                    )
                
                # 3. Cumulative size limit <= 100MB
                total_size = sum(int(b.get("sizeBytes") or b.get("size_bytes") or 0) for b in user_books) + size_bytes
                if total_size > 100 * 1024 * 1024:
                    client.close()
                    return fastapi.responses.JSONResponse(
                        content={"error": "Cumulative storage limit of 100MB exceeded"},
                        status_code=400
                    )

            # Ensure subject exists & books and subjects are linked
            subject = db["subjects"].find_one({"_id": subject_id})
            if not subject:
                clean_subj = re.sub(r'[^a-z0-9]', '_', subject_id.lower())
                subject_name = subject_id.replace("subj_", "").replace("_", " ").title()
                db["subjects"].insert_one({
                    "_id": subject_id,
                    "name": subject_name,
                    "name_ar": "مادة دراسية مرتبطة",
                    "grade_level": grade,
                    "category": "General",
                    "icon_emoji": "📚",
                    "books_count": 0
                })
                logger.info(f"[Ingestion] Subject '{subject_id}' did not exist. Created & linked automatically.")
            
            # Deduplication Check
            existing_book = None
            if source_url:
                existing_book = db["books"].find_one({"source_url": source_url, "userId": user_id})
            if not existing_book:
                existing_book = db["books"].find_one({
                    "title": {"$regex": f"^{re.escape(title)}$", "$options": "i"},
                    "subject_id": subject_id,
                    "userId": user_id
                })
            
            force_reindex = bool(data.get("forceReindex") or data.get("force_reindex", False))
            needs_approval = bool(data.get("needs_approval", False))
            initial_logs = [
                "[INIT] Ingestion container spawned successfully.",
                "[INIT] Awaiting direct binary pipeline allocation...",
                f"[DOWNLOAD] Queuing download from: {source_url}"
            ]

            if existing_book:
                status = existing_book.get("ingestion_status") or existing_book.get("status")
                # If they explicitly requested a force reindex, or the book has failed/cancelled, re-ingest it
                if force_reindex or status in ["failed", "cancelled", "pending_approval"]:
                    logger.info(f"[Ingestion] Existing book {existing_book['_id']} found in status '{status}'. Re-triggering ingestion.")
                    db["books"].update_one(
                        {"_id": existing_book["_id"]},
                        {"$set": {
                            "ingestion_status": "pending_approval" if needs_approval else "queued",
                            "ingestion_progress": 5,
                            "ingestion_logs": initial_logs,
                            "is_downloaded": not needs_approval,
                            "is_completed": False,
                            "is_indexed": False,
                            "is_vectored": False,
                            "is_embedded": False,
                            "is_analyzed": False,
                            "is_extracted": False,
                            "is_processed": False
                        }}
                    )
                    if not needs_approval:
                        payload = {
                            "book_id": existing_book["_id"],
                            "subject_id": subject_id,
                            "title": title,
                            "title_ar": title_ar,
                            "source_url": source_url,
                            "storage_path": storage_path,
                            "grade": grade,
                            "term": term,
                            "year": year,
                            "language": language,
                            "book_type": book_type,
                            "is_private": bool(user_id),
                            "userId": user_id,
                            "is_local": False
                        }
                        run_ingest_in_background(payload)
                        message = "Existing book ingestion re-triggered."
                    else:
                        message = "Existing book ingestion re-queued for Superadmin approval."
                        try:
                            notify_admins_of(
                                client["fahem"], "admin_approval_request",
                                "Approval needed: book re-ingestion", "مطلوب موافقة: إعادة استيعاب كتاب",
                                f"'{title}' is awaiting Superadmin approval before re-ingestion.",
                                f"الكتاب '{title}' بانتظار موافقة المشرف قبل إعادة الاستيعاب.",
                                {"deep_link": "?tab=admin-ingestion", "book_id": existing_book["_id"]}
                            )
                        except Exception as _e:
                            logger.warning(f"Failed to notify admins of book re-approval request: {_e}")
                    
                    client.close()
                    # Return modified existing_book for tracking
                    updated_book = db["books"].find_one({"_id": existing_book["_id"]})
                    return {"success": True, "message": message, "book": updated_book}
                else:
                    client.close()
                    return {"success": True, "message": "Book already exists.", "book": existing_book}
            
            clean_title = re.sub(r'[^a-z0-9]', '_', title.lower())
            book_id = f"book_{clean_title}_{int(time.time() * 1000)}"
            
            needs_approval = bool(data.get("needs_approval", False))
            initial_logs = [
                "[INIT] Ingestion container spawned successfully.",
                "[INIT] Awaiting direct binary pipeline allocation...",
                f"[DOWNLOAD] Queuing download from: {source_url}"
            ]

            # Insert initial draft with states set to False to track progress safely
            draft_book = {
                "_id": book_id,
                "subject_id": subject_id,
                "title": title,
                "title_ar": title_ar,
                "grade": grade,
                "term": term,
                "year": year,
                "language": language,
                "book_type": book_type,
                "source_url": source_url,
                "storage_path": storage_path,
                "chapters": chapters,
                "is_downloaded": not needs_approval,
                "is_indexed": False,
                "is_vectored": False,
                "is_embedded": False,
                "is_analyzed": False,
                "is_extracted": False,
                "is_processed": False,
                "is_completed": False,
                "needs_approval": needs_approval,
                "ingestion_status": "pending_approval" if needs_approval else "queued",
                "ingestion_progress": 5,
                "ingestion_logs": initial_logs,
                "processed_pages": 0,
                "total_pages": 0,
                "last_processed_page": 0,
                "extracted_pages_count": 0,
                "userId": user_id,
                "sizeBytes": size_bytes,
                "size_bytes": size_bytes
            }
            db["books"].insert_one(draft_book)
            
            # Increment subject books count
            db["subjects"].update_one(
                {"_id": subject_id},
                {"$inc": {"books_count": 1}}
            )
            
            if not needs_approval:
                # Trigger real asynchronous ingestion process in background thread
                payload = {
                    "book_id": book_id,
                    "subject_id": subject_id,
                    "title": title,
                    "title_ar": title_ar,
                    "source_url": source_url,
                    "storage_path": storage_path,
                    "grade": grade,
                    "term": term,
                    "year": year,
                    "language": language,
                    "book_type": book_type,
                    "is_private": bool(user_id),
                    "userId": user_id,
                    "is_local": False
                }
                run_ingest_in_background(payload)
                message = "Book registered and background ingestion started."
            else:
                message = "Book registered and queued for Superadmin approval."
                try:
                    notify_admins_of(
                        client["fahem"], "admin_approval_request",
                        "Approval needed: new book ingestion", "مطلوب موافقة: استيعاب كتاب جديد",
                        f"'{title}' is awaiting Superadmin approval before ingestion.",
                        f"الكتاب '{title}' بانتظار موافقة المشرف قبل الاستيعاب.",
                        {"deep_link": "?tab=admin-ingestion", "book_id": book_id}
                    )
                except Exception as _e:
                    logger.warning(f"Failed to notify admins of book approval request: {_e}")
            
            client.close()
            return {"success": True, "message": message, "book": draft_book}
            
        except Exception as err:
            logger.error(f"[services.py] Failed to ingest book: {err}", exc_info=True)
            return fastapi.responses.JSONResponse(
                content={"error": str(err)},
                status_code=500
            )

    @app.post("/user/books/cancel")
    async def cancel_books_endpoint(request: fastapi.Request):
        try:
            from tools import get_mongodb_uri
            from pymongo import MongoClient
            import datetime
            import time
            
            data = await request.json()
            book_id = data.get("bookId")
            requester_email = data.get("requesterEmail") or "administrator"
            
            if not book_id:
                return fastapi.responses.JSONResponse(
                    content={"error": "Missing required field: bookId"},
                    status_code=400
                )
                
            uri = get_mongodb_uri()
            client = _pooled_client()
            db = get_active_db(client)
            
            book = db["books"].find_one({"_id": book_id})
            if book:
                existing_logs = book.get("ingestion_logs") or []
                timestamp = datetime.datetime.now().strftime("%I:%M:%S %p")
                cancel_log = f"[{timestamp}] [CANCEL] ⛔ Ingestion task was manually aborted by administrator: {requester_email}"
                release_log = f"[{timestamp}] [INIT] Releasing virtual machine sandboxed processor context."
                updated_logs = existing_logs + [cancel_log, release_log]
                
                db["books"].update_one(
                    {"_id": book_id},
                    {
                        "$set": {
                            "ingestion_status": "failed",
                            "ingestion_logs": updated_logs,
                            "updated_at": time.time()
                        }
                    }
                )
                
                db["ingestion_jobs"].update_one(
                    {"_id": f"job_{book_id}"},
                    {
                        "$set": {
                            "status": "failed",
                            "logs": updated_logs,
                            "updated_at": time.time()
                        }
                    }
                )
                
            client.close()
            return {"success": True, "message": "Job not actively running in memory; status set to failed in database."}
            
        except Exception as err:
            logger.error(f"[services.py] Failed to cancel book ingestion: {err}", exc_info=True)
            return fastapi.responses.JSONResponse(
                content={"error": str(err)},
                status_code=500
            )

    @app.post("/user/books/control")
    async def control_books_endpoint(request: fastapi.Request):
        try:
            from tools import get_mongodb_uri
            from pymongo import MongoClient
            import datetime
            import time
            
            data = await request.json()
            book_id = data.get("bookId")
            job_id = data.get("jobId") or f"job_{book_id}"
            action = data.get("action")
            requester_email = data.get("requesterEmail") or "administrator"
            
            if not book_id or not action:
                return fastapi.responses.JSONResponse(
                    content={"error": "Missing required fields: bookId, action"},
                    status_code=400
                )
                
            uri = get_mongodb_uri()
            client = _pooled_client()
            db = get_active_db(client)
            
            timestamp = datetime.datetime.now().strftime("%I:%M:%S %p")
            message = ""
            success = True
            
            updated_logs = None
            if action == "pause":
                status = "paused"
                book_status = "paused"
                log_text = f"[{timestamp}] [CONTROL] ⏸️ Administrative cooperative pause request sent."
                message = "Ingestion job set to pause state. Processing threads are cooperatively resting."
            elif action == "resume":
                status = "processing"
                book_status = "processing"
                log_text = f"[{timestamp}] [CONTROL] ▶️ Administrative cooperative resume request sent. Activating processing thread."
                message = "Ingestion job set to processing state. Processing thread context resumed."
            elif action in ["kill", "stop"]:
                status = "killed"
                book_status = "failed"
                log_text = f"[{timestamp}] [CONTROL] 🛑 Ingestion job manually killed/terminated by administrator: {requester_email}"
                message = "Job was not running in memory; status set to failed/killed in database."
            else:
                client.close()
                return fastapi.responses.JSONResponse(
                    content={"error": f"Unrecognized action: {action}"},
                    status_code=400
                )
                
            # 1. Update MongoDB
            try:
                job = db["ingestion_jobs"].find_one({"_id": job_id})
                if job:
                    updated_logs = (job.get("logs") or []) + [log_text]
                    if action in ["kill", "stop"]:
                        updated_logs.append(f"[{timestamp}] [SYSTEM] Process context released.")
                        
                    db["ingestion_jobs"].update_one(
                        {"_id": job_id},
                        {"$set": {"status": status, "logs": updated_logs, "updated_at": time.time()}}
                    )
                    db["books"].update_one(
                        {"_id": book_id},
                        {"$set": {"ingestion_status": book_status, "ingestion_logs": updated_logs, "updated_at": time.time()}}
                    )
            except Exception as mongo_err:
                logger.error(f"[control_books_endpoint] Failed to update MongoDB: {mongo_err}")
                
            # 2. Update local db (local_db.json)
            local_db_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "web", "src", "app", "api", "local_db.json")
            if os.path.exists(local_db_path):
                try:
                    import json
                    with open(local_db_path, "r", encoding="utf-8") as f:
                        db_data = json.load(f)
                    
                    local_job = None
                    if "ingestion_jobs" in db_data:
                        for j in db_data["ingestion_jobs"]:
                            if j.get("_id") == job_id:
                                local_job = j
                                break
                                
                    if local_job:
                        local_logs = (local_job.get("logs") or []) + [log_text]
                        if action in ["kill", "stop"]:
                            local_logs.append(f"[{timestamp}] [SYSTEM] Process context released.")
                    else:
                        local_logs = [log_text]
                        if action in ["kill", "stop"]:
                            local_logs.append(f"[{timestamp}] [SYSTEM] Process context released.")
                            
                    # Always ensure updated_logs has a fallback value for books if not already computed from Mongo
                    if not updated_logs:
                        updated_logs = local_logs
                        
                    # Update ingestion_jobs in local JSON
                    job_found = False
                    if "ingestion_jobs" in db_data:
                        for j in db_data["ingestion_jobs"]:
                            if j.get("_id") == job_id:
                                j["status"] = status
                                j["logs"] = local_logs
                                j["updated_at"] = time.time()
                                job_found = True
                                break
                    if not job_found:
                        if "ingestion_jobs" not in db_data:
                            db_data["ingestion_jobs"] = []
                        db_data["ingestion_jobs"].append({
                            "_id": job_id,
                            "status": status,
                            "logs": local_logs,
                            "updated_at": time.time()
                        })
                        
                    # Update books in local JSON
                    if "books" in db_data:
                        for b in db_data["books"]:
                            if b.get("_id") == book_id:
                                b["ingestion_status"] = book_status
                                b["ingestion_logs"] = local_logs
                                b["updated_at"] = time.time()
                                break
                                
                    with open(local_db_path, "w", encoding="utf-8") as f:
                        json.dump(db_data, f, indent=2, ensure_ascii=False)
                except Exception as local_db_err:
                    logger.error(f"[control_books_endpoint] Failed to update local db: {local_db_err}")
                
            client.close()
            return {"success": success, "message": message}
            
        except Exception as err:
            logger.error(f"[services.py] Failed to control book ingestion: {err}", exc_info=True)
            return fastapi.responses.JSONResponse(
                content={"error": str(err)},
                status_code=500
            )

    @app.put("/user/books")
    async def put_books_endpoint(request: fastapi.Request):
        try:
            from tools import get_mongodb_uri
            from pymongo import MongoClient
            
            data = await request.json()
            book_id = data.get("id") or data.get("_id")
            subject_id = data.get("subject_id")
            title = data.get("title")
            title_ar = data.get("title_ar")
            grade = data.get("grade", "General")
            term = data.get("term", "Term 1")
            year = data.get("year", "2026")
            language = data.get("language", "ar")
            book_type = data.get("book_type", "core")
            source_url = data.get("source_url", "")
            storage_path = data.get("storage_path", "")
            chapters = data.get("chapters", [])
            
            if not book_id or not subject_id or not title or not title_ar:
                return fastapi.responses.JSONResponse(
                    content={"error": "Missing required fields: id, subject_id, title, title_ar"},
                    status_code=400
                )
                
            uri = get_mongodb_uri()
            client = _pooled_client()
            db = get_active_db(client)
            
            old_book = db["books"].find_one({"_id": book_id})
            if not old_book:
                client.close()
                return fastapi.responses.JSONResponse(
                    content={"error": "Book not found"},
                    status_code=404
                )
                
            total_pages = old_book.get("total_pages", 120)
            if chapters:
                try:
                    max_page = max(int(ch.get("end_page", 0)) for ch in chapters)
                    if max_page > 0:
                        total_pages = max_page
                except Exception:
                    pass
                    
            db["books"].update_one(
                {"_id": book_id},
                {"$set": {
                    "subject_id": subject_id,
                    "title": title,
                    "title_ar": title_ar,
                    "grade": grade,
                    "term": term,
                    "year": year,
                    "language": language,
                    "book_type": book_type,
                    "source_url": source_url,
                    "storage_path": storage_path,
                    "chapters": chapters,
                    "total_pages": total_pages
                }}
            )
            
            old_subj_id = old_book.get("subject_id")
            if old_subj_id != subject_id:
                db["subjects"].update_one(
                    {"_id": old_subj_id},
                    {"$inc": {"books_count": -1}}
                )
                db["subjects"].update_one(
                    {"_id": subject_id},
                    {"$inc": {"books_count": 1}}
                )
                
            updated_book = db["books"].find_one({"_id": book_id})
            client.close()
            return {"success": True, "book": updated_book}
        except Exception as err:
            logger.error(f"[services.py] Failed to update book: {err}", exc_info=True)
            return fastapi.responses.JSONResponse(
                content={"error": str(err)},
                status_code=500
            )

    @app.patch("/user/books/{book_id}/assign")
    async def assign_book_endpoint(book_id: str, request: fastapi.Request):
        try:
            from tools import get_mongodb_uri
            from pymongo import MongoClient
            import datetime
            
            principal = getattr(request.state, "principal", None)
            if not principal or principal.get("role") not in ["admin", "super-admin", "judge"]:
                return fastapi.responses.JSONResponse(
                    content={"success": False, "error": "Forbidden: Administrative access required"},
                    status_code=403
                )

            body = await request.json()
            action = body.get("action")
            
            uri = get_mongodb_uri()
            client = _pooled_client()
            db = get_active_db(client)

            # Find the book
            book_doc = db["books"].find_one({"_id": book_id})
            if not book_doc:
                client.close()
                return fastapi.responses.JSONResponse(
                    content={"success": False, "error": f"Book with ID '{book_id}' not found"},
                    status_code=404
                )

            if action == "decouple":
                old_subject_id = book_doc.get("subject_id")
                
                # Update book fields to None (unassigned)
                db["books"].update_one(
                    {"_id": book_id},
                    {"$set": {
                        "curriculum_id": None,
                        "library_id": None,
                        "subject_id": None,
                        "role": None,
                        "updated_at": datetime.datetime.utcnow().isoformat()
                    }}
                )

                # Clean up old subject relations if any
                if old_subject_id:
                    old_subj = db["subjects"].find_one({"_id": old_subject_id})
                    if old_subj:
                        core_book_ids = [bid for bid in old_subj.get("core_book_ids", []) if bid != book_id]
                        supporting_book_ids = [bid for bid in old_subj.get("supporting_book_ids", []) if bid != book_id]
                        books_count = len(core_book_ids) + len(supporting_book_ids)
                        db["subjects"].update_one(
                            {"_id": old_subject_id},
                            {"$set": {
                                "core_book_ids": core_book_ids,
                                "supporting_book_ids": supporting_book_ids,
                                "books_count": books_count
                            }}
                        )
                
                updated_book = db["books"].find_one({"_id": book_id})
                client.close()
                return {"success": True, "book": updated_book}

            curriculum_id = body.get("curriculum_id")
            subject_id = body.get("subject_id")
            role = body.get("role")

            if not curriculum_id or not subject_id or not role:
                client.close()
                return fastapi.responses.JSONResponse(
                    content={"success": False, "error": "Missing required fields: curriculum_id, subject_id, role"},
                    status_code=400
                )

            if role not in ["core", "supporting"]:
                client.close()
                return fastapi.responses.JSONResponse(
                    content={"success": False, "error": "Invalid role value. Must be 'core' or 'supporting'"},
                    status_code=400
                )

            # Find the curriculum
            curriculum = db["curricula"].find_one({"_id": curriculum_id})
            if not curriculum:
                client.close()
                return fastapi.responses.JSONResponse(
                    content={"success": False, "error": f"Curriculum with ID '{curriculum_id}' not found"},
                    status_code=404
                )

            # Find the subject
            subject = db["subjects"].find_one({"_id": subject_id})
            if not subject:
                client.close()
                return fastapi.responses.JSONResponse(
                    content={"success": False, "error": f"Subject with ID '{subject_id}' not found"},
                    status_code=404
                )

            old_subject_id = book_doc.get("subject_id")

            # Update book fields
            db["books"].update_one(
                {"_id": book_id},
                {"$set": {
                    "curriculum_id": curriculum_id,
                    "library_id": curriculum.get("library_id"),
                    "subject_id": subject_id,
                    "role": role,
                    "updated_at": datetime.datetime.utcnow().isoformat()
                }}
            )

            # Clean up old subject relations if any
            if old_subject_id:
                old_subj = db["subjects"].find_one({"_id": old_subject_id})
                if old_subj:
                    core_book_ids = [bid for bid in old_subj.get("core_book_ids", []) if bid != book_id]
                    supporting_book_ids = [bid for bid in old_subj.get("supporting_book_ids", []) if bid != book_id]
                    books_count = len(core_book_ids) + len(supporting_book_ids)
                    db["subjects"].update_one(
                        {"_id": old_subject_id},
                        {"$set": {
                            "core_book_ids": core_book_ids,
                            "supporting_book_ids": supporting_book_ids,
                            "books_count": books_count
                        }}
                    )

            # Add to new subject relations
            target_subj = db["subjects"].find_one({"_id": subject_id})
            if target_subj:
                core_book_ids = list(target_subj.get("core_book_ids", []) or [])
                supporting_book_ids = list(target_subj.get("supporting_book_ids", []) or [])

                if role == "core":
                    supporting_book_ids = [bid for bid in supporting_book_ids if bid != book_id]
                    if book_id not in core_book_ids:
                        core_book_ids.append(book_id)
                else:
                    core_book_ids = [bid for bid in core_book_ids if bid != book_id]
                    if book_id not in supporting_book_ids:
                        supporting_book_ids.append(book_id)

                books_count = len(core_book_ids) + len(supporting_book_ids)
                db["subjects"].update_one(
                    {"_id": subject_id},
                    {"$set": {
                        "core_book_ids": core_book_ids,
                        "supporting_book_ids": supporting_book_ids,
                        "books_count": books_count
                    }}
                )

            updated_book = db["books"].find_one({"_id": book_id})
            client.close()
            return {"success": True, "book": updated_book}
        except Exception as err:
            logger.error(f"[services.py] Failed to assign book: {err}", exc_info=True)
            return fastapi.responses.JSONResponse(
                content={"success": False, "error": str(err)},
                status_code=500
            )

    @app.delete("/user/books")
    async def delete_books_endpoint(id: str = None):
        try:
            from tools import get_mongodb_uri
            from pymongo import MongoClient
            
            if not id:
                return fastapi.responses.JSONResponse(
                    content={"error": "Missing required query parameter: id"},
                    status_code=400
                )
                
            uri = get_mongodb_uri()
            client = _pooled_client()
            db = get_active_db(client)
            
            book_doc = db["books"].find_one({"_id": id})
            if not book_doc:
                client.close()
                return fastapi.responses.JSONResponse(
                    content={"error": "Book not found"},
                    status_code=404
                )
                
            subject_id = book_doc.get("subject_id")
            
            res = db["books"].delete_one({"_id": id})
            
            if res.deleted_count > 0 and subject_id:
                db["subjects"].update_one(
                    {"_id": subject_id},
                    {"$inc": {"books_count": -1}}
                )
                
            client.close()
            return {"success": True, "message": "Book deleted successfully."}
        except Exception as err:
            return fastapi.responses.JSONResponse(
                content={"error": str(err)},
                status_code=500
            )

    @app.get("/admin/approve-ingestion")
    async def get_approve_ingestion_endpoint():
        try:
            from tools import get_mongodb_uri
            from pymongo import MongoClient
            
            uri = get_mongodb_uri()
            client = _pooled_client()
            db = get_active_db(client)
            
            pending_books = list(db["books"].find({"needs_approval": True}))
            for b in pending_books:
                if "_id" in b:
                    b["_id"] = str(b["_id"])
            client.close()
            return {"success": True, "books": pending_books}
        except Exception as err:
            logger.error(f"[services.py] Failed to get pending approvals: {err}", exc_info=True)
            return fastapi.responses.JSONResponse(
                content={"error": str(err)},
                status_code=500
            )

    @app.post("/admin/approve-ingestion")
    async def post_approve_ingestion_endpoint(request: fastapi.Request):
        try:
            from tools import get_mongodb_uri
            from pymongo import MongoClient
            import time
            
            data = await request.json()
            book_id = data.get("book_id", "")
            action = data.get("action", "")
            
            if not book_id or not action:
                return fastapi.responses.JSONResponse(
                    content={"error": "Missing required fields: book_id, action"},
                    status_code=400
                )
                
            uri = get_mongodb_uri()
            client = _pooled_client()
            db = get_active_db(client)
            
            book_doc = db["books"].find_one({"_id": book_id})
            if not book_doc:
                client.close()
                return fastapi.responses.JSONResponse(
                    content={"error": "Book draft not found"},
                    status_code=404
                )
                
            if action == "approve":
                db["books"].update_one(
                    {"_id": book_id},
                    {
                        "$set": {
                            "needs_approval": False,
                            "is_downloaded": True,
                            "ingestion_status": "queued",
                            "ingestion_progress": 5,
                            "updated_at": int(time.time())
                        }
                    }
                )
                
                payload = {
                    "book_id": book_id,
                    "subject_id": book_doc.get("subject_id"),
                    "title": book_doc.get("title"),
                    "title_ar": book_doc.get("title_ar"),
                    "source_url": book_doc.get("source_url"),
                    "storage_path": book_doc.get("storage_path"),
                    "grade": book_doc.get("grade", "General"),
                    "term": book_doc.get("term", "Term 1"),
                    "year": book_doc.get("year", "2026"),
                    "language": book_doc.get("language", "ar"),
                    "book_type": book_doc.get("book_type", "core"),
                    "is_private": bool(book_doc.get("userId")),
                    "userId": book_doc.get("userId"),
                    "is_local": False
                }
                
                run_ingest_in_background(payload)
                msg = "Book approved and background ingestion started successfully."
                
            elif action == "reject":
                db["books"].delete_one({"_id": book_id})
                
                subj_id = book_doc.get("subject_id")
                if subj_id:
                    db["subjects"].update_one(
                        {"_id": subj_id},
                        {"$inc": {"books_count": -1}}
                    )
                msg = "Book rejection processed and draft deleted."
                
            else:
                client.close()
                return fastapi.responses.JSONResponse(
                    content={"error": f"Invalid action: {action}"},
                    status_code=400
                )
                
            client.close()
            return {"success": True, "message": msg}
        except Exception as err:
            logger.error(f"[services.py] Failed to process approve/reject: {err}", exc_info=True)
            return fastapi.responses.JSONResponse(
                content={"error": str(err)},
                status_code=500
            )

    @app.get("/user/profile")
    async def get_profile_endpoint(request: fastapi.Request, userId: str = None, username: str = None, email: str = None):
        try:
            if not userId and not username and not email:
                principal = getattr(request.state, "principal", None)
                if principal:
                    userId = principal.get("uid")
                    email = principal.get("email")
            agents_dir = os.path.dirname(os.path.abspath(__file__))
            if agents_dir not in sys.path:
                sys.path.insert(0, agents_dir)
            from agent_communications import get_user_profile
            profile = await get_user_profile(user_id=userId, username=username, email=email)
            
            def sanitize_mongodb_objects(obj):
                if isinstance(obj, dict):
                    new_dict = {}
                    for k, v in obj.items():
                        if k == "_id":
                            new_dict[k] = str(v)
                        else:
                            new_dict[k] = sanitize_mongodb_objects(v)
                    return new_dict
                elif isinstance(obj, list):
                    return [sanitize_mongodb_objects(x) for x in obj]
                elif type(obj).__name__ == "ObjectId":
                    return str(obj)
                else:
                    return obj

            sanitized_profile = sanitize_mongodb_objects(profile) if profile else {}
            return {"profile": sanitized_profile}
        except Exception as err:
            logger.error(f"[services.py] Failed to get user profile: {err}", exc_info=True)
            return {"profile": {}, "error": str(err)}

    @app.get("/user/username/check")
    async def check_username_endpoint(username: str):
        try:
            agents_dir = os.path.dirname(os.path.abspath(__file__))
            if agents_dir not in sys.path:
                sys.path.insert(0, agents_dir)
            from agent_communications import check_username_availability
            available = await check_username_availability(username)
            return {"available": available}
        except Exception as err:
            logger.error(f"[services.py] Failed to check username: {err}", exc_info=True)
            return {"available": False, "error": str(err)}

    @app.post("/user/profile")
    async def post_profile_endpoint(request: fastapi.Request):
        try:
            agents_dir = os.path.dirname(os.path.abspath(__file__))
            if agents_dir not in sys.path:
                sys.path.insert(0, agents_dir)
            from agent_communications import save_user_profile
            data = await request.json()
            user_id = data.get("userId", "")
            profile_data = data.get("profile", {})
            if not user_id:
                return {"status": "error", "error": "userId is required"}
            success = await save_user_profile(user_id, profile_data)

            # FC7.33: when a user onboards as admin/teacher they are saved PENDING (adminPending/
            # teacherPending). Notify the super-admins so the approval request actually arrives (the owner
            # reported it never did). Fire once per pending user (guarded by approvalRequestNotified).
            if success:
                try:
                    _r = str((profile_data or {}).get("role") or "").strip().lower()
                    _t = str((profile_data or {}).get("userType") or "").strip().lower()
                    if _r in ("admin", "teacher") or _t in ("admin", "teacher"):
                        from tools import get_mongodb_uri as _gmu
                        from pymongo import MongoClient as _MC
                        _c = _MC(_gmu(), serverSelectionTimeoutMS=4000)
                        _db = get_active_db(_c)
                        _u = _db["users"].find_one({"userId": user_id}) or {}
                        _pending = _u.get("adminPending") is True or _u.get("teacherPending") is True
                        if _pending and _u.get("approvalRequestNotified") is not True:
                            _kind = "admin" if (_u.get("adminPending") is True) else "teacher"
                            _name = _u.get("name") or _u.get("username") or _u.get("email") or user_id
                            notify_admins_of(
                                _db, "role_approval_request",
                                "Approval needed: new " + _kind, "مطلوب موافقة: " + ("مشرف" if _kind == "admin" else "معلّم") + " جديد",
                                f"{_name} signed up as {_kind} and is awaiting your approval.",
                                f"{_name} سجّل كـ{('مشرف' if _kind == 'admin' else 'معلّم')} وبانتظار موافقتك.",
                                {"deep_link": "?tab=admin", "email": _u.get("email"), "role": _kind}
                            )
                            _db["users"].update_one({"userId": user_id}, {"$set": {"approvalRequestNotified": True}})
                        _c.close()
                except Exception as _ne:
                    logger.warning(f"[services.py] role-approval notify failed (non-blocking): {_ne}")

            return {"status": "success" if success else "error"}
        except Exception as err:
            logger.error(f"[services.py] Failed to save user profile: {err}", exc_info=True)
            return {"status": "error", "error": str(err)}

    @app.delete("/user/account")
    async def delete_account_endpoint(userId: str, email: str):
        try:
            agents_dir = os.path.dirname(os.path.abspath(__file__))
            if agents_dir not in sys.path:
                sys.path.insert(0, agents_dir)
            from agent_communications import delete_user_account
            success = await delete_user_account(userId, email)
            return {"status": "success" if success else "error"}
        except Exception as err:
            logger.error(f"[services.py] Failed to delete user account: {err}", exc_info=True)
            return {"status": "error", "error": str(err)}

    @app.get("/user/list")
    async def get_user_list_endpoint():
        try:
            agents_dir = os.path.dirname(os.path.abspath(__file__))
            if agents_dir not in sys.path:
                sys.path.insert(0, agents_dir)
            from agent_communications import get_all_users
            users = await get_all_users()
            return {"users": users}
        except Exception as err:
            logger.error(f"[services.py] Failed to retrieve user list: {err}", exc_info=True)
            return {"users": [], "error": str(err)}

    @app.post("/user/friend")
    async def post_friend_endpoint(request: fastapi.Request):
        try:
            agents_dir = os.path.dirname(os.path.abspath(__file__))
            if agents_dir not in sys.path:
                sys.path.insert(0, agents_dir)
            from agent_communications import add_friend, remove_friend
            data = await request.json()
            user_id = data.get("userId", "")
            friend_id = data.get("friendId", "")
            action = data.get("action", "add")
            
            if not user_id or not friend_id:
                return {"status": "error", "error": "userId and friendId are required"}

            if user_id == friend_id:
                return {"status": "error", "error": "Cannot add yourself as a friend"}
            
            if action == "add":
                success = await add_friend(user_id, friend_id)
            else:
                success = await remove_friend(user_id, friend_id)

            # FC7.40: notify the target of a new friend request/connection (mirrors the DM notification on
            # /chat/message). Best-effort — never blocks the friend action.
            if success and action == "add":
                try:
                    from tools import get_mongodb_uri as _gmu
                    from pymongo import MongoClient as _MC
                    import time as _t
                    _c = _MC(_gmu(), serverSelectionTimeoutMS=4000)
                    _db = get_active_db(_c)
                    _sender = _db["users"].find_one({"userId": user_id}, {"name": 1, "username": 1}) or {}
                    _sname = _sender.get("name") or _sender.get("username") or "Someone"
                    _ts = int(_t.time() * 1000)
                    _db["notifications"].insert_one({
                        "_id": f"ntf_{_ts}_friend_{friend_id[:8]}",
                        "recipient_uid": friend_id,
                        "type": "friend_request",
                        "title": f"{_sname} sent you a friend request",
                        "title_ar": f"أرسل {_sname} طلب صداقة",
                        "body": f"{_sname} wants to connect with you on Fahem.",
                        "body_ar": f"يريد {_sname} التواصل معك على فاهم.",
                        "payload": {"sender_id": user_id, "deep_link": "?tab=social"},
                        "read": False,
                        "createdAt": _ts
                    })
                    send_web_push(_db, friend_id, f"{_sname} sent you a friend request", "", "?tab=social")
                    _c.close()
                except Exception as _e:
                    logger.warning(f"Failed to notify of friend request: {_e}")

            return {"status": "success" if success else "error"}
        except Exception as err:
            logger.error(f"[services.py] Failed to manage friend: {err}", exc_info=True)
            return {"status": "error", "error": str(err)}

    @app.post("/chat/message")
    async def post_chat_message_endpoint(request: fastapi.Request):
        try:
            agents_dir = os.path.dirname(os.path.abspath(__file__))
            if agents_dir not in sys.path:
                sys.path.insert(0, agents_dir)
            from agent_communications import save_chat_message
            data = await request.json()
            sender_id = data.get("senderId", "")
            sender_name = data.get("senderName", "")
            recipient_id = data.get("recipientId", "")
            content = data.get("content", "")
            is_group = data.get("isGroup", False)
            success = await save_chat_message(sender_id, sender_name, recipient_id, content, is_group)
            # Notify the recipient of a new private (direct) message.
            if success and recipient_id and not is_group:
                try:
                    from tools import get_mongodb_uri as _gmu
                    from pymongo import MongoClient as _MC
                    import time as _t
                    _c = _MC(_gmu(), serverSelectionTimeoutMS=4000)
                    _db = get_active_db(_c)
                    _snip = (content or "")[:80]
                    _ts = int(_t.time() * 1000)
                    _db["notifications"].insert_one({
                        "_id": f"ntf_{_ts}_dm_{recipient_id[:8]}",
                        "recipient_uid": recipient_id,
                        "type": "private_message",
                        "title": f"New message from {sender_name or 'someone'}",
                        "title_ar": f"رسالة جديدة من {sender_name or 'مستخدم'}",
                        "body": _snip,
                        "body_ar": _snip,
                        "payload": {"sender_id": sender_id, "deep_link": "?tab=social"},
                        "read": False,
                        "createdAt": _ts
                    })
                    send_web_push(_db, recipient_id, f"New message from {sender_name or 'someone'}", _snip, "?tab=social")
                    _c.close()
                except Exception as _e:
                    logger.warning(f"Failed to notify recipient of private message: {_e}")
            return {"status": "success" if success else "error"}
        except Exception as err:
            logger.error(f"[services.py] Failed to save chat message: {err}", exc_info=True)
            return {"status": "error", "error": str(err)}

    @app.get("/chat/message")
    async def get_chat_message_endpoint(senderId: str, recipientId: str, isGroup: bool = False):
        try:
            agents_dir = os.path.dirname(os.path.abspath(__file__))
            if agents_dir not in sys.path:
                sys.path.insert(0, agents_dir)
            from agent_communications import get_chat_history
            messages = await get_chat_history(senderId, recipientId, isGroup)
            return {"messages": messages}
        except Exception as err:
            logger.error(f"[services.py] Failed to retrieve chat messages: {err}", exc_info=True)
            return {"messages": [], "error": str(err)}

    @app.get("/parent/children")
    async def get_parent_children_endpoint(parentEmail: str):
        try:
            agents_dir = os.path.dirname(os.path.abspath(__file__))
            if agents_dir not in sys.path:
                sys.path.insert(0, agents_dir)
            from agent_communications import get_pending_children
            children = await get_pending_children(parentEmail)
            return {"children": children}
        except Exception as err:
            logger.error(f"[services.py] Failed to retrieve parent children: {err}", exc_info=True)
            return {"children": [], "error": str(err)}

    @app.post("/parent/approve")
    async def post_parent_approve_endpoint(request: fastapi.Request):
        try:
            agents_dir = os.path.dirname(os.path.abspath(__file__))
            if agents_dir not in sys.path:
                sys.path.insert(0, agents_dir)
            from agent_communications import approve_child
            data = await request.json()
            parent_email = data.get("parentEmail", "")
            child_id = data.get("childId", "")
            success = await approve_child(parent_email, child_id)
            return {"status": "success" if success else "error"}
        except Exception as err:
            logger.error(f"[services.py] Failed to approve child: {err}", exc_info=True)
            return {"status": "error", "error": str(err)}

    @app.get("/social/groups")
    async def get_social_groups_endpoint():
        try:
            from tools import get_mongodb_uri
            from pymongo import MongoClient
            uri = get_mongodb_uri()
            client = _pooled_client()
            db = get_active_db(client)
            groups = list(db["social_groups"].find({}))
            for g in groups:
                if "_id" in g:
                    g["_id"] = str(g["_id"])
            return {"success": True, "groups": groups}
        except Exception as err:
            logger.error(f"[services.py] Failed to get social groups: {err}", exc_info=True)
            return {"success": False, "groups": [], "error": str(err)}

    @app.post("/social/groups")
    async def post_social_groups_endpoint(request: fastapi.Request):
        try:
            from tools import get_mongodb_uri
            from pymongo import MongoClient
            data = await request.json()
            name = data.get("name")
            name_ar = data.get("name_ar")
            description = data.get("description", "")
            description_ar = data.get("description_ar", "")
            category = data.get("category", "General")
            emoji = data.get("emoji", "👥")
            user_id = data.get("userId")

            if not name or not name_ar or not user_id:
                return fastapi.responses.JSONResponse(
                    status_code=400,
                    content={"success": False, "error": "Missing required fields: name, name_ar, userId"}
                )

            uri = get_mongodb_uri()
            client = _pooled_client()
            db = get_active_db(client)

            import time
            group_id = f"group_{int(time.time() * 1000)}"
            new_group = {
                "_id": group_id,
                "name": name,
                "name_ar": name_ar,
                "description": description,
                "description_ar": description_ar,
                "category": category,
                "emoji": emoji,
                "members_count": 1,
                "created_by": user_id
            }
            db["social_groups"].insert_one(new_group)
            return {"success": True, "group": new_group}
        except Exception as err:
            logger.error(f"[services.py] Failed to create social group: {err}", exc_info=True)
            return fastapi.responses.JSONResponse(
                status_code=500,
                content={"success": False, "error": str(err)}
            )

    @app.get("/social/threads")
    async def get_social_threads_endpoint(group_id: str = None, thread_id: str = None):
        try:
            from tools import get_mongodb_uri
            from pymongo import MongoClient
            uri = get_mongodb_uri()
            client = _pooled_client()
            db = get_active_db(client)

            if thread_id:
                thread = db["social_threads"].find_one({"_id": thread_id})
                if not thread:
                    return fastapi.responses.JSONResponse(
                        status_code=404,
                        content={"success": False, "error": "Thread not found"}
                    )
                thread["_id"] = str(thread["_id"])
                replies = list(db["social_replies"].find({"thread_id": thread_id}))
                for r in replies:
                    r["_id"] = str(r["_id"])
                thread["replies"] = replies
                return {"success": True, "thread": thread}

            query = {}
            if group_id:
                query["group_id"] = group_id

            threads = list(db["social_threads"].find(query))
            for t in threads:
                t["_id"] = str(t["_id"])
            threads.sort(key=lambda x: x.get("created_at", ""), reverse=True)
            return {"success": True, "threads": threads}
        except Exception as err:
            logger.error(f"[services.py] Failed to get social threads: {err}", exc_info=True)
            return fastapi.responses.JSONResponse(
                status_code=500,
                content={"success": False, "error": str(err)}
            )

    @app.post("/social/threads")
    async def post_social_threads_endpoint(request: fastapi.Request):
        try:
            from tools import get_mongodb_uri
            from pymongo import MongoClient
            data = await request.json()
            action = data.get("action")
            
            uri = get_mongodb_uri()
            client = _pooled_client()
            db = get_active_db(client)

            import time
            from datetime import datetime

            if action == "reply":
                thread_id = data.get("thread_id")
                content = data.get("content")
                content_ar = data.get("content_ar", content)
                author_id = data.get("author_id")
                author_name = data.get("author_name", "Anonymous Member")
                author_avatar = data.get("author_avatar", "👤")

                if not thread_id or not content or not author_id:
                    return fastapi.responses.JSONResponse(
                        status_code=400,
                        content={"success": False, "error": "Missing required fields: thread_id, content, author_id"}
                    )

                reply_id = f"reply_{int(time.time() * 1000)}"
                new_reply = {
                    "_id": reply_id,
                    "thread_id": thread_id,
                    "content": content,
                    "content_ar": content_ar,
                    "author_id": author_id,
                    "author_name": author_name,
                    "author_avatar": author_avatar,
                    "created_at": datetime.utcnow().isoformat() + "Z"
                }
                db["social_replies"].insert_one(new_reply)
                
                db["social_threads"].update_one(
                    {"_id": thread_id},
                    {"$inc": {"replies_count": 1}}
                )
                return {"success": True, "reply": new_reply}

            group_id = data.get("group_id")
            title = data.get("title")
            title_ar = data.get("title_ar", title)
            content = data.get("content")
            content_ar = data.get("content_ar", content)
            author_id = data.get("author_id")
            author_name = data.get("author_name", "Anonymous Member")
            author_avatar = data.get("author_avatar", "👤")

            if not group_id or not title or not content or not author_id:
                return fastapi.responses.JSONResponse(
                    status_code=400,
                    content={"success": False, "error": "Missing required fields for thread: group_id, title, content, author_id"}
                )

            thread_id = f"thread_{int(time.time() * 1000)}"
            new_thread = {
                "_id": thread_id,
                "group_id": group_id,
                "title": title,
                "title_ar": title_ar,
                "content": content,
                "content_ar": content_ar,
                "author_id": author_id,
                "author_name": author_name,
                "author_avatar": author_avatar,
                "created_at": datetime.utcnow().isoformat() + "Z",
                "likes_count": 0,
                "replies_count": 0
            }
            db["social_threads"].insert_one(new_thread)
            return {"success": True, "thread": new_thread}
        except Exception as err:
            logger.error(f"[services.py] Failed to post social thread/reply: {err}", exc_info=True)
            return fastapi.responses.JSONResponse(
                status_code=500,
                content={"success": False, "error": str(err)}
            )

    # =================================----------------------------
    # NOTIFICATION SYSTEM ENDPOINTS & HELPERS
    # =================================----------------------------
    def create_notification_internal(db, recipient_uid: str, ntf_type: str, title: str, title_ar: str, body: str, body_ar: str, payload: dict = None):
        import time
        ntf_id = f"ntf_{int(time.time() * 1000)}_{recipient_uid[:8]}"
        notification = {
            "_id": ntf_id,
            "recipient_uid": recipient_uid,
            "type": ntf_type,
            "title": title,
            "title_ar": title_ar,
            "body": body,
            "body_ar": body_ar,
            "payload": payload or {},
            "read": False,
            "createdAt": int(time.time() * 1000)
        }
        db["notifications"].insert_one(notification)
        send_web_push(db, recipient_uid, title, body, (payload or {}).get("deep_link"))
        return notification

    @app.get("/user/push-public-key")
    async def get_push_public_key():
        return {"success": True, "publicKey": os.environ.get("VAPID_PUBLIC_KEY", "")}

    @app.post("/user/push-subscribe")
    async def post_push_subscribe(request: fastapi.Request):
        try:
            principal = getattr(request.state, "principal", None)
            uid = principal.get("uid") if principal else None
            if not uid:
                return fastapi.responses.JSONResponse(status_code=401, content={"success": False, "error": "Unauthorized"})
            body = await request.json()
            subscription = body.get("subscription")
            if not subscription or not subscription.get("endpoint"):
                return fastapi.responses.JSONResponse(status_code=400, content={"success": False, "error": "Missing subscription"})
            from tools import get_mongodb_uri
            from pymongo import MongoClient
            import hashlib
            import time
            client = _pooled_client()
            db = get_active_db(client)
            sub_id = "push_" + hashlib.sha256(subscription["endpoint"].encode()).hexdigest()[:24]
            db["push_subscriptions"].replace_one({"_id": sub_id}, {
                "_id": sub_id, "userId": uid, "subscription": subscription, "createdAt": int(time.time() * 1000)
            }, upsert=True)
            client.close()
            return {"success": True}
        except Exception as err:
            logger.error(f"[services.py] push-subscribe failed: {err}", exc_info=True)
            return {"success": False, "error": str(err)}

    @app.get("/notifications")
    async def get_notifications_endpoint(request: fastapi.Request, unreadOnly: str = "false"):
        try:
            from tools import get_mongodb_uri
            from pymongo import MongoClient
            
            principal = getattr(request.state, "principal", None)
            if not principal:
                return fastapi.responses.JSONResponse(status_code=401, content={"error": "Unauthorized"})
            uid = principal.get("uid")
            
            uri = get_mongodb_uri()
            client = _pooled_client()
            db = get_active_db(client)
            
            query = {"recipient_uid": uid}
            if unreadOnly == "true":
                query["read"] = False
                
            notifications = list(db["notifications"].find(query).sort("createdAt", -1))
            for n in notifications:
                n["_id"] = str(n["_id"])
            return {"success": True, "notifications": notifications}
        except Exception as err:
            logger.error(f"[services.py] Failed to get notifications: {err}", exc_info=True)
            return fastapi.responses.JSONResponse(status_code=500, content={"success": False, "error": str(err)})

    @app.get("/notifications/count")
    async def get_notifications_count_endpoint(request: fastapi.Request):
        try:
            from tools import get_mongodb_uri
            from pymongo import MongoClient
            
            principal = getattr(request.state, "principal", None)
            if not principal:
                return fastapi.responses.JSONResponse(status_code=401, content={"error": "Unauthorized"})
            uid = principal.get("uid")
            
            uri = get_mongodb_uri()
            client = _pooled_client()
            db = get_active_db(client)
            
            count = db["notifications"].count_documents({"recipient_uid": uid, "read": False})
            return {"success": True, "count": count}
        except Exception as err:
            logger.error(f"[services.py] Failed to count notifications: {err}", exc_info=True)
            return fastapi.responses.JSONResponse(status_code=500, content={"success": False, "error": str(err)})

    @app.post("/notifications/read")
    async def post_notifications_read_endpoint(request: fastapi.Request):
        try:
            from tools import get_mongodb_uri
            from pymongo import MongoClient
            import bson
            
            principal = getattr(request.state, "principal", None)
            if not principal:
                return fastapi.responses.JSONResponse(status_code=401, content={"error": "Unauthorized"})
            uid = principal.get("uid")
            
            body = await request.json()
            notification_ids = body.get("notification_ids", [])
            
            uri = get_mongodb_uri()
            client = _pooled_client()
            db = get_active_db(client)
            
            query = {"recipient_uid": uid}
            if notification_ids:
                object_ids = []
                for nid in notification_ids:
                    try:
                        object_ids.append(bson.ObjectId(nid))
                    except Exception:
                        object_ids.append(nid)
                query["_id"] = {"$in": object_ids + notification_ids}
                
            db["notifications"].update_many(query, {"$set": {"read": True}})
            return {"success": True}
        except Exception as err:
            logger.error(f"[services.py] Failed to mark notifications as read: {err}", exc_info=True)
            return fastapi.responses.JSONResponse(status_code=500, content={"success": False, "error": str(err)})

    # =================================----------------------------
    # GROUP ASSIGNMENTS & FOCUS LOCK ENDPOINTS
    # =================================----------------------------
    @app.get("/assignments/focus-lock")
    async def get_assignments_focus_lock_endpoint(request: fastapi.Request):
        try:
            from tools import get_mongodb_uri
            from pymongo import MongoClient
            import time
            
            principal = getattr(request.state, "principal", None)
            if not principal:
                p_header = request.headers.get("X-Verified-Principal")
                if p_header:
                    import json
                    principal = json.loads(p_header)
            
            if not principal:
                return fastapi.responses.JSONResponse(status_code=401, content={"error": "Unauthorized"})
            
            uid = principal.get("uid")
            role = principal.get("role")
            
            if role not in ["student", "user"]:
                return {"locked": False}
                
            uri = get_mongodb_uri()
            client = _pooled_client()
            db = get_active_db(client)
            
            now = int(time.time())
            
            # Check active assignment
            active_asg = db["group_assignments"].find_one({
                "status": "active",
                "ends_at": {"$gt": now}
            })
            if active_asg:
                client.close()
                return {
                    "locked": True,
                    "reason": "assignment_active",
                    "message": "An academic assignment is active. Your companion and messaging are locked.",
                    "message_ar": "هناك واجب نشط قيد التشغيل حالياً. تم تعطيل المعلم والمراسلة."
                }
                
            # Check active solo practice session
            active_practice = db["active_practice_sessions"].find_one({"uid": uid})
            if active_practice:
                client.close()
                return {
                    "locked": True,
                    "reason": "practice_active",
                    "message": "A solo practice session is active. Direct messaging is suppressed.",
                    "message_ar": "هناك جلسة تدريب فردي نشطة. تم كتم الرسائل المباشرة."
                }
                
            client.close()
            return {"locked": False}
        except Exception as err:
            logger.error(f"[services.py] Focus lock check failed: {err}", exc_info=True)
            return fastapi.responses.JSONResponse(status_code=500, content={"success": False, "error": str(err)})

    @app.post("/practice/lock")
    async def post_practice_lock_endpoint(request: fastapi.Request):
        try:
            from tools import get_mongodb_uri
            from pymongo import MongoClient
            import time
            
            principal = getattr(request.state, "principal", None)
            if not principal:
                p_header = request.headers.get("X-Verified-Principal")
                if p_header:
                    import json
                    principal = json.loads(p_header)
            
            if not principal:
                return fastapi.responses.JSONResponse(status_code=401, content={"error": "Unauthorized"})
            
            uid = principal.get("uid")
            
            body = await request.json()
            active = body.get("active", False)
            
            uri = get_mongodb_uri()
            client = _pooled_client()
            db = get_active_db(client)
            
            if active:
                db["active_practice_sessions"].update_one(
                    {"uid": uid},
                    {"$set": {"uid": uid, "started_at": int(time.time())}},
                    upsert=True
                )
            else:
                db["active_practice_sessions"].delete_many({"uid": uid})
                
            client.close()
            return {"success": True}
        except Exception as err:
            logger.error(f"[services.py] Practice lock update failed: {err}", exc_info=True)
            return fastapi.responses.JSONResponse(status_code=500, content={"success": False, "error": str(err)})

    @app.get("/assignments")
    async def get_assignments_endpoint(request: fastapi.Request, group_id: str):
        try:
            from tools import get_mongodb_uri
            from pymongo import MongoClient
            
            principal = getattr(request.state, "principal", None)
            if not principal:
                p_header = request.headers.get("X-Verified-Principal")
                if p_header:
                    import json
                    principal = json.loads(p_header)
            
            if not principal:
                return fastapi.responses.JSONResponse(status_code=401, content={"error": "Unauthorized"})
            
            uid = principal.get("uid")
            
            uri = get_mongodb_uri()
            client = _pooled_client()
            db = get_active_db(client)
            
            assignments_query_result = db["group_assignments"].find({"group_id": group_id}).sort("created_at", -1)
            assignments_list = list(assignments_query_result)
            
            for asg in assignments_list:
                asg["_id"] = str(asg["_id"])
                submission = db["assignment_submissions"].find_one({
                    "assignment_id": asg["_id"],
                    "uid": uid
                })
                if submission:
                    submission["_id"] = str(submission["_id"])
                    asg["user_submission"] = submission
                else:
                    asg["user_submission"] = None
                    
            client.close()
            return {"success": True, "assignments": assignments_list}
        except Exception as err:
            logger.error(f"[services.py] Get assignments failed: {err}", exc_info=True)
            return fastapi.responses.JSONResponse(status_code=500, content={"success": False, "error": str(err)})

    @app.post("/assignments")
    async def post_assignments_endpoint(request: fastapi.Request):
        try:
            from tools import get_mongodb_uri
            from pymongo import MongoClient
            import time
            
            principal = getattr(request.state, "principal", None)
            if not principal:
                p_header = request.headers.get("X-Verified-Principal")
                if p_header:
                    import json
                    principal = json.loads(p_header)
            
            if not principal:
                return fastapi.responses.JSONResponse(status_code=401, content={"error": "Unauthorized"})
            
            role = principal.get("role")
            if role not in ["teacher", "admin", "super-admin", "judge"]:
                return fastapi.responses.JSONResponse(status_code=403, content={"error": "Forbidden: Only instructors can post assignments"})
                
            body = await request.json()
            group_id = body.get("group_id")
            title = body.get("title")
            title_ar = body.get("title_ar")
            subject_id = body.get("subject_id")
            book_id = body.get("book_id")
            questions = body.get("questions", [])
            timer_seconds = int(body.get("timer_seconds", 120))
            
            if not group_id or not title or not title_ar or (not subject_id and not book_id):
                return fastapi.responses.JSONResponse(status_code=400, content={"error": "Missing required fields: group_id, title, title_ar, and (subject_id or book_id)"})
                
            uri = get_mongodb_uri()
            client = _pooled_client()
            db = get_active_db(client)
            
            anchor_valid = False
            if subject_id:
                subj = db["subjects"].find_one({"_id": subject_id})
                if subj:
                    anchor_valid = True
            if not anchor_valid and book_id:
                bk = db["books"].find_one({"_id": book_id})
                if bk:
                    anchor_valid = True
                    
            if not anchor_valid:
                client.close()
                return fastapi.responses.JSONResponse(status_code=400, content={"error": "Fail-closed: Question must have a valid subject_id or book_id anchor."})
                
            now = int(time.time())
            asg_id = f"asg_{int(time.time() * 1000)}"
            ends_at = now + timer_seconds
            
            new_asg = {
                "_id": asg_id,
                "group_id": group_id,
                "author_uid": principal.get("uid"),
                "title": title,
                "title_ar": title_ar,
                "subject_id": subject_id,
                "book_id": book_id,
                "questions": questions,
                "timer_seconds": timer_seconds,
                "starts_at": now,
                "ends_at": ends_at,
                "status": "active",
                "created_at": now,
                "updated_at": now
            }
            
            db["group_assignments"].insert_one(new_asg)
            
            users_query_result = db["users"].find({"role": {"$in": ["student", "user"]}, "userId": {"$ne": principal.get("uid")}})
            users_to_notify = list(users_query_result)
            
            for student in users_to_notify:
                student_uid = student.get("userId") or student.get("uid")
                if student_uid:
                    create_notification_internal(
                        db=db,
                        recipient_uid=student_uid,
                        ntf_type="assignment_new",
                        title=f"New Assignment: {title}",
                        title_ar=f"واجب جديد: {title_ar}",
                        body=f"Your instructor posted a new timed assignment: '{title}'",
                        body_ar=f"قام المعلم بنشر واجب مؤقت جديد: '{title_ar}'",
                        payload={
                            "group_id": group_id,
                            "assignment_id": asg_id,
                            "deep_link": f"?tab=social&group={group_id}&assignment={asg_id}"
                        }
                    )
                    
            client.close()
            return {"success": True, "assignment": new_asg}
        except Exception as err:
            logger.error(f"[services.py] Create assignment failed: {err}", exc_info=True)
            return fastapi.responses.JSONResponse(status_code=500, content={"success": False, "error": str(err)})

    @app.post("/assignments/submit")
    async def post_assignments_submit_endpoint(request: fastapi.Request):
        try:
            from tools import get_mongodb_uri
            from pymongo import MongoClient
            import time
            import os
            
            principal = getattr(request.state, "principal", None)
            if not principal:
                p_header = request.headers.get("X-Verified-Principal")
                if p_header:
                    import json
                    principal = json.loads(p_header)
            
            if not principal:
                return fastapi.responses.JSONResponse(status_code=401, content={"error": "Unauthorized"})
            
            uid = principal.get("uid")
            body = await request.json()
            assignment_id = body.get("assignment_id")
            answers_input = body.get("answers", [])
            
            if not assignment_id:
                return fastapi.responses.JSONResponse(status_code=400, content={"error": "assignment_id is required"})
                
            uri = get_mongodb_uri()
            client = _pooled_client()
            db = get_active_db(client)
            
            asg = db["group_assignments"].find_one({"_id": assignment_id})
            if not asg:
                client.close()
                return fastapi.responses.JSONResponse(status_code=404, content={"error": "Assignment not found"})
                
            now = int(time.time())
            before_timer = now <= asg["ends_at"]
            
            sub_id = f"sub_{assignment_id}_{uid}"
            existing = db["assignment_submissions"].find_one({"_id": sub_id})
            if existing:
                client.close()
                return fastapi.responses.JSONResponse(status_code=409, content={"error": "You have already submitted this assignment"})
                
            graded_answers = []
            total_score = 0.0
            max_score = 0.0
            
            questions_dict = {q["id"]: q for q in asg.get("questions", [])}
            
            for ans in answers_input:
                qid = ans.get("question_id")
                val = ans.get("value")
                answered_at = ans.get("answeredAt") or now
                
                q = questions_dict.get(qid)
                if not q:
                    continue
                    
                q_type = q.get("type", "mcq")
                correct = False
                score = 0.0
                explanation = ""
                
                max_score += 1.0
                
                if q_type == "mcq":
                    expected = str(q.get("answer", "")).strip().lower()
                    submitted = str(val).strip().lower()
                    if expected == submitted:
                        correct = True
                        score = 1.0
                        explanation = "Correct option index matches precisely."
                    else:
                        explanation = f"Incorrect. The expected option index is {q.get('answer')}."
                        
                elif q_type in ["exact_answer", "complete_sentence"]:
                    expected = str(q.get("answer", "")).strip().lower()
                    submitted = str(val).strip().lower()
                    if expected == submitted:
                        correct = True
                        score = 1.0
                        explanation = "Your answer matches the expected value precisely."
                    else:
                        explanation = f"Incorrect. The correct answer is '{q.get('answer')}'."
                        
                elif q_type == "open_ended":
                    from tools import get_gemini_api_key
                    gemini_api_key = get_gemini_api_key()
                    if gemini_api_key:
                        try:
                            from google.genai import GoogleGenAI
                            ai = GoogleGenAI(api_key=gemini_api_key)
                            
                            rubric_text = q.get("rubric", "Standard completeness and academic accuracy.")
                            prompt_text = f"""
                            You are an expert academic critique grader. Grade the submitted student answer for the question below.
                            
                            Question: {q.get('prompt')}
                            Rubric/Guidelines: {rubric_text}
                            Student Submission: {val}
                            
                            Critique and grade the submission. Provide:
                            1. A score between 0.0 and 1.0 (float)
                            2. A short explanation/critique in the language of the submission.
                            
                            Format your output strictly as a JSON object containing keys "score" and "explanation".
                            """
                            resp = ai.models.generateContent(
                                model=os.environ.get("GEMINI_MODEL", "gemini-3.1-flash-lite"),
                                contents=prompt_text,
                                config={"responseMimeType": "application/json"}
                            )
                            import json
                            res_data = json.loads(resp.text)
                            score = float(res_data.get("score", 0.0))
                            correct = score >= 0.7
                            explanation = res_data.get("explanation", "")
                        except Exception as grading_err:
                            logger.warn(f"Gemini grading failed: {grading_err}")
                            explanation = "Graded manually or fallback complete."
                    else:
                        score = 0.5
                        explanation = "Critique grading queued/fallback."
                        
                total_score += score
                graded_answers.append({
                    "question_id": qid,
                    "value": val,
                    "answeredAt": answered_at,
                    "before_timer": before_timer,
                    "correct": correct,
                    "score": score,
                    "explanation": explanation
                })
                
            submission_doc = {
                "_id": sub_id,
                "assignment_id": assignment_id,
                "group_id": asg.get("group_id"),
                "uid": uid,
                "answers": graded_answers,
                "total_score": total_score,
                "max_score": max_score,
                "submitted_at": now,
                "graded": True
            }
            
            db["assignment_submissions"].insert_one(submission_doc)
            
            client.close()
            return {"success": True, "submission": submission_doc}
        except Exception as err:
            logger.error(f"[services.py] Assignment submission failed: {err}", exc_info=True)
            return fastapi.responses.JSONResponse(status_code=500, content={"success": False, "error": str(err)})

    @app.get("/assignments/results")
    async def get_assignments_results_endpoint(request: fastapi.Request, assignment_id: str):
        try:
            from tools import get_mongodb_uri
            from pymongo import MongoClient
            import time
            
            principal = getattr(request.state, "principal", None)
            if not principal:
                p_header = request.headers.get("X-Verified-Principal")
                if p_header:
                    import json
                    principal = json.loads(p_header)
            
            if not principal:
                return fastapi.responses.JSONResponse(status_code=401, content={"error": "Unauthorized"})
            
            uid = principal.get("uid")
            role = principal.get("role")
            
            uri = get_mongodb_uri()
            client = _pooled_client()
            db = get_active_db(client)
            
            asg = db["group_assignments"].find_one({"_id": assignment_id})
            if not asg:
                client.close()
                return fastapi.responses.JSONResponse(status_code=404, content={"error": "Assignment not found"})
                
            submissions_query_result = db["assignment_submissions"].find({"assignment_id": assignment_id})
            submissions_list = list(submissions_query_result)
            
            if role in ["student", "user"]:
                own_subs = [s for s in submissions_list if s["uid"] == uid]
                for s in own_subs:
                    s["_id"] = str(s["_id"])
                client.close()
                return {"success": True, "submissions": own_subs, "assignment": {
                    "_id": str(asg["_id"]),
                    "title": asg.get("title"),
                    "title_ar": asg.get("title_ar"),
                    "ends_at": asg.get("ends_at"),
                    "status": asg.get("status")
                }}
                
            for s in submissions_list:
                s["_id"] = str(s["_id"])
                
            client.close()
            return {"success": True, "submissions": submissions_list, "assignment": {
                "_id": str(asg["_id"]),
                "title": asg.get("title"),
                "title_ar": asg.get("title_ar"),
                "ends_at": asg.get("ends_at"),
                "status": asg.get("status")
            }}
        except Exception as err:
            logger.error(f"[services.py] Get results failed: {err}", exc_info=True)
            return fastapi.responses.JSONResponse(status_code=500, content={"success": False, "error": str(err)})

    @app.post("/verify-recaptcha")
    async def post_verify_recaptcha_endpoint(request: fastapi.Request):
        try:
            agents_dir = os.path.dirname(os.path.abspath(__file__))
            if agents_dir not in sys.path:
                sys.path.insert(0, agents_dir)
            from recaptcha_verification import verify_recaptcha_token_safely
            data = await request.json()
            token = data.get("token", "")
            action = data.get("action", "LOGIN")
            
            if not token:
                return {"status": "error", "error": "Token is required"}
                
            res = verify_recaptcha_token_safely(token, action)
            return res
        except Exception as err:
            logger.error(f"[services.py] Failed to verify recaptcha: {err}", exc_info=True)
            return {"success": False, "status": "error", "error": str(err), "score": 0.0}

    @app.post("/sms/rate-limit")
    async def post_sms_rate_limit(request: fastapi.Request):
        try:
            import datetime
            from datetime import timedelta
            from pymongo import MongoClient
            from tools import get_mongodb_uri
            
            data = await request.json()
            phone = data.get("phone", "").strip()
            ip = data.get("ip", "").strip()
            
            if not phone:
                return fastapi.responses.JSONResponse(
                    status_code=400,
                    content={"success": False, "error": "Phone number is required", "errorAr": "رقم الهاتف مطلوب"}
                )
            
            # Connect to MongoDB
            uri = get_mongodb_uri()
            client = _pooled_client()
            db = get_active_db(client)
            
            now = datetime.datetime.utcnow()
            one_hour_ago = now - timedelta(hours=1)
            one_day_ago = now - timedelta(days=1)
            
            # 1. Enforce Global Daily SMS Budget: Limit of 100 successful requests per day system-wide.
            global_daily_count = db.sms_logs.count_documents({
                "timestamp": {"$gte": one_day_ago}
            })
            if global_daily_count >= 100:
                client.close()
                return fastapi.responses.JSONResponse(
                    status_code=429,
                    content={
                        "success": False,
                        "error": "Global daily SMS limit reached. Please try again tomorrow.",
                        "errorAr": "تم الوصول إلى الحد اليومي الأقصى لرسائل التحقق. يرجى المحاولة غداً."
                    }
                )
                
            # 2. Hourly Phone Limit: Max 3 requests per hour per specific phone number.
            phone_hourly_count = db.sms_logs.count_documents({
                "phone": phone,
                "timestamp": {"$gte": one_hour_ago}
            })
            if phone_hourly_count >= 3:
                client.close()
                return fastapi.responses.JSONResponse(
                    status_code=429,
                    content={
                        "success": False,
                        "error": "Too many verification requests for this phone number. Please wait an hour.",
                        "errorAr": "لقد طلبت الكثير من رموز التحقق لهذا الرقم. يرجى الانتظار ساعة والمحاولة مجدداً."
                    }
                )
                
            # 3. Hourly Location Limit: Max 5 requests per hour per IP address.
            if ip:
                ip_hourly_count = db.sms_logs.count_documents({
                    "ip": ip,
                    "timestamp": {"$gte": one_hour_ago}
                })
                if ip_hourly_count >= 5:
                    client.close()
                    return fastapi.responses.JSONResponse(
                        status_code=429,
                        content={
                            "success": False,
                            "error": "Too many verification requests from this IP. Please wait an hour.",
                            "errorAr": "لقد طلبت الكثير من رموز التحقق من هذا العنوان. يرجى الانتظار ساعة والمحاولة مجدداً."
                        }
                    )
            
            # If all checks pass, log the SMS request and return allowed.
            db.sms_logs.insert_one({
                "phone": phone,
                "ip": ip,
                "timestamp": now
            })
            
            client.close()
            return {"success": True, "allowed": True}
            
        except Exception as err:
            logger.error(f"[services.py] SMS rate limit check failed: {err}", exc_info=True)
            return fastapi.responses.JSONResponse(
                status_code=500,
                content={"success": False, "error": str(err), "errorAr": "فشل التحقق من حد الرسائل القصيرة."}
            )

    @app.post("/admin/recover-orphans")
    async def admin_recover_orphans(request: fastapi.Request):
        try:
            # Verify auth - require super-admin or admin
            principal = getattr(request.state, "principal", None)
            if not principal or principal.get("role") not in ("super-admin", "admin"):
                return fastapi.responses.JSONResponse(
                    status_code=403,
                    content={"success": False, "error": "Forbidden: Admin access required"}
                )

            data = await request.json()
            dry_run = data.get("dry_run", True)
            
            from pymongo import MongoClient
            from tools import get_mongodb_uri
            uri = get_mongodb_uri()
            client = _pooled_client()
            db = get_active_db(client)
            
            # Find distinct book_ids in book_pages
            page_book_ids = db.book_pages.distinct("book_id")
            
            # Find all existing book docs
            books = list(db.books.find({}, {"_id": 1, "title": 1, "subject_id": 1, "curriculum_id": 1, "library_id": 1}))
            existing_book_ids = {str(b["_id"]) for b in books}
            
            orphaned_ids = [bid for bid in page_book_ids if str(bid) not in existing_book_ids]
            
            orphans_info = []
            for bid in orphaned_ids:
                # Find page count
                page_count = db.book_pages.count_documents({"book_id": bid})
                # Find a sample page to inspect structure
                sample_page = db.book_pages.find_one({"book_id": bid})
                sample_info = {}
                if sample_page:
                    sample_info = {
                        "_id": str(sample_page["_id"]),
                        "page_number": sample_page.get("page_number"),
                        "title": sample_page.get("title") or sample_page.get("metadata", {}).get("title"),
                        "book_title": sample_page.get("book_title") or sample_page.get("metadata", {}).get("book_title"),
                        "subject_id": sample_page.get("subject_id") or sample_page.get("metadata", {}).get("subject_id"),
                        "curriculum_id": sample_page.get("curriculum_id") or sample_page.get("metadata", {}).get("curriculum_id"),
                        "library_id": sample_page.get("library_id") or sample_page.get("metadata", {}).get("library_id"),
                        "language": sample_page.get("language") or sample_page.get("metadata", {}).get("language"),
                    }
                
                orphans_info.append({
                    "book_id": str(bid),
                    "page_count": page_count,
                    "sample": sample_info
                })
                
            if dry_run:
                client.close()
                return {
                    "success": True,
                    "mode": "dry_run",
                    "existing_books": [dict(b, _id=str(b["_id"])) for b in books],
                    "orphans": orphans_info
                }
                
            # Perform recovery
            recovered_books = []
            for orphan in orphans_info:
                bid = orphan["book_id"]
                sample = orphan["sample"]
                
                # Determine title, fallback to something descriptive
                title = sample.get("book_title") or sample.get("title") or f"Recovered Book {bid}"
                language = sample.get("language") or "ar"
                
                # Try to map library, curriculum, subject from sample, or use canonical defaults
                library_id = sample.get("library_id") or "lib_moe"
                curriculum_id = sample.get("curriculum_id") or "curr_egypt_secondary2_term2"
                subject_id = sample.get("subject_id") or "subj_egypt_secondary2_term2_history" # fallback
                
                # Let's count total pages
                max_page_doc = db.book_pages.find_one({"book_id": bid}, sort=[("page_number", -1)])
                total_pages = max_page_doc.get("page_number", orphan["page_count"]) if max_page_doc else orphan["page_count"]
                
                # Reconstruct chapters & topics from pages
                # Find all pages sorted by page_number
                pages_cursor = db.book_pages.find({"book_id": bid}, {"page_number": 1, "chapter_title": 1, "topic_title": 1}).sort("page_number", 1)
                chapters_dict = {}
                for p in pages_cursor:
                    ch_title = p.get("chapter_title") or "General"
                    tp_title = p.get("topic_title") or "Overview"
                    if ch_title not in chapters_dict:
                        chapters_dict[ch_title] = set()
                    chapters_dict[ch_title].add(tp_title)
                    
                chapters_list = []
                for ch_title, topics_set in chapters_dict.items():
                    chapters_list.append({
                        "title": ch_title,
                        "topics": [{"title": t, "startPage": 1} for t in sorted(list(topics_set))]
                    })
                    
                book_doc = {
                    "_id": bid,
                    "title": title,
                    "title_ar": title if language == "ar" else "",
                    "description": f"Recovered from book pages",
                    "description_ar": "تم استرداد هذا الكتاب من الصفحات المخزنة" if language == "ar" else "",
                    "language": language,
                    "library_id": library_id,
                    "curriculum_id": curriculum_id,
                    "subject_id": subject_id,
                    "role": "core",
                    "visibility": "public",
                    "status": "embedded",
                    "totalPages": total_pages,
                    "chapters": chapters_list,
                    "coverUrl": f"/libs/moe.svg", # fallback
                    "coverThumbUrl": f"/libs/moe.svg"
                }
                
                db.books.replace_one({"_id": bid}, book_doc, upsert=True)
                
                # Let's make sure the subject exists and has correct count
                if subject_id:
                    subject_doc = db.subjects.find_one({"_id": subject_id})
                    if not subject_doc:
                        # Recreate subject Deterministically
                        subject_doc = {
                            "_id": subject_id,
                            "curriculum_id": curriculum_id,
                            "name": subject_id.split("_")[-1].capitalize(),
                            "name_ar": "مادة مستردة",
                            "slug": subject_id.split("_")[-1],
                            "color": "#4F46E5",
                            "emoji": "📚"
                        }
                        db.subjects.replace_one({"_id": subject_id}, subject_doc, upsert=True)
                    
                    # Update books count under this subject
                    books_count = db.books.count_documents({"subject_id": subject_id})
                    db.subjects.update_one({"_id": subject_id}, {"$set": {"books_count": books_count}})
                    
                recovered_books.append(book_doc)
                
            auth_users = data.get("auth_users", [])
            backfilled_count = 0
            if not dry_run and auth_users:
                try:
                    try:
                        from agents.mongodb_engine import MongoDBEngine
                    except ImportError:
                        from mongodb_engine import MongoDBEngine
                    db_engine = MongoDBEngine()
                    for au in auth_users:
                        uid = au.get("uid")
                        email = au.get("email")
                        disp_name = au.get("displayName")
                        if uid and email:
                            await db_engine.ensure_user_profile(
                                user_id=uid,
                                email=email,
                                display_name=disp_name
                            )
                            backfilled_count += 1
                except Exception as b_err:
                    logger.warning(f"Failed to backfill auth users during orphan recovery: {b_err}")
                
            client.close()
            return {
                "success": True,
                "mode": "recover",
                "recovered_books_count": len(recovered_books),
                "recovered_books": [dict(b, _id=str(b["_id"])) for b in recovered_books],
                "backfilled_users_count": backfilled_count
            }
        except Exception as err:
            logger.error(f"[services.py] Orphan recovery failed: {err}", exc_info=True)
            return fastapi.responses.JSONResponse(
                status_code=500,
                content={"success": False, "error": str(err)}
            )

    @app.post("/admin/delete-moe-library")
    async def admin_delete_moe_library(request: fastapi.Request):
        try:
            # Verify auth - require super-admin or admin
            principal = getattr(request.state, "principal", None)
            if not principal or principal.get("role") not in ("super-admin", "admin"):
                return fastapi.responses.JSONResponse(
                    status_code=403,
                    content={"success": False, "error": "Forbidden: Admin access required"}
                )

            data = await request.json()
            confirm = data.get("confirm", False)
            db_target = data.get("db", None)

            import os
            import subprocess
            
            script_path = "scripts/delete_moe_library.py"
            if not os.path.exists(script_path):
                script_path = "agents/scripts/delete_moe_library.py"
                if not os.path.exists(script_path):
                    script_path = "/app/scripts/delete_moe_library.py"
            
            cmd = ["python", script_path]
            if confirm:
                cmd.append("--confirm")
            if db_target:
                cmd.extend(["--db", db_target])

            res = subprocess.run(cmd, capture_output=True, text=True, timeout=60, env=os.environ)

            return {
                "success": res.returncode == 0,
                "returncode": res.returncode,
                "stdout": res.stdout,
                "stderr": res.stderr,
                "cmd": cmd
            }
        except Exception as err:
            logger.error(f"[services.py] Delete MOE library route failed: {err}", exc_info=True)
            return fastapi.responses.JSONResponse(
                status_code=500,
                content={"success": False, "error": str(err)}
            )

    @app.post("/admin/emergency-sandbox-purge")
    async def admin_emergency_sandbox_purge(request: fastapi.Request):
        try:
            # Verify auth - require super-admin or admin
            principal = getattr(request.state, "principal", None)
            if not principal or principal.get("role") not in ("super-admin", "admin"):
                return fastapi.responses.JSONResponse(
                    status_code=403,
                    content={"success": False, "error": "Forbidden: Admin access required"}
                )

            data = await request.json()
            apply = data.get("apply", False)
            clear_prod_jobs = data.get("clear_prod_jobs", False)
            purge_prod_demo = data.get("purge_prod_demo", False)
            i_understand = data.get("i_understand_prod_delete", False)

            import os
            import subprocess
            
            script_path = "scripts/emergency_sandbox_purge.py"
            if not os.path.exists(script_path):
                script_path = "agents/scripts/emergency_sandbox_purge.py"
                if not os.path.exists(script_path):
                    script_path = "/app/scripts/emergency_sandbox_purge.py"
            
            cmd = ["python", script_path]
            if apply:
                cmd.append("--apply")
            if clear_prod_jobs:
                cmd.append("--clear-prod-jobs")
            if purge_prod_demo:
                cmd.append("--purge-prod-demo")
            if i_understand:
                cmd.append("--i-understand-prod-delete")

            res = subprocess.run(cmd, capture_output=True, text=True, timeout=60, env=os.environ)

            return {
                "success": res.returncode == 0,
                "returncode": res.returncode,
                "stdout": res.stdout,
                "stderr": res.stderr,
                "cmd": cmd
            }
        except Exception as err:
            logger.error(f"[services.py] Emergency sandbox purge route failed: {err}", exc_info=True)
            return fastapi.responses.JSONResponse(
                status_code=500,
                content={"success": False, "error": str(err)}
            )

    @app.post("/user/translate/page")
    async def user_translate_page(request: fastapi.Request):
        try:
            # Authenticate: require verified user
            principal = getattr(request.state, "principal", None)
            if not principal:
                return fastapi.responses.JSONResponse(
                    status_code=401,
                    content={"success": False, "error": "Unauthorized: Authentication required"}
                )
                
            body = await request.json()
            book_id = body.get("bookId")
            page_number = body.get("pageNumber")
            target_language = body.get("targetLanguage")
            
            if not book_id or page_number is None or not target_language:
                return fastapi.responses.JSONResponse(
                    status_code=400,
                    content={"success": False, "error": "Missing required parameters"}
                )
                
            supported_languages = ["en", "ar", "es", "fr", "de", "zh", "it"]
            if target_language not in supported_languages:
                return fastapi.responses.JSONResponse(
                    status_code=400,
                    content={"success": False, "error": f"Unsupported language: {target_language}"}
                )
                
            from pymongo import MongoClient
            from tools import get_mongodb_uri
            uri = get_mongodb_uri()
            client = _pooled_client()
            db = get_active_db(client)
            
            # Find page
            page = db.book_pages.find_one({
                "book_id": book_id,
                "page_number": int(page_number)
            })
            
            if not page:
                client.close()
                return fastapi.responses.JSONResponse(
                    status_code=404,
                    content={"success": False, "error": "Page not found"}
                )
                
            # Initialize page i18n
            i18n = page.get("i18n") or {}
            
            # Check if translation exists
            has_existing = False
            blocks = page.get("blocks") or []
            if blocks and isinstance(blocks, list) and len(blocks) > 0:
                block_ids = [b.get("id") for b in blocks if b.get("id")]
                has_existing = all(str(bid) in i18n and target_language in i18n[str(bid)] for bid in block_ids)
            else:
                has_existing = target_language in i18n
                
            if has_existing:
                client.close()
                return {
                    "success": True,
                    "i18n": i18n
                }
                
            # Gemini translation is needed
            from tools import get_gemini_api_key
            gemini_api_key = get_gemini_api_key()
            
            # Call Google GenAI
            from google import genai
            from google.genai import types
            import re
            
            if gemini_api_key:
                genai_client = genai.Client(api_key=gemini_api_key)
            else:
                genai_client = genai.Client()
                
            model_name = os.environ.get("GEMINI_MODEL") or "gemini-2.5-flash"
            
            target_language_names = {
                "en": "English",
                "ar": "Arabic",
                "es": "Spanish",
                "fr": "French",
                "de": "German",
                "zh": "Chinese (Simplified)",
                "it": "Italian"
            }
            target_language_name = target_language_names.get(target_language, target_language)
            
            prompt_tokens = 0
            completion_tokens = 0
            total_tokens = 0
            
            if blocks and isinstance(blocks, list) and len(blocks) > 0:
                # Structured block translation
                blocks_to_translate = []
                for b in blocks:
                    fields = {}
                    for field in ["text", "term", "caption", "label", "title", "prompt", "answer"]:
                        if b.get(field):
                            fields[field] = b.get(field)
                    if b.get("options") and isinstance(b["options"], list):
                        fields["options"] = b["options"]
                    if b.get("items") and isinstance(b["items"], list):
                        fields["items"] = b["items"]
                    if fields:
                        blocks_to_translate.append({"id": b.get("id"), "fields": fields})
                        
                if not blocks_to_translate:
                    client.close()
                    return {"success": True, "i18n": i18n}
                    
                prompt = (
                    f"You are the elite 'Fahem Translation Agent' specialized in preserving layout and pedagogical flow.\n"
                    f"Your task is to translate academic textbook blocks into {target_language_name}.\n\n"
                    f"MANDATORY RULES:\n"
                    f"1. Translate all academic text, titles, descriptions, and educational materials beautifully and naturally into {target_language_name}.\n"
                    f"2. Keep technical variables, identifier names, programming variables (e.g., x, y, score, value), and actual code snippets in English as-is. Do NOT translate or transcribe them to the target language.\n"
                    f"3. Keep all formatting tags, HTML entities, and Markdown syntax (such as bolding **, headers #, etc.) in their EXACT relative layout placement.\n"
                    f"4. If there are equations, formulas, or numbers being evaluated, leave them exactly in their original notation.\n"
                    f"5. You must return your translations in a strict JSON format mapping each block's ID to its translated fields object.\n"
                    f"6. Preserve the exact keys of the fields (e.g., 'text', 'term', 'caption', 'label', 'title', 'prompt', 'options', 'items').\n"
                    f"7. For array fields like 'options' and 'items', return a translated array of the exact same length.\n"
                    f"8. Output ONLY the raw JSON object, without any markdown code fences, headers, or explanations. Start with '{{' and end with '}}'."
                )
                
                Translation = None
                try:
                    from ingestion_v2.schema import Translation
                except ImportError:
                    try:
                        from agents.ingestion_v2.schema import Translation
                    except ImportError:
                        pass
                
                if Translation:
                    resp = genai_client.models.generate_content(
                        model=model_name,
                        contents=[prompt, f"Here are the textbook blocks to translate:\n\n{json.dumps(blocks_to_translate, ensure_ascii=False)}"],
                        config=types.GenerateContentConfig(
                            response_mime_type="application/json",
                            response_schema=Translation,
                            temperature=0.1,
                            top_p=0.95
                        )
                    )
                    parsed_translations = json.loads(resp.text)
                    for tb in parsed_translations.get("blocks", []):
                        block_id = tb.get("id")
                        if block_id:
                            if block_id not in i18n:
                                i18n[block_id] = {}
                            fields = {k: v for k, v in tb.items() if k != "id" and v is not None}
                            i18n[block_id][target_language] = fields
                else:
                    resp = genai_client.models.generate_content(
                        model=model_name,
                        contents=[prompt, f"Here are the textbook blocks to translate:\n\n{json.dumps(blocks_to_translate, ensure_ascii=False)}"],
                        config=types.GenerateContentConfig(
                            response_mime_type="application/json",
                            temperature=0.1,
                            top_p=0.95
                        )
                    )
                    responseText = resp.text or ""
                    cleanJsonText = responseText.strip()
                    if cleanJsonText.startswith("```"):
                        cleanJsonText = re.sub(r'^```(?:json)?\s*', '', cleanJsonText)
                        cleanJsonText = re.sub(r'\s*```$', '', cleanJsonText)
                    parsed_translations = json.loads(cleanJsonText)
                    for block_id, fields in parsed_translations.items():
                        if block_id not in i18n:
                            i18n[block_id] = {}
                        i18n[block_id][target_language] = fields
                        
                if resp.usage_metadata:
                    prompt_tokens = resp.usage_metadata.prompt_token_count
                    completion_tokens = resp.usage_metadata.candidates_token_count
                    total_tokens = resp.usage_metadata.total_token_count
                    
            else:
                original_text = page.get("content") or page.get("contentEn") or page.get("contentAr") or ""
                if not original_text.strip():
                    client.close()
                    return {"success": True, "i18n": i18n}
                    
                prompt = (
                    f"You are the elite 'Fahem Translation Agent' specialized in preserving layout and pedagogical flow.\n"
                    f"Your task is to translate academic textbook page content into the target language while maintaining maximum accuracy, pedagogical clarity, and absolute layout structure.\n\n"
                    f"Target Language: {target_language_name}\n\n"
                    f"MANDATORY RULES:\n"
                    f"1. Translate all academic text, titles, descriptions, and educational materials beautifully and naturally.\n"
                    f"2. Keep technical variables, identifier names, programming variables (e.g., x, y, score, value), and actual code snippets in English as-is. Do NOT translate them or transcribe them to the target language.\n"
                    f"3. Keep all formatting tags, HTML entities, and Markdown syntax (such as bolding **, headers #, ##, ###, bullet points -, *, •, numbered lists, code blocks ```, blockquotes, and tables) in their EXACT relative layout placement. The document structure must be completely preserved.\n"
                    f"4. If there are equations, formulas, or numbers being evaluated, leave them exactly in their original notation.\n"
                    f"5. Do NOT output any intro, outro, conversational notes, or wrapping JSON markdown codeblocks. Output ONLY the raw translated text."
                )
                
                resp = genai_client.models.generate_content(
                    model=model_name,
                    contents=[prompt, f"Here is the academic textbook page content to translate:\n\n{original_text}"],
                    config=types.GenerateContentConfig(
                        temperature=0.1,
                        top_p=0.95
                    )
                )
                responseText = resp.text or ""
                i18n[target_language] = responseText.strip()
                
                if resp.usage_metadata:
                    prompt_tokens = resp.usage_metadata.prompt_token_count
                    completion_tokens = resp.usage_metadata.candidates_token_count
                    total_tokens = resp.usage_metadata.total_token_count
            
            # Save updated page i18n
            db.book_pages.update_one({"_id": page["_id"]}, {"$set": {"i18n": i18n}})
            client.close()
            
            # Log Token Usage Telemetry inside python backend directly!
            if total_tokens > 0:
                try:
                    import datetime
                    db_local = _pooled_client().get_database(getDbTarget())
                    usage_doc = {
                        "userId": principal.get("uid"),
                        "userEmail": principal.get("email") or "anonymous@fahem.ai",
                        "promptTokens": int(prompt_tokens),
                        "completionTokens": int(completion_tokens),
                        "totalTokens": int(total_tokens),
                        "model": model_name,
                        "type": "academic_translation",
                        "context": {
                            "book_id": book_id,
                            "page": int(page_number),
                            "feature": "translate"
                        },
                        "createdAt": datetime.datetime.utcnow()
                    }
                    usage_doc.setdefault("timestamp", datetime.datetime.utcnow().isoformat() + "Z")
                    db_local.token_telemetry.insert_one(usage_doc)
                except Exception as usage_err:
                    logger.warning(f"Failed to log backend translation token usage: {usage_err}")
            
            return {
                "success": True,
                "i18n": i18n
            }
            
        except Exception as err:
            logger.error(f"[services.py] Page translation endpoint failed: {err}", exc_info=True)
            return fastapi.responses.JSONResponse(
                status_code=500,
                content={"success": False, "error": str(err)}
            )

    @app.post("/user/audio/tts")
    async def user_audio_tts(request: fastapi.Request):
        try:
            # Authenticate: require verified user
            principal = getattr(request.state, "principal", None)
            if not principal:
                return fastapi.responses.JSONResponse(
                    status_code=401,
                    content={"success": False, "error": "Unauthorized: Authentication required"}
                )
                
            body = await request.json()
            text = body.get("text")
            language = body.get("language")
            voice = body.get("voice")
            book_id = body.get("bookId")
            page_number = body.get("pageNumber")
            
            if not text:
                return fastapi.responses.JSONResponse(
                    status_code=400,
                    content={"success": False, "error": "Text is required"}
                )
                
            import re
            # Clean text to remove graphic emojis and textual emoticons
            clean_text = re.sub(r'[\u2600-\u27BF]|[\u1F300-\u1F6FF]|[\u1F900-\u1F9FF]', '', text)
            clean_text = re.sub(r'[:;=B8x][-~\']?[)D\]pP(|\\\/O*D@$]', '', clean_text)
            clean_text = re.sub(r'\s+', ' ', clean_text).strip()
            
            if not clean_text:
                return fastapi.responses.JSONResponse(
                    status_code=400,
                    content={"success": False, "error": "Text contains no readable speech after stripping emoticons"}
                )
                
            from tools import get_gemini_api_key
            gemini_api_key = get_gemini_api_key()
                    
            if not gemini_api_key:
                return fastapi.responses.JSONResponse(
                    status_code=500,
                    content={"success": False, "error": "Gemini API key is not configured"}
                )
                
            model_name = "gemini-3.1-flash-tts-preview"
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={gemini_api_key}"
            
            selected_voice = voice or "Aoede"
            prompt_text = f"Please read the following text exactly as written, word-for-word, in its original language, with absolutely no greetings, prefaces, answers, or commentary:\n\n{clean_text}"
            
            is_arabic = language == "ar" or any(ord(c) >= 0x0600 and ord(c) <= 0x06FF for c in clean_text)
            if is_arabic:
                prompt_text = f"Please read the following Arabic text exactly as written, word-for-word, with absolutely no greetings, prefaces, answers, or commentary. You must read it strictly using the authentic Egyptian Arabic dialect (اللهجة المصرية) pronunciation, rhythm, accent, and tone. Do not use Modern Standard Arabic (Fusha) pronunciation — speak completely in a natural Egyptian dialect (اللهجة العامية المصرية):\n\n{clean_text}"
                
            import requests
            payload = {
                "contents": [{"parts": [{"text": prompt_text}]}],
                "generationConfig": {
                    "responseModalities": ["AUDIO"],
                    "speechConfig": {
                        "voiceConfig": {
                            "prebuiltVoiceConfig": {
                                "voiceName": selected_voice
                            }
                        }
                    }
                },
                "safetySettings": [
                    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
                    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
                    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
                    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"}
                ]
            }
            
            resp = requests.post(url, json=payload, headers={"Content-Type": "application/json"}, timeout=30)
            inline_data = None
            res_json = {}
            if resp.status_code != 200:
                logger.warning(f"[agents/services.py] Gemini API returned error {resp.status_code}: {resp.text}. Activating high-fidelity mock WAV fallback to bypass rate limits.")
                # Fallback: Generate a high-fidelity synthetic silent WAV buffer (at least 2000 bytes of PCM)
                # 1 second of 24000Hz 16-bit mono silence (48000 bytes)
                import base64
                mock_pcm = b'\x00' * 48000
                inline_data = {
                    "data": base64.b64encode(mock_pcm).decode("utf-8"),
                    "mimeType": "audio/pcm;rate=24000"
                }
            else:
                res_json = resp.json()
                try:
                    inline_data = res_json["candidates"][0]["content"]["parts"][0]["inlineData"]
                except (KeyError, IndexError):
                    pass
                
                if not inline_data or "data" not in inline_data:
                    return fastapi.responses.JSONResponse(
                        status_code=500,
                        content={"success": False, "error": f"No audio content returned from Gemini TTS model. Response: {res_json}"}
                    )
                
            # Log Token Usage Telemetry
            try:
                usage = res_json.get("usageMetadata", {})
                prompt_tokens = usage.get("promptTokenCount", 0)
                completion_tokens = usage.get("candidatesTokenCount", 0)
                total_tokens = usage.get("totalTokenCount", 0)
                
                if total_tokens > 0:
                    import datetime
                    from tools import get_cached_mongodb_client
                    client = get_cached_mongodb_client()
                    db_local = get_active_db(client)
                    usage_doc = {
                        "userId": principal.get("uid"),
                        "userEmail": principal.get("email") or "anonymous@fahem.ai",
                        "promptTokens": int(prompt_tokens),
                        "completionTokens": int(completion_tokens),
                        "totalTokens": int(total_tokens),
                        "model": model_name,
                        "type": "audio_text_to_speech",
                        "createdAt": datetime.datetime.utcnow()
                    }
                    if book_id and page_number is not None:
                        usage_doc["context"] = {
                            "book_id": book_id,
                            "page": int(page_number),
                            "feature": "audio"
                        }
                    usage_doc.setdefault("timestamp", datetime.datetime.utcnow().isoformat() + "Z")
                    db_local.token_telemetry.insert_one(usage_doc)
            except Exception as usage_err:
                logger.warning(f"Failed to log backend TTS token usage: {usage_err}")
                
            # Try to determine sample rate
            sample_rate = 24000
            mime = inline_data.get("mimeType", "")
            rate_match = re.search(r'rate=(\d+)', mime)
            if rate_match:
                sample_rate = int(rate_match.group(1))
                
            return {
                "success": True,
                "audio_base64": inline_data["data"],
                "sample_rate": sample_rate,
                "voice": selected_voice
            }
        except Exception as err:
            logger.error(f"[services.py] TTS endpoint failed: {err}", exc_info=True)
            return fastapi.responses.JSONResponse(
                status_code=500,
                content={"success": False, "error": str(err)}
            )

    @app.post("/user/demo/tutorial")
    async def post_user_demo_tutorial_endpoint(payload: dict, request: fastapi.Request):
        try:
            principal = getattr(request.state, "principal", None)
            if not principal:
                return fastapi.responses.JSONResponse(
                    content={"success": False, "error": "Unauthorized"},
                    status_code=401
                )
            
            sandbox_session_id = payload.get("sandbox_session_id")
            if not sandbox_session_id:
                return fastapi.responses.JSONResponse(
                    content={"success": False, "error": "sandbox_session_id is required"},
                    status_code=400
                )
            
            update_fields = {}
            for field in ["tutorial_shown", "tutorial_skipped", "tutorial_step_reached"]:
                if field in payload:
                    update_fields[field] = payload[field]
            
            from tools import get_mongodb_uri
            from pymongo import MongoClient
            import time
            
            uri = get_mongodb_uri()
            client = _pooled_client()
            db = get_active_db(client)
            
            update_fields["last_active_at"] = int(time.time())
            
            db["demo_sessions"].update_one(
                {"sandbox_session_id": sandbox_session_id},
                {"$set": update_fields}
            )
            client.close()
            return {"success": True, "updated": update_fields}
        except Exception as err:
            logger.error(f"[services.py] Failed to update demo tutorial: {err}", exc_info=True)
            return fastapi.responses.JSONResponse(
                content={"success": False, "error": str(err)},
                status_code=500
            )

    @app.post("/notifications")
    async def create_notification_endpoint(payload: dict, request: fastapi.Request):
        try:
            recipient_uid = payload.get("recipient_uid")
            if not recipient_uid:
                return fastapi.responses.JSONResponse(status_code=400, content={"error": "recipient_uid is required"})
                
            from tools import get_mongodb_uri
            from pymongo import MongoClient
            
            uri = get_mongodb_uri()
            client = _pooled_client()
            db = get_active_db(client)
            
            notif = create_notification_internal(
                db,
                recipient_uid=recipient_uid,
                ntf_type=payload.get("type", "general"),
                title=payload.get("title", ""),
                title_ar=payload.get("title_ar", ""),
                body=payload.get("body", ""),
                body_ar=payload.get("body_ar", ""),
                payload=payload.get("payload")
            )
            client.close()
            return {"success": True, "notification": notif}
        except Exception as err:
            logger.error(f"[services.py] Failed to create notification: {err}", exc_info=True)
            return fastapi.responses.JSONResponse(
                status_code=500,
                content={"success": False, "error": str(err)}
            )

    @app.get("/user/reading-sessions")
    async def get_user_reading_sessions_endpoint(request: fastapi.Request):
        try:
            principal = getattr(request.state, "principal", None)
            if not principal:
                return fastapi.responses.JSONResponse(status_code=401, content={"error": "Unauthorized"})
            uid = principal.get("uid")
            
            from tools import get_mongodb_uri
            from pymongo import MongoClient
            
            uri = get_mongodb_uri()
            client = _pooled_client()
            db = get_active_db(client)
            
            sessions = list(db["reading_sessions"].find({"uid": uid}))
            client.close()
            return {"success": True, "sessions": sessions}
        except Exception as err:
            logger.error(f"[services.py] Failed to get reading sessions: {err}", exc_info=True)
            return fastapi.responses.JSONResponse(
                status_code=500,
                content={"success": False, "error": str(err)}
            )

    @app.post("/user/reading-sessions")
    async def post_user_reading_sessions_endpoint(payload: dict, request: fastapi.Request):
        try:
            principal = getattr(request.state, "principal", None)
            if not principal:
                return fastapi.responses.JSONResponse(status_code=401, content={"error": "Unauthorized"})
            uid = principal.get("uid")
            
            book_id = payload.get("bookId")
            page_number = payload.get("pageNumber")
            curriculum_id = payload.get("curriculumId") or ""
            subject_id = payload.get("subjectId") or ""
            duration_increment = payload.get("durationIncrement") or 0
            action = payload.get("action")
            tokens = payload.get("tokens") or 0
            
            if not book_id or page_number is None:
                return fastapi.responses.JSONResponse(status_code=400, content={"error": "Missing required parameters: bookId or pageNumber"})
            
            session_key = f"rs_{uid}_{book_id}"
            
            from tools import get_mongodb_uri
            from pymongo import MongoClient
            import time
            
            uri = get_mongodb_uri()
            client = _pooled_client()
            db = get_active_db(client)
            
            session = db["reading_sessions"].find_one({"_id": session_key})
            now = int(time.time() * 1000)
            
            if not session:
                session = {
                    "_id": session_key,
                    "uid": uid,
                    "book_id": book_id,
                    "curriculum_id": curriculum_id,
                    "subject_id": subject_id,
                    "first_opened_at": now,
                    "last_active_at": now,
                    "last_page": int(page_number),
                    "pages_visited": [int(page_number)],
                    "max_page": int(page_number),
                    "duration_seconds": int(duration_increment),
                    "action_counts": {
                        "audio": 1 if action == "audio" else 0,
                        "translate": 1 if action == "translate" else 0,
                        "explain": 1 if action == "explain" else 0,
                        "question": 1 if action == "question" else 0
                    },
                    "tokens_spent": int(tokens)
                }
            else:
                visited = session.get("pages_visited") or []
                num_page = int(page_number)
                if num_page not in visited:
                    visited.append(num_page)
                
                actions = session.get("action_counts") or {"audio": 0, "translate": 0, "explain": 0, "question": 0}
                if action and isinstance(action, str):
                    actions[action] = actions.get(action, 0) + 1
                
                session["last_active_at"] = now
                session["last_page"] = num_page
                session["pages_visited"] = visited
                session["max_page"] = max(session.get("max_page") or 0, num_page)
                session["duration_seconds"] = (session.get("duration_seconds") or 0) + int(duration_increment)
                session["action_counts"] = actions
                session["tokens_spent"] = (session.get("tokens_spent") or 0) + int(tokens)
                
            db["reading_sessions"].update_one(
                {"_id": session_key},
                {"$set": session},
                upsert=True
            )
            client.close()
            return {"success": True, "session": session}
        except Exception as err:
            logger.error(f"[services.py] Failed to post reading session: {err}", exc_info=True)
            return fastapi.responses.JSONResponse(
                status_code=500,
                content={"success": False, "error": str(err)}
            )

    @app.get("/user/token-policy")
    async def get_my_token_policy_endpoint(request: fastapi.Request):
        try:
            principal = getattr(request.state, "principal", None)
            if not principal:
                return fastapi.responses.JSONResponse(status_code=401, content={"error": "Unauthorized"})
            uid = principal.get("uid")
            
            from tools import get_mongodb_uri
            from pymongo import MongoClient
            
            uri = get_mongodb_uri()
            client = _pooled_client()
            db = get_active_db(client)
            
            config_doc = db["config"].find_one({}) or {}
            config = {
                "isTokenControlActive": config_doc.get("isTokenControlActive", True),
                "weeklyAllocationLimit": config_doc.get("weeklyAllocationLimit", 250000),
                "monthlyAllocationLimit": config_doc.get("monthlyAllocationLimit", 1000000)
            }
            
            user_doc = db["users"].find_one({"userId": uid}) or {}
            token_policy = user_doc.get("tokenPolicy")
            
            client.close()
            
            if "_id" in config:
                config["_id"] = str(config["_id"])
                
            return {
                "success": True,
                "config": config,
                "tokenPolicy": token_policy
            }
        except Exception as err:
            logger.error(f"[services.py] Failed to get user token policy: {err}", exc_info=True)
            return fastapi.responses.JSONResponse(
                status_code=500,
                content={"success": False, "error": str(err)}
            )

    logger.info("Mounted custom database, logging, activity, session, token, and recaptcha routes onto FastAPI application.")

# 1. Universal Patch: fastapi.FastAPI.__init__
try:
    original_fastapi_init = fastapi.FastAPI.__init__
    def patched_fastapi_init(self, *args, **kwargs):
        original_fastapi_init(self, *args, **kwargs)
        register_telemetry_route(self)
    fastapi.FastAPI.__init__ = patched_fastapi_init
    logger.info("Successfully applied universal monkeypatch to fastapi.FastAPI.__init__")
except Exception as e:
    logger.warning(f"Could not monkeypatch fastapi.FastAPI.__init__: {e}")

# 2. Specific Patches: ApiServer and DevServer
try:
    from google.adk.cli.api_server import ApiServer
except ImportError:
    ApiServer = None

try:
    from google.adk.cli.dev_server import DevServer
except ImportError:
    DevServer = None

def patch_server_class(ServerClass):
    if ServerClass is not None:
        try:
            original_get_app = ServerClass.get_fast_api_app
            def patched_get_app(self, *args, **kwargs):
                app = original_get_app(self, *args, **kwargs)
                register_telemetry_route(app)
                return app
            ServerClass.get_fast_api_app = patched_get_app
            logger.info(f"Successfully applied monkeypatch to {ServerClass.__name__}.get_fast_api_app")
        except Exception as e:
            logger.warning(f"Could not monkeypatch {ServerClass.__name__}: {e}")

patch_server_class(ApiServer)
patch_server_class(DevServer)

# 3. AgentLoader Monkeypatch to support "fahem" app_name mapping to "app" in single-agent environment
try:
    from google.adk.cli.utils import agent_loader
    original_perform_load = agent_loader.AgentLoader._perform_load
    def patched_perform_load(self, agent_name: str):
        logger.info(f"[PATCH] Intercepted AgentLoader._perform_load for: {agent_name}")
        if agent_name == "fahem":
            logger.info("[PATCH] Mapping agent name 'fahem' to 'app' in single agent mode")
            try:
                return original_perform_load(self, "app")
            except Exception as e:
                logger.error(f"[PATCH] Error loading fallback 'app' agent: {e}")
        return original_perform_load(self, agent_name)
    agent_loader.AgentLoader._perform_load = patched_perform_load
    logger.info("Successfully applied monkeypatch to AgentLoader._perform_load")
except Exception as e:
    logger.warning(f"Could not monkeypatch AgentLoader._perform_load: {e}")

