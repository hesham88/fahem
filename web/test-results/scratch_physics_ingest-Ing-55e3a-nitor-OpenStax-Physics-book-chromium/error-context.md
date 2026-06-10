# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: scratch_physics_ingest.spec.ts >> Ingest and monitor OpenStax Physics book
- Location: e2e\scratch_physics_ingest.spec.ts:96:5

# Error details

```
TimeoutError: page.waitForURL: Timeout 25000ms exceeded.
=========================== logs ===========================
waiting for navigation to "**/home*" until "load"
============================================================
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - navigation [ref=e3]:
      - generic [ref=e4] [cursor=pointer]:
        - img "Fahem Logo" [ref=e5]
        - generic [ref=e6]: Fahem
      - list [ref=e7]:
        - listitem [ref=e8]:
          - link "Overview" [ref=e9] [cursor=pointer]:
            - /url: "#overview"
            - img [ref=e10]
            - text: Overview
        - listitem [ref=e14]:
          - link "AI Swarm" [ref=e15] [cursor=pointer]:
            - /url: "#swarm"
            - img [ref=e16]
            - text: AI Swarm
        - listitem [ref=e18]:
          - link "Features" [ref=e19] [cursor=pointer]:
            - /url: "#features"
            - img [ref=e20]
            - text: Features
        - listitem [ref=e23]:
          - link "Why Fahem" [ref=e24] [cursor=pointer]:
            - /url: "#why-fahem"
            - img [ref=e25]
            - text: Why Fahem
        - listitem [ref=e27]:
          - link "Tech Stack" [ref=e28] [cursor=pointer]:
            - /url: "#tech-stack"
            - img [ref=e29]
            - text: Tech Stack
        - listitem [ref=e32]:
          - link "Support Us" [ref=e33] [cursor=pointer]:
            - /url: "#donation-section"
            - img [ref=e34]
            - text: Support Us
        - listitem [ref=e36]:
          - link "GitHub" [ref=e37] [cursor=pointer]:
            - /url: https://github.com/hesham88/fahem
            - img [ref=e38]
            - text: GitHub
        - listitem [ref=e40]:
          - button "Switch to Dark Mode" [ref=e41] [cursor=pointer]:
            - img [ref=e42]
        - listitem [ref=e44]:
          - button "✨ Welcome / Landing" [ref=e46] [cursor=pointer]:
            - generic [ref=e47]:
              - generic [ref=e48]: ✨
              - generic [ref=e49]: Welcome / Landing
            - img [ref=e50]
        - listitem [ref=e52]:
          - generic [ref=e53]:
            - img [ref=e54]
            - combobox [ref=e57] [cursor=pointer]:
              - option "English" [selected]
              - option "العربية"
        - listitem [ref=e58]:
          - button "Sign In" [ref=e59] [cursor=pointer]
    - main [ref=e60]:
      - generic [ref=e62]:
        - generic [ref=e63]:
          - generic [ref=e64]:
            - generic [ref=e65]: ✨
            - generic [ref=e66]: NEXT-GEN AI TUTORING SWARM
          - 'heading "AI Tutors in Your Pocket: Learn Smarter, Study Faster" [level=1] [ref=e67]'
          - paragraph [ref=e68]: Fahem turns your textbooks, lecture slides, and notes into an interactive, high-fidelity personal learning world. Master any curriculum, generate custom flashcards, study maps, and take mock exams with real-time feedback—all tailored directly to your unique brain.
          - generic [ref=e69]:
            - generic [ref=e70]:
              - img [ref=e72]
              - generic [ref=e76]:
                - strong [ref=e77]: Instant Study Maps
                - generic [ref=e78]: Turn dense books into structured interactive maps that highlight exactly what you need to know.
            - generic [ref=e79]:
              - img [ref=e81]
              - generic [ref=e83]:
                - strong [ref=e84]: Chat with Your Books
                - generic [ref=e85]: Ask questions directly to your curriculum and get clear, deep-vision explanations and step-by-step guidance.
            - generic [ref=e86]:
              - img [ref=e88]
              - generic [ref=e90]:
                - strong [ref=e91]: Master the Exam
                - generic [ref=e92]: Perfect your knowledge with personalized quizzes that adapt to your progress and boost your confidence.
          - generic [ref=e93]:
            - generic [ref=e94]: GET STARTED NOW
            - button "Sign in with Google" [disabled] [ref=e95]:
              - img [ref=e96]
              - generic [ref=e101]: Sign in with Google
        - generic [ref=e102]:
          - img "Fahem Brand Symbol" [ref=e104]
          - generic [ref=e105]:
            - generic [ref=e106]:
              - generic [ref=e107]: ⭐
              - generic [ref=e108]: EXPLORE DEMO SANDBOX
            - paragraph [ref=e109]: Select your evaluation role and provide an optional email to explore.
            - generic [ref=e110]:
              - generic [ref=e111]: CHOOSE PERSONA
              - combobox "CHOOSE PERSONA" [ref=e112] [cursor=pointer]:
                - option "Student Persona"
                - option "Teacher Persona"
                - option "Admin Preview Persona" [selected]
            - generic [ref=e113]:
              - generic [ref=e114]: EMAIL ADDRESS (OPTIONAL)
              - textbox "EMAIL ADDRESS (OPTIONAL)" [ref=e115]:
                - /placeholder: your.email@example.com
                - text: evaluation.judge@fahem.pro
            - button "Entering..." [disabled] [ref=e116] [cursor=pointer]
          - generic [ref=e118]:
            - generic [ref=e119]:
              - img [ref=e120]
              - generic [ref=e122]: Support Fahem's Servers
            - paragraph [ref=e123]: Your micro-donations keep our AI tutors active and free for everyone.
            - generic [ref=e124]:
              - link "Buy me a coffee ($5)" [ref=e125] [cursor=pointer]:
                - /url: https://www.paypal.com/ncp/payment/FKBWYZGBNDKU4
                - img [ref=e126]
                - text: Buy me a coffee ($5)
              - link "Invite me for a meal ($29)" [ref=e129] [cursor=pointer]:
                - /url: https://www.paypal.com/ncp/payment/D5RHBB8M694MN
                - img [ref=e130]
                - text: Invite me for a meal ($29)
              - link "Surprise me" [ref=e132] [cursor=pointer]:
                - /url: https://www.paypal.com/ncp/payment/QE894AKFVYLZS
                - img [ref=e133]
                - text: Surprise me
    - generic [ref=e139]:
      - generic [ref=e140]:
        - heading "Specialized Collaborative AI Swarm" [level=2] [ref=e141]
        - paragraph [ref=e142]: Discover the power of collaborative AI agents working together to elevate your educational journey. Each agent is a specialist dedicated to a critical pillar of your learning path.
      - generic [ref=e143]:
        - generic [ref=e144]:
          - generic [ref=e145]:
            - img [ref=e147]
            - heading "System Coordinator" [level=3] [ref=e150]
          - paragraph [ref=e151]: Intelligently orchestrates queries, delegates tasks to specialist sub-agents, and refines complex output into warm, natural answers.
        - generic [ref=e152]:
          - generic [ref=e153]:
            - img [ref=e155]
            - heading "Study Companion" [level=3] [ref=e157]
          - paragraph [ref=e158]: An interactive, friendly companion on your left that answers context-aware study questions and guides you through complex curriculum concepts.
        - generic [ref=e159]:
          - generic [ref=e160]:
            - img [ref=e162]
            - heading "Quiz Master" [level=3] [ref=e165]
          - paragraph [ref=e166]: Dynamically builds real-time interactive mock tests and flashcards customized to your school, grade, and active learning objectives.
        - generic [ref=e167]:
          - generic [ref=e168]:
            - img [ref=e170]
            - heading "Metadata Researcher" [level=3] [ref=e172]
          - paragraph [ref=e173]: Performs secure database diagnostics, statistics harvesting, and real-time schema analytics using Atlas MCP.
    - generic [ref=e175]:
      - generic [ref=e176]:
        - heading "Premium System Workstation" [level=2] [ref=e177]
        - paragraph [ref=e178]: A comprehensive educational hub built to simplify structured learning, streamline collaborative study, and monitor academic progress in real-time.
      - generic [ref=e179]:
        - generic [ref=e180]:
          - img [ref=e182]
          - generic [ref=e185]:
            - heading "Interactive Library" [level=4] [ref=e186]
            - paragraph [ref=e187]: Access curated study guides, resources, and shared documents tailored to your localized grade.
        - generic [ref=e188]:
          - img [ref=e190]
          - generic [ref=e194]:
            - heading "Curriculum Directory" [level=4] [ref=e195]
            - paragraph [ref=e196]: Explore your entire curriculum with expandable course directories, chapters, and high-fidelity study outlines.
        - generic [ref=e197]:
          - img [ref=e199]
          - generic [ref=e201]:
            - heading "Practice Workstation" [level=4] [ref=e202]
            - paragraph [ref=e203]: Sharpen your skills with interactive flashcards, practice problems, and self-evaluation modules.
        - generic [ref=e204]:
          - img [ref=e206]
          - generic [ref=e209]:
            - heading "Dynamic Study Planner" [level=4] [ref=e210]
            - paragraph [ref=e211]: Create customized weekly study roadmaps with automated target notifications and progress milestones.
        - generic [ref=e212]:
          - img [ref=e214]
          - generic [ref=e218]:
            - heading "Weekly Timetable" [level=4] [ref=e219]
            - paragraph [ref=e220]: Build and visualize your class schedule using a beautiful, interactive drag-and-drop style planner.
        - generic [ref=e221]:
          - img [ref=e223]
          - generic [ref=e225]:
            - heading "Zatona Digest Hub" [level=4] [ref=e226]
            - paragraph [ref=e227]: Get rich, consolidated research digests, quick summaries, and AI-powered curriculum breakdowns.
    - generic [ref=e229]:
      - generic [ref=e230]:
        - heading "Why Choose Fahem?" [level=2] [ref=e231]
        - paragraph [ref=e232]: Fahem is not just another app — it is a smart, secure, and state-of-the-art educational ecosystem designed with your success in mind.
      - generic [ref=e233]:
        - generic [ref=e234]:
          - img [ref=e236]
          - heading "Tailored for You" [level=4] [ref=e239]
          - paragraph [ref=e240]: From onboarding to study plans, everything adapts to your age, country, school, and selected educational branch.
        - generic [ref=e241]:
          - img [ref=e243]
          - heading "Native RTL & LTR Support" [level=4] [ref=e247]
          - paragraph [ref=e248]: A beautifully mirrored interface crafted with premium Cairo typography for Arabic and Outfit typography for English.
        - generic [ref=e249]:
          - img [ref=e251]
          - heading "Secure & Enterprise-Grade" [level=4] [ref=e253]
          - paragraph [ref=e254]: Powered by secure MongoDB Atlas databases, Firebase authentication, and robust super-admin shields.
        - generic [ref=e255]:
          - img [ref=e257]
          - heading "Powered by Google ADK" [level=4] [ref=e260]
          - paragraph [ref=e261]: Leverages cutting-edge Google Gemini AI models and specialized MCP toolsets to provide unparalleled study assistance.
        - generic [ref=e262]:
          - img [ref=e264]
          - heading "Cognitive Load Management (CLT & CTL Balance)" [level=4] [ref=e266]
          - paragraph [ref=e267]: Balances working memory loads (CLT & CTL balance) through beautiful progressive disclosure and clean structured concept blocks.
        - generic [ref=e268]:
          - img [ref=e270]
          - heading "Bounded Autodidactism via Heutagogical Paths" [level=4] [ref=e273]
          - paragraph [ref=e274]: Supports authentic student autonomy via the OEPA mobile learning model, allowing self-guided learning acceleration at your own pace.
        - generic [ref=e275]:
          - img [ref=e277]
          - heading "Active Security & Guardrails" [level=4] [ref=e279]
          - paragraph [ref=e280]: Strict token budget enforcement and GCP-level model armor to secure user privacy and prevent prompt injections.
        - generic [ref=e281]:
          - img [ref=e283]
          - heading "Multi-Agent DAG Pipelines" [level=4] [ref=e286]
          - paragraph [ref=e287]: Decoupled asynchronous processing loops and zero-disruption indexing for intelligent, parallelized workflow execution.
    - generic [ref=e289]:
      - generic [ref=e290]:
        - heading "Leading Tech Integrations & Stack" [level=2] [ref=e291]
        - paragraph [ref=e292]: Fahem is built on top of a highly resilient, enterprise-grade cloud architecture integrated with world-leading technology partners.
      - generic [ref=e293]:
        - link "Google Gemini Google Gemini AI Advanced natural language reasoning and contextual multi-modal textbook analysis." [ref=e294] [cursor=pointer]:
          - /url: https://gemini.google.com/
          - generic [ref=e295]:
            - generic [ref=e296]:
              - img "Google Gemini" [ref=e298]
              - heading "Google Gemini AI" [level=3] [ref=e299]
            - paragraph [ref=e300]: Advanced natural language reasoning and contextual multi-modal textbook analysis.
        - link "Google ADK Google ADK 2.0 Advanced audio speech synthesis and local hardware coordination for natural voice tutoring." [ref=e301] [cursor=pointer]:
          - /url: https://adk.dev/
          - generic [ref=e302]:
            - generic [ref=e303]:
              - img "Google ADK" [ref=e305]
              - heading "Google ADK 2.0" [level=3] [ref=e306]
            - paragraph [ref=e307]: Advanced audio speech synthesis and local hardware coordination for natural voice tutoring.
        - link "Antigravity Antigravity CLI Autonomous developer execution agent, dashboard control console, and secure prompt runtime environments." [ref=e308] [cursor=pointer]:
          - /url: https://antigravity.google/
          - generic [ref=e309]:
            - generic [ref=e310]:
              - img "Antigravity" [ref=e312]
              - heading "Antigravity CLI" [level=3] [ref=e313]
            - paragraph [ref=e314]: Autonomous developer execution agent, dashboard control console, and secure prompt runtime environments.
        - link "Firebase Google Firebase Secure global database synchronization, cloud hosting, and robust user session authentication." [ref=e315] [cursor=pointer]:
          - /url: https://console.firebase.google.com/
          - generic [ref=e316]:
            - generic [ref=e317]:
              - img "Firebase" [ref=e319]
              - heading "Google Firebase" [level=3] [ref=e320]
            - paragraph [ref=e321]: Secure global database synchronization, cloud hosting, and robust user session authentication.
        - link "Next.js Next.js The gold-standard framework for building blazing fast user interfaces, seamless server-side rendering (SSR), and state-of-the-art SEO web performance." [ref=e322] [cursor=pointer]:
          - /url: https://nextjs.org/
          - generic [ref=e323]:
            - generic [ref=e324]:
              - img "Next.js" [ref=e326]
              - heading "Next.js" [level=3] [ref=e327]
            - paragraph [ref=e328]: The gold-standard framework for building blazing fast user interfaces, seamless server-side rendering (SSR), and state-of-the-art SEO web performance.
        - link "Google Maps Google Maps Dynamic visual geospatial APIs, interactive school mapping, and intelligent regional routing to discover educational support centers near you." [ref=e329] [cursor=pointer]:
          - /url: https://mapsplatform.google.com/
          - generic [ref=e330]:
            - generic [ref=e331]:
              - img "Google Maps" [ref=e333]
              - heading "Google Maps" [level=3] [ref=e334]
            - paragraph [ref=e335]: Dynamic visual geospatial APIs, interactive school mapping, and intelligent regional routing to discover educational support centers near you.
        - link "MongoDB Atlas MongoDB Atlas Distributed cloud database, vectors index search, and semantic lesson retrieval via custom MCP servers." [ref=e336] [cursor=pointer]:
          - /url: https://www.mongodb.com/
          - generic [ref=e337]:
            - generic [ref=e338]:
              - img "MongoDB Atlas" [ref=e340]
              - heading "MongoDB Atlas" [level=3] [ref=e341]
            - paragraph [ref=e342]: Distributed cloud database, vectors index search, and semantic lesson retrieval via custom MCP servers.
        - link "Google Cloud Google Cloud Secure enterprise cloud computing, high-performance VM hosting, Model Armor, and Vertex AI nodes to power Fahem's interactive tutoring services globally." [ref=e343] [cursor=pointer]:
          - /url: https://cloud.google.com/
          - generic [ref=e344]:
            - generic [ref=e345]:
              - img "Google Cloud" [ref=e347]
              - heading "Google Cloud" [level=3] [ref=e348]
            - paragraph [ref=e349]: Secure enterprise cloud computing, high-performance VM hosting, Model Armor, and Vertex AI nodes to power Fahem's interactive tutoring services globally.
    - generic [ref=e351]:
      - generic [ref=e352]:
        - generic [ref=e353]:
          - img [ref=e354]
          - generic [ref=e356]: Why support Fahem?
        - heading "Support Fahem's Journey" [level=2] [ref=e357]
        - paragraph [ref=e358]: Fahem is an independent, non-profit-driven tool built to democratize interactive AI learning. Your contributions directly cover real-time server computations, vector index searches, and API endpoints.
      - generic [ref=e359]:
        - generic [ref=e360]:
          - img [ref=e362]
          - generic [ref=e365]:
            - heading "Buy me a coffee" [level=3] [ref=e366]
            - paragraph [ref=e367]: $5
          - paragraph [ref=e368]: A quick, warm micro-donation equivalent to a single coffee cup to keep our APIs fueled.
          - link "Donate Now" [ref=e369] [cursor=pointer]:
            - /url: https://www.paypal.com/ncp/payment/FKBWYZGBNDKU4
            - text: Donate Now
            - img [ref=e370]
        - generic [ref=e373]:
          - generic [ref=e374]: Most Impactful
          - img [ref=e376]
          - generic [ref=e378]:
            - heading "Invite me for a meal" [level=3] [ref=e379]
            - paragraph [ref=e380]: $29
          - paragraph [ref=e381]: Sponsors a full week of heavy Vector search computation and AI translation runs.
          - link "Support Now" [ref=e382] [cursor=pointer]:
            - /url: https://www.paypal.com/ncp/payment/D5RHBB8M694MN
            - text: Support Now
            - img [ref=e383]
        - generic [ref=e386]:
          - img [ref=e388]
          - generic [ref=e393]:
            - heading "Surprise me" [level=3] [ref=e394]
            - paragraph [ref=e395]: Custom
          - paragraph [ref=e396]: Specify a customized amount on PayPal to fuel Fahem's future features and maintenance.
          - link "Surprise Us" [ref=e397] [cursor=pointer]:
            - /url: https://www.paypal.com/ncp/payment/QE894AKFVYLZS
            - text: Surprise Us
            - img [ref=e398]
      - generic [ref=e401]: Secure one-click PayPal checkout
    - contentinfo [ref=e402]:
      - generic [ref=e403]:
        - generic [ref=e404]:
          - link "Terms of Service" [ref=e405] [cursor=pointer]:
            - /url: /en/terms
            - img [ref=e406]
            - text: Terms of Service
          - generic [ref=e409]: •
          - link "Privacy Policy" [ref=e410] [cursor=pointer]:
            - /url: /en/privacy
            - img [ref=e411]
            - text: Privacy Policy
          - generic [ref=e414]: •
          - link "Contact Us" [ref=e415] [cursor=pointer]:
            - /url: /en/contact
            - img [ref=e416]
            - text: Contact Us
        - generic [ref=e419]:
          - link "X" [ref=e420] [cursor=pointer]:
            - /url: https://x.com/fahempro
            - img "X" [ref=e421]
          - link "Instagram" [ref=e422] [cursor=pointer]:
            - /url: https://www.instagram.com/fahem.pro/
            - img "Instagram" [ref=e423]
          - link "Facebook" [ref=e424] [cursor=pointer]:
            - /url: https://www.facebook.com/ai.fahem.pro/
            - img "Facebook" [ref=e425]
          - link "Email" [ref=e426] [cursor=pointer]:
            - /url: mailto:contact@fahem.pro
            - img "Email" [ref=e427]
        - paragraph [ref=e429]:
          - text: Made with love ❤️ All rights reserved to
          - link "Asdaa" [ref=e430] [cursor=pointer]:
            - /url: https://asdaa.co
          - text: and Fahem Team
  - alert [ref=e431]
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import * as fs from 'fs';
  3   | import * as path from 'path';
  4   | 
  5   | // Helper to log in to sandbox with a specific persona
  6   | async function loginToSandbox(page: any, persona: "student" | "teacher" | "admin", email = "evaluation.judge@fahem.pro") {
  7   |   await page.setViewportSize({ width: 1280, height: 1000 });
  8   |   await page.goto("/");
  9   |   
  10  |   await page.evaluate(() => {
  11  |     localStorage.clear();
  12  |     sessionStorage.clear();
  13  |     localStorage.setItem("demo_tutorial_skipped", "true");
  14  |   });
  15  |   await page.reload();
  16  | 
  17  |   const selectSelector = "#persona-select";
  18  |   await page.waitForSelector(selectSelector, { timeout: 15000 });
  19  |   await page.selectOption(selectSelector, persona);
  20  | 
  21  |   const emailSelector = "#sandbox-email-input";
  22  |   await page.fill(emailSelector, email);
  23  | 
  24  |   const submitBtn = page.locator("#sandbox-submit-button");
  25  |   await submitBtn.click();
  26  | 
> 27  |   await page.waitForURL("**/home*", { timeout: 25000 });
      |              ^ TimeoutError: page.waitForURL: Timeout 25000ms exceeded.
  28  | }
  29  | 
  30  | // Function to ensure Physics subject exists under lib_openstax -> openstax_all
  31  | async function ensurePhysicsSubjectExists(page: any) {
  32  |   console.log('[PLAYWRIGHT] Navigating to Curriculum Builder to verify Physics subject...');
  33  |   await page.locator('button').filter({ hasText: /Curriculum Builder|منشئ المناهج/ }).click();
  34  |   await page.waitForTimeout(3000);
  35  | 
  36  |   console.log('[PLAYWRIGHT] Selecting OpenStax Library from sidebar picker...');
  37  |   const sidebarSelect = page.locator('.library-picker-panel select');
  38  |   await sidebarSelect.waitFor({ state: 'visible', timeout: 15000 });
  39  |   await sidebarSelect.selectOption('lib_openstax');
  40  |   await page.waitForTimeout(3000);
  41  | 
  42  |   console.log('[PLAYWRIGHT] Locating OpenStax Library branch in the explorer tree...');
  43  |   const libBranch = page.locator('.tree-branch').filter({ hasText: /OpenStax Library|مكتبة أوبن ستاكس/ }).first();
  44  |   await libBranch.waitFor({ state: 'attached', timeout: 15000 });
  45  | 
  46  |   // Expand OpenStax Library branch if collapsed
  47  |   const isLibExpanded = await libBranch.locator('.tree-children').count() > 0;
  48  |   if (!isLibExpanded) {
  49  |     console.log('[PLAYWRIGHT] OpenStax Library branch is collapsed. Clicking expand toggle...');
  50  |     const expandToggle = libBranch.locator('.expand-toggle').first();
  51  |     await expandToggle.click({ force: true });
  52  |     await page.waitForTimeout(2000);
  53  |   }
  54  | 
  55  |   console.log('[PLAYWRIGHT] Locating OpenStax curriculum branch...');
  56  |   const curBranch = libBranch.locator('.tree-branch').filter({ hasText: /OpenStax/ }).first();
  57  |   await curBranch.waitFor({ state: 'attached', timeout: 15000 });
  58  | 
  59  |   // Expand OpenStax curriculum branch if collapsed
  60  |   const isCurExpanded = await curBranch.locator('.tree-children').count() > 0;
  61  |   if (!isCurExpanded) {
  62  |     console.log('[PLAYWRIGHT] OpenStax curriculum branch is collapsed. Clicking expand toggle...');
  63  |     const expandToggle = curBranch.locator('.expand-toggle').first();
  64  |     await expandToggle.click({ force: true });
  65  |     await page.waitForTimeout(2000);
  66  |   }
  67  | 
  68  |   // Check if Physics subject already exists under OpenStax curriculum
  69  |   const hasPhysics = await curBranch.locator('.tree-node-title').filter({ hasText: /Physics|الفيزياء/ }).count() > 0;
  70  |   if (hasPhysics) {
  71  |     console.log('[PLAYWRIGHT] Physics subject already exists under OpenStax curriculum. Excellent!');
  72  |   } else {
  73  |     console.log('[PLAYWRIGHT] Physics subject not found! Adding Physics subject to OpenStax curriculum...');
  74  |     const addSubjBtn = curBranch.locator('button[title*="Subject"], button[title*="مادة"]').first();
  75  |     await addSubjBtn.click({ force: true });
  76  |     await page.waitForTimeout(2000);
  77  | 
  78  |     console.log('[PLAYWRIGHT] Filling Subject Form...');
  79  |     const subFormSection = page.locator('section.form-card').filter({ hasText: /Subject|مادة/ }).first();
  80  |     await subFormSection.waitFor({ state: 'visible', timeout: 10000 });
  81  |     await subFormSection.locator('input').first().fill('Physics');
  82  |     await subFormSection.locator('input').nth(1).fill('الفيزياء');
  83  | 
  84  |     console.log('[PLAYWRIGHT] Submitting Subject Form...');
  85  |     await subFormSection.locator('button.primary-submit-btn, button[type="submit"]').first().click();
  86  |     await page.waitForTimeout(4000);
  87  |     console.log('[PLAYWRIGHT] Physics subject created successfully!');
  88  |   }
  89  | 
  90  |   // Go back to Ingestion Console
  91  |   console.log('[PLAYWRIGHT] Navigating back to Ingestion & Crawl Console tab...');
  92  |   await page.locator('button').filter({ hasText: /Ingestion & Crawl Console|الاستيراد والزحف/ }).click();
  93  |   await page.waitForTimeout(2000);
  94  | }
  95  | 
  96  | test('Ingest and monitor OpenStax Physics book', async ({ page }) => {
  97  |   test.setTimeout(1800000); // 30 minutes timeout for the entire test
  98  |   
  99  |   // Capture browser logs and errors
  100 |   page.on('console', msg => {
  101 |     console.log(`[BROWSER CONSOLE] [${msg.type().toUpperCase()}] ${msg.text()}`);
  102 |   });
  103 |   page.on('pageerror', err => {
  104 |     console.log(`[BROWSER EXCEPTION] ${err.message}\n${err.stack || ''}`);
  105 |   });
  106 |   page.on('requestfailed', request => {
  107 |     console.log(`[PLAYWRIGHT REQUEST FAILED] ${request.url()}: ${request.failure()?.errorText || 'Unknown error'}`);
  108 |   });
  109 |   page.on('response', response => {
  110 |     if (response.status() >= 400) {
  111 |       console.log(`[PLAYWRIGHT RESPONSE ERROR] [${response.status()}] ${response.url()}`);
  112 |     }
  113 |   });
  114 | 
  115 |   console.log('[PLAYWRIGHT] Starting login procedure...');
  116 |   await loginToSandbox(page, "admin");
  117 |   console.log('[PLAYWRIGHT] Logged in successfully. Navigating to Ingestion Studio...');
  118 |   await page.goto("/en/home?tab=admin-ingestion");
  119 |   await page.waitForTimeout(3000);
  120 |   
  121 |   // 1. Ensure Physics subject is registered
  122 |   await ensurePhysicsSubjectExists(page);
  123 | 
  124 |   console.log('[PLAYWRIGHT] Expanding Ingestion & Crawl Console...');
  125 |   const consoleBtn = page.locator('button').filter({ hasText: /Ingestion & Crawl Console|الاستيراد والزحف/ });
  126 |   await consoleBtn.waitFor({ state: 'visible', timeout: 15000 });
  127 |   
```