import os
import sys
import time

# Ensure we can import from scripts
sys.path.append(os.path.abspath("scripts"))

try:
    from reexec_dbox import enter_demo, _get
except ImportError as e:
    print("Failed to import from reexec_dbox:", e)
    sys.exit(1)

print("Starting performance diagnostics...")

t0 = time.time()
tok, err = enter_demo("student")
if not tok:
    print(f"[-] enter_demo failed after {time.time() - t0:.2f}s with error: {err}")
    sys.exit(1)
print(f"[+] enter_demo succeeded in {time.time() - t0:.2f}s.")

# 1. Measure /api/knowledge
t1 = time.time()
try:
    print("[-] Requesting /api/knowledge...")
    k_res = _get("/api/knowledge", tok, timeout=20)
    print(f"[+] /api/knowledge succeeded in {time.time() - t1:.2f}s. Response length: {len(k_res)}")
except Exception as e:
    print(f"[-] /api/knowledge failed after {time.time() - t1:.2f}s with exception: {e}")

# 2. Measure /api/books
t2 = time.time()
try:
    print("[-] Requesting /api/books...")
    b_res = _get("/api/books", tok, timeout=20)
    print(f"[+] /api/books succeeded in {time.time() - t2:.2f}s. Response length: {len(b_res)}")
except Exception as e:
    print(f"[-] /api/books failed after {time.time() - t2:.2f}s with exception: {e}")
