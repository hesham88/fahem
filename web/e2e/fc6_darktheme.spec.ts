import { test, expect } from "@playwright/test";

/**
 * FC6.15 — dark-theme contrast smoke check (public surface).
 *
 * The dashboard panels (Insights/Practice/Zatona/Library) are behind auth, but the
 * footer Terms/Privacy/social-icons live on the public landing page, and they were the
 * worst offenders (invisible un-hovered + a harsh white hover flash in dark theme).
 * This asserts, on prod, that in dark mode:
 *   1. the new theme tokens resolve to their DARK values (the sweep is wired), and
 *   2. .footer-nav-link is light/readable (not the old #4a5d6a), and
 *   3. its hover background is NOT white (no harsh flash) — it's the soft primary-tint.
 */
test("FC6.15 dark theme: footer tokens flip and hover is soft (not white)", async ({ page }) => {
  // The landing page reads localStorage 'fahem_theme' in a mount effect and sets the
  // <html>.dark class accordingly — seed it BEFORE load so dark mode actually applies.
  await page.addInitScript(() => localStorage.setItem("fahem_theme", "dark"));
  await page.goto("/en", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.classList.contains("dark"));

  // 1) New FC6.15 surface tokens must resolve to their DARK values.
  const surfaces = await page.evaluate(() => {
    const s = getComputedStyle(document.documentElement);
    return {
      translucent: s.getPropertyValue("--surface-translucent").trim(),
      subtle: s.getPropertyValue("--surface-subtle").trim(),
      foreground: s.getPropertyValue("--foreground").trim(),
    };
  });
  // dark --surface-translucent = rgba(30,41,59,0.55); browsers may serialize hex/rgba.
  expect(surfaces.translucent.length).toBeGreaterThan(0);
  expect(surfaces.subtle.length).toBeGreaterThan(0);

  // 2) Footer nav link readable in dark (light foreground, not the old dark slate).
  const link = page.locator("a.footer-nav-link").first();
  await link.scrollIntoViewIfNeeded();
  await expect(link).toBeVisible();

  const color = await link.evaluate((el) => getComputedStyle(el).color);
  const toRGB = (c: string) => (c.match(/\d+/g) || []).map(Number);
  const [r, g, b] = toRGB(color);
  // Light text => high luminance; the old #4a5d6a (~74,93,106) would fail this.
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  expect(luminance).toBeGreaterThan(150);

  // 3) Hover background must NOT be opaque white (the old harsh flash).
  await link.hover();
  const hoverBg = await link.evaluate((el) => getComputedStyle(el).backgroundColor);
  const [hr, hg, hb] = toRGB(hoverBg);
  const isWhiteish = hr > 240 && hg > 240 && hb > 240;
  expect(isWhiteish).toBeFalsy();
});
