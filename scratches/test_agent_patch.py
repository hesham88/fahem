import sys
import os

# Add agents dir to path
agents_dir = r"C:\Users\hesh1\Desktop\fahem\agents"
sys.path.insert(0, agents_dir)

try:
    from google.adk.cli.utils import agent_loader
    print("AgentLoader imported successfully.")
    
    # Let's print original perform_load
    loader = agent_loader.AgentLoader(agents_dir=agents_dir)
    print("Loader created.")
    
    # Apply monkeypatch
    original_perform_load = agent_loader.AgentLoader._perform_load
    def patched_perform_load(self, agent_name: str):
        print(f"[PATCH] Intercepted _perform_load for: {agent_name}")
        if agent_name == "fahem":
            print("[PATCH] Mapping 'fahem' to 'app'")
            try:
                return original_perform_load(self, "app")
            except Exception as e:
                print(f"[PATCH] Failed to load 'app': {e}")
        return original_perform_load(self, agent_name)
        
    agent_loader.AgentLoader._perform_load = patched_perform_load
    print("Monkeypatch applied.")
    
    # Try loading "fahem"
    agent = loader.load_agent("fahem")
    print("Loaded agent successfully:", agent)
    
except Exception as e:
    import traceback
    traceback.print_exc()
