import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 375, height: 667 } });

test('mobile: legend starts collapsed by default', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('#legend', { timeout: 15000 });
  await expect(page.locator('#legend')).toHaveClass(/collapsed/);
});

test('mobile: clicking legend title expands then collapses', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('#legend', { timeout: 15000 });
  await page.locator('#legend h4').first().click();
  await expect(page.locator('#legend')).not.toHaveClass(/collapsed/);
  await page.locator('#legend h4').first().click();
  await expect(page.locator('#legend')).toHaveClass(/collapsed/);
});

test('mobile: city marker dot computed size is enlarged (>= 12px)', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.city-marker[data-city-id="xian"]', { timeout: 15000 });
  const size = await page.locator('.city-marker[data-city-id="xian"] .dot').evaluate((el) => {
    const s = getComputedStyle(el);
    return parseFloat(s.width);
  });
  expect(size).toBeGreaterThanOrEqual(12);
});

test('mobile: city marker opens the detail panel on tap', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.city-marker[data-city-id="xian"]', { timeout: 15000 });
  await page.locator('.city-marker[data-city-id="xian"]').click();
  await page.waitForSelector('#panel:not(.closed)', { timeout: 5000 });
  await expect(page.locator('#panel .panel-head h2')).toContainText('西安');
});

test('desktop: legend starts expanded', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await page.waitForSelector('#legend', { timeout: 15000 });
  await expect(page.locator('#legend')).not.toHaveClass(/collapsed/);
});
