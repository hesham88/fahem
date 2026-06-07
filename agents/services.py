import sys
import os
import logging
import fastapi
import json

logger = logging.getLogger("google_adk." + __name__)

# Helper to register route on a FastAPI app
def register_telemetry_route(app: fastapi.FastAPI):
    # Check if the route is already registered to avoid duplication
    for route in app.routes:
        if hasattr(route, "path") and route.path == "/db-metadata":
            return

    # Secure OIDC Bearer Token Verification Middleware for Cloud Run environment with Fail-Closed defaults
    @app.middleware("http")
    async def oidc_security_middleware(request: fastapi.Request, call_next):
        PUBLIC_PATHS = {"/healthz", "/health", "/", "/verify-recaptcha"}
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
                    
                    if not principal:
                        principal = {
                            "uid": id_info.get("sub", "unknown_gcp_uid"),
                            "email": email,
                            "role": "super-admin" if email == "hesham1988@gmail.com" else "user"
                        }
                except Exception as err:
                    logger.warning(f"[OIDC FAILED] Token verification failed for {path}: {err}")
                    if is_gcp:
                        return fastapi.responses.JSONResponse(
                            content={"status": "error", "error": f"Unauthorized: Invalid OIDC Token ({str(err)})"},
                            status_code=401
                        )
            else:
                if is_gcp:
                    logger.warning(f"[OIDC BLOCKED] Request to {path} blocked: No OIDC Bearer Token.")
                    return fastapi.responses.JSONResponse(
                        content={"status": "error", "error": "Unauthorized: OIDC Bearer token required on Google Cloud Run"},
                        status_code=401
                    )
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
            
        token_ctx = None
        try:
            from guardrails import verified_principal_ctx
            if verified_principal_ctx is not None and principal:
                token_ctx = verified_principal_ctx.set(principal)
        except Exception as ctx_err:
            logger.warning(f"Failed to import/set verified_principal_ctx: {ctx_err}")

        try:
            return await call_next(request)
        finally:
            if token_ctx is not None:
                try:
                    from guardrails import verified_principal_ctx
                    verified_principal_ctx.reset(token_ctx)
                except Exception:
                    pass


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
                
            client = MongoClient(uri, serverSelectionTimeoutMS=5000)
            db = client["fahem"]
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

    @app.post("/admin/seed-db")
    async def custom_db_seed(request: fastapi.Request):
        try:
            from tools import get_mongodb_uri
            from pymongo import MongoClient
            
            uri = get_mongodb_uri()
            client = MongoClient(uri, serverSelectionTimeoutMS=5000)
            db = client["fahem"]
            
            # --- 1. SEED SUBJECTS ---
            subjects_data = [
                {
                    "_id": "subj_algebra_stats",
                    "name": "Algebra and Statistics",
                    "name_ar": "الجبر والإحصاء",
                    "emoji": "📊",
                    "grade_levels": ["Grade 10", "Grade 11", "Grade 12"]
                },
                {
                    "_id": "subj_biology",
                    "name": "Biology",
                    "name_ar": "الأحياء",
                    "emoji": "🧬",
                    "grade_levels": ["Grade 10", "Grade 11", "Grade 12"]
                },
                {
                    "_id": "subj_arabic_grammar",
                    "name": "Arabic Grammar",
                    "name_ar": "النحو والصرف",
                    "emoji": "📖",
                    "grade_levels": ["Grade 10", "Grade 11", "Grade 12"]
                }
            ]
            
            # Insert or replace subjects
            for subj in subjects_data:
                db["subjects"].replace_one({"_id": subj["_id"]}, subj, upsert=True)
                
            # --- 2. SEED BOOKS ---
            books_data = [
                {
                    "_id": "book_moe_alg_g10_t1",
                    "subject_id": "subj_algebra_stats",
                    "title": "High School Algebra and Analytic Geometry",
                    "title_ar": "الجبر الهندسة التحليلية للمرحلة الثانوية",
                    "grade": "Grade 10",
                    "term": "Term 1",
                    "year": "2026",
                    "language": "ar",
                    "book_type": "core", 
                    "source_url": "https://ellibrary.moe.gov.eg/content/HighSchool_Algebra_G10.pdf",
                    "storage_path": "gs://fahem-academic-lake/moe/alg_g10_t1.pdf",
                    "chapters": [
                        {
                            "id": "ch_1",
                            "title": "Linear Equations and Matrices",
                            "title_ar": "المعادلات الخطية والمصفوفات",
                            "page_start": 4,
                            "page_end": 28,
                            "concepts": ["Matrix Inversion", "Determinants", "Cramer's Rule"]
                        },
                        {
                            "id": "ch_2",
                            "title": "Vectors and Linear Spaces",
                            "title_ar": "المتجهات والفراغات الخطية",
                            "page_start": 29,
                            "page_end": 50,
                            "concepts": ["Vector Dot Product", "Cross Product", "Geometric Dimension"]
                        }
                    ],
                    "mindmap": {
                        "root": "Matrices & Vectors",
                        "children": [
                            { "name": "Linear Algebra", "children": [{ "name": "Matrices" }, { "name": "Determinants" }] },
                            { "name": "Analytic Geometry", "children": [{ "name": "Vectors" }, { "name": "Lines in Space" }] }
                        ]
                    },
                    "keywords": ["matrix", "determinant", "vector", "linear system", "cramer"]
                },
                {
                    "_id": "book_moe_bio_g11_t1",
                    "subject_id": "subj_biology",
                    "title": "High School Biology",
                    "title_ar": "الأحياء للمرحلة الثانوية",
                    "grade": "Grade 11",
                    "term": "Term 1",
                    "year": "2026",
                    "language": "ar",
                    "book_type": "core",
                    "source_url": "https://ellibrary.moe.gov.eg/content/HighSchool_Biology_G11.pdf",
                    "storage_path": "gs://fahem-academic-lake/moe/bio_g11_t1.pdf",
                    "chapters": [
                        {
                            "id": "ch_1",
                            "title": "Nutrition and Autotrophic Processes",
                            "title_ar": "التغذية والعمليات الذاتية",
                            "page_start": 5,
                            "page_end": 35,
                            "concepts": ["Photosynthesis", "Chloroplasts", "Light Reactions", "Calvin Cycle"]
                        },
                        {
                            "id": "ch_2",
                            "title": "Human Transport System",
                            "title_ar": "النقل في الإنسان",
                            "page_start": 36,
                            "page_end": 65,
                            "concepts": ["Heart Chambers", "Blood Vessels", "Blood Composition", "Lymphatic System"]
                        }
                    ],
                    "mindmap": {
                        "root": "Biology Grade 11",
                        "children": [
                            { "name": "Plant Physiology", "children": [{ "name": "Photosynthesis" }, { "name": "Nutrition" }] },
                            { "name": "Human Physiology", "children": [{ "name": "Circulation" }, { "name": "Respiration" }] }
                        ]
                    },
                    "keywords": ["photosynthesis", "nutrition", "chloroplast", "heart", "circulatory", "blood"]
                },
                {
                    "_id": "book_moe_grammar_g12",
                    "subject_id": "subj_arabic_grammar",
                    "title": "High School Arabic Grammar & Rhetoric",
                    "title_ar": "النحو والصرف والبلاغة للمرحلة الثانوية العامة",
                    "grade": "Grade 12",
                    "term": "Full Year",
                    "year": "2026",
                    "language": "ar",
                    "book_type": "core",
                    "source_url": "https://ellibrary.moe.gov.eg/content/HighSchool_Arabic_Grammar_G12.pdf",
                    "storage_path": "gs://fahem-academic-lake/moe/arabic_grammar_g12.pdf",
                    "chapters": [
                        {
                            "id": "ch_1",
                            "title": "The Dynamic Verbs (Kaada and her Sisters)",
                            "title_ar": "كاد وأخواتها (أفعال المقاربة والرجاء والشروع)",
                            "page_start": 10,
                            "page_end": 22,
                            "concepts": ["Subject of Kaada", "Predicate conditions (An + Present verb)", "Differences with Kana"]
                        },
                        {
                            "id": "ch_2",
                            "title": "The Excepted (Al-Mustathna)",
                            "title_ar": "الاستثناء وأحكامه (إلا، غير، سوى، خلا، عدا، حاشا)",
                            "page_start": 23,
                            "page_end": 38,
                            "concepts": ["Tam Mitbah (Complete Affirmative)", "Tam Manfi (Complete Negative)", "Naqis Manfi (Defective Negative)"]
                        }
                    ],
                    "mindmap": {
                        "root": "Arabic Grammar",
                        "children": [
                            { "name": "Verbs & Nouns", "children": [{ "name": "Kaada" }, { "name": "Kana" }] },
                            { "name": "Grammatical Styles", "children": [{ "name": "Excepted Style" }, { "name": "Exclamatory Style" }] }
                        ]
                    },
                    "keywords": ["kaada", "mustathna", "nahw", "arabic grammar", "thanaweya", "بلاغة"]
                }
            ]
            
            for bk in books_data:
                db["books"].replace_one({"_id": bk["_id"]}, bk, upsert=True)
                
            # --- 3. SEED QUESTION BANK ---
            questions_data = [
                {
                    "_id": "q_mat_001",
                    "book_id": "book_moe_alg_g10_t1",
                    "chapter_id": "ch_1",
                    "page_reference": 14,
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
                    "book_id": "book_moe_alg_g10_t1",
                    "chapter_id": "ch_1",
                    "page_reference": 22,
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
                    "_id": "q_bio_001",
                    "book_id": "book_moe_bio_g11_t1",
                    "chapter_id": "ch_1",
                    "page_reference": 18,
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
                    "_id": "q_ara_001",
                    "book_id": "book_moe_grammar_g12",
                    "chapter_id": "ch_1",
                    "page_reference": 12,
                    "type": "MCQ",
                    "complexity_rating": "hard",
                    "question_text": "In the sentence 'أنشأ المهندس يبني المصنع', what is the grammatical position of the verb 'أنشأ' and its predicate?",
                    "question_text_ar": "في الجملة 'أنشأ المهندس يبني المصنع'، ما هو الموقع الإعرابي للفعل 'أنشأ' وخبره؟",
                    "distractors": [
                        "Ansha is a standard transitive verb, and the sentence 'yabni' is an adjective clause.",
                        "Ansha is an inchoative verb, and its predicate 'yabni' can be prefixed with 'An'.",
                        "Ansha behaves exactly like Kana and its predicate must be a singular noun."
                    ],
                    "distractors_ar": [
                        "أنشأ فعل تام متعدٍ، وجملة 'يبني' في محل نصب نعت.",
                        "أنشأ فعل شروع، ويجوز اقتران خبره 'يبني' بـ 'أن'.",
                        "أنشأ يعمل عمل كان تماماً وخبره يجب أن يكون مفرداً."
                    ],
                    "correct_answer": "Ansha is an inchoative verb (verb of beginning) whose predicate 'yabni' must be an un-associated present tense clause.",
                    "correct_answer_ar": "أنشأ فعل شروع ناقص جامد، وخبره الجملة الفعلية 'يبني' يمتنع اقترانه بـ 'أن'.",
                    "pedagogical_intent": "Verify understanding of Shuroo' verbs (Ansha) predicate association rules.",
                    "embedding": [0.03, 0.22, -0.12, 0.81]
                }
            ]
            
            for q in questions_data:
                db["question_bank"].replace_one({"_id": q["_id"]}, q, upsert=True)
                
            # Create indexes for the new collections
            db["subjects"].create_index([("name", 1)])
            db["books"].create_index([("subject_id", 1)])
            db["question_bank"].create_index([("book_id", 1), ("chapter_id", 1)])
            
            return {
                "status": "success",
                "message": "Database seeded successfully with dynamic Egyptian curriculum models!",
                "seeded_counts": {
                    "subjects": len(subjects_data),
                    "books": len(books_data),
                    "question_bank": len(questions_data)
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
            client = MongoClient(uri, serverSelectionTimeoutMS=5000)
            db = client["fahem"]
            
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
            client = MongoClient(uri, serverSelectionTimeoutMS=2000)
            db = client["fahem"]

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
                    "discovered": []
                }
                
            return {
                "success": True,
                "status": job.get("status"),
                "progress": job.get("progress"),
                "logs": job.get("logs", []),
                "discovered": job.get("discovered", [])
            }
        except Exception as err:
            logger.error(f"[services.py] Failed to get crawl job: {err}", exc_info=True)
            return fastapi.responses.JSONResponse(status_code=500, content={"error": str(err)})

    @app.post("/admin/crawl")
    async def trigger_crawl_job(request: fastapi.Request, background_tasks: fastapi.BackgroundTasks):
        try:
            body = await request.json()
            url = body.get("url")
            max_depth = body.get("maxDepth", 3)
            requester_email = body.get("requesterEmail")
            
            if not url:
                return fastapi.responses.JSONResponse(status_code=400, content={"error": "Missing crawl URL"})
            if not requester_email:
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
            
            from pymongo import MongoClient
            from tools import get_mongodb_uri
            uri = get_mongodb_uri()
            client = MongoClient(uri, serverSelectionTimeoutMS=2000)
            db = client["fahem"]
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
            client.close()
            
            import subprocess
            
            def run_crawler_background(j_id: str, u_str: str, depth: int, email: str):
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
                        cl = MongoClient(get_mongodb_uri(), serverSelectionTimeoutMS=2000)
                        mongodb = cl["fahem"]
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
                            cl = MongoClient(get_mongodb_uri(), serverSelectionTimeoutMS=2000)
                            mongodb = cl["fahem"]
                            
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
                        cl = MongoClient(get_mongodb_uri(), serverSelectionTimeoutMS=2000)
                        mongodb = cl["fahem"]
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
    async def get_token_stats(userId: str):
        try:
            agents_dir = os.path.dirname(os.path.abspath(__file__))
            if agents_dir not in sys.path:
                sys.path.insert(0, agents_dir)
            from agent_communications import get_user_token_stats
            stats = await get_user_token_stats(userId)
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

    @app.get("/user/books")
    async def get_books_endpoint(subject_id: str = None):
        try:
            from tools import get_mongodb_uri
            from pymongo import MongoClient
            
            uri = get_mongodb_uri()
            client = MongoClient(uri, serverSelectionTimeoutMS=5000)
            db = client["fahem"]
            
            query = {}
            if subject_id:
                query["subject_id"] = subject_id
                
            books = list(db["books"].find(query))
            return {"books": books}
        except Exception as err:
            logger.error(f"[services.py] Failed to get books: {err}", exc_info=True)
            return {"books": [], "error": str(err)}

    @app.get("/user/books/pages")
    async def get_book_pages_endpoint(book_id: str):
        try:
            from tools import get_mongodb_uri
            from pymongo import MongoClient
            
            uri = get_mongodb_uri()
            client = MongoClient(uri, serverSelectionTimeoutMS=5000)
            db = client["fahem"]
            
            pages = list(db["book_pages"].find({"book_id": book_id}).sort("page_number", 1))
            # Convert ObjectId to string for JSON serialization
            for p in pages:
                if "_id" in p:
                    p["_id"] = str(p["_id"])
            return {"success": True, "pages": pages}
        except Exception as err:
            logger.error(f"[services.py] Failed to get book pages: {err}", exc_info=True)
            return {"success": False, "pages": [], "error": str(err)}

    @app.get("/user/subjects")
    async def get_subjects_endpoint():
        try:
            from tools import get_mongodb_uri
            from pymongo import MongoClient
            
            uri = get_mongodb_uri()
            client = MongoClient(uri, serverSelectionTimeoutMS=5000)
            db = client["fahem"]
            
            subjects = list(db["subjects"].find({}))
            for s in subjects:
                s["icon_emoji"] = s.get("icon_emoji") or s.get("emoji") or "📚"
                s["emoji"] = s.get("emoji") or s.get("icon_emoji") or "📚"
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
            client = MongoClient(uri, serverSelectionTimeoutMS=5000)
            db = client["fahem"]
            
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
            client = MongoClient(uri, serverSelectionTimeoutMS=5000)
            db = client["fahem"]
            
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

    @app.get("/user/curricula")
    async def get_curricula_endpoint(request: fastapi.Request, library_id: str = None):
        try:
            from tools import get_mongodb_uri
            from pymongo import MongoClient
            
            principal = getattr(request.state, "principal", None)
            role = principal.get("role") if principal else "anonymous"
            uid = principal.get("uid") if principal else None

            uri = get_mongodb_uri()
            client = MongoClient(uri, serverSelectionTimeoutMS=5000)
            db = client["fahem"]
            
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
            client = MongoClient(uri, serverSelectionTimeoutMS=5000)
            db = client["fahem"]
            
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
            client = MongoClient(uri, serverSelectionTimeoutMS=5000)
            db = client["fahem"]
            
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


    @app.get("/admin/check")
    async def admin_check_endpoint(email: str):
        try:
            from tools import get_mongodb_uri
            from pymongo import MongoClient
            
            uri = get_mongodb_uri()
            client = MongoClient(uri, serverSelectionTimeoutMS=5000)
            db = client["fahem"]
            
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

    @app.get("/admin/approve")
    async def admin_approve_get_endpoint():
        try:
            from tools import get_mongodb_uri
            from pymongo import MongoClient
            
            uri = get_mongodb_uri()
            client = MongoClient(uri, serverSelectionTimeoutMS=5000)
            db = client["fahem"]
            
            # Fetch users with role admin and all admins
            users = list(db["users"].find({"role": "admin"}))
            admins = list(db["admins"].find({}))
            client.close()
            
            # Proactively filter out Anas Al-Sayed / admin.candidate@fahem.edu
            admins = [adm for adm in admins if adm.get("email", "").lower().strip() != "admin.candidate@fahem.edu" and not (adm.get("name") and "anas" in adm.get("name").lower())]
            users = [usr for usr in users if usr.get("email", "").lower().strip() != "admin.candidate@fahem.edu" and not (usr.get("name") and "anas" in usr.get("name").lower())]

            admin_map = {}
            for adm in admins:
                email_key = adm.get("email", "").lower().strip()
                if email_key:
                    admin_map[email_key] = {
                        "email": adm.get("email"),
                        "name": adm.get("name") or "Approved Admin",
                        "role": "admin",
                        "isApprovedAdmin": adm.get("isApprovedAdmin") == True,
                        "source": "admins_collection"
                    }
                    
            for usr in users:
                email_key = usr.get("email", "").lower().strip()
                if email_key:
                    existing = admin_map.get(email_key)
                    admin_map[email_key] = {
                        "email": usr.get("email"),
                        "name": usr.get("name") or usr.get("username") or "Admin Candidate",
                        "role": "admin",
                        "isApprovedAdmin": usr.get("isApprovedAdmin") == True or (existing and existing.get("isApprovedAdmin") == True),
                        "source": "users_collection",
                        "userId": usr.get("userId")
                    }
            
            # Ensure Seba Freediving is always present as candidate
            seba_email = "sebafreediving@gmail.com"
            if seba_email not in admin_map:
                admin_map[seba_email] = {
                    "email": seba_email,
                    "name": "Seba Freediving",
                    "role": "admin",
                    "isApprovedAdmin": False,
                    "source": "admins_collection"
                }
            
            return {"success": True, "admins": list(admin_map.values())}
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
            
            if not admin_email or not action:
                return fastapi.responses.JSONResponse(
                    content={"error": "Missing required fields"},
                    status_code=400
                )
                
            uri = get_mongodb_uri()
            client = MongoClient(uri, serverSelectionTimeoutMS=5000)
            db = client["fahem"]
            
            is_approved = (action == "approve")
            
            # Update users
            db["users"].update_one(
                {"email": admin_email},
                {"$set": {"isApprovedAdmin": is_approved}}
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

    @app.post("/user/subjects")
    async def post_subjects_endpoint(request: fastapi.Request):
        try:
            from tools import get_mongodb_uri
            from pymongo import MongoClient
            import time
            import re
            
            data = await request.json()
            name = data.get("name", "")
            name_ar = data.get("name_ar", "")
            grade_level = data.get("grade_level", "General")
            category = data.get("category", "Science")
            icon_emoji = data.get("icon_emoji", "📚")
            
            if not name or not name_ar:
                return fastapi.responses.JSONResponse(
                    content={"error": "Missing required fields"},
                    status_code=400
                )
                
            uri = get_mongodb_uri()
            client = MongoClient(uri, serverSelectionTimeoutMS=5000)
            db = client["fahem"]
            
            clean_name = re.sub(r'[^a-z0-9]', '_', name.lower())
            subject_id = f"sub_{clean_name}_{int(time.time() * 1000)}"
            
            new_subject = {
                "_id": subject_id,
                "name": name,
                "name_ar": name_ar,
                "grade_level": grade_level,
                "category": category,
                "icon_emoji": icon_emoji,
                "emoji": icon_emoji,
                "books_count": 0
            }
            
            db["subjects"].insert_one(new_subject)
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
            client = MongoClient(uri, serverSelectionTimeoutMS=5000)
            db = client["fahem"]
            
            res = db["subjects"].update_one(
                {"_id": subject_id},
                {"$set": {
                    "name": name,
                    "name_ar": name_ar,
                    "grade_level": grade_level,
                    "category": category,
                    "icon_emoji": icon_emoji,
                    "emoji": icon_emoji
                }}
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
            client = MongoClient(uri, serverSelectionTimeoutMS=5000)
            db = client["fahem"]
            
            # Delete associated books
            db["books"].delete_many({"subject_id": id})
            
            # Delete subject itself
            res = db["subjects"].delete_one({"_id": id})
            
            if res.deleted_count == 0:
                client.close()
                return fastapi.responses.JSONResponse(
                    content={"error": "Subject not found"},
                    status_code=404
                )
                
            client.close()
            return {"success": True, "message": "Subject and associated books deleted successfully."}
        except Exception as err:
            logger.error(f"[services.py] Failed to delete subject: {err}", exc_info=True)
            return fastapi.responses.JSONResponse(
                content={"error": str(err)},
                status_code=500
            )

    def run_ingest_in_background(payload):
        import threading
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

        t = threading.Thread(target=target)
        t.daemon = True
        t.start()

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
            client = MongoClient(uri, serverSelectionTimeoutMS=5000)
            db = client["fahem"]
            
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
            client = MongoClient(uri, serverSelectionTimeoutMS=5000)
            db = client["fahem"]
            
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
            
            if existing_book:
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
            client = MongoClient(uri, serverSelectionTimeoutMS=5000)
            db = client["fahem"]
            
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
            client = MongoClient(uri, serverSelectionTimeoutMS=5000)
            db = client["fahem"]
            
            timestamp = datetime.datetime.now().strftime("%I:%M:%S %p")
            message = ""
            success = True
            
            if action == "pause":
                job = db["ingestion_jobs"].find_one({"_id": job_id})
                if job:
                    updated_logs = (job.get("logs") or []) + [
                        f"[{timestamp}] [CONTROL] ⏸️ Administrative cooperative pause request sent."
                    ]
                    db["ingestion_jobs"].update_one(
                        {"_id": job_id},
                        {"$set": {"status": "paused", "logs": updated_logs, "updated_at": time.time()}}
                    )
                    db["books"].update_one(
                        {"_id": book_id},
                        {"$set": {"ingestion_status": "paused", "ingestion_logs": updated_logs, "updated_at": time.time()}}
                    )
                message = "Ingestion job set to pause state. Processing threads are cooperatively resting."
                
            elif action == "resume":
                job = db["ingestion_jobs"].find_one({"_id": job_id})
                if job:
                    updated_logs = (job.get("logs") or []) + [
                        f"[{timestamp}] [CONTROL] ▶️ Administrative cooperative resume request sent. Activating processing thread."
                    ]
                    db["ingestion_jobs"].update_one(
                        {"_id": job_id},
                        {"$set": {"status": "processing", "logs": updated_logs, "updated_at": time.time()}}
                    )
                    db["books"].update_one(
                        {"_id": book_id},
                        {"$set": {"ingestion_status": "processing", "ingestion_logs": updated_logs, "updated_at": time.time()}}
                    )
                message = "Ingestion job set to processing state. Processing thread context resumed."
                
            elif action in ["kill", "stop"]:
                job = db["ingestion_jobs"].find_one({"_id": job_id})
                if job:
                    updated_logs = (job.get("logs") or []) + [
                        f"[{timestamp}] [CONTROL] 🛑 Ingestion job manually killed/terminated by administrator: {requester_email}",
                        f"[{timestamp}] [SYSTEM] Process context released."
                    ]
                    db["ingestion_jobs"].update_one(
                        {"_id": job_id},
                        {"$set": {"status": "killed", "logs": updated_logs, "updated_at": time.time()}}
                    )
                    db["books"].update_one(
                        {"_id": book_id},
                        {"$set": {"ingestion_status": "failed", "ingestion_logs": updated_logs, "updated_at": time.time()}}
                    )
                message = "Job was not running in memory; status set to failed/killed in database."
                
            else:
                client.close()
                return fastapi.responses.JSONResponse(
                    content={"error": f"Unrecognized action: {action}"},
                    status_code=400
                )
                
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
            client = MongoClient(uri, serverSelectionTimeoutMS=5000)
            db = client["fahem"]
            
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
            client = MongoClient(uri, serverSelectionTimeoutMS=5000)
            db = client["fahem"]
            
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
            client = MongoClient(uri, serverSelectionTimeoutMS=5000)
            db = client["fahem"]
            
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
            client = MongoClient(uri, serverSelectionTimeoutMS=5000)
            db = client["fahem"]
            
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
    async def get_profile_endpoint(userId: str = None, username: str = None, email: str = None):
        try:
            agents_dir = os.path.dirname(os.path.abspath(__file__))
            if agents_dir not in sys.path:
                sys.path.insert(0, agents_dir)
            from agent_communications import get_user_profile
            profile = await get_user_profile(user_id=userId, username=username, email=email)
            return {"profile": profile}
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
            
            if action == "add":
                success = await add_friend(user_id, friend_id)
            else:
                success = await remove_friend(user_id, friend_id)
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
            client = MongoClient(uri, serverSelectionTimeoutMS=5000)
            db = client["fahem"]
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
            client = MongoClient(uri, serverSelectionTimeoutMS=5000)
            db = client["fahem"]

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
            client = MongoClient(uri, serverSelectionTimeoutMS=5000)
            db = client["fahem"]

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
            client = MongoClient(uri, serverSelectionTimeoutMS=5000)
            db = client["fahem"]

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
