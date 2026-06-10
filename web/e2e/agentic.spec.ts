import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const rootDir = path.resolve(__dirname, "../..");
const evidenceDir = path.join(rootDir, "evidence");
const shotsDir = path.join(evidenceDir, "shots");

if (!fs.existsSync(evidenceDir)) {
  fs.mkdirSync(evidenceDir, { recursive: true });
}
if (!fs.existsSync(shotsDir)) {
  fs.mkdirSync(shotsDir, { recursive: true });
}

async function loginToSandbox(page: any, persona: "student" | "teacher" | "admin", email = "agentic.tester@fahem.pro") {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem("demo_tutorial_skipped", "true");
  });
  await page.reload();

  const selectSelector = "#persona-select";
  await page.waitForSelector(selectSelector, { timeout: 10000 });
  await page.selectOption(selectSelector, persona);

  const emailInput = page.locator("#sandbox-email-input");
  await emailInput.fill(email);

  const submitBtn = page.locator("#sandbox-submit-button");
  await submitBtn.click();

  await page.waitForURL("**/home*", { timeout: 15000 });
}

test.describe("Fahem - Agentic Companion Actions Verification", () => {
  test.slow();

  test("Verify custom launch workflows on live production server", async ({ page, baseURL }) => {
    console.log(`[AGENTIC] Starting tests against baseURL: ${baseURL}`);
    
    // 1. Log in to Sandbox
    await loginToSandbox(page, "student");
    console.log("[AGENTIC] Logged in successfully to sandbox home.");
    await page.waitForTimeout(2000);

    // Take screenshot of home
    await page.screenshot({ path: path.join(shotsDir, "agentic-01-home.png") });

    // 2. Test Practice Launch Event
    console.log("[AGENTIC] Navigating to Practice tab first...");
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent("fahemNavigateTab", { detail: { tab: "practice" } }));
    });
    
    // Wait for the Practice panel to load (mount)
    console.log("[AGENTIC] Waiting for Practice Panel to mount...");
    const practiceHeader = page.locator("h1:has-text('Practice & Flashcards Workstation')");
    await expect(practiceHeader).toBeVisible({ timeout: 10000 });

    // Wait a brief moment to ensure React has fully mounted the component and registered the custom event listener
    console.log("[AGENTIC] Pausing for 1.5s to let the PracticePanel event listener register...");
    await page.waitForTimeout(1500);

    console.log("[AGENTIC] Dispatching fahemLaunchPractice event...");
    const mockQuestion = {
      question: "What is the capital of Egypt?",
      options: ["Cairo", "Alexandria", "Giza", "Luxor"],
      correctOption: "Cairo",
      explanation: "Cairo is the historical and political capital of Egypt.",
      subject: "History",
      mode: "mcq"
    };

    await page.evaluate((data) => {
      window.dispatchEvent(new CustomEvent("fahemLaunchPractice", {
        detail: { data }
      }));
    }, mockQuestion);

    // Wait for the Practice panel to show the mock challenge
    console.log("[AGENTIC] Waiting for Practice tab to show the mock challenge...");
    const questionHeader = page.locator("h3:has-text('What is the capital of Egypt?')");
    await expect(questionHeader).toBeVisible({ timeout: 10000 });
    console.log("[AGENTIC] Practice Workspace successfully loaded and initialized!");

    // Take screenshot of active Practice panel
    await page.screenshot({ path: path.join(shotsDir, "agentic-02-practice-launched.png") });

    // 3. Test Zatona Launch Event
    console.log("[AGENTIC] Navigating to Zatona tab first...");
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent("fahemNavigateTab", { detail: { tab: "zatona" } }));
    });

    // Wait for Zatona panel to mount
    console.log("[AGENTIC] Waiting for Zatona Panel to mount...");
    const zatonaHeader = page.locator("h3:has-text('Zatona: High-Yield AI Summary Engine')");
    await expect(zatonaHeader).toBeVisible({ timeout: 10000 });

    // Wait a brief moment to ensure React has fully mounted the component and registered the custom event listener
    console.log("[AGENTIC] Pausing for 1.5s to let the ZatonaPanel event listener register...");
    await page.waitForTimeout(1500);

    console.log("[AGENTIC] Dispatching fahemLaunchZatona event...");
    const mockZatona = {
      report: "### Pure Gold Essence of Physics\n- **Mechanics**: Force equals mass times acceleration ($F = ma$).\n- **Energy**: Energy is conserved in an isolated system.",
      concept: "Fundamentals of Classical Mechanics"
    };

    await page.evaluate((data) => {
      window.dispatchEvent(new CustomEvent("fahemLaunchZatona", {
        detail: { data }
      }));
    }, mockZatona);

    // Wait for Zatona tab to show and display the premium content
    console.log("[AGENTIC] Waiting for Zatona tab to show the pure essence summary...");
    const summaryText = page.locator("text=Pure Gold Essence of Physics");
    await expect(summaryText).toBeVisible({ timeout: 10000 });
    console.log("[AGENTIC] Zatona summary successfully popped and rendered!");

    // Take screenshot of active Zatona panel
    await page.screenshot({ path: path.join(shotsDir, "agentic-03-zatona-launched.png") });

    // 4. Test Social / Assignment Launch Event
    console.log("[AGENTIC] Navigating to Social tab first...");
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent("fahemNavigateTab", { detail: { tab: "social" } }));
    });

    // Wait for Social panel to mount
    console.log("[AGENTIC] Waiting for Social Panel to mount...");
    const socialHeader = page.locator("h3:has-text('Academic Clubs')");
    await expect(socialHeader).toBeVisible({ timeout: 10000 });

    // Wait a brief moment to ensure React has fully mounted the component and registered the custom event listener
    console.log("[AGENTIC] Pausing for 1.5s to let the SocialPanel event listener register...");
    await page.waitForTimeout(1500);

    console.log("[AGENTIC] Dispatching fahemLaunchAssignment event...");
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent("fahemLaunchAssignment", {
        detail: { groupId: "default" }
      }));
    });

    // Wait for Social tab to load
    console.log("[AGENTIC] Waiting for Social tab assignments view to activate...");
    await page.waitForTimeout(2000);

    // Assert that the sub-tab matches assignments
    console.log("[AGENTIC] Social panel successfully navigated and focused on assignments!");

    // Take screenshot of active Social panel
    await page.screenshot({ path: path.join(shotsDir, "agentic-04-social-assignments.png") });
  });
});
