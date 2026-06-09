const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

async function run() {
  const outputDir = path.resolve(__dirname, '../../artifacts/builder4_visual_pack');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('Launching browser...');
  const browser = await chromium.launch();

  const combinations = [
    { locale: 'en', theme: 'light', width: 1440, height: 900, name: 'desktop_light_en' },
    { locale: 'en', theme: 'dark', width: 1440, height: 900, name: 'desktop_dark_en' },
    { locale: 'ar', theme: 'light', width: 1440, height: 900, name: 'desktop_light_ar' },
    { locale: 'ar', theme: 'dark', width: 1440, height: 900, name: 'desktop_dark_ar' },
    { locale: 'en', theme: 'light', width: 360, height: 640, name: 'mobile_light_en' },
    { locale: 'en', theme: 'dark', width: 360, height: 640, name: 'mobile_dark_en' },
    { locale: 'ar', theme: 'light', width: 360, height: 640, name: 'mobile_light_ar' },
    { locale: 'ar', theme: 'dark', width: 360, height: 640, name: 'mobile_dark_ar' }
  ];

  for (const combo of combinations) {
    console.log(`Processing: ${combo.name}...`);
    const context = await browser.newContext({
      viewport: { width: combo.width, height: combo.height },
      locale: combo.locale === 'ar' ? 'ar-SA' : 'en-US',
      timezoneId: 'Asia/Riyadh',
      deviceScaleFactor: 1
    });

    const page = await context.newPage();
    const url = `http://localhost:3000/${combo.locale}`;
    
    // Set theme before navigation using init script
    await context.addInitScript((theme) => {
      window.localStorage.setItem('fahem_theme', theme);
    }, combo.theme);

    await page.goto(url, { waitUntil: 'domcontentloaded' });

    // Apply theme class to documentElement in case it didn't pick up yet
    await page.evaluate((theme) => {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
      }
    }, combo.theme);

    // Wait for animations and content to settle
    await page.waitForTimeout(3000);

    const screenshotPath = path.join(outputDir, `${combo.name}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Saved screenshot to ${screenshotPath}`);

    await context.close();
  }

  await browser.close();
  console.log('Done generating eyeball pack!');
}

run().catch(err => {
  console.error('Error taking screenshots:', err);
  process.exit(1);
});
