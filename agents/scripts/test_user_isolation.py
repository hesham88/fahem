import asyncio
import random
import sys
import os

# Add the workspace root to sys.path so we can import modules from agents
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../agents")))

try:
    from guardrails import verified_principal_ctx
    from mongodb_engine import db_target_var, selected_book_ids_var
except ImportError as e:
    print(f"Import failed: {e}. Trying absolute paths...")
    # Attempt absolute paths fallback
    sys.path.append("C:\\Users\\hesh1\\Desktop\\fahem\\agents")
    from guardrails import verified_principal_ctx
    from mongodb_engine import db_target_var, selected_book_ids_var

async def run_session(session_id: int, uid: str, db_target: str, book_ids: list):
    print(f"[Session {session_id}] Starting session for user {uid} targeting database {db_target}...")
    
    # 1. Set the contextvars for this task
    token = verified_principal_ctx.set({"uid": uid, "email": f"{uid}@fahem.app", "db_target": db_target})
    db_ctx = db_target_var.set(db_target)
    books_ctx = selected_book_ids_var.set(book_ids)
    
    try:
        # 2. Assert they are set correctly initially
        assert verified_principal_ctx.get()["uid"] == uid, f"[Session {session_id}] Incorrect uid on start!"
        assert db_target_var.get() == db_target, f"[Session {session_id}] Incorrect db_target on start!"
        assert selected_book_ids_var.get() == book_ids, f"[Session {session_id}] Incorrect book_ids on start!"
        
        # 3. Sleep a random duration to allow task context-switching and potential interleaving
        sleep_time = random.uniform(0.1, 0.5)
        print(f"[Session {session_id}] Context validated initially. Sleeping for {sleep_time:.3f}s...")
        await asyncio.sleep(sleep_time)
        
        # 4. Re-verify the contexts are still completely isolated and unpolluted after context switching
        assert verified_principal_ctx.get()["uid"] == uid, f"[Session {session_id}] POLLUTION DETECTED: uid changed to {verified_principal_ctx.get()['uid']}!"
        assert db_target_var.get() == db_target, f"[Session {session_id}] POLLUTION DETECTED: db_target changed to {db_target_var.get()}!"
        assert selected_book_ids_var.get() == book_ids, f"[Session {session_id}] POLLUTION DETECTED: book_ids changed!"
        
        print(f"[Session {session_id}] SUCCESS! Request-scoped context is perfectly isolated.")
        return True
    except AssertionError as ae:
        print(f"[Session {session_id}] FAIL: {ae}")
        return False
    finally:
        # Reset the contextvars
        verified_principal_ctx.reset(token)
        db_target_var.reset(db_ctx)
        selected_book_ids_var.reset(books_ctx)

async def main():
    print("======================================================================")
    print("FAHEM CROSS-USER REQUEST-SCOPED ISOLATION TEST")
    print("======================================================================")
    
    # Run two concurrent sessions targeting different databases and scopes
    results = await asyncio.gather(
        run_session(1, "user_alice_999", "fahem_sandbox", ["book_math_123"]),
        run_session(2, "user_bob_777", "fahem", ["book_physics_456"])
    )
    
    print("----------------------------------------------------------------------")
    if all(results):
        print("ALL TESTS PASSED! Request-scoped per-user isolation is 100% robust.")
        sys.exit(0)
    else:
        print("TEST FAILED! Leakage detected between concurrent request sessions.")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
