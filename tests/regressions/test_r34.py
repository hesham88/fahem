#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import unittest

class TestR34(unittest.TestCase):
    
    def get_workspace_root(self):
        return os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

    def test_r34_deploy_parity(self):
        """Regression test for R34: Ensures next.config.ts successfully configures git SHA stamp injection."""
        root = self.get_workspace_root()
        next_config_path = os.path.join(root, "web", "next.config.ts")
        self.assertTrue(os.path.exists(next_config_path), f"next.config.ts not found at {next_config_path}")
        
        with open(next_config_path, "r", encoding="utf-8") as f:
            content = f.read()
            
        self.assertTrue("NEXT_PUBLIC_BUILD_SHA" in content, "next.config.ts does not configure NEXT_PUBLIC_BUILD_SHA injection!")
        self.assertTrue("NEXT_PUBLIC_BUILD_TIME" in content, "next.config.ts does not configure NEXT_PUBLIC_BUILD_TIME injection!")

if __name__ == "__main__":
    unittest.main()
