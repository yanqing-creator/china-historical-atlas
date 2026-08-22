import { test, expect } from '@playwright/test';

async function waitForLoadedMap(page) {
  await page.goto('/');
  await page.waitForSelector('.maplibregl-canvas', { timeout: 15000 });
  await page.waitForFunction(() => {
    const m = window.__hm.map;
    return m.loaded() && m.getLayer('border-fill-han');
  }, null, { timeout: 15000 });
}

async function openGuideTab(page, id = 'xian') {
  const marker = page.locator(`.city-marker[data-city-id="${id}"]`);
  await marker.waitFor({ timeout: 15000 });
  await marker.click();
  await page.waitForSelector('#panel:not(.closed)', { timeout: 15000 });
  await page.click('#panel .ptab[data-tab="guide"]');
}

async function saveFakeConfig(page) {
  await page.click('#settings-btn');
  await page.fill('#cfg-key', 'sk-test-fake');
  await page.fill('#cfg-base', 'http://127.0.0.1:9/v1');
  await page.fill('#cfg-model', 'test-model');
  await page.click('#cfg-save');
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
});

test('guide tab shows no AI button without llm config', async ({ page }) => {
  await waitForLoadedMap(page);
  await openGuideTab(page);
  await expect(page.locator('#panel #ai-btn')).toHaveCount(0);
});

test('saving config via settings modal shows AI button in guide tab', async ({ page }) => {
  await waitForLoadedMap(page);
  await saveFakeConfig(page);
  await openGuideTab(page);
  await expect(page.locator('#panel #ai-btn')).toBeVisible();
});

test('clicking AI button with unreachable base URL shows error', async ({ page }) => {
  await waitForLoadedMap(page);
  await saveFakeConfig(page);
  await openGuideTab(page);
  await page.click('#panel #ai-btn');
  await expect(page.locator('#panel .ai-error')).toBeVisible({ timeout: 15000 });
});
