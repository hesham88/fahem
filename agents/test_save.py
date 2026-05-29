import asyncio
import sys
import os

# Add current folder to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

async def main():
    from get_metadata import get_user_profile, save_user_profile
    print("Testing get_user_profile...")
    profile = await get_user_profile("test_user_id_123")
    print("Current test profile:", profile)
    
    print("\nTesting save_user_profile...")
    success = await save_user_profile("test_user_id_123", {
        "name": "Test User",
        "onboardingCompleted": True,
        "email": "test@example.com"
    })
    print("Save status:", success)
    
    print("\nRe-fetching test profile...")
    profile2 = await get_user_profile("test_user_id_123")
    print("Updated test profile:", profile2)

if __name__ == "__main__":
    asyncio.run(main())
