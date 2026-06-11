import os
import logging
from typing import Any, Optional, Sequence, Mapping
from pydantic import BaseModel

try:
    from typing import override
except ImportError:
    try:
        from typing_extensions import override
    except ImportError:
        def override(func):
            return func

from google.adk.sessions import BaseSessionService, Session
from google.adk.sessions.base_session_service import ListSessionsResponse, GetSessionConfig
from google.adk.sessions.in_memory_session_service import InMemorySessionService
from google.adk.sessions.state import State
from google.adk.sessions import _session_util
from google.adk import Event
from google.adk.errors.already_exists_error import AlreadyExistsError
from google.adk.platform import time as platform_time
from google.adk.platform import uuid as platform_uuid

from google.adk.memory import BaseMemoryService
from google.adk.memory.base_memory_service import SearchMemoryResponse, MemoryEntry
from google.adk.memory.in_memory_memory_service import InMemoryMemoryService

import pymongo
from pymongo import MongoClient

logger = logging.getLogger(__name__)

def get_db_client() -> Optional[MongoClient]:
    """Attempts to connect to MongoDB. Returns None if connection fails."""
    try:
        # Import dynamically to prevent import loop or environment missing errors
        try:
            from tools import get_mongodb_uri
        except ImportError:
            from agents.tools import get_mongodb_uri
            
        uri = get_mongodb_uri()
        client = MongoClient(uri, serverSelectionTimeoutMS=2000)
        # Verify connection
        client.admin.command('ping')
        logger.info("[MongoServices] MongoDB connection established successfully.")
        return client
    except Exception as e:
        logger.warning(f"[MongoServices] MongoDB connection failed: {e}. Falling back to InMemory service.")
        return None

# -------------------------------------------------------------
# 1. MongoSessionService Implementation
# -------------------------------------------------------------
class MongoSessionService(BaseSessionService):
    """A persistent, MongoDB-backed session service for ADK 2.0 with InMemory fallback."""

    @property
    def db_name(self) -> str:
        try:
            from agents.mongodb_engine import db_target_var
            return db_target_var.get()
        except ImportError:
            try:
                from mongodb_engine import db_target_var
                return db_target_var.get()
            except ImportError:
                return "fahem"

    @db_name.setter
    def db_name(self, value):
        pass

    def __init__(self, client: Optional[MongoClient] = None, database_name: str = "fahem"):
        super().__init__()
        self.client = client or get_db_client()
        self.fallback_service = InMemorySessionService()

    def _get_user_state(self, app_name: str, user_id: str) -> dict:
        if not self.client:
            return {}
        try:
            db = self.client[self.db_name]
            col = db["companion_user_state"]
            doc = col.find_one({"app_name": app_name, "user_id": user_id})
            if doc:
                doc.pop("_id", None)
                doc.pop("app_name", None)
                doc.pop("user_id", None)
                return doc
        except Exception as e:
            logger.error(f"[MongoSessionService] Failed to load user state: {e}")
        return {}

    def _save_user_state(self, app_name: str, user_id: str, state_delta: dict) -> None:
        if not self.client or not state_delta:
            return
        try:
            db = self.client[self.db_name]
            col = db["companion_user_state"]
            col.update_one(
                {"app_name": app_name, "user_id": user_id},
                {"$set": state_delta},
                upsert=True
            )
        except Exception as e:
            logger.error(f"[MongoSessionService] Failed to save user state: {e}")

    def _get_app_state(self, app_name: str) -> dict:
        if not self.client:
            return {}
        try:
            db = self.client[self.db_name]
            col = db["companion_app_state"]
            doc = col.find_one({"app_name": app_name})
            if doc:
                doc.pop("_id", None)
                doc.pop("app_name", None)
                return doc
        except Exception as e:
            logger.error(f"[MongoSessionService] Failed to load app state: {e}")
        return {}

    def _save_app_state(self, app_name: str, state_delta: dict) -> None:
        if not self.client or not state_delta:
            return
        try:
            db = self.client[self.db_name]
            col = db["companion_app_state"]
            col.update_one(
                {"app_name": app_name},
                {"$set": state_delta},
                upsert=True
            )
        except Exception as e:
            logger.error(f"[MongoSessionService] Failed to save app state: {e}")

    def _merge_state(self, app_name: str, user_id: str, copied_session: Session) -> Session:
        """Merges persisted app and user states into session state."""
        # Merge app state
        app_state = self._get_app_state(app_name)
        for key, value in app_state.items():
            copied_session.state[State.APP_PREFIX + key] = value

        # Merge user state
        user_state = self._get_user_state(app_name, user_id)
        for key, value in user_state.items():
            copied_session.state[State.USER_PREFIX + key] = value

        return copied_session

    @override
    async def create_session(
        self,
        *,
        app_name: str,
        user_id: str,
        state: Optional[dict[str, Any]] = None,
        session_id: Optional[str] = None,
    ) -> Session:
        if not self.client:
            return await self.fallback_service.create_session(
                app_name=app_name, user_id=user_id, state=state, session_id=session_id
            )

        if session_id and await self.get_session(
            app_name=app_name, user_id=user_id, session_id=session_id
        ):
            raise AlreadyExistsError(f"Session with id {session_id} already exists.")

        state_deltas = _session_util.extract_state_delta(state)
        app_state_delta = state_deltas["app"]
        user_state_delta = state_deltas["user"]
        session_state = state_deltas["session"]

        if app_state_delta:
            self._save_app_state(app_name, app_state_delta)
        if user_state_delta:
            self._save_user_state(app_name, user_id, user_state_delta)

        session_id = (
            session_id.strip()
            if session_id and session_id.strip()
            else platform_uuid.new_uuid()
        )

        session = Session(
            app_name=app_name,
            user_id=user_id,
            id=session_id,
            state=session_state or {},
            last_update_time=platform_time.get_time(),
            events=[]
        )

        try:
            db = self.client[self.db_name]
            col = db["companion_sessions"]
            col.replace_one(
                {"id": session_id, "user_id": user_id, "app_name": app_name},
                session.model_dump(),
                upsert=True
            )
        except Exception as e:
            logger.error(f"[MongoSessionService] Failed to save new session to DB: {e}")

        # Deep copy to return clean detached session with merged states
        copied_session = Session.model_validate(session.model_dump())
        return self._merge_state(app_name, user_id, copied_session)

    @override
    async def get_session(
        self,
        *,
        app_name: str,
        user_id: str,
        session_id: str,
        config: Optional[GetSessionConfig] = None,
    ) -> Optional[Session]:
        if not self.client:
            return await self.fallback_service.get_session(
                app_name=app_name, user_id=user_id, session_id=session_id, config=config
            )

        try:
            db = self.client[self.db_name]
            col = db["companion_sessions"]
            doc = col.find_one({"id": session_id, "user_id": user_id, "app_name": app_name})
            if not doc:
                return None
            doc.pop("_id", None)
            session = Session.model_validate(doc)
        except Exception as e:
            logger.error(f"[MongoSessionService] Failed to get session from DB: {e}")
            return None

        # Apply config event limits/filters (mirrors InMemorySessionService)
        if config:
            if config.num_recent_events is not None:
                if config.num_recent_events == 0:
                    session.events = []
                else:
                    session.events = session.events[-config.num_recent_events :]
            if config.after_timestamp:
                i = len(session.events) - 1
                while i >= 0:
                    if session.events[i].timestamp < config.after_timestamp:
                        break
                    i -= 1
                if i >= 0:
                    session.events = session.events[i + 1 :]

        return self._merge_state(app_name, user_id, session)

    @override
    async def delete_session(
        self, *, app_name: str, user_id: str, session_id: str
    ) -> None:
        if not self.client:
            return await self.fallback_service.delete_session(
                app_name=app_name, user_id=user_id, session_id=session_id
            )

        try:
            db = self.client[self.db_name]
            col = db["companion_sessions"]
            col.delete_one({"id": session_id, "user_id": user_id, "app_name": app_name})
        except Exception as e:
            logger.error(f"[MongoSessionService] Failed to delete session: {e}")

    @override
    async def list_sessions(
        self, *, app_name: str, user_id: Optional[str] = None
    ) -> ListSessionsResponse:
        if not self.client:
            return await self.fallback_service.list_sessions(app_name=app_name, user_id=user_id)

        try:
            db = self.client[self.db_name]
            col = db["companion_sessions"]
            query = {"app_name": app_name}
            if user_id is not None:
                query["user_id"] = user_id

            sessions_without_events = []
            db_iter = col.find(query)
            for doc in db_iter:
                doc.pop("_id", None)
                session = Session.model_validate(doc)
                session.events = []
                session = self._merge_state(app_name, session.user_id, session)
                sessions_without_events.append(session)

            return ListSessionsResponse(sessions=sessions_without_events)
        except Exception as e:
            logger.error(f"[MongoSessionService] Failed to list sessions: {e}")
            return ListSessionsResponse(sessions=[])

    @override
    async def append_event(self, session: Session, event: Event) -> Event:
        if not self.client:
            return await self.fallback_service.append_event(session=session, event=event)

        if event.partial:
            return event

        # Process superclass modifications (temp states, state updates, append events)
        event = await super().append_event(session=session, event=event)
        session.last_update_time = event.timestamp

        # Extract and update user/app states persisted in separate collections
        if event.actions.state_delta:
            state_deltas = _session_util.extract_state_delta(event.actions.state_delta)
            app_state_delta = state_deltas["app"]
            user_state_delta = state_deltas["user"]
            if app_state_delta:
                self._save_app_state(session.app_name, app_state_delta)
            if user_state_delta:
                self._save_user_state(session.app_name, session.user_id, user_state_delta)

        # Upsert the fully serialized session model back to MongoDB
        try:
            db = self.client[self.db_name]
            col = db["companion_sessions"]
            col.replace_one(
                {"id": session.id, "user_id": session.user_id, "app_name": session.app_name},
                session.model_dump(),
                upsert=True
            )
        except Exception as e:
            logger.error(f"[MongoSessionService] Failed to append event and save session to DB: {e}")

        return event


# -------------------------------------------------------------
# 2. MongoMemoryService Implementation
# -------------------------------------------------------------
class MongoMemoryService(BaseMemoryService):
    """A persistent, MongoDB-backed memory service for ADK 2.0 with InMemory fallback."""

    @property
    def db_name(self) -> str:
        try:
            from agents.mongodb_engine import db_target_var
            return db_target_var.get()
        except ImportError:
            try:
                from mongodb_engine import db_target_var
                return db_target_var.get()
            except ImportError:
                return "fahem"

    @db_name.setter
    def db_name(self, value):
        pass

    def __init__(self, client: Optional[MongoClient] = None, database_name: str = "fahem"):
        super().__init__()
        self.client = client or get_db_client()
        self.fallback_service = InMemoryMemoryService()

    @override
    async def add_session_to_memory(self, session: Session) -> None:
        if not self.client:
            return await self.fallback_service.add_session_to_memory(session)

        try:
            db = self.client[self.db_name]
            col = db["companion_memories"]

            events_data = [
                event.model_dump()
                for event in session.events
                if event.content and event.content.parts
            ]

            col.replace_one(
                {"app_name": session.app_name, "user_id": session.user_id, "session_id": session.id},
                {
                    "app_name": session.app_name,
                    "user_id": session.user_id,
                    "session_id": session.id,
                    "events": events_data,
                    "last_update_time": platform_time.get_time()
                },
                upsert=True
            )
        except Exception as e:
            logger.error(f"[MongoMemoryService] Failed to add session to memory: {e}")

    @override
    async def add_events_to_memory(
        self,
        *,
        app_name: str,
        user_id: str,
        events: Sequence[Event],
        session_id: str | None = None,
        custom_metadata: Mapping[str, object] | None = None,
    ) -> None:
        if not self.client:
            return await self.fallback_service.add_events_to_memory(
                app_name=app_name,
                user_id=user_id,
                events=events,
                session_id=session_id,
                custom_metadata=custom_metadata
            )

        scoped_session_id = session_id or "unknown_session_id"
        events_to_add = [
            event for event in events if event.content and event.content.parts
        ]

        try:
            db = self.client[self.db_name]
            col = db["companion_memories"]

            doc = col.find_one({"app_name": app_name, "user_id": user_id, "session_id": scoped_session_id})
            existing_events_data = doc.get("events", []) if doc else []

            existing_ids = {evt.get("id") for evt in existing_events_data if evt.get("id")}
            for event in events_to_add:
                if event.id not in existing_ids:
                    existing_events_data.append(event.model_dump())
                    existing_ids.add(event.id)

            col.replace_one(
                {"app_name": app_name, "user_id": user_id, "session_id": scoped_session_id},
                {
                    "app_name": app_name,
                    "user_id": user_id,
                    "session_id": scoped_session_id,
                    "events": existing_events_data,
                    "last_update_time": platform_time.get_time()
                },
                upsert=True
            )
        except Exception as e:
            logger.error(f"[MongoMemoryService] Failed to add events to memory: {e}")

    @override
    async def add_memory(
        self,
        *,
        app_name: str,
        user_id: str,
        memories: Sequence[MemoryEntry],
        custom_metadata: Mapping[str, object] | None = None,
    ) -> None:
        """Saves custom/explicit user preferences and study profile memory facts durable in companion_facts."""
        if not self.client:
            # InMemory service does not support direct writes, so ignore or log
            logger.warning("[MongoMemoryService] Direct facts add skipped in offline/InMemory fallback mode.")
            return

        try:
            db = self.client[self.db_name]
            col = db["companion_facts"]

            for entry in memories:
                doc_id = entry.id or platform_uuid.new_uuid()
                col.replace_one(
                    {"app_name": app_name, "user_id": user_id, "id": doc_id},
                    {
                        "app_name": app_name,
                        "user_id": user_id,
                        "id": doc_id,
                        "content": entry.content.model_dump() if hasattr(entry.content, "model_dump") else entry.content,
                        "author": entry.author or "user",
                        "timestamp": entry.timestamp or str(platform_time.get_time()),
                        "custom_metadata": entry.custom_metadata or {}
                    },
                    upsert=True
                )
        except Exception as e:
            logger.error(f"[MongoMemoryService] Failed to write explicit memories: {e}")

    @override
    async def search_memory(
        self, *, app_name: str, user_id: str, query: str
    ) -> SearchMemoryResponse:
        if not self.client:
            return await self.fallback_service.search_memory(
                app_name=app_name, user_id=user_id, query=query
            )

        response = SearchMemoryResponse(memories=[])
        query_words = set(query.lower().split()) if query else set()

        try:
            db = self.client[self.db_name]
            
            # 1. Search persistent facts/preferences (durable profile facts)
            facts_col = db["companion_facts"]
            facts_iter = facts_col.find({"app_name": app_name, "user_id": user_id})
            for doc in facts_iter:
                content_dict = doc.get("content", {})
                from google.genai.types import Content
                try:
                    content_obj = Content.model_validate(content_dict)
                except Exception:
                    content_obj = content_dict

                text_content = ""
                if hasattr(content_obj, "parts") and content_obj.parts:
                    text_content = " ".join([part.text for part in content_obj.parts if part.text]).lower()

                words_in_fact = set(text_content.split())
                # If query is blank, retrieve all; otherwise matching on words
                if not query_words or any(qw in words_in_fact for qw in query_words):
                    response.memories.append(
                        MemoryEntry(
                            content=content_obj,
                            author=doc.get("author", "user"),
                            timestamp=str(doc.get("timestamp")),
                            id=doc.get("id"),
                            custom_metadata=doc.get("custom_metadata", {})
                        )
                    )

            # 2. Search persistent chat-events (working turn recollections)
            mem_col = db["companion_memories"]
            db_iter = mem_col.find({"app_name": app_name, "user_id": user_id})
            for doc in db_iter:
                events_data = doc.get("events", [])
                for evt_dict in events_data:
                    event = Event.model_validate(evt_dict)
                    if not event.content or not event.content.parts:
                        continue

                    text_content = " ".join([part.text for part in event.content.parts if part.text]).lower()
                    words_in_event = set(text_content.split())

                    if not query_words or any(qw in words_in_event for qw in query_words):
                        from google.adk.memory import _utils
                        try:
                            formatted_ts = _utils.format_timestamp(event.timestamp)
                        except Exception:
                            import datetime
                            formatted_ts = datetime.datetime.fromtimestamp(event.timestamp or 0).isoformat()

                        response.memories.append(
                            MemoryEntry(
                                content=event.content,
                                author=event.author,
                                timestamp=formatted_ts,
                                id=event.id
                            )
                        )
        except Exception as e:
            logger.error(f"[MongoMemoryService] Failed to query search_memory: {e}")

        return response
