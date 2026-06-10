import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// Helper to log in to sandbox with a specific persona
async function loginToSandbox(page: any, persona: "student" | "teacher" | "admin", email = "evaluation.judge@fahem.pro") {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.goto("/");
  
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem("demo_tutorial_skipped", "true");
  });
  await page.reload();

  const selectSelector = "#persona-select";
  await page.waitForSelector(selectSelector, { timeout: 15000 });
  await page.selectOption(selectSelector, persona);

  const emailSelector = "#sandbox-email-input";
  await page.fill(emailSelector, email);

  const submitBtn = page.locator("#sandbox-submit-button");
  await submitBtn.click();

  await page.waitForURL("**/home*", { timeout: 25000 });
}

// Function to ensure Physics subject exists under lib_openstax -> openstax_all
async function ensurePhysicsSubjectExists(page: any) {
  console.log('[PLAYWRIGHT] Navigating to Curriculum Builder to verify Physics subject...');
  await page.locator('button').filter({ hasText: /Curriculum Builder|منشئ المناهج/ }).click();
  await page.waitForTimeout(3000);

  console.log('[PLAYWRIGHT] Selecting OpenStax Library from sidebar picker...');
  const sidebarSelect = page.locator('.library-picker-panel select');
  await sidebarSelect.waitFor({ state: 'visible', timeout: 15000 });
  await sidebarSelect.selectOption('lib_openstax');
  await page.waitForTimeout(3000);

  console.log('[PLAYWRIGHT] Locating OpenStax Library branch in the explorer tree...');
  const libBranch = page.locator('.tree-branch').filter({ hasText: /OpenStax Library|مكتبة أوبن ستاكس/ }).first();
  await libBranch.waitFor({ state: 'attached', timeout: 15000 });

  // Expand OpenStax Library branch if collapsed
  const isLibExpanded = await libBranch.locator('.tree-children').count() > 0;
  if (!isLibExpanded) {
    console.log('[PLAYWRIGHT] OpenStax Library branch is collapsed. Clicking expand toggle...');
    const expandToggle = libBranch.locator('.expand-toggle').first();
    await expandToggle.click({ force: true });
    await page.waitForTimeout(2000);
  }

  console.log('[PLAYWRIGHT] Locating OpenStax curriculum branch...');
  const curBranch = libBranch.locator('.tree-branch').filter({ hasText: /OpenStax/ }).first();
  await curBranch.waitFor({ state: 'attached', timeout: 15000 });

  // Expand OpenStax curriculum branch if collapsed
  const isCurExpanded = await curBranch.locator('.tree-children').count() > 0;
  if (!isCurExpanded) {
    console.log('[PLAYWRIGHT] OpenStax curriculum branch is collapsed. Clicking expand toggle...');
    const expandToggle = curBranch.locator('.expand-toggle').first();
    await expandToggle.click({ force: true });
    await page.waitForTimeout(2000);
  }

  // Check if Physics subject already exists under OpenStax curriculum
  const hasPhysics = await curBranch.locator('.tree-node-title').filter({ hasText: /Physics|الفيزياء/ }).count() > 0;
  if (hasPhysics) {
    console.log('[PLAYWRIGHT] Physics subject already exists under OpenStax curriculum. Excellent!');
  } else {
    console.log('[PLAYWRIGHT] Physics subject not found! Adding Physics subject to OpenStax curriculum...');
    const addSubjBtn = curBranch.locator('button[title*="Subject"], button[title*="مادة"]').first();
    await addSubjBtn.click({ force: true });
    await page.waitForTimeout(2000);

    console.log('[PLAYWRIGHT] Filling Subject Form...');
    const subFormSection = page.locator('section.form-card').filter({ hasText: /Subject|مادة/ }).first();
    await subFormSection.waitFor({ state: 'visible', timeout: 10000 });
    await subFormSection.locator('input').first().fill('Physics');
    await subFormSection.locator('input').nth(1).fill('الفيزياء');

    console.log('[PLAYWRIGHT] Submitting Subject Form...');
    await subFormSection.locator('button.primary-submit-btn, button[type="submit"]').first().click();
    await page.waitForTimeout(4000);
    console.log('[PLAYWRIGHT] Physics subject created successfully!');
  }

  // Go back to Ingestion Console
  console.log('[PLAYWRIGHT] Navigating back to Ingestion & Crawl Console tab...');
  await page.locator('button').filter({ hasText: /Ingestion & Crawl Console|الاستيراد والزحف/ }).click();
  await page.waitForTimeout(2000);
}

test('Ingest and monitor OpenStax Physics book', async ({ page }) => {
  test.setTimeout(1800000); // 30 minutes timeout for the entire test
  
  // Capture browser logs and errors
  page.on('console', msg => {
    console.log(`[BROWSER CONSOLE] [${msg.type().toUpperCase()}] ${msg.text()}`);
  });
  page.on('pageerror', err => {
    console.log(`[BROWSER EXCEPTION] ${err.message}\n${err.stack || ''}`);
  });
  page.on('requestfailed', request => {
    console.log(`[PLAYWRIGHT REQUEST FAILED] ${request.url()}: ${request.failure()?.errorText || 'Unknown error'}`);
  });
  page.on('response', response => {
    if (response.status() >= 400) {
      console.log(`[PLAYWRIGHT RESPONSE ERROR] [${response.status()}] ${response.url()}`);
    }
  });

  console.log('[PLAYWRIGHT] Starting login procedure...');
  await loginToSandbox(page, "admin");
  console.log('[PLAYWRIGHT] Logged in successfully. Navigating to Ingestion Studio...');
  await page.goto("/en/home?tab=admin-ingestion");
  await page.waitForTimeout(3000);
  
  // 1. Ensure Physics subject is registered
  await ensurePhysicsSubjectExists(page);

  console.log('[PLAYWRIGHT] Expanding Ingestion & Crawl Console...');
  const consoleBtn = page.locator('button').filter({ hasText: /Ingestion & Crawl Console|الاستيراد والزحف/ });
  await consoleBtn.waitFor({ state: 'visible', timeout: 15000 });
  
  // Interact with modern custom Dropdown & checkbox elements inside .curriculum-assignment-gateway container
  console.log('[PLAYWRIGHT] Interacting with custom Dropdown components...');
  const gateway = page.locator('.curriculum-assignment-gateway');

  // 1. Library Dropdown Selection
  console.log('[PLAYWRIGHT] Clicking Library Dropdown trigger...');
  const libDropdownTrigger = gateway.locator('.custom-dropdown-container').nth(0).locator('.custom-dropdown-trigger');
  await libDropdownTrigger.click();
  await page.waitForTimeout(1000);

  // Select OpenStax Library
  console.log('[PLAYWRIGHT] Selecting OpenStax Library from floating panel...');
  const libPanel = page.locator('.custom-dropdown-panel');
  await libPanel.waitFor({ state: 'visible', timeout: 5000 });
  const libOptions = libPanel.locator('> div');
  const libOptionCount = await libOptions.count();
  console.log(`[PLAYWRIGHT] Found ${libOptionCount} library options in panel.`);

  let selectedLib = false;
  for (let i = 0; i < libOptionCount; i++) {
    const text = await libOptions.nth(i).innerText();
    console.log(`  > Option ${i}: "${text}"`);
    if (text.includes('OpenStax Library') || text.includes('أوبن ستاكس') || text.toLowerCase().includes('openstax')) {
      await libOptions.nth(i).click();
      selectedLib = true;
      break;
    }
  }
  
  if (!selectedLib) {
    throw new Error("Could not find OpenStax Library in the dropdown list!");
  }
  await page.waitForTimeout(2000);

  // 2. Curriculum Dropdown Selection
  console.log('[PLAYWRIGHT] Clicking Curriculum Dropdown trigger...');
  const curDropdownTrigger = gateway.locator('.custom-dropdown-container').nth(1).locator('.custom-dropdown-trigger');
  await curDropdownTrigger.click();
  await page.waitForTimeout(1000);

  // Select OpenStax Curriculum (openstax_all)
  console.log('[PLAYWRIGHT] Selecting OpenStax Curriculum from floating panel...');
  await libPanel.waitFor({ state: 'visible', timeout: 5000 });
  const curOptions = libPanel.locator('> div');
  const curOptionCount = await curOptions.count();
  console.log(`[PLAYWRIGHT] Found ${curOptionCount} curriculum options in panel.`);

  let selectedCur = false;
  for (let i = 0; i < curOptionCount; i++) {
    const text = await curOptions.nth(i).innerText();
    console.log(`  > Option ${i}: "${text}"`);
    if (text.includes('OpenStax') || text.toLowerCase().includes('openstax')) {
      await curOptions.nth(i).click();
      selectedCur = true;
      break;
    }
  }
  if (!selectedCur) {
    throw new Error("Could not find OpenStax curriculum in the dropdown list!");
  }
  await page.waitForTimeout(2000);

  // 3. Subject Checkbox Selection
  console.log('[PLAYWRIGHT] Checking Subject grid...');
  const subjectGrid = gateway.locator('.subjects-checkbox-grid');
  await subjectGrid.waitFor({ state: 'visible', timeout: 25000 });

  const subjectCheckboxes = subjectGrid.locator('label.subject-checkbox-item');
  const subjectCount = await subjectCheckboxes.count();
  console.log(`[PLAYWRIGHT] Found ${subjectCount} subject checkboxes in grid.`);

  let selectedSubj = false;
  for (let i = 0; i < subjectCount; i++) {
    const text = await subjectCheckboxes.nth(i).innerText();
    console.log(`  > Subject ${i}: "${text}"`);
    if (text.toLowerCase().includes('physics') || text.includes('الفيزياء')) {
      const checkbox = subjectCheckboxes.nth(i).locator('input[type="checkbox"]');
      if (!await checkbox.isChecked()) {
        await checkbox.click();
      }
      selectedSubj = true;
      break;
    }
  }
  if (!selectedSubj) {
    throw new Error("Could not find Physics subject checkbox in the grid!");
  }
  await page.waitForTimeout(2000);
  
  // Fill the Manual Ingestion form
  console.log('[PLAYWRIGHT] Filling manual direct ingestion form...');
  const enTitleInput = page.locator('input[placeholder="Physics Vol 1"]');
  const arTitleInput = page.locator('input[placeholder="الفيزياء الجزء الأول"]');
  const urlInput = page.locator('input[placeholder="https://example.com/textbook.pdf"]');
  
  await enTitleInput.waitFor({ state: 'visible', timeout: 5000 });
  await enTitleInput.fill('Physics Volume 1 (OpenStax)');
  await arTitleInput.fill('الفيزياء الجزء الأول (OpenStax)');
  await urlInput.fill('https://assets.openstax.org/oscms-prodcms/media/documents/Physics-WEB_Sab7RrQ.pdf');
  
  // Select English language for this book inside direct manual ingester
  const languageSelect = page.locator('.manual-ingest-card select').first();
  await languageSelect.selectOption('en');
  await page.waitForTimeout(1000);
  
  // Take screenshot of form
  await page.screenshot({ path: '../evidence/shots/physics_ingest_form_filled.png' });
  
  console.log('[PLAYWRIGHT] Form filled. Submitting direct manual ingestion...');
  const submitBtn = page.locator('.manual-ingest-card button[type="submit"]');
  await submitBtn.click();
  
  console.log('[PLAYWRIGHT] Submitted! Waiting for job card in telemetry hub...');
  await page.waitForTimeout(6000); // Wait for API submission to register and trigger reload
  
  // Monitoring Loop
  let jobFound = false;
  let pollCount = 0;
  const maxPolls = 360; // Poll for up to ~1 hour (very large textbook!)
  let lastPrintedLogIndex = 0;
  
  while (pollCount < maxPolls) {
    pollCount++;
    console.log(`\n--- POLL PROGRESS INTERVAL #${pollCount} ---`);
    
    // Refresh queue jobs UI
    const refreshBtn = page.locator('button').filter({ hasText: /Refresh Queue Status|تحديث قائمة المهام/ });
    if (await refreshBtn.count() > 0) {
      await refreshBtn.click();
      await page.waitForTimeout(2000);
    }
    
    const jobCards = page.locator('.pipeline-job-card');
    const jobCardCount = await jobCards.count();
    
    let targetJobIndex = -1;
    for (let i = 0; i < jobCardCount; i++) {
      const titleText = await jobCards.nth(i).locator('h4').innerText();
      if (titleText.includes('Physics Volume 1 (OpenStax)') || titleText.includes('Physics-WEB_Sab7RrQ')) {
        targetJobIndex = i;
        break;
      }
    }
    
    if (targetJobIndex === -1) {
      console.log('[PLAYWRIGHT] Target Physics Ingestion Job not found in list yet. Waiting...');
      await page.waitForTimeout(8000);
      continue;
    }
    
    jobFound = true;
    const card = jobCards.nth(targetJobIndex);
    
    // Extract metadata
    const idText = await card.locator('.monospace-id').innerText();
    const statusText = await card.locator('.status-pill').innerText();
    const subjectText = await card.locator('span').nth(1).innerText();
    
    // Progress information
    const progressRow = card.locator('.job-progressbar-outer').locator('xpath=..');
    const progressLabel = await progressRow.locator('span').nth(1).innerText(); // Processed/Total pages (X%)
    
    // Extract ETA
    const etaElement = card.locator('strong');
    const etaText = await etaElement.count() > 0 ? await etaElement.innerText() : 'Unknown';
    
    // Active Stage Steps
    const activeStepElement = card.locator('div[style*="pulse-active-step"]');
    let activeStage = 'Unknown';
    if (await activeStepElement.count() > 0) {
      const activeStepContainer = activeStepElement.locator('xpath=..');
      activeStage = await activeStepContainer.locator('span').innerText();
    }
    
    console.log(`[JOB UPDATE] ID: ${idText} | Subject: ${subjectText}`);
    console.log(`[JOB UPDATE] Status: ${statusText} | Active Stage: ${activeStage}`);
    console.log(`[JOB UPDATE] Progress Pages: ${progressLabel} | ETA: ${etaText}`);
    
    // Extract and print only NEW trace logs from job terminal if available
    const terminalLogs = card.locator('.terminal-logs-window div');
    const logCount = await terminalLogs.count();
    if (logCount > lastPrintedLogIndex) {
      console.log('[JOB TRACE LOGS] NEW EVENTS:');
      for (let j = lastPrintedLogIndex; j < logCount; j++) {
        const logLine = await terminalLogs.nth(j).innerText();
        console.log(`  > ${logLine}`);
      }
      lastPrintedLogIndex = logCount;
    }
    
    // Take screenshot during processing periodically
    if (pollCount % 10 === 0) {
      await page.screenshot({ path: `../evidence/shots/physics_progress_poll_${pollCount}.png` });
    }
    
    // Exit conditions
    const normalizedStatus = statusText.trim().toLowerCase();
    if (normalizedStatus === 'completed' || normalizedStatus === 'success' || normalizedStatus.includes('embedded')) {
      console.log('\n[PLAYWRIGHT][SUCCESS] Ingestion completed 100%! Book is fully embedded.');
      await page.screenshot({ path: '../evidence/shots/physics_ingest_completed.png' });
      break;
    }
    
    if (normalizedStatus === 'failed') {
      console.log('\n[PLAYWRIGHT][ERROR] Ingestion Job reported FAILED status.');
      await page.screenshot({ path: '../evidence/shots/physics_ingest_failed.png' });
      break;
    }
    
    // Pause between polls (10 seconds)
    await page.waitForTimeout(10000);
  }
  
  if (!jobFound) {
    console.log('[PLAYWRIGHT][ERROR] Physics Ingestion Job was never found in the telemetry console.');
  }
});
