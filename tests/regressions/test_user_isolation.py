#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import unittest

class TestGF4UserIsolation(unittest.TestCase):
    
    def get_workspace_root(self):
        return os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

    def test_async_local_storage_present(self):
        """GF4: Verify that AsyncLocalStorage is configured for multi-tenant / multi-session db context."""
        root = self.get_workspace_root()
        helper_path = os.path.join(root, "web", "src", "app", "api", "localDbHelper.ts")
        self.assertTrue(os.path.exists(helper_path), f"localDbHelper.ts not found at {helper_path}")
        
        with open(helper_path, "r", encoding="utf-8") as f:
            content = f.read()
            
        self.assertTrue("AsyncLocalStorage" in content, "AsyncLocalStorage not found in localDbHelper.ts")
        self.assertTrue("dbContextStorage" in content, "dbContextStorage not found in localDbHelper.ts")
        self.assertTrue("getDbTarget" in content, "getDbTarget function not found in localDbHelper.ts")

    def test_demo_session_targets_sandbox(self):
        """GF4: Verify that the DB target maps to local_db_sandbox.json when dbTarget is 'fahem_sandbox'."""
        root = self.get_workspace_root()
        helper_path = os.path.join(root, "web", "src", "app", "api", "localDbHelper.ts")
        
        with open(helper_path, "r", encoding="utf-8") as f:
            content = f.read()
            
        self.assertTrue("local_db_sandbox.json" in content, "local_db_sandbox.json not target of sandbox db context")

if __name__ == "__main__":
    unittest.main()
