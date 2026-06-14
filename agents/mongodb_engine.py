import os
import re
import json
import logging
import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

try:
    from tools import get_mongodb_uri
except ImportError:
    from agents.tools import get_mongodb_uri

logger = logging.getLogger("fahem.mongodb_engine")

# =====================================================================
# PYDANTIC SCHEMAS (STRYCT INPUT / OUTPUT SCHEMES)
# =====================================================================

class UserProfileSchema(BaseModel):
    userId: str = Field(..., description="Unique Firebase/Auth UID")
    username: str = Field(..., description="Chosen display username", min_length=3, max_length=30)
    username_clean: Optional[str] = Field(None, description="Normalized lowercase/stripped username for uniqueness checks")
    email: str = Field(..., description="User email address")
    role: str = Field(..., description="User role (e.g. student, teacher, parent)")
    name: Optional[str] = Field(None, description="Display name of the user")
    age: Optional[int] = Field(None, description="User age")
    country: Optional[str] = Field(None, description="User country")
    grade: Optional[str] = Field(None, description="Educational grade level")
    avatar: Optional[str] = Field(None, description="Selected avatar/emoji")
    school: Optional[str] = Field(None, description="School name")
    userType: Optional[str] = Field(None, description="Specific type of user")
    onboardingCompleted: bool = Field(False, description="Whether the onboarding sequence is finished")
    onboardingSkipped: bool = Field(False, description="Whether the user skipped onboarding")
    skippedStep: Optional[str] = Field(None, description="Step at which user skipped onboarding")
    isApproved: bool = Field(True, description="Account approval status")
    childrenCount: int = Field(0, description="Number of associated children (for parents)")
    childrenInSchoolCount: int = Field(0, description="Number of children enrolled in school")
    friends: List[str] = Field(default_factory=list, description="List of friend userIds")
    groupsJoined: List[str] = Field(default_factory=list, description="List of joined group IDs")
    parentEmail: Optional[str] = Field(None, description="Parent's email address if underage student")
    phoneNumber: Optional[str] = Field(None, description="Verified phone number of the user")
    phoneVerified: bool = Field(False, description="Whether the phone number is verified")
    createdAt: Optional[str] = Field(None, description="ISO timestamp of record creation")
    updatedAt: Optional[str] = Field(None, description="ISO timestamp of record update")

    class Config:
        populate_by_name = True
        extra = "allow"


class ChatMessageSchema(BaseModel):
    senderId: str
    senderName: str
    recipientId: str
    content: str
    timestamp: Optional[str] = None
    isGroup: bool = False
    role: Optional[str] = "user"


    class Config:
        populate_by_name = True
        extra = "allow"


class ChatSessionSchema(BaseModel):
    sessionId: str
    userId: str
    userEmail: str
    title: str
    messages: List[ChatMessageSchema] = Field(default_factory=list)
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None

    class Config:
        populate_by_name = True
        extra = "allow"


class UserActivitySchema(BaseModel):
    userId: str
    userEmail: str
    action: str
    status: str
    details: Optional[Any] = None
    timestamp: Optional[str] = None

    class Config:
        populate_by_name = True
        extra = "allow"


class TokenTelemetrySchema(BaseModel):
    userId: str
    userEmail: str
    promptTokens: int
    completionTokens: int
    totalTokens: int
    model: str
    type: str
    timestamp: Optional[str] = None

    class Config:
        populate_by_name = True
        extra = "allow"


class AuditLogSchema(BaseModel):
    category: str
    agent: str
    message: str
    details: Optional[Any] = None
    timestamp: Optional[str] = None

    class Config:
        populate_by_name = True
        extra = "allow"


# =====================================================================
# PHASE 1 — CURRICULUM DATA MODELS (ADDITIVE & DYNAMIC SCHEMAS)
# =====================================================================

class ScopeDimensionSchema(BaseModel):
    key: str = Field(..., description="Unique slug for the dimension, e.g. grade, term, year, discipline, level")
    label: str = Field(..., description="Display label in English")
    label_ar: str = Field(..., description="Display label in Arabic")
    type: str = Field(..., description="Type of dimension input: enum or string")
    options: Optional[List[str]] = Field(None, description="Array of option strings for enum type")

    class Config:
        populate_by_name = True
        extra = "allow"


class LibrarySchema(BaseModel):
    id: str = Field(..., alias="_id", description="Unique ID of the library provider, e.g., lib_moe, lib_openstax")
    name: str = Field(..., description="English name of library")
    name_ar: str = Field(..., description="Arabic name of library")
    source: str = Field(..., description="Provider source code: moe | openstax | private | custom")
    logo: str = Field(..., description="Icon path or public bucket URL for logo")
    scopeSchema: List[ScopeDimensionSchema] = Field(default_factory=list, description="Ordered dimensions used for curriculum scope")
    status: str = Field("active", description="active | inactive")

    class Config:
        populate_by_name = True
        extra = "allow"


class CurriculumSchema(BaseModel):
    id: str = Field(..., alias="_id", description="Unique ID of curriculum scope, e.g., cur_moe_g12_t1_2026")
    library_id: str = Field(..., description="Associated library provider ID")
    title: str = Field(..., description="English curriculum title")
    title_ar: str = Field(..., description="Arabic curriculum title")
    scope: Dict[str, str] = Field(default_factory=dict, description="Concrete values mapping library's scopeSchema keys")
    subject_ids: List[str] = Field(default_factory=list, description="List of canonical subject IDs linked to this curriculum")
    status: str = Field("published", description="draft | published | archived")
    visibility: str = Field("public", description="public | private (user vault)")
    owner_uid: Optional[str] = Field(None, description="Owner Firebase UID if private curriculum")
    created_by: str = Field(..., description="Creator Firebase UID")
    created_at: Optional[Any] = None
    updated_at: Optional[Any] = None

    class Config:
        populate_by_name = True
        extra = "allow"


class SubjectSchema(BaseModel):
    id: str = Field(..., alias="_id", description="Unique ID of subject, e.g., subj_algebra_stats")
    curriculum_id: str = Field(..., description="Parent curriculum ID")
    name: str = Field(..., description="English subject name")
    name_ar: str = Field(..., description="Arabic subject name")
    color: str = Field("#1E96A0", description="Canonical hex color code for UI accent and book covers")
    emoji: str = Field("📚", description="Subject representative emoji")
    category: str = Field("General", description="Grouping category, e.g., Math, Science, Humanities")
    core_book_ids: List[str] = Field(default_factory=list, description="Associated core book IDs")
    supporting_book_ids: List[str] = Field(default_factory=list, description="Associated supporting book/reference IDs")
    books_count: int = Field(0, description="Cached number of active books in this subject")

    class Config:
        populate_by_name = True
        extra = "allow"


class TopicSchema(BaseModel):
    title: str = Field(..., description="English title")
    title_ar: str = Field(..., description="Arabic title")
    page: int = Field(..., description="Starting page number in the textbook")

    class Config:
        populate_by_name = True
        extra = "allow"


class ChapterSchema(BaseModel):
    title: str = Field(..., description="English chapter title")
    title_ar: str = Field(..., description="Arabic chapter title")
    start_page: int = Field(..., description="Chapter starting page")
    end_page: int = Field(..., description="Chapter ending page")
    topics: List[TopicSchema] = Field(default_factory=list, description="Inner topics with page markers")

    class Config:
        populate_by_name = True
        extra = "allow"


class BookSchema(BaseModel):
    id: str = Field(..., alias="_id", description="Unique textbook record ID")
    library_id: str = Field(..., description="Associated library ID")
    curriculum_id: str = Field(..., description="Associated curriculum ID")
    subject_id: str = Field(..., description="Associated subject ID")
    role: str = Field("core", description="core | supporting")
    title: str = Field(..., description="English book title")
    title_ar: str = Field(..., description="Arabic book title")
    language: str = Field("ar", description="ar | en")
    coverUrl: Optional[str] = None
    coverThumbUrl: Optional[str] = None
    chapters: List[ChapterSchema] = Field(default_factory=list, description="Structured table of contents (TOC)")
    visibility: str = Field("public", description="public | private")
    owner_uid: Optional[str] = None
    status: str = Field("embedded", description="embedded | processing | failed")
    totalPages: int = Field(0, description="Real parsed total page count from PyMuPDF")

    class Config:
        populate_by_name = True
        extra = "allow"


import contextvars
db_target_var = contextvars.ContextVar("db_target", default="fahem")
selected_book_ids_var = contextvars.ContextVar("selected_book_ids", default=[])

# =====================================================================
# PYMONGO ENGINE (DIRECT HIGH-PERFORMANCE DATA LAYER WITH SCHEMAS)
# =====================================================================

class MongoDBEngine:
    _instance = None
    _client = None
    _initialized = False

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(MongoDBEngine, cls).__new__(cls)
        return cls._instance

    @property
    def _db(self):
        if self._client is None:
            return None
        target = db_target_var.get()
        return self._client[target]

    @_db.setter
    def _db(self, value):
        # Allow assignment in constructor but ignore since we resolve dynamically via contextvar
        pass

    def __init__(self, database_name: str = "fahem"):
        if self._initialized:
            return
        
        self.database_name = database_name
        self.uri = get_mongodb_uri()
        
        # Initialize Direct MongoClient Connection
        try:
            from pymongo import MongoClient
            self._client = MongoClient(self.uri, serverSelectionTimeoutMS=5000)
            logger.info(f"[MongoDBEngine] Successfully connected direct MongoClient client. Dynamic targeting active.")
            
            # Run startup auto-healing collection initializations and index tuning
            self.ensure_schema_and_indexes()
            self.run_startup_migration()
            self._initialized = True
        except Exception as e:
            logger.error(f"[MongoDBEngine] Direct MongoClient initialization failed: {e}", exc_info=True)
            self._client = None

    def ensure_schema_and_indexes(self):
        """Preemptively boots up collections and strictly applies unique constraints & index-tuning on both prod and sandbox."""
        if self._client is None:
            logger.warning("[MongoDBEngine] MongoClient connection missing; skipping index initialization.")
            return

        old_target = db_target_var.get()
        
        for target_db_name in ["fahem", "fahem_sandbox"]:
            try:
                db_target_var.set(target_db_name)
                logger.info(f"[MongoDBEngine] Booting up auto-healing database schema & index-tuning for {target_db_name}...")
                
                # 1. Users Unique Indexes
                self._db["users"].create_index("userId", unique=True, background=True)
                self._db["users"].create_index("username_clean", unique=True, background=True)
                self._db["users"].create_index("email", unique=True, background=True)
                
                # 2. Messages Composite Indexes for ultra-fast chat query performance
                self._db["messages"].create_index([("senderId", 1), ("recipientId", 1), ("timestamp", 1)], background=True)
                self._db["messages"].create_index([("recipientId", 1), ("senderId", 1), ("timestamp", 1)], background=True)
                
                # 3. Chat Sessions
                self._db["chat_sessions"].create_index("userId", background=True)
                self._db["chat_sessions"].create_index("sessionId", unique=True, background=True)
                
                # 4. User Activities
                self._db["user_activities"].create_index("userId", background=True)
                
                # 5. Token Telemetry
                self._db["token_telemetry"].create_index("userId", background=True)
                self._db["token_telemetry"].create_index([("userId", 1), ("timestamp", 1)], background=True)
                self._db["token_telemetry"].create_index([("userId", 1), ("createdAt", 1)], background=True)
                
                # 6. Audit Logs
                self._db["audit_logs"].create_index("timestamp", background=True)

                # 7. Phase 1 — Curricula, Libraries, Subjects, Books Index Tuning
                self._db["libraries"].create_index("_id", unique=True, background=True)
                
                self._db["curricula"].create_index("library_id", background=True)
                self._db["curricula"].create_index([("scope.grade", 1), ("scope.term", 1)], background=True)
                self._db["curricula"].create_index([("visibility", 1), ("owner_uid", 1)], background=True)
                
                self._db["subjects"].create_index("curriculum_id", background=True)
                self._db["subjects"].create_index("category", background=True)
                self._db["subjects"].create_index([("curriculum_id", 1), ("slug", 1)], unique=True, background=True)
                try:
                    self._db["subjects"].drop_index("name_1")
                except Exception:
                    pass
                
                self._db["books"].create_index([("curriculum_id", 1), ("subject_id", 1), ("role", 1)], background=True)
                self._db["books"].create_index([("visibility", 1), ("owner_uid", 1)], background=True)
                self._db["books"].create_index("subject_id", background=True)
                
                self._db["book_pages"].create_index([("book_id", 1), ("page_number", 1)], background=True)
                
                # 8. Notification & Assignment Systems
                self._db["notifications"].create_index([("recipient_uid", 1), ("read", 1), ("createdAt", -1)], background=True)
                self._db["group_assignments"].create_index([("group_id", 1), ("status", 1), ("ends_at", 1)], background=True)
                self._db["assignment_submissions"].create_index([("assignment_id", 1), ("uid", 1)], unique=True, background=True)
                self._db["assignment_reports"].create_index("assignment_id", background=True)
                
                # 9. Assert/Create Atlas Vector Search Index 'vector_index_book_pages'
                try:
                    if "book_pages" in self._db.list_collection_names():
                        try:
                            indexes = list(self._db["book_pages"].list_search_indexes())
                            found_v_index = False
                            for idx in indexes:
                                if idx.get("name") == "vector_index_book_pages":
                                    found_v_index = True
                                    logger.info(f"[INDEX CHECK] Atlas Vector Search index 'vector_index_book_pages' verified on {target_db_name}: {idx}")
                                    break
                            if not found_v_index:
                                logger.info(f"Atlas Vector Search index 'vector_index_book_pages' is missing on {target_db_name}. Initiating auto-creation...")
                                try:
                                    from pymongo.operations import SearchIndexModel
                                    definition = {
                                        "fields": [
                                            { "type": "vector", "path": "embedding", "numDimensions": 3072, "similarity": "cosine" },
                                            { "type": "filter", "path": "book_id" },
                                            { "type": "filter", "path": "subject_id" },
                                            { "type": "filter", "path": "curriculum_id" },
                                            { "type": "filter", "path": "status" }
                                        ]
                                    }
                                    model = SearchIndexModel(
                                        definition=definition,
                                        name="vector_index_book_pages",
                                        type="vectorSearch"
                                    )
                                    self._db["book_pages"].create_search_index(model=model)
                                    logger.info(f"Successfully submitted search index creation for 'vector_index_book_pages' in {target_db_name}.")
                                except Exception as inner_ex:
                                    logger.warning(f"Could not auto-create search index on {target_db_name}: {inner_ex}")
                                    if os.environ.get("K_SERVICE") or (os.environ.get("MONGODB_URI") and "mongodb.net" in os.environ.get("MONGODB_URI")):
                                        if target_db_name == "fahem":
                                            raise RuntimeError(f"CRITICAL: Search index missing and auto-creation failed: {inner_ex}")
                        except Exception as ex:
                            logger.warning(f"Could not check search indexes on book_pages in {target_db_name}: {ex}")
                except Exception as outer_ex:
                    logger.warning(f"Error listing collection names for index check in {target_db_name}: {outer_ex}")

            except Exception as e:
                logger.warning(f"[MongoDBEngine] Index-tuning warning for {target_db_name}: {e}")
                
        db_target_var.set(old_target)
        logger.info("[MongoDBEngine] Auto-healing schema & unique index tuning completed for all targets! 🚀")

    def run_startup_migration(self):
        """Checks if libraries are empty in DB. If so, seeds standard libraries, curricula, subjects, and groups books."""
        if self._db is None:
            return
        
        try:
            if self._db["libraries"].count_documents({}) > 0:
                logger.info("[MongoDBEngine] Libraries already seeded. Skipping startup migration.")
                return

            logger.info("[MongoDBEngine] Libraries collection is empty. Initializing startup migration...")

            # 1. Standard Libraries
            libraries = [
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
                },
                {
                    "_id": "lib_private",
                    "name": "Private Vault",
                    "name_ar": "الخزانة الخاصة",
                    "source": "private",
                    "logo": "/libs/private.svg",
                    "scopeSchema": [
                        { "key": "category", "label": "Category", "label_ar": "الفئة", "type": "enum", "options": ["My Uploads", "Shared with Me", "Uncategorized"] }
                    ],
                    "status": "active"
                }
            ]

            for lib in libraries:
                self._db["libraries"].update_one({"_id": lib["_id"]}, {"$set": lib}, upsert=True)

            logger.info(f"[MongoDBEngine] Successfully seeded {len(libraries)} libraries.")

            # 2. Seed default openstax curriculum & subject if they don't exist
            openstax_curr = {
                "_id": "cur_openstax_math_college",
                "library_id": "lib_openstax",
                "title": "OpenStax — Mathematics & CS College Series",
                "title_ar": "أوبن ستاكس — سلسلة الرياضيات وعلوم الحاسب الجامعية",
                "scope": { "discipline": "Mathematics", "level": "College" },
                "subject_ids": ["sub_computer_science_1780535716963"],
                "status": "published",
                "visibility": "public",
                "owner_uid": None,
                "created_by": "system",
                "created_at": datetime.datetime.utcnow().isoformat() + "Z",
                "updated_at": datetime.datetime.utcnow().isoformat() + "Z"
            }
            self._db["curricula"].update_one({"_id": openstax_curr["_id"]}, {"$set": openstax_curr}, upsert=True)

            openstax_subj = {
                "_id": "sub_computer_science_1780535716963",
                "curriculum_id": "cur_openstax_math_college",
                "name": "Computer Science",
                "name_ar": "علوم الحاسب",
                "color": "#6366F1",
                "emoji": "💻",
                "category": "Computer Science",
                "core_book_ids": ["book_introduction_to_python_programming_1780535737559"],
                "supporting_book_ids": [],
                "books_count": 1
            }
            self._db["subjects"].update_one({"_id": openstax_subj["_id"]}, {"$set": openstax_subj}, upsert=True)

            # 3. Migrate existing flat books in books collection
            books_cursor = self._db["books"].find({})
            migrated_count = 0
            for book in books_cursor:
                book_id = book.get("_id")
                # Skip if already migrated/partially has new keys
                if "library_id" in book and "curriculum_id" in book:
                    continue

                lib_id = "lib_moe"
                curr_id = ""
                subj_id = ""
                role = "core"
                visibility = book.get("visibility", "public")
                owner_uid = book.get("userId")

                if book_id == "book_introduction_to_python_programming_1780535737559":
                    lib_id = "lib_openstax"
                    curr_id = "cur_openstax_math_college"
                    subj_id = "sub_computer_science_1780535716963"
                    role = "core"
                    visibility = "public"
                    owner_uid = None
                elif owner_uid and (book_id == "book_python_real_test" or book_id == "book_history_real_test"):
                    # Private user upload
                    lib_id = "lib_private"
                    curr_id = f"cur_private_{owner_uid}"
                    subj_id = f"subj_private_{owner_uid}"
                    role = "core"
                    visibility = "private"

                    # Check if curriculum already exists
                    private_curr = {
                        "_id": curr_id,
                        "library_id": "lib_private",
                        "title": "My Private Vault",
                        "title_ar": "خزانتي الخاصة",
                        "scope": { "category": "My Uploads" },
                        "subject_ids": [subj_id],
                        "status": "published",
                        "visibility": "private",
                        "owner_uid": owner_uid,
                        "created_by": owner_uid,
                        "created_at": datetime.datetime.utcnow().isoformat() + "Z",
                        "updated_at": datetime.datetime.utcnow().isoformat() + "Z"
                    }
                    self._db["curricula"].update_one({"_id": curr_id}, {"$set": private_curr}, upsert=True)

                    # Check if subject already exists
                    private_subj = {
                        "_id": subj_id,
                        "curriculum_id": curr_id,
                        "name": "My Documents",
                        "name_ar": "مستنداتي",
                        "color": "#4F46E5",
                        "emoji": "🔒",
                        "category": "Private",
                        "core_book_ids": [book_id],
                        "supporting_book_ids": [],
                        "books_count": 1
                    }
                    self._db["subjects"].update_one({"_id": subj_id}, {"$set": private_subj}, upsert=True)
                else:
                    # Public MOE book or normal book
                    lib_id = "lib_moe"
                    
                    # Parse grade/term/year from book or fallback
                    b_grade = book.get("grade", "Secondary 2")
                    if b_grade not in ["Secondary 1", "Secondary 2", "Secondary 3"]:
                        if b_grade == "Grade 11":
                            b_grade = "Secondary 2"
                        elif b_grade == "Grade 12":
                            b_grade = "Secondary 3"
                        elif b_grade in ["Grade 9", "Preparatory 3"]:
                            b_grade = "Preparatory 3"
                        else:
                            b_grade = "Secondary 2"

                    b_term = "Term 2" if book.get("term") == "Term 2" else "Term 1"
                    b_year = book.get("year", "2026")

                    slug_grade = b_grade.lower().replace(" ", "")
                    slug_term = b_term.lower().replace(" ", "")
                    curr_id = f"cur_moe_{slug_grade}_{slug_term}_{b_year}"

                    # Create MOE curriculum
                    moe_curr = {
                        "_id": curr_id,
                        "library_id": "lib_moe",
                        "title": f"MOE — {b_grade} · {b_term} · {b_year}",
                        "title_ar": f"وزارة التربية والتعليم — {'الصف الأول الثانوي' if b_grade == 'Secondary 1' else 'الصف الثاني الثانوي' if b_grade == 'Secondary 2' else 'الصف الثالث الثانوي'} · {'الفصل الدراسي الأول' if b_term == 'Term 1' else 'الفصل الدراسي الثاني'} · {b_year}",
                        "scope": { "grade": b_grade, "term": b_term, "year": b_year },
                        "subject_ids": [],
                        "status": "published",
                        "visibility": "public",
                        "owner_uid": None,
                        "created_by": "system",
                        "created_at": datetime.datetime.utcnow().isoformat() + "Z",
                        "updated_at": datetime.datetime.utcnow().isoformat() + "Z"
                    }
                    
                    # Subject mapping
                    legacy_subj_id = book.get("subject_id", "subj_algebra_stats")
                    if legacy_subj_id == "subj_user_uploads":
                        legacy_subj_id = "subj_algebra_stats"
                    
                    subj_id = f"{legacy_subj_id}_{slug_grade}_{slug_term}"
                    moe_curr["subject_ids"] = [subj_id]
                    self._db["curricula"].update_one({"_id": curr_id}, {"$set": moe_curr}, upsert=True)

                    # Get legacy subject details
                    legacy_subj = self._db["subjects"].find_one({"_id": legacy_subj_id}) or {
                        "name": "Pure Mathematics",
                        "name_ar": "الرياضيات البحتة",
                        "emoji": "📐",
                        "category": "Math"
                    }

                    moe_subj = {
                        "_id": subj_id,
                        "curriculum_id": curr_id,
                        "name": legacy_subj.get("name", "Pure Mathematics"),
                        "name_ar": legacy_subj.get("name_ar", "الرياضيات البحتة"),
                        "color": "#1E96A0" if legacy_subj_id == "subj_algebra_stats" else "#E11D48",
                        "emoji": legacy_subj.get("emoji", "📐"),
                        "category": legacy_subj.get("category", "Math"),
                        "core_book_ids": [book_id],
                        "supporting_book_ids": [],
                        "books_count": 1
                    }
                    self._db["subjects"].update_one({"_id": subj_id}, {"$set": moe_subj}, upsert=True)

                # Update Book Schema
                update_fields = {
                    "library_id": lib_id,
                    "curriculum_id": curr_id,
                    "subject_id": subj_id,
                    "role": role,
                    "visibility": visibility,
                    "owner_uid": owner_uid,
                    "totalPages": book.get("total_pages", book.get("totalPages", 0)),
                    "status": "embedded" if (book.get("ingestion_status") == "completed" or book.get("is_completed")) else "processing"
                }
                
                # Delete legacy keys
                unset_fields = {
                    "grade": "",
                    "term": "",
                    "year": "",
                    "is_completed": "",
                    "total_pages": ""
                }
                
                self._db["books"].update_one({"_id": book_id}, {"$set": update_fields, "$unset": unset_fields})
                migrated_count += 1

            logger.info(f"[MongoDBEngine] Startup migration successfully completed. Migrated {migrated_count} flat books.")
        except Exception as e:
            logger.error(f"[MongoDBEngine] Startup migration failed: {e}", exc_info=True)

    # =================================================================
    # INTERFACE METHODS (STRICT SCHEMA VALIDATION & ROBUST ENFORCEMENT)
    # =================================================================

    def get_db_status(self) -> Dict[str, Any]:
        """Provides dynamic real-time telemetry on active collections and counts."""
        if self._db is None:
            return {
                "databaseName": self.database_name,
                "collectionsCount": "0",
                "collectionList": "None",
                "status": "Disconnected"
            }
        try:
            cols = self._db.list_collection_names()
            counts = {col: self._db[col].count_documents({}) for col in cols}
            return {
                "databaseName": self.database_name,
                "collectionsCount": str(len(cols)),
                "collectionList": ", ".join([f"{col} ({counts[col]} docs)" for col in cols]) if cols else "None",
                "status": "Connected",
                "counts": counts
            }
        except Exception as e:
            return {
                "databaseName": self.database_name,
                "collectionsCount": "0",
                "collectionList": f"Error: {e}",
                "status": "Disconnected (Error)"
            }

    async def get_user_profile(self, user_id: str = None, username: str = None, email: str = None) -> Optional[UserProfileSchema]:
        """Fetches and returns a strictly validated UserProfileSchema document from the users collection."""
        if self._db is None:
            raise RuntimeError("Database engine not connected.")

        doc = None
        if user_id:
            doc = self._db["users"].find_one({"userId": user_id})
        
        if not doc and email:
            doc = self._db["users"].find_one({"email": email.strip().lower()})
            if not doc:
                doc = self._db["users"].find_one({"email": email.strip()})
                
        if not doc and username:
            doc = self._db["users"].find_one({"username_clean": username.strip().lower()})
            if not doc:
                doc = self._db["users"].find_one({"userId": username})
            if not doc:
                doc = self._db["users"].find_one({"email": {"$regex": f"^{re.escape(username.strip().lower())}@", "$options": "i"}})

        if not doc:
            return None

        doc.pop("_id", None)  # Strip Mongo Internal ID
        if "userId" in doc and doc["userId"] is not None:
            doc["userId"] = str(doc["userId"])
        if "friends" in doc and isinstance(doc["friends"], list):
            doc["friends"] = [str(f) for f in doc["friends"]]
        if "groupsJoined" in doc and isinstance(doc["groupsJoined"], list):
            doc["groupsJoined"] = [str(g) for g in doc["groupsJoined"]]
        return UserProfileSchema(**doc)


    async def check_username_availability(self, username: str, exclude_user_id: str = None) -> bool:
        """Determines username availability using clean, flat equality checks on username_clean, with regex fallback."""
        if self._db is None:
            raise RuntimeError("Database engine not connected.")

        if not username or not username.strip():
            return False

        import re
        username_clean = username.strip().lower()
        escaped_username = re.escape(username.strip())
        
        username_query = {
            "$or": [
                {"username_clean": username_clean},
                {"username": {"$regex": f"^{escaped_username}$", "$options": "i"}}
            ]
        }
        
        if exclude_user_id:
            filt = {
                "$and": [
                    username_query,
                    {"userId": {"$ne": exclude_user_id}}
                ]
            }
        else:
            filt = username_query

        count = self._db["users"].count_documents(filt)
        return count == 0

    async def save_user_profile(self, user_id: str, data: dict) -> bool:
        """Saves or updates user profiles via atomic, structured, validated Upsert."""
        if self._db is None:
            raise RuntimeError("Database engine not connected.")

        try:
            now_str = datetime.datetime.utcnow().isoformat() + "Z"
            
            # Merge keys to build a standard flat dictionary
            flat_profile = {**data, "userId": user_id}
            flat_profile.pop("_id", None)
            
            # Check username uniqueness first
            username = str(flat_profile.get("username", "")).strip()
            if username:
                is_avail = await self.check_username_availability(username, exclude_user_id=user_id)
                if not is_avail:
                    raise ValueError(f"Username '{username}' is already taken by another user.")
            
            # Set system fields
            flat_profile["username_clean"] = username.lower()
            flat_profile["email"] = str(flat_profile.get("email", "")).strip().lower()
            flat_profile["updatedAt"] = now_str
            
            # Validate input against the strict schema!
            validated = UserProfileSchema(**flat_profile)
            dumped_data = validated.model_dump(by_alias=True, exclude_none=True)
            
            # Run atomic pymongo upsert
            self._db["users"].update_one(
                {"userId": user_id},
                {
                    "$set": dumped_data,
                    "$setOnInsert": {"createdAt": now_str}
                },
                upsert=True
            )
            
            logger.info(f"[MongoDBEngine] Successfully upserted profile for {user_id}")
            return True
        except Exception as e:
            logger.error(f"[MongoDBEngine] Profile upsert failed for {user_id}: {e}", exc_info=True)
            raise e

    async def ensure_user_profile(self, user_id: str, email: str, display_name: Optional[str] = None, role: Optional[str] = None) -> UserProfileSchema:
        """Idempotently inserts or retrieves a user profile for the given user_id and email."""
        if self._db is None:
            raise RuntimeError("Database engine not connected.")
        
        # 1. Try to find by userId
        doc = self._db["users"].find_one({"userId": user_id})
        if not doc and email:
            doc = self._db["users"].find_one({"email": email.strip().lower()})
            if doc:
                # Update userId if it was somehow different or missing
                self._db["users"].update_one({"_id": doc["_id"]}, {"$set": {"userId": user_id}})
                doc["userId"] = user_id

        if doc:
            doc.pop("_id", None)
            if "userId" in doc and doc["userId"] is not None:
                doc["userId"] = str(doc["userId"])
            if "friends" in doc and isinstance(doc["friends"], list):
                doc["friends"] = [str(f) for f in doc["friends"]]
            if "groupsJoined" in doc and isinstance(doc["groupsJoined"], list):
                doc["groupsJoined"] = [str(g) for g in doc["groupsJoined"]]
            return UserProfileSchema(**doc)

        # 2. Not found, create standard profile
        import datetime
        now_str = datetime.datetime.utcnow().isoformat() + "Z"
        
        # Derive name
        name = display_name or ""
        
        # Clean username derivation
        base_username = ""
        if name:
            # strip special characters, keep alphanumeric
            base_username = re.sub(r'[^a-zA-Z0-9]', '', name)
        
        if not base_username and email:
            base_username = email.split("@")[0]
            base_username = re.sub(r'[^a-zA-Z0-9]', '', base_username)
            
        if len(base_username) < 3:
            base_username = "user_" + user_id[:6]
            
        if len(base_username) > 25:
            base_username = base_username[:25]
            
        # Find a unique username
        username = base_username
        suffix = 1
        while True:
            # check availability
            username_clean = username.lower()
            existing = self._db["users"].find_one({
                "$or": [
                    {"username_clean": username_clean},
                    {"username": {"$regex": f"^{re.escape(username)}$", "$options": "i"}}
                ]
            })
            if not existing:
                break
            username = f"{base_username[:20]}{suffix}"
            suffix += 1

        # Determine role
        final_role = role
        if not final_role:
            email_lower = email.strip().lower()
            if email_lower == "hesham1988@gmail.com":
                final_role = "super-admin"
            elif email_lower == "contact@fahem.pro":
                final_role = "super-admin"
            else:
                final_role = "user"

        flat_profile = {
            "userId": user_id,
            "username": username,
            "username_clean": username.lower(),
            "email": email.strip().lower(),
            "role": final_role,
            "name": name or username,
            "onboardingCompleted": False,
            "phoneVerified": False,
            "createdAt": now_str,
            "updatedAt": now_str
        }

        # Validate input against the strict schema
        validated = UserProfileSchema(**flat_profile)
        dumped_data = validated.model_dump(by_alias=True, exclude_none=True)

        # Pop 'createdAt' from dumped_data so it doesn't conflict with $setOnInsert
        dumped_data.pop("createdAt", None)

        self._db["users"].update_one(
            {"userId": user_id},
            {
                "$set": dumped_data,
                "$setOnInsert": {"createdAt": now_str}
            },
            upsert=True
        )
        logger.info(f"[MongoDBEngine] Idempotently created default user profile for {user_id} ({email})")

        # Notify admins of the new sign-up (with the user type). Best-effort — never block signup.
        try:
            import time as _t
            _ts = int(_t.time() * 1000)
            _i = 0
            for _adm in self._db["users"].find({"role": {"$in": ["admin", "super-admin"]}}, {"userId": 1}):
                _auid = _adm.get("userId")
                if not _auid or _auid == user_id:
                    continue
                self._db["notifications"].insert_one({
                    "_id": f"ntf_{_ts}_signup_{str(_auid)[:8]}_{_i}",
                    "recipient_uid": _auid,
                    "type": "admin_new_signup",
                    "title": f"New {final_role} signed up",
                    "title_ar": f"تسجيل مستخدم جديد ({final_role})",
                    "body": f"{name or username} ({email}) joined as {final_role}.",
                    "body_ar": f"انضم {name or username} ({email}) بصفة {final_role}.",
                    "payload": {"new_user_id": user_id, "deep_link": "?tab=super-admin-users"},
                    "read": False,
                    "createdAt": _ts
                })
                _i += 1
            # A teacher/admin account needs Superadmin approval — raise an approval request.
            if final_role in ("teacher", "admin"):
                _ts2 = int(_t.time() * 1000)
                _j = 0
                for _sa in self._db["users"].find({"role": "super-admin"}, {"userId": 1}):
                    _sauid = _sa.get("userId")
                    if not _sauid or _sauid == user_id:
                        continue
                    self._db["notifications"].insert_one({
                        "_id": f"ntf_{_ts2}_adminreq_{str(_sauid)[:8]}_{_j}",
                        "recipient_uid": _sauid,
                        "type": "admin_approval_request",
                        "title": f"New {final_role} approval request",
                        "title_ar": f"طلب موافقة على حساب ({final_role})",
                        "body": f"{name or username} ({email}) registered as {final_role} and needs approval.",
                        "body_ar": f"سجّل {name or username} ({email}) كـ{final_role} ويحتاج إلى موافقتك.",
                        "payload": {"new_user_id": user_id, "deep_link": "?tab=super-admin-users"},
                        "read": False,
                        "createdAt": _ts2
                    })
                    _j += 1
        except Exception as _e:
            logger.warning(f"Failed to notify admins of new signup: {_e}")

        return validated

    async def delete_user_account(self, user_id: str, email: str) -> bool:
        """Performs atomic cascading compliance deletion of a user's entire footprint."""
        if self._db is None:
            raise RuntimeError("Database engine not connected.")

        try:
            self._db["users"].delete_many({"userId": user_id})
            self._db["chat_sessions"].delete_many({"userId": user_id})
            self._db["user_activities"].delete_many({"userId": user_id})
            self._db["token_telemetry"].delete_many({"userId": user_id})
            self._db["messages"].delete_many({
                "$or": [
                    {"senderId": user_id},
                    {"recipientId": user_id}
                ]
            })
            logger.info(f"[MongoDBEngine] Successfully purged all footprint data for user {user_id}")
            return True
        except Exception as e:
            logger.error(f"[MongoDBEngine] Compliance deletion failed for {user_id}: {e}")
            return False

    async def get_all_users(self) -> List[UserProfileSchema]:
        """Retrieves and returns all registered user profiles as validated schemas."""
        if self._db is None:
            return []
        try:
            users_list = []
            for doc in self._db["users"].find({}):
                doc.pop("_id", None)
                if "userId" in doc and doc["userId"] is not None:
                    doc["userId"] = str(doc["userId"])
                try:
                    users_list.append(UserProfileSchema(**doc))
                except Exception as parse_err:
                    logger.warning(f"Error parsing user document {doc.get('userId')}: {parse_err}")
            return users_list
        except Exception as e:
            logger.error(f"Failed to query all users: {e}")
            return []

    async def log_user_activity(self, user_id: str, user_email: str, action: str, status: str, details: Any = None) -> bool:
        """Appends a validated action schema record to the user activities log collection."""
        if self._db is None:
            return False
        try:
            now_str = datetime.datetime.utcnow().isoformat() + "Z"
            activity = UserActivitySchema(
                userId=user_id,
                userEmail=user_email.strip().lower() if user_email else "",
                action=action,
                status=status,
                details=details,
                timestamp=now_str
            )
            self._db["user_activities"].insert_one(activity.model_dump(exclude_none=True))
            return True
        except Exception as e:
            logger.error(f"Failed to log user activity: {e}")
            return False

    async def get_user_activities(self, user_id: str) -> List[UserActivitySchema]:
        """Retrieves history of user actions sorted chronologically."""
        if self._db is None:
            return []
        try:
            activities = []
            for doc in self._db["user_activities"].find({"userId": user_id}).sort("timestamp", -1).limit(100):
                doc.pop("_id", None)
                activities.append(UserActivitySchema(**doc))
            return activities
        except Exception as e:
            logger.error(f"Failed to fetch user activities: {e}")
            return []

    async def get_all_activities(self) -> List[UserActivitySchema]:
        """Retrieves up to 200 recent activities globally (for Superadmins)."""
        if self._db is None:
            return []
        try:
            activities = []
            for doc in self._db["user_activities"].find({}).sort("timestamp", -1).limit(200):
                doc.pop("_id", None)
                activities.append(UserActivitySchema(**doc))
            return activities
        except Exception as e:
            logger.error(f"Failed to fetch all activities: {e}")
            return []

    async def save_chat_session(self, session_id: str, user_id: str, user_email: str, title: str, messages: List[dict]) -> bool:
        """Saves an entire chat session sequence using atomic serialization schemas."""
        if self._db is None:
            return False
        try:
            now_str = datetime.datetime.utcnow().isoformat() + "Z"
            
            validated_msgs = []
            for msg in messages:
                validated_msgs.append(ChatMessageSchema(
                    senderId=msg.get("senderId", ""),
                    senderName=msg.get("senderName", ""),
                    recipientId=msg.get("recipientId", ""),
                    content=msg.get("content", ""),
                    timestamp=msg.get("timestamp", now_str),
                    isGroup=msg.get("isGroup", False),
                    role=msg.get("role", "user")
                ))

            session_data = ChatSessionSchema(
                sessionId=session_id,
                userId=user_id,
                userEmail=user_email.strip().lower(),
                title=title,
                messages=validated_msgs,
                updatedAt=now_str
            )
            
            dumped = session_data.model_dump(exclude_none=True)
            self._db["chat_sessions"].update_one(
                {"sessionId": session_id},
                {
                    "$set": dumped,
                    "$setOnInsert": {"createdAt": now_str}
                },
                upsert=True
            )
            return True
        except Exception as e:
            logger.error(f"Failed to save chat session {session_id}: {e}")
            return False

    async def rename_chat_session(self, session_id: str, new_title: str) -> bool:
        """Renames a specific chat session's title."""
        if self._db is None:
            return False
        try:
            now_str = datetime.datetime.utcnow().isoformat() + "Z"
            self._db["chat_sessions"].update_one(
                {"sessionId": session_id},
                {
                    "$set": {
                        "title": new_title,
                        "updatedAt": now_str
                    }
                }
            )
            return True
        except Exception as e:
            logger.error(f"Failed to rename chat session {session_id}: {e}")
            return False

    async def get_user_sessions(self, user_id: str) -> List[ChatSessionSchema]:
        """Lists chat session metadata for a user."""
        if self._db is None:
            return []
        try:
            sessions = []
            for doc in self._db["chat_sessions"].find({"userId": user_id}).sort("updatedAt", -1):
                doc.pop("_id", None)
                sessions.append(ChatSessionSchema(**doc))
            return sessions
        except Exception as e:
            logger.error(f"Failed to fetch user sessions: {e}")
            return []

    async def get_session_detail(self, session_id: str) -> Optional[ChatSessionSchema]:
        """Retrieves exact details and full message logs of a specific chat session."""
        if self._db is None:
            return None
        try:
            doc = self._db["chat_sessions"].find_one({"sessionId": session_id})
            if doc:
                doc.pop("_id", None)
                return ChatSessionSchema(**doc)
            return None
        except Exception as e:
            logger.error(f"Failed to fetch session detail for {session_id}: {e}")
            return None

    async def delete_session(self, session_id: str) -> bool:
        """Deletes a chat session."""
        if self._db is None:
            return False
        try:
            self._db["chat_sessions"].delete_one({"sessionId": session_id})
            return True
        except Exception as e:
            logger.error(f"Failed to delete chat session {session_id}: {e}")
            return False

    async def log_token_usage(self, user_id: str, user_email: str, prompt_tokens: int, completion_tokens: int, total_tokens: int, model: str, run_type: str) -> bool:
        """Logs and aggregates precise LLM token usage details."""
        if self._db is None:
            return False
        try:
            now_str = datetime.datetime.utcnow().isoformat() + "Z"
            telemetry = TokenTelemetrySchema(
                userId=user_id,
                userEmail=user_email.strip().lower() if user_email else "",
                promptTokens=prompt_tokens,
                completionTokens=completion_tokens,
                totalTokens=total_tokens,
                model=model,
                type=run_type,
                timestamp=now_str
            )
            self._db["token_telemetry"].insert_one(telemetry.model_dump(exclude_none=True))
            return True
        except Exception as e:
            logger.error(f"Failed to record token usage: {e}")
            return False

    async def get_user_token_stats(self, user_id: str, user_email: str = None) -> Dict[str, Any]:
        """Calculates precise consolidated telemetry statistics for a specific user.

        Returns true rolling windows (daily/weekly/monthly) plus the all-time total.
        Token documents are matched by userId OR userEmail so usage is never dropped
        when one identifier differs between the writer and the reader, and timestamps
        are read from either the ISO ``timestamp`` field or the datetime ``createdAt``
        field so every historical write shape is counted.
        """
        if self._db is None:
            return {"daily": 0, "weekly": 0, "monthly": 0, "total": 0}
        try:
            match_or = []
            if user_id:
                match_or.append({"userId": user_id})
            if user_email:
                match_or.append({"userEmail": user_email.strip().lower()})
            if not match_or:
                return {"daily": 0, "weekly": 0, "monthly": 0, "total": 0}

            now = datetime.datetime.utcnow()
            day_cutoff = now - datetime.timedelta(days=1)
            week_cutoff = now - datetime.timedelta(days=7)
            month_cutoff = now - datetime.timedelta(days=30)

            def _ts(doc):
                t = doc.get("timestamp") or doc.get("createdAt")
                if t is None:
                    return None
                if isinstance(t, datetime.datetime):
                    return t
                try:
                    return datetime.datetime.fromisoformat(str(t).replace("Z", ""))
                except Exception:
                    return None

            daily = weekly = monthly = total = 0
            cursor = self._db["token_telemetry"].find(
                {"$or": match_or},
                {"totalTokens": 1, "timestamp": 1, "createdAt": 1}
            )
            for doc in cursor:
                tok = int(doc.get("totalTokens") or 0)
                total += tok
                ts = _ts(doc)
                if ts is None:
                    continue
                if ts >= month_cutoff:
                    monthly += tok
                if ts >= week_cutoff:
                    weekly += tok
                if ts >= day_cutoff:
                    daily += tok

            return {"daily": daily, "weekly": weekly, "monthly": monthly, "total": total}
        except Exception as e:
            logger.error(f"Failed to aggregate token stats: {e}")
            return {"daily": 0, "weekly": 0, "monthly": 0, "total": 0}

    async def get_global_token_stats(self) -> Dict[str, Any]:
        """Provides platform-wide token consumption statistics and user breakdowns."""
        if self._db is None:
            return {"daily": 0, "weekly": 0, "monthly": 0, "total": 0, "userBreakdown": []}
        try:
            pipeline = [
                {"$group": {"_id": None, "total": {"$sum": "$totalTokens"}}}
            ]
            res = list(self._db["token_telemetry"].aggregate(pipeline))
            total = res[0]["total"] if res else 0
            
            user_breakdown_pipeline = [
                {"$group": {"_id": "$userId", "tokens": {"$sum": "$totalTokens"}}},
                {"$sort": {"tokens": -1}},
                {"$limit": 10}
            ]
            breakdown_res = list(self._db["token_telemetry"].aggregate(user_breakdown_pipeline))
            user_breakdown = [{"userId": d["_id"], "tokens": d["tokens"]} for d in breakdown_res]
            
            return {
                "daily": total,
                "weekly": total,
                "monthly": total,
                "total": total,
                "userBreakdown": user_breakdown
            }
        except Exception as e:
            logger.error(f"Failed to aggregate global token stats: {e}")
            return {"daily": 0, "weekly": 0, "monthly": 0, "total": 0, "userBreakdown": []}

    async def log_audit_event(self, category: str, agent: str, message: str, details: Any = None) -> bool:
        """Writes validated administrative auditing events strictly for transparency and compliance."""
        if self._db is None:
            return False
        try:
            now_str = datetime.datetime.utcnow().isoformat() + "Z"
            log = AuditLogSchema(
                category=category,
                agent=agent,
                message=message,
                details=details,
                timestamp=now_str
            )
            self._db["audit_logs"].insert_one(log.model_dump(exclude_none=True))
            return True
        except Exception as e:
            logger.error(f"Failed to log audit event: {e}")
            return False

    async def get_audit_logs(self) -> List[AuditLogSchema]:
        """Retrieves and returns chronological list of security audit events."""
        if self._db is None:
            return []
        try:
            logs = []
            for doc in self._db["audit_logs"].find({}).sort("timestamp", -1).limit(100):
                doc.pop("_id", None)
                logs.append(AuditLogSchema(**doc))
            return logs
        except Exception as e:
            logger.error(f"Failed to retrieve audit logs: {e}")
            return []

    async def add_friend(self, user_id: str, friend_id: str) -> bool:
        """Adds bidirectional friendship between user_id and friend_id."""
        if self._db is None:
            return False
        try:
            self._db["users"].update_one({"userId": user_id}, {"$addToSet": {"friends": friend_id}})
            self._db["users"].update_one({"userId": friend_id}, {"$addToSet": {"friends": user_id}})
            return True
        except Exception as e:
            logger.error(f"Failed to add friend: {e}")
            return False

    async def remove_friend(self, user_id: str, friend_id: str) -> bool:
        """Removes bidirectional friendship between user_id and friend_id."""
        if self._db is None:
            return False
        try:
            self._db["users"].update_one({"userId": user_id}, {"$pull": {"friends": friend_id}})
            self._db["users"].update_one({"userId": friend_id}, {"$pull": {"friends": user_id}})
            return True
        except Exception as e:
            logger.error(f"Failed to remove friend: {e}")
            return False

    async def save_chat_message(self, sender_id: str, sender_name: str, recipient_id: str, content: str, is_group: bool) -> bool:
        """Saves a direct or group chat message."""
        if self._db is None:
            return False
        try:
            now_str = datetime.datetime.utcnow().isoformat() + "Z"
            msg = ChatMessageSchema(
                senderId=sender_id,
                senderName=sender_name,
                recipientId=recipient_id,
                content=content,
                timestamp=now_str,
                isGroup=is_group
            )
            self._db["messages"].insert_one(msg.model_dump(exclude_none=True))
            return True
        except Exception as e:
            logger.error(f"Failed to save chat message: {e}")
            return False

    async def get_chat_history(self, sender_id: str, recipient_id: str, is_group: bool) -> List[ChatMessageSchema]:
        """Fetches up to 200 chat messages between sender_id and recipient_id, or inside a group."""
        if self._db is None:
            return []
        try:
            if is_group:
                filt = {"recipientId": recipient_id, "isGroup": True}
            else:
                filt = {
                    "isGroup": False,
                    "$or": [
                        {"senderId": sender_id, "recipientId": recipient_id},
                        {"senderId": recipient_id, "recipientId": sender_id}
                    ]
                }
            messages = []
            for doc in self._db["messages"].find(filt).sort("timestamp", 1).limit(200):
                doc.pop("_id", None)
                messages.append(ChatMessageSchema(**doc))
            return messages
        except Exception as e:
            logger.error(f"Failed to fetch chat history: {e}")
            return []

    async def get_pending_children(self, parent_email: str) -> List[UserProfileSchema]:
        """Fetches associated underage student profiles pending approval."""
        if self._db is None:
            return []
        try:
            children = []
            for doc in self._db["users"].find({"parentEmail": parent_email.strip().lower()}):
                doc.pop("_id", None)
                if "userId" in doc and doc["userId"] is not None:
                    doc["userId"] = str(doc["userId"])
                children.append(UserProfileSchema(**doc))
            return children
        except Exception as e:
            logger.error(f"Failed to fetch pending children for parent {parent_email}: {e}")
            return []

    async def approve_child(self, parent_email: str, child_id: str) -> bool:
        """Approves a child profile under a parent."""
        if self._db is None:
            return False
        try:
            self._db["users"].update_one(
                {"userId": child_id, "parentEmail": parent_email.strip().lower()},
                {"$set": {"isApproved": True}}
            )
            return True
        except Exception as e:
            logger.error(f"Failed to approve child {child_id}: {e}")
            return False
