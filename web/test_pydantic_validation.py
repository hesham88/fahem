import sys
import os

# Add agents directory to path
agents_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "agents"))
sys.path.insert(0, agents_dir)

try:
    from mongodb_engine import ChatSessionSchema, ChatMessageSchema
    print("Successfully imported schemas!")
    
    doc = {
        "sessionId": "onboarding_session_test_user_id_999",
        "userId": "test_user_id_999",
        "userEmail": "hesham1988@gmail.com",
        "title": "Onboarding Chat Session Test",
        "messages": [
            {
                "senderId": "",
                "senderName": "",
                "recipientId": "",
                "content": "hello, I am student",
                "timestamp": "2026-05-31T01:15:31.000Z",
                "isGroup": False
            }
        ],
        "updatedAt": "2026-05-31T01:15:31.000Z"
    }
    
    print("Attempting to validate doc...")
    session = ChatSessionSchema(**doc)
    print("Validation Succeeded!")
    print("Dumped:", session.model_dump())
except Exception as err:
    print("Validation Failed with error:", err)
