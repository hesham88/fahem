#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import unittest
import json

class TestGF5Tokens(unittest.TestCase):
    
    def get_workspace_root(self):
        return os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

    def test_token_credit_limits_defined(self):
        """GF5: Verify token credit system limits are configured in localDbHelper."""
        root = self.get_workspace_root()
        helper_path = os.path.join(root, "web", "src", "app", "api", "localDbHelper.ts")
        self.assertTrue(os.path.exists(helper_path))
        
        with open(helper_path, "r", encoding="utf-8") as f:
            content = f.read()
            
        self.assertTrue("weeklyAllocationLimit" in content, "weeklyAllocationLimit is missing in TS DB schema config")
        self.assertTrue("monthlyAllocationLimit" in content, "monthlyAllocationLimit is missing in TS DB schema config")

    def test_local_db_has_active_token_controls(self):
        """GF5: Ensure default configuration in local_db.json is set to fail-closed with token control active."""
        root = self.get_workspace_root()
        db_path = os.path.join(root, "web", "src", "app", "api", "local_db.json")
        self.assertTrue(os.path.exists(db_path))
        
        with open(db_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            
        config = data.get("config", {})
        self.assertTrue(config.get("isTokenControlActive"), "Token control must be active by default")
        self.assertGreater(config.get("weeklyAllocationLimit", 0), 0)

if __name__ == "__main__":
    unittest.main()
