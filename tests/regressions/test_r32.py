#!/usr/bin/env python
# -*- coding: utf-8 -*-

import unittest
import os
import re

class TestR32SeedToProd(unittest.TestCase):
    def get_workspace_root(self):
        return os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

    def test_seeding_targets_sandbox_only(self):
        """
        R32: Verify that any seeding or test user database operations strictly target 'fahem_sandbox'.
        """
        root = self.get_workspace_root()
        scripts_dir = os.path.join(root, "scripts")
        
        if not os.path.exists(scripts_dir):
            return
            
        seed_pattern = re.compile(r"(seed|insert_many|insert_one|insert)", re.IGNORECASE)
        prod_db_pattern = re.compile(r"['\"]fahem['\"]", re.IGNORECASE)
        
        for filename in os.listdir(scripts_dir):
            # Focus on seeding, backfilling or syncing scripts (excluding async/crawler scripts)
            if ("seed" in filename.lower() or "sync" in filename.lower()) and "async" not in filename.lower():
                if filename.endswith(".py") and filename != "guard_nofakes.py":
                    file_path = os.path.join(scripts_dir, filename)
                    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                        content = f.read()
                    
                    if seed_pattern.search(content) and prod_db_pattern.search(content):
                        # Seeding script referencing "fahem" instead of "fahem_sandbox" is an error
                        if "fahem_sandbox" not in content:
                            self.fail(f"R32 Violation in {filename}: Seeding operation found targeting production database 'fahem' rather than 'fahem_sandbox'.")

    def test_seed_db_endpoint_in_services(self):
        """
        R32: Verify the /admin/seed-db endpoint in services.py targets 'fahem_sandbox'.
        """
        root = self.get_workspace_root()
        services_path = os.path.join(root, "agents", "services.py")
        if not os.path.exists(services_path):
            return
            
        with open(services_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
            
        seed_db_match = re.search(r"def\s+seed_db\s*\(", content)
        if seed_db_match:
            start_pos = seed_db_match.start()
            sub_content = content[start_pos : start_pos + 4000]
            # Ensure it asserts/targets fahem_sandbox
            self.assertTrue("fahem_sandbox" in sub_content, 
                            "The seed_db endpoint in services.py appears to be seeding into a non-sandbox database!")

if __name__ == "__main__":
    unittest.main()
