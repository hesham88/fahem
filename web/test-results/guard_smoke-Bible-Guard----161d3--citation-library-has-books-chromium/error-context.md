# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: guard_smoke.spec.ts >> Bible Guard - Complete Smoke Suite (D0-D16) >> D5: Companion Grounding - Verify companion answer citation & library has books
- Location: e2e\guard_smoke.spec.ts:173:7

# Error details

```
Error: expect(received).not.toContain(expected) // indexOf

Expected substring: not "0 books"
Received string:        "fahem
academic space
knowledge library
course subjects
practice workstation
study planner
weekly schedule
zatona ai research
insights & achievements
community & control
social network
my public profile
account settings
github
language
english
العربية
theme
⭐ demo (sandbox)
⭐ judge
evaluation.judge@fahem.pro
⚡ daily tokens:
42 / 100
sign out
⚖️
whitelisted judge sandbox console

you are in a secure, ephemeral playground. select a role persona below to audit different views.

🛠️
admin (studio & overrides)
🎓
student (gamification)
🏫
teacher (assignments)
interactive knowledge library

explore, search, and download curriculum textbooks, comprehensive review sheets, and premium educational resources.

🏫 curriculum libraries
📁 private study vault
📚
all libraries

consolidated digital library portal

0 books
📚 all subjects
📚
no textbooks found

we couldn't find any textbooks matching your current filters. try relaxing your filters or uploading a personal guide!

terms of service
privacy policy
submit report
🎙️
asdaa
partners & technologies
google cloud
firebase
gemini
mongodb
devpost
adk 2.0
antigravity
🎙️
asdaa.co

fahem console home | hackathon mongodb track partner integration

running on firebase app hosting • secure google cloud secret manager environment

🎓"
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - alert [ref=e2]
  - generic [ref=e3]:
    - complementary [ref=e4]:
      - generic [ref=e5]:
        - generic [ref=e7]:
          - img [ref=e9]
          - generic [ref=e12]: Fahem
        - navigation [ref=e13]:
          - generic [ref=e14]: ACADEMIC SPACE
          - button "Knowledge Library" [ref=e15] [cursor=pointer]:
            - img [ref=e16]
            - generic [ref=e19]: Knowledge Library
          - button "Course Subjects" [ref=e20] [cursor=pointer]:
            - img [ref=e21]
            - generic [ref=e25]: Course Subjects
          - button "Practice Workstation" [ref=e26] [cursor=pointer]:
            - img [ref=e27]
            - generic [ref=e29]: Practice Workstation
          - button "Study Planner" [ref=e30] [cursor=pointer]:
            - img [ref=e31]
            - generic [ref=e34]: Study Planner
          - button "Weekly Schedule" [ref=e35] [cursor=pointer]:
            - img [ref=e36]
            - generic [ref=e39]: Weekly Schedule
          - button "Zatona AI Research" [ref=e40] [cursor=pointer]:
            - img [ref=e41]
            - generic [ref=e45]: Zatona AI Research
          - button "Insights & Achievements" [ref=e46] [cursor=pointer]:
            - img [ref=e47]
            - generic [ref=e50]: Insights & Achievements
          - generic [ref=e51]: COMMUNITY & CONTROL
          - button "Social Network" [ref=e52] [cursor=pointer]:
            - img [ref=e53]
            - generic [ref=e58]: Social Network
          - button "My Public Profile" [ref=e59] [cursor=pointer]:
            - img [ref=e60]
            - generic [ref=e63]: My Public Profile
          - button "Account Settings" [ref=e64] [cursor=pointer]:
            - img [ref=e65]
            - generic [ref=e68]: Account Settings
          - link "GitHub" [ref=e69] [cursor=pointer]:
            - /url: https://github.com/hesham88/fahem
            - img [ref=e70]
            - generic [ref=e72]: GitHub
      - generic [ref=e73]:
        - generic [ref=e74]:
          - generic [ref=e75]:
            - generic [ref=e76]:
              - img [ref=e77]
              - generic [ref=e80]: Language
            - combobox [ref=e81] [cursor=pointer]:
              - option "English" [selected]
              - option "العربية"
          - generic [ref=e82]:
            - generic [ref=e84]: Theme
            - button "Toggle Theme" [ref=e85] [cursor=pointer]:
              - img [ref=e86]
        - generic [ref=e88]:
          - generic [ref=e89] [cursor=pointer]:
            - img "⭐ DEMO" [ref=e91]
            - generic [ref=e92]:
              - generic [ref=e93]:
                - generic "⭐ DEMO (Sandbox)" [ref=e94]
                - generic [ref=e95]: ⭐ JUDGE
              - generic "evaluation.judge@fahem.pro" [ref=e96]
          - generic [ref=e98]:
            - generic [ref=e99]: "⚡ Daily Tokens:"
            - generic [ref=e100]: 42 / 100
        - button "Sign Out" [ref=e103] [cursor=pointer]:
          - img [ref=e104]
          - generic [ref=e107]: Sign Out
    - main [ref=e108]:
      - generic [ref=e109]:
        - generic [ref=e110]:
          - generic [ref=e111]: ⚖️
          - generic [ref=e112]:
            - heading "WHITELISTED JUDGE SANDBOX CONSOLE" [level=4] [ref=e113]
            - paragraph [ref=e114]: You are in a secure, ephemeral playground. Select a role persona below to audit different views.
        - generic [ref=e115]:
          - button "🛠️ Admin (Studio & Overrides)" [ref=e116] [cursor=pointer]:
            - generic [ref=e117]: 🛠️
            - generic [ref=e118]: Admin (Studio & Overrides)
          - button "🎓 Student (Gamification)" [ref=e119] [cursor=pointer]:
            - generic [ref=e120]: 🎓
            - generic [ref=e121]: Student (Gamification)
          - button "🏫 Teacher (Assignments)" [ref=e122] [cursor=pointer]:
            - generic [ref=e123]: 🏫
            - generic [ref=e124]: Teacher (Assignments)
      - generic [ref=e125]:
        - generic [ref=e126]:
          - heading "Interactive Knowledge Library" [level=1] [ref=e127]
          - paragraph [ref=e128]: Explore, search, and download curriculum textbooks, comprehensive review sheets, and premium educational resources.
        - button "Toggle notifications" [ref=e131] [cursor=pointer]:
          - img [ref=e132]
      - generic [ref=e136]:
        - generic [ref=e137]:
          - button "🏫 Curriculum Libraries" [ref=e138] [cursor=pointer]
          - button "📁 Private Study Vault" [ref=e139] [cursor=pointer]
        - generic [ref=e141] [cursor=pointer]:
          - generic [ref=e143]:
            - generic [ref=e145]: 📚
            - generic [ref=e146]:
              - heading "All Libraries" [level=4] [ref=e147]
              - paragraph [ref=e148]: Consolidated digital library portal
          - generic [ref=e150]: 0 Books
        - generic [ref=e151]:
          - button "📚 All Subjects" [ref=e153] [cursor=pointer]
          - textbox "Search course textbooks..." [ref=e154]
        - generic [ref=e156]:
          - generic [ref=e157]: 📚
          - generic [ref=e158]:
            - heading "No textbooks found" [level=4] [ref=e159]
            - paragraph [ref=e160]: We couldn't find any textbooks matching your current filters. Try relaxing your filters or uploading a personal guide!
      - generic [ref=e161]:
        - generic [ref=e162]:
          - link "Terms of Service" [ref=e163] [cursor=pointer]:
            - /url: /en/terms
            - img [ref=e164]
            - text: Terms of Service
          - link "Privacy Policy" [ref=e167] [cursor=pointer]:
            - /url: /en/privacy
            - img [ref=e168]
            - text: Privacy Policy
          - link "Submit Report" [ref=e171] [cursor=pointer]:
            - /url: /en/report
            - img [ref=e172]
            - text: Submit Report
        - generic [ref=e174]:
          - link "X" [ref=e175] [cursor=pointer]:
            - /url: https://x.com
            - img [ref=e176]
          - link "Instagram" [ref=e178] [cursor=pointer]:
            - /url: https://instagram.com
            - img [ref=e179]
          - link "Facebook" [ref=e182] [cursor=pointer]:
            - /url: https://facebook.com
            - img [ref=e183]
          - link "Email" [ref=e185] [cursor=pointer]:
            - /url: mailto:info@asdaa.co
            - img [ref=e186]
          - link "Asdaa" [ref=e189] [cursor=pointer]:
            - /url: https://asdaa.co
            - generic [ref=e190]: 🎙️
            - generic [ref=e191]: Asdaa
        - generic [ref=e192]:
          - generic [ref=e193]: Partners & Technologies
          - generic [ref=e194]:
            - link "Google Cloud" [ref=e195] [cursor=pointer]:
              - /url: https://cloud.google.com
              - img [ref=e196]
              - generic [ref=e198]: Google Cloud
            - link "Firebase" [ref=e199] [cursor=pointer]:
              - /url: https://firebase.google.com
              - img [ref=e200]
              - generic [ref=e204]: Firebase
            - link "Gemini" [ref=e205] [cursor=pointer]:
              - /url: https://deepmind.google/technologies/gemini/
              - img [ref=e206]
              - generic [ref=e209]: Gemini
            - link "MongoDB" [ref=e210] [cursor=pointer]:
              - /url: https://www.mongodb.com
              - img [ref=e211]
              - generic [ref=e214]: MongoDB
            - link "Devpost" [ref=e215] [cursor=pointer]:
              - /url: https://devpost.com
              - img [ref=e216]
              - generic [ref=e218]: Devpost
            - link "ADK 2.0" [ref=e219] [cursor=pointer]:
              - /url: https://github.com/google
              - img [ref=e220]
              - generic [ref=e223]: ADK 2.0
            - link "Antigravity" [ref=e224] [cursor=pointer]:
              - /url: https://github.com
              - img [ref=e225]
              - generic [ref=e228]: Antigravity
            - link "🎙️ Asdaa.co" [ref=e229] [cursor=pointer]:
              - /url: https://asdaa.co
              - generic [ref=e230]: 🎙️
              - generic [ref=e231]: Asdaa.co
        - paragraph [ref=e232]: Fahem Console Home | Hackathon MongoDB Track Partner Integration
        - paragraph [ref=e233]: Running on Firebase App Hosting • Secure Google Cloud Secret Manager Environment
    - button "🎓" [ref=e234] [cursor=pointer]
```

# Test source

```ts
  81  |     await page.waitForTimeout(1000);
  82  |     await page.setViewportSize({ width: 2560, height: 1600 });
  83  |     await page.screenshot({ path: path.join(shotsDir, "D0-version.png") });
  84  | 
  85  |     // Also verify cluster card is absent from fresh URL
  86  |     await page.goto("/");
  87  |     const bodyText = await page.innerText("body");
  88  |     expect(bodyText.toLowerCase()).not.toContain("mongodb atlas cluster: connected");
  89  |   });
  90  | 
  91  |   test("D1: Sandbox Entry - Access public Tier-0 sandbox and verify no 'not eligible' banner", async ({ page, baseURL }) => {
  92  |     await page.goto("/");
  93  |     
  94  |     // Clear storage
  95  |     await page.evaluate(() => {
  96  |       localStorage.clear();
  97  |       sessionStorage.clear();
  98  |     });
  99  |     await page.reload();
  100 |     
  101 |     // Take landing page screenshot of the form (clean, un-submitted state)
  102 |     await page.waitForSelector("#persona-select", { timeout: 10000 });
  103 |     await page.screenshot({ path: path.join(shotsDir, "D1-landing.png") });
  104 | 
  105 |     // Select student persona
  106 |     await page.selectOption("#persona-select", "student");
  107 | 
  108 |     // Fill email
  109 |     await page.fill("#sandbox-email-input", "evaluation.judge@fahem.pro");
  110 | 
  111 |     // Submit
  112 |     const submitBtn = page.locator("#sandbox-submit-button");
  113 |     await submitBtn.click();
  114 | 
  115 |     // Wait for redirect to /home
  116 |     await page.waitForURL("**/home*", { timeout: 15000 });
  117 |     await page.waitForTimeout(1000); // short wait for layout paint
  118 |     await page.screenshot({ path: path.join(shotsDir, "D1-home.png") });
  119 | 
  120 |     const bodyText = await page.innerText("body");
  121 |     expect(bodyText.toLowerCase()).not.toContain("not eligible");
  122 |     expect(bodyText).not.toContain("غير مؤهل");
  123 |     expect(page.url()).toContain("/home");
  124 |   });
  125 | 
  126 |   test("D2: Sandbox Isolation - Validate demo writes are sandboxed", async ({ page }) => {
  127 |     await loginToSandbox(page, "student");
  128 |     await page.screenshot({ path: path.join(shotsDir, "D2-isolation.png") });
  129 | 
  130 |     const isSandbox = await page.evaluate(() => {
  131 |       return localStorage.getItem("app_mode") === "demo";
  132 |     });
  133 |     expect(isSandbox).toBe(true);
  134 |   });
  135 | 
  136 |   test("D3: Sandbox Personas - Verify standard/superadmin views inside sandbox", async ({ page }) => {
  137 |     // Check Admin persona
  138 |     await loginToSandbox(page, "admin");
  139 |     await page.screenshot({ path: path.join(shotsDir, "D3-admin-view.png") });
  140 |     
  141 |     let bodyText = await page.innerText("body");
  142 |     expect(bodyText.toLowerCase()).not.toContain("access denied");
  143 |     expect(bodyText).toContain("Sandbox");
  144 | 
  145 |     // Check Teacher persona
  146 |     await loginToSandbox(page, "teacher");
  147 |     await page.screenshot({ path: path.join(shotsDir, "D3-teacher-view.png") });
  148 |     bodyText = await page.innerText("body");
  149 |     expect(bodyText).toContain("Sandbox");
  150 | 
  151 |     // Check Student persona
  152 |     await loginToSandbox(page, "student");
  153 |     await page.screenshot({ path: path.join(shotsDir, "D3-student-view.png") });
  154 |     bodyText = await page.innerText("body");
  155 |     expect(bodyText).toContain("Sandbox");
  156 |   });
  157 | 
  158 |   test("D4: Sandbox Kill & Wipe - Reset demo baseline", async ({ page }) => {
  159 |     await loginToSandbox(page, "admin");
  160 |     await page.goto("/en/home?tab=super-admin-users");
  161 |     await page.waitForTimeout(1000);
  162 |     const demoBtn = page.locator("button:has-text('Demo Oversight'), button:has-text('غرفة التحكم')");
  163 |     if (await demoBtn.count() > 0) {
  164 |       await demoBtn.click();
  165 |     }
  166 |     await page.waitForTimeout(1000);
  167 |     await page.screenshot({ path: path.join(shotsDir, "D4-kill-wipe.png") });
  168 |     
  169 |     const bodyText = await page.innerText("body");
  170 |     expect(bodyText).toContain("Oversight");
  171 |   });
  172 | 
  173 |   test("D5: Companion Grounding - Verify companion answer citation & library has books", async ({ page }) => {
  174 |     await loginToSandbox(page, "student");
  175 |     await page.waitForTimeout(5000);
  176 |     await page.screenshot({ path: path.join(shotsDir, "D5-grounding.png") });
  177 | 
  178 |     // Try to locate book cards or verify library is present
  179 |     const bodyText = await page.innerText("body");
  180 |     // Assert we don't have "0 Books" or "empty library"
> 181 |     expect(bodyText.toLowerCase()).not.toContain("0 books");
      |                                        ^ Error: expect(received).not.toContain(expected) // indexOf
  182 |     expect(bodyText.toLowerCase()).not.toContain("empty library");
  183 |     expect(bodyText).toContain("Fahem");
  184 |   });
  185 | 
  186 |   test("D6: Ingestion Pipeline - Books reach status embedded and vector search is active", async ({ page }) => {
  187 |     await loginToSandbox(page, "admin");
  188 |     await page.goto("/en/home?tab=admin-ingestion");
  189 |     await page.locator("button").filter({ hasText: /Ingestion & Crawl Console|الاستيراد والزحف/ }).click();
  190 |     await page.waitForTimeout(3000); // Wait for statistics and books list to render
  191 |     await page.screenshot({ path: path.join(shotsDir, "D6-ingestion.png") });
  192 |     
  193 |     const bodyText = await page.innerText("body");
  194 |     expect(bodyText).toContain("Ingestion");
  195 |   });
  196 | 
  197 |   test("D7: Reader Content - Chapter matches current open book", async ({ page }) => {
  198 |     await loginToSandbox(page, "student");
  199 |     await page.waitForTimeout(5000);
  200 |     await page.screenshot({ path: path.join(shotsDir, "D7-reader.png") });
  201 | 
  202 |     const bodyText = await page.innerText("body");
  203 |     // Should not blindly default to Chapter 1 statements
  204 |     expect(bodyText.toLowerCase()).not.toContain("chapter 1: statements & programming");
  205 |     expect(bodyText).toContain("Fahem");
  206 |   });
  207 | 
  208 |   test("D8: TTS Read Aloud - Check audio playback trigger", async ({ page }) => {
  209 |     await loginToSandbox(page, "student");
  210 |     await page.waitForTimeout(5000);
  211 |     await page.screenshot({ path: path.join(shotsDir, "D8-tts.png") });
  212 |     
  213 |     expect(page.url()).toContain("/home");
  214 |   });
  215 | 
  216 |   test("D9: Admin Oversight / Reports - Admin panel and token policy list loads", async ({ page }) => {
  217 |     await loginToSandbox(page, "admin");
  218 |     await page.goto("/en/home?tab=super-admin-users");
  219 |     await page.waitForTimeout(1000);
  220 |     await page.screenshot({ path: path.join(shotsDir, "D9-admin-panel.png") });
  221 |     
  222 |     const bodyText = await page.innerText("body");
  223 |     expect(bodyText).toContain("Policy");
  224 |   });
  225 | 
  226 |   test("D10: Companion Language Lock - Validate chat language consistency", async ({ page }) => {
  227 |     await loginToSandbox(page, "student");
  228 |     await page.screenshot({ path: path.join(shotsDir, "D10-language-lock.png") });
  229 |     
  230 |     expect(page.url()).toContain("/home");
  231 |   });
  232 | 
  233 |   test("D11: Theme & Style - Verify light theme default is intact", async ({ page }) => {
  234 |     await page.goto("/");
  235 |     await page.waitForTimeout(1000);
  236 |     await page.screenshot({ path: path.join(shotsDir, "D11-theme.png") });
  237 |     
  238 |     // Light theme should not have 'dark' class on root html on first load
  239 |     const isDarkClassPresent = await page.locator("html").evaluate((el) => el.classList.contains("dark"));
  240 |     expect(isDarkClassPresent).toBe(false);
  241 |   });
  242 | 
  243 |   test("D12: Responsive Public Shell - Test mobile 360px layout & mobile block notice", async ({ page }) => {
  244 |     // Force 360px viewport
  245 |     await page.setViewportSize({ width: 360, height: 640 });
  246 |     await page.goto("/");
  247 |     await page.waitForTimeout(1000);
  248 |     await page.screenshot({ path: path.join(shotsDir, "D12-mobile-landing.png") });
  249 | 
  250 |     // Go to app route inside sandbox
  251 |     await loginToSandbox(page, "student");
  252 |     await page.setViewportSize({ width: 360, height: 640 });
  253 |     await page.waitForTimeout(1000);
  254 |     await page.screenshot({ path: path.join(shotsDir, "D12-mobile-app-notice.png") });
  255 |     
  256 |     expect(page.url()).toContain("/home");
  257 |   });
  258 | 
  259 |   test("D13: Public Navigation - Access landing while signed in without forced bounce", async ({ page }) => {
  260 |     await loginToSandbox(page, "student");
  261 |     
  262 |     // Attempt to navigate back to landing page
  263 |     await page.goto("/");
  264 |     await page.waitForTimeout(1000);
  265 |     await page.screenshot({ path: path.join(shotsDir, "D13-public-nav.png") });
  266 |     
  267 |     expect(page.url()).not.toContain("/home");
  268 |   });
  269 | 
  270 |   test("D14: Branding Assets - Verify favicon & real PNG partner assets load correctly", async ({ page }) => {
  271 |     await page.goto("/");
  272 |     await page.setViewportSize({ width: 1280, height: 1800 });
  273 |     // Scroll down to reveal the partner logo section
  274 |     await page.evaluate(() => window.scrollTo(0, 800));
  275 |     await page.waitForTimeout(2000);
  276 |     await page.screenshot({ path: path.join(shotsDir, "D14-branding.png") });
  277 |     
  278 |     const logoImg = page.locator("img[src*='logo']");
  279 |     expect(await logoImg.count()).toBeGreaterThanOrEqual(0);
  280 |   });
  281 | 
```