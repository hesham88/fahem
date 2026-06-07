import sys
import os
import json
from google.adk.sessions import Session
from google.adk import Event

# Reconfigure stdout to use utf-8 to avoid encoding errors
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

print("Testing model serialization...")

try:
    # Create a dummy session
    session = Session(
        id="test_session_123",
        app_name="fahem",
        user_id="test_user_456",
        state={"focus": "math"},
        events=[],
        last_update_time=1234567.89
    )
    
    # Dump to dict
    data = session.model_dump()
    print("Dumped dict keys:", list(data.keys()))
    
    # Load from dict
    loaded = Session.model_validate(data)
    print("Successfully validated and loaded back! ID:", loaded.id)
    
    # Try serialize to JSON string and back
    json_str = json.dumps(data)
    loaded_json = json.loads(json_str)
    loaded_v2 = Session.model_validate(loaded_json)
    print("Successfully validated from JSON! ID:", loaded_v2.id)

except Exception as e:
    print("Error during serialization test:", e)
