#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import unittest

class TestGF6Notifications(unittest.TestCase):
    
    def get_workspace_root(self):
        return os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

    def test_notification_helper_interface(self):
        """GF6: Verify that the notification helper exports the required creation interface with recipient scoping."""
        root = self.get_workspace_root()
        helper_path = os.path.join(root, "web", "src", "app", "api", "notifications", "helper.ts")
        self.assertTrue(os.path.exists(helper_path))
        
        with open(helper_path, "r", encoding="utf-8") as f:
            content = f.read()
            
        self.assertTrue("export async function createNotification" in content, "createNotification function is missing")
        self.assertTrue("recipient_uid" in content, "recipient_uid is missing in notification helper parameters")
        self.assertTrue("payload" in content, "payload field is missing in notification helper")

if __name__ == "__main__":
    unittest.main()
