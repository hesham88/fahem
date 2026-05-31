import sys
import os
import inspect

sys.path.append(r"C:\Users\hesh1\Desktop\fahem\agents")

from google.adk import Agent
from google.adk.workflow import Workflow

print("=== Agent.run_async signature ===")
try:
    print(inspect.signature(Agent.run_async))
except Exception as e:
    print("Failed:", e)

print("\n=== Agent.run signature ===")
try:
    print(inspect.signature(Agent.run))
except Exception as e:
    print("Failed:", e)

print("\n=== Workflow.run signature ===")
try:
    print(inspect.signature(Workflow.run))
except Exception as e:
    print("Failed:", e)
