#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import unittest
import json

class TestGF9DataIntegrity(unittest.TestCase):
    
    def get_workspace_root(self):
        return os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

    def test_local_db_data_integrity(self):
        """GF9: Verify data integrity of local database JSON file (subjects, books, curricula, libraries)."""
        root = self.get_workspace_root()
        db_path = os.path.join(root, "web", "src", "app", "api", "local_db.json")
        self.assertTrue(os.path.exists(db_path), f"local_db.json not found at {db_path}")
        
        with open(db_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            
        # Ensure collections exist and are not empty (ES.6.1a and BG.9)
        self.assertIn("subjects", data)
        self.assertIn("books", data)
        
        subjects = data["subjects"]
        books = data["books"]
        
        self.assertGreater(len(subjects), 0, "No subjects found in local_db.json")
        self.assertGreater(len(books), 0, "No books found in local_db.json")

        # Let's verify grouping constraints
        seen_slugs = set()
        for s in subjects:
            self.assertIn("_id", s)
            slug = s.get("slug", s.get("_id"))
            curr_id = s.get("curriculum_id", "default")
            key = (curr_id, slug)
            # Ensure unique curriculum_id + slug grouping
            self.assertNotIn(key, seen_slugs, f"Duplicate subject found for curriculum_id {curr_id} and slug {slug}")
            seen_slugs.add(key)

if __name__ == "__main__":
    unittest.main()
