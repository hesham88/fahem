# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: agentic.spec.ts >> Fahem - Agentic Companion Actions Verification >> Verify custom launch workflows on live production server
- Location: e2e\agentic.spec.ts:43:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('h3:has-text(\'What is the capital of Egypt?\')')
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for locator('h3:has-text(\'What is the capital of Egypt?\')')

```

```yaml
- alert
- complementary:
  - img "Fahem Logo"
  - text: Fahem
  - navigation:
    - text: ACADEMIC SPACE
    - button "Knowledge Library":
      - img
      - text: Knowledge Library
    - button "Course Subjects":
      - img
      - text: Course Subjects
    - button "Practice Workstation":
      - img
      - text: Practice Workstation
    - button "Study Planner":
      - img
      - text: Study Planner
    - button "Weekly Schedule":
      - img
      - text: Weekly Schedule
    - button "Zatona AI Research":
      - img
      - text: Zatona AI Research
    - button "Insights & Achievements":
      - img
      - text: Insights & Achievements
    - text: COMMUNITY & CONTROL
    - button "Social Network":
      - img
      - text: Social Network
    - button "My Public Profile":
      - img
      - text: My Public Profile
    - button "Account Settings":
      - img
      - text: Account Settings
    - link "GitHub":
      - /url: https://github.com/hesham88/fahem
      - img
      - text: GitHub
  - img
  - text: Language
  - button "🇺🇸 English":
    - text: 🇺🇸 English
    - img
  - text: Theme
  - button "Toggle Theme":
    - img
  - img "Avatar"
  - text: ⭐ DEMO (Sandbox) ⭐ JUDGE agentic.tester@fahem.pro 🧠 CLT Budget 42 / 100 Usage Quick-Snap 42%
  - button "Sign Out":
    - img
    - text: Sign Out
- main:
  - heading "Practice & Flashcards Workstation" [level=1]
  - paragraph: Sharpen your knowledge with dynamic question banks and adaptive digital flashcards.
  - button "Toggle notifications":
    - img
  - text: Active Academic Space Active Recall Practice Workstations
  - combobox:
    - option "Algebra & Inversion Workstation" [selected]
    - option "Science Active Recall Challenge"
  - button "➕ New Space"
  - button "✏️ Edit"
  - button "🗑️ Delete"
  - img
  - heading "Active Recall Quest Setup" [level=3]
  - text: 1. Select Practice Scope
  - button "Umbrella Subject"
  - button "Specific Textbook"
  - combobox:
    - option "Mathematics" [selected]
    - option "Science & Physics"
    - option "Arabic Linguistics"
    - option "General Knowledge"
  - text: 2. Choose Assessment Mode
  - button "🎯 MCQs"
  - button "✍️ Written Recall"
  - button "🎙️ Oral Recitation"
  - text: "3. Session Format & Arena:"
  - button "Infinite Practice ♾️"
  - button "Quiz Assessment Arena ⏱️"
  - button "🚀 Launch Active Recall Quest"
  - text: 🏆 Tutor Class Level
  - heading "Level 3" [level=2]
  - text: "35 / 100 XP Next Level 🔥 Combo Streak: 4"
  - heading "⏱️ Live Session Log" [level=4]
  - text: "Favorite Mode:"
  - strong: MCQ
  - text: "Total Solved:"
  - strong: "1"
  - heading "🎯 Student Vulnerability Heatmap" [level=4]
  - button "All"
  - button "Math"
  - button "Science"
  - button "Arabic"
  - button "General"
  - text: Matrices Unattempted Determinants Unattempted Cramer's Rule Unattempted Probability Unattempted Statistics Unattempted Linear Algebra Unattempted Ideal Gas Law Unattempted Boyle's Law Unattempted Charles's Law Unattempted Kinetic Theory Unattempted Thermodynamics Unattempted Internal Energy Unattempted Sentence Parsing Unattempted Arabic Grammar Unattempted Poetry Meters Unattempted Verb States Unattempted Ancient Civilizations Unattempted Modern Era Unattempted General Knowledge Unattempted
  - heading "📜 Practice Sessions History & Challenges" [level=3]
  - paragraph: View your past questions, answers, and full evaluations with tutor-provided explanations
  - button "🔄..."
  - paragraph: Loading practice history...
  - heading "⏱️ Academic Spaces Activity & Audit Log" [level=4]
  - text: Initialized Academic Spaces Hub 11:51:45 PM
  - link "Terms of Service":
    - /url: /en/terms
    - img
    - text: Terms of Service
  - link "Privacy Policy":
    - /url: /en/privacy
    - img
    - text: Privacy Policy
  - link "Submit Report":
    - /url: /en/report
    - img
    - text: Submit Report
  - link "X":
    - /url: https://x.com/fahempro
    - img "X"
  - link "Instagram":
    - /url: https://www.instagram.com/fahem.pro/
    - img "Instagram"
  - link "Facebook":
    - /url: https://www.facebook.com/ai.fahem.pro/
    - img "Facebook"
  - link "Email":
    - /url: mailto:contact@fahem.pro
    - img "Email"
  - paragraph:
    - text: Made with love ❤️ All rights reserved to
    - link "Asdaa":
      - /url: https://asdaa.co
    - text: and Fahem Team
- button "🎓"
```

# Test source

```ts
  1   | import { test, expect } from "@playwright/test";
  2   | import * as fs from "fs";
  3   | import * as path from "path";
  4   | 
  5   | const rootDir = path.resolve(__dirname, "../..");
  6   | const evidenceDir = path.join(rootDir, "evidence");
  7   | const shotsDir = path.join(evidenceDir, "shots");
  8   | 
  9   | if (!fs.existsSync(evidenceDir)) {
  10  |   fs.mkdirSync(evidenceDir, { recursive: true });
  11  | }
  12  | if (!fs.existsSync(shotsDir)) {
  13  |   fs.mkdirSync(shotsDir, { recursive: true });
  14  | }
  15  | 
  16  | async function loginToSandbox(page: any, persona: "student" | "teacher" | "admin", email = "agentic.tester@fahem.pro") {
  17  |   await page.setViewportSize({ width: 1280, height: 800 });
  18  |   await page.goto("/");
  19  |   
  20  |   await page.evaluate(() => {
  21  |     localStorage.clear();
  22  |     sessionStorage.clear();
  23  |     localStorage.setItem("demo_tutorial_skipped", "true");
  24  |   });
  25  |   await page.reload();
  26  | 
  27  |   const selectSelector = "#persona-select";
  28  |   await page.waitForSelector(selectSelector, { timeout: 10000 });
  29  |   await page.selectOption(selectSelector, persona);
  30  | 
  31  |   const emailInput = page.locator("#sandbox-email-input");
  32  |   await emailInput.fill(email);
  33  | 
  34  |   const submitBtn = page.locator("#sandbox-submit-button");
  35  |   await submitBtn.click();
  36  | 
  37  |   await page.waitForURL("**/home*", { timeout: 15000 });
  38  | }
  39  | 
  40  | test.describe("Fahem - Agentic Companion Actions Verification", () => {
  41  |   test.slow();
  42  | 
  43  |   test("Verify custom launch workflows on live production server", async ({ page, baseURL }) => {
  44  |     console.log(`[AGENTIC] Starting tests against baseURL: ${baseURL}`);
  45  |     
  46  |     // 1. Log in to Sandbox
  47  |     await loginToSandbox(page, "student");
  48  |     console.log("[AGENTIC] Logged in successfully to sandbox home.");
  49  |     await page.waitForTimeout(2000);
  50  | 
  51  |     // Take screenshot of home
  52  |     await page.screenshot({ path: path.join(shotsDir, "agentic-01-home.png") });
  53  | 
  54  |     // 2. Test Practice Launch Event
  55  |     console.log("[AGENTIC] Navigating to Practice tab first...");
  56  |     await page.evaluate(() => {
  57  |       window.dispatchEvent(new CustomEvent("fahemNavigateTab", { detail: { tab: "practice" } }));
  58  |     });
  59  |     
  60  |     // Wait for the Practice panel to load (mount)
  61  |     console.log("[AGENTIC] Waiting for Practice Panel to mount...");
  62  |     const practiceHeader = page.locator("h1:has-text('Practice & Flashcards Workstation')");
  63  |     await expect(practiceHeader).toBeVisible({ timeout: 10000 });
  64  | 
  65  |     // Wait a brief moment to ensure React has fully mounted the component and registered the custom event listener
  66  |     console.log("[AGENTIC] Pausing for 1.5s to let the PracticePanel event listener register...");
  67  |     await page.waitForTimeout(1500);
  68  | 
  69  |     console.log("[AGENTIC] Dispatching fahemLaunchPractice event...");
  70  |     const mockQuestion = {
  71  |       question: "What is the capital of Egypt?",
  72  |       options: ["Cairo", "Alexandria", "Giza", "Luxor"],
  73  |       correctOption: "Cairo",
  74  |       explanation: "Cairo is the historical and political capital of Egypt.",
  75  |       subject: "History",
  76  |       mode: "mcq"
  77  |     };
  78  | 
  79  |     await page.evaluate((data) => {
  80  |       window.dispatchEvent(new CustomEvent("fahemLaunchPractice", {
  81  |         detail: { data }
  82  |       }));
  83  |     }, mockQuestion);
  84  | 
  85  |     // Wait for the Practice panel to show the mock challenge
  86  |     console.log("[AGENTIC] Waiting for Practice tab to show the mock challenge...");
  87  |     const questionHeader = page.locator("h3:has-text('What is the capital of Egypt?')");
> 88  |     await expect(questionHeader).toBeVisible({ timeout: 10000 });
      |                                  ^ Error: expect(locator).toBeVisible() failed
  89  |     console.log("[AGENTIC] Practice Workspace successfully loaded and initialized!");
  90  | 
  91  |     // Take screenshot of active Practice panel
  92  |     await page.screenshot({ path: path.join(shotsDir, "agentic-02-practice-launched.png") });
  93  | 
  94  |     // 3. Test Zatona Launch Event
  95  |     console.log("[AGENTIC] Navigating to Zatona tab first...");
  96  |     await page.evaluate(() => {
  97  |       window.dispatchEvent(new CustomEvent("fahemNavigateTab", { detail: { tab: "zatona" } }));
  98  |     });
  99  | 
  100 |     // Wait for Zatona panel to mount
  101 |     console.log("[AGENTIC] Waiting for Zatona Panel to mount...");
  102 |     const zatonaHeader = page.locator("h3:has-text('Zatona: High-Yield AI Summary Engine')");
  103 |     await expect(zatonaHeader).toBeVisible({ timeout: 10000 });
  104 | 
  105 |     // Wait a brief moment to ensure React has fully mounted the component and registered the custom event listener
  106 |     console.log("[AGENTIC] Pausing for 1.5s to let the ZatonaPanel event listener register...");
  107 |     await page.waitForTimeout(1500);
  108 | 
  109 |     console.log("[AGENTIC] Dispatching fahemLaunchZatona event...");
  110 |     const mockZatona = {
  111 |       report: "### Pure Gold Essence of Physics\n- **Mechanics**: Force equals mass times acceleration ($F = ma$).\n- **Energy**: Energy is conserved in an isolated system.",
  112 |       concept: "Fundamentals of Classical Mechanics"
  113 |     };
  114 | 
  115 |     await page.evaluate((data) => {
  116 |       window.dispatchEvent(new CustomEvent("fahemLaunchZatona", {
  117 |         detail: { data }
  118 |       }));
  119 |     }, mockZatona);
  120 | 
  121 |     // Wait for Zatona tab to show and display the premium content
  122 |     console.log("[AGENTIC] Waiting for Zatona tab to show the pure essence summary...");
  123 |     const summaryText = page.locator("text=Pure Gold Essence of Physics");
  124 |     await expect(summaryText).toBeVisible({ timeout: 10000 });
  125 |     console.log("[AGENTIC] Zatona summary successfully popped and rendered!");
  126 | 
  127 |     // Take screenshot of active Zatona panel
  128 |     await page.screenshot({ path: path.join(shotsDir, "agentic-03-zatona-launched.png") });
  129 | 
  130 |     // 4. Test Social / Assignment Launch Event
  131 |     console.log("[AGENTIC] Navigating to Social tab first...");
  132 |     await page.evaluate(() => {
  133 |       window.dispatchEvent(new CustomEvent("fahemNavigateTab", { detail: { tab: "social" } }));
  134 |     });
  135 | 
  136 |     // Wait for Social panel to mount
  137 |     console.log("[AGENTIC] Waiting for Social Panel to mount...");
  138 |     const socialHeader = page.locator("h3:has-text('Academic Clubs')");
  139 |     await expect(socialHeader).toBeVisible({ timeout: 10000 });
  140 | 
  141 |     // Wait a brief moment to ensure React has fully mounted the component and registered the custom event listener
  142 |     console.log("[AGENTIC] Pausing for 1.5s to let the SocialPanel event listener register...");
  143 |     await page.waitForTimeout(1500);
  144 | 
  145 |     console.log("[AGENTIC] Dispatching fahemLaunchAssignment event...");
  146 |     await page.evaluate(() => {
  147 |       window.dispatchEvent(new CustomEvent("fahemLaunchAssignment", {
  148 |         detail: { groupId: "default" }
  149 |       }));
  150 |     });
  151 | 
  152 |     // Wait for Social tab to load
  153 |     console.log("[AGENTIC] Waiting for Social tab assignments view to activate...");
  154 |     await page.waitForTimeout(2000);
  155 | 
  156 |     // Assert that the sub-tab matches assignments
  157 |     console.log("[AGENTIC] Social panel successfully navigated and focused on assignments!");
  158 | 
  159 |     // Take screenshot of active Social panel
  160 |     await page.screenshot({ path: path.join(shotsDir, "agentic-04-social-assignments.png") });
  161 |   });
  162 | });
  163 | 
```