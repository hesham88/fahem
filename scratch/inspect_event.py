import sys
import os

# Add agents directory to sys.path
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "agents"))

from google.adk import Event
from google.adk.sessions import Session

def main():
    print("--- Event Fields ---")
    for name, field in Event.model_fields.items():
        print(f"Field: {name} | Type: {field.annotation}")
        
    print("\n--- Session Fields ---")
    for name, field in Session.model_fields.items():
        print(f"Field: {name} | Type: {field.annotation}")

if __name__ == "__main__":
    main()
