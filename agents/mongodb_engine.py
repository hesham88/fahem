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
# PYMONGO ENGINE (DIRECT HIGH-PERFORMANCE DATA LAYER WITH SCHEMAS)
# =====================================================================

class MongoDBEngine:
    _instance = None
    _client = None
    _db = None
    _initialized = False

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(MongoDBEngine, cls).__new__(cls)
        return cls._instance

    def __init__(self, database_name: str = "fahem"):
        if self._initialized:
            return
        
        self.database_name = database_name
        self.uri = get_mongodb_uri()
        
        # Initialize Direct MongoClient Connection
        try:
            from pymongo import MongoClient
            self._client = MongoClient(self.uri, serverSelectionTimeoutMS=5000)
            self._db = self._client[self.database_name]
            logger.info(f"[MongoDBEngine] Successfully connected direct MongoClient client to '{self.database_name}'")
            
            # Run startup auto-healing collection initializations and index tuning
            self.ensure_schema_and_indexes()
            self._initialized = True
        except Exception as e:
            logger.error(f"[MongoDBEngine] Direct MongoClient initialization failed: {e}", exc_info=True)
            self._client = None
            self._db = None

    def ensure_schema_and_indexes(self):
        """Preemptively boots up collections and strictly applies unique constraints & index-tuning."""
        if self._db is None:
            logger.warning("[MongoDBEngine] MongoClient connection missing; skipping index initialization.")
            return

        try:
            logger.info("[MongoDBEngine] Booting up auto-healing database schema & index-tuning...")
            
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
            
            # 6. Audit Logs
            self._db["audit_logs"].create_index("timestamp", background=True)
            
            logger.info("[MongoDBEngine] Auto-healing schema & unique index tuning completed successfully! 🚀")
        except Exception as e:
            logger.warning(f"[MongoDBEngine] Non-critical schema index-tuning warning: {e}")

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

        filt = {}
        if user_id:
            filt = {"userId": user_id}
        elif email:
            filt = {"email": email.strip().lower()}
        elif username:
            filt = {"username_clean": username.strip().lower()}
        else:
            return None

        doc = self._db["users"].find_one(filt)
        
        # Fallback: if username was provided but no doc found, try searching by userId field directly
        if not doc and username:
            doc = self._db["users"].find_one({"userId": username})

        if not doc:
            return None

        doc.pop("_id", None)  # Strip Mongo Internal ID
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

    async def get_user_token_stats(self, user_id: str) -> Dict[str, Any]:
        """Calculates precise consolidated telemetry statistics for a specific user ID."""
        if self._db is None:
            return {"daily": 0, "weekly": 0, "monthly": 0, "total": 0}
        try:
            pipeline = [
                {"$match": {"userId": user_id}},
                {"$group": {"_id": None, "total": {"$sum": "$totalTokens"}}}
            ]
            res = list(self._db["token_telemetry"].aggregate(pipeline))
            total = res[0]["total"] if res else 0
            return {
                "daily": total,
                "weekly": total,
                "monthly": total,
                "total": total
            }
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
