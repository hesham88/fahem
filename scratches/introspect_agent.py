import sys
import os
import inspect

sys.path.append(r"C:\Users\hesh1\Desktop\fahem\agents")

# Preload local config
try:
    with open(r"C:\Users\hesh1\Desktop\fahem\web\.env.local", "r") as f:
        for line in f:
            if "=" in line and not line.strip().startswith("#"):
                key, val = line.split("=", 1)
                key = key.strip()
                val = val.strip().strip('"').strip("'")
                if key not in os.environ:
                    os.environ[key] = val
except Exception:
    pass

from google.adk import Agent
from google.adk.workflow import Workflow, Edge, START, FunctionNode

print("=== Agent Inspection ===")
print("Agent bases:", Agent.__bases__)
print("Agent methods:", [x for x in dir(Agent) if not x.startswith('_')])
try:
    print("Agent init signature:", inspect.signature(Agent.__init__))
except Exception as e:
    print("Agent init signature failed:", e)

print("\n=== Workflow Inspection ===")
print("Workflow bases:", Workflow.__bases__)
print("Workflow methods:", [x for x in dir(Workflow) if not x.startswith('_')])
try:
    print("Workflow init signature:", inspect.signature(Workflow.__init__))
except Exception as e:
    print("Workflow init signature failed:", e)
