import { test, expect } from '@playwright/test';

async function waitForLoadedMap(page) {
  await page.goto('/');
  await page.waitForSelector('.maplibregl-canvas', { timeout: 15000 });
  await page.waitForFunction(() => {
    const m = window.__hm.map;
    return m.loaded() && m.getLayer('border-fill-han');
  }, null, { timeout: 15000 });
}

test('qinhan default shows unify-qin event marker with bilingual name label', async ({ page }) => {
  await waitForLoadedMap(page);
  const marker = page.locator('.event-marker[data-event-id="unify-qin"]');
  await marker.waitFor({ timeout: 15000 });
  await expect(marker.locator('.label.cn')).toHaveText('秦统一六国');
  await expect(marker.locator('.label.en')).toHaveText('Qin Unifies the Six States');
});

test('switching period refreshes event markers', async ({ page }) => {
  await waitForLoadedMap(page);
  await page.waitForSelector('.event-marker[data-event-id="unify-qin"]', { timeout: 15000 });
  await page.click('[data-period="yuanmingqing"]');
  await page.waitForSelector('.event-marker[data-event-id="humen"]', { timeout: 15000 });
  expect(await page.locator('.event-marker[data-event-id="unify-qin"]').count()).toBe(0);
});
