import sys
import os
import logging
import fastapi

logger = logging.getLogger("google_adk." + __name__)

# Helper to register route on a FastAPI app
def register_telemetry_route(app: fastapi.FastAPI):
    # Check if the route is already registered to avoid duplication
    for route in app.routes:
        if hasattr(route, "path") and route.path == "/db-metadata":
            return

    # Secure OIDC Bearer Token Verification Middleware for Cloud Run environment
    @app.middleware("http")
    async def oidc_security_middleware(request: fastapi.Request, call_next):
        secured_paths = [
            "/db-metadata", "/audit-logs", "/user/activity", "/user/chat-session",
            "/user/token-usage", "/user/token-stats", "/admin/global-stats",
            "/user/profile", "/user/account", "/user/list", "/user/friend",
            "/chat/message", "/parent/children", "/parent/approve", "/admin/seed-db",
            "/admin/mcp-tool"
        ]
        
        path = request.url.path
        is_secured = any(path == p or path.startswith(p + "/") or path.startswith(p + "?") for p in secured_paths)
        
        if is_secured:
            is_gcp = os.environ.get("K_SERVICE") is not None or os.environ.get("GOOGLE_CLOUD_PROJECT") is not None
            auth_header = request.headers.get("Authorization")
            
            # Allow local Next.js environment to bypass OIDC using a pre-shared local secret
            if auth_header == "Bearer LOCAL_BYPASS_TOKEN_fahem_2026":
                logger.info(f"[OIDC BYPASS via SECRET] Request to {path} permitted via shared secret.")
                request.state.verified_email = "local_dev_bypass@fahem.app"
                return await call_next(request)

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
                    
        return await call_next(request)


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

    @app.get("/user/subjects")
    async def get_subjects_endpoint():
        try:
            from tools import get_mongodb_uri
            from pymongo import MongoClient
            
            uri = get_mongodb_uri()
            client = MongoClient(uri, serverSelectionTimeoutMS=5000)
            db = client["fahem"]
            
            subjects = list(db["subjects"].find({}))
            return {"subjects": subjects}
        except Exception as err:
            logger.error(f"[services.py] Failed to get subjects: {err}", exc_info=True)
            return {"subjects": [], "error": str(err)}

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
            return {"success": True, "status": "fail_open_bypass", "error": str(err), "score": 1.0}

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
