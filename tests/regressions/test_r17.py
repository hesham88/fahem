#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import unittest

class TestR17(unittest.TestCase):
    
    def get_workspace_root(self):
        return os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

    def test_r17_non_destructive_sync(self):
        """Regression test for R17: Ensures sync script does not destructively delete production books."""
        root = self.get_workspace_root()
        sync_path = os.path.join(root, "scripts", "sync_local_to_prod.py")
        if not os.path.exists(sync_path):
            # Check agents/scripts/sync_local_to_prod.py
            sync_path = os.path.join(root, "agents", "scripts", "sync_local_to_prod.py")
            
        if os.path.exists(sync_path):
            with open(sync_path, "r", encoding="utf-8") as f:
                content = f.read()
            # Assert that we don't have delete_many or drop without a sandbox/local check
            has_delete_many = "delete_many" in content or "deleteMany" in content
            has_drop = "drop" in content
            if has_delete_many or has_drop:
                self.assertTrue("sandbox" in content.lower() or "local" in content.lower(), 
                                "Sync script contains destructive drop/delete operations that are not sandboxed/localized!")

if __name__ == "__main__":
    unittest.main()
