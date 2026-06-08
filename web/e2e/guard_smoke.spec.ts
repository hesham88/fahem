import { test, expect } from "@playwright/test";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

// Ensure evidence directories exist
const evidenceDir = path.resolve(__dirname, "../../evidence");
const shotsDir = path.join(evidenceDir, "shots");
if (!fs.existsSync(evidenceDir)) {
  fs.mkdirSync(evidenceDir, { recursive: true });
}
if (!fs.existsSync(shotsDir)) {
  fs.mkdirSync(shotsDir, { recursive: true });
}

// Get current expected git SHA from HEAD
let expectedSha = "unknown";
try {
  expectedSha = execSync("git rev-parse HEAD").toString().trim();
} catch (e) {
  console.warn("Could not retrieve local git SHA:", e);
}

test.describe("Bible Guard - Smoke Tests", () => {
  
  test("D0: Version Parity - Fetch /api/version and assert SHA matches git HEAD", async ({ request, baseURL }) => {
    console.log(`[D0] Checking version parity on base URL: ${baseURL}`);
    const response = await request.get("/api/version");
    expect(response.ok()).toBe(true);
    
    const data = await response.json();
    console.log(`[D0] Live version endpoint returned:`, data);
    
    expect(data).toHaveProperty("sha");
    expect(data).toHaveProperty("builtAt");
    
    if (expectedSha !== "unknown") {
      console.log(`[D0] Checking if live SHA ${data.sha} matches local expected SHA ${expectedSha}`);
      // For local dev, we might accept mismatches or print a warning, but for full deploy-parity (G8) we enforce it
      if (process.env.ENFORCE_PARITY === "true" || baseURL === "https://fahem.pro") {
        expect(data.sha).toBe(expectedSha);
      } else {
        if (data.sha !== expectedSha) {
          console.warn(`[D0][WARN] SHA mismatch (non-blocking for local): Live=${data.sha} Local=${expectedSha}`);
        }
      }
    }
  });

  test("D1: Sandbox Entry - Access public Tier-0 sandbox and verify no 'not eligible' banner", async ({ page, baseURL }) => {
    console.log(`[D1] Navigating to homepage: ${baseURL}`);
    await page.goto("/");
    
    // Allow page to settle and hydrate
    await page.waitForTimeout(2000);
    
    // Take landing page screenshot
    const landingShotPath = path.join(shotsDir, "landing.png");
    await page.screenshot({ path: landingShotPath });
    console.log(`[D1] Saved landing page screenshot to ${landingShotPath}`);

    // Fill out sandbox form
    // Locate the select dropdown for persona
    const selectSelector = "#persona-select";
    if (await page.locator(selectSelector).count() > 0) {
      await page.selectOption(selectSelector, "student");
      console.log("[D1] Selected Student persona");
    }
    
    // Locate the optional email input
    const emailSelector = "#sandbox-email-input";
    if (await page.locator(emailSelector).count() > 0) {
      await page.fill(emailSelector, "evaluation.judge@fahem.pro");
      console.log("[D1] Filled evaluation email");
    }
    
    // Click 'Enter Sandbox' or submit form
    const submitBtn = page.locator("#sandbox-submit-button");
    if (await submitBtn.count() > 0) {
      console.log("[D1] Clicking Enter Sandbox button...");
      await Promise.all([
        page.waitForNavigation({ timeout: 15000 }).catch(() => {
          console.log("[D1] Navigation timed out or handled client-side.");
        }),
        submitBtn.click()
      ]);
    } else {
      // Try finding by text or class
      const enterSandboxBtn = page.locator("button:has-text('Sandbox'), button:has-text('التجريبية')");
      if (await enterSandboxBtn.count() > 0) {
        console.log("[D1] Found enter button by text. Clicking...");
        await Promise.all([
          page.waitForNavigation({ timeout: 15000 }).catch(() => {}),
          enterSandboxBtn.first().click()
        ]);
      }
    }
    
    // Wait for redirect to home
    await page.waitForTimeout(3000);
    
    // Check that we don't have "not eligible" banners or error messages
    const bodyText = await page.innerText("body");
    expect(bodyText.toLowerCase()).not.toContain("not eligible");
    expect(bodyText).not.toContain("غير مؤهل");
    
    // Take sandbox entry screenshot
    const sandboxShotPath = path.join(shotsDir, "D1-sandbox-entry.png");
    await page.screenshot({ path: sandboxShotPath });
    console.log(`[D1] Saved sandbox entry screenshot to ${sandboxShotPath}`);
    
    // Confirm we are on /home or /en/home or /ar/home
    const currentUrl = page.url();
    console.log(`[D1] Current URL after entering sandbox: ${currentUrl}`);
    expect(currentUrl).toContain("/home");
  });
});
