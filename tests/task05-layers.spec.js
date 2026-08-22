import { test, expect } from '@playwright/test';
import { layerVisibility } from './helpers.mjs';

async function waitForLoadedMap(page) {
  await page.goto('/');
  await page.waitForSelector('.maplibregl-canvas', { timeout: 15000 });
  await page.waitForFunction(() => {
    const m = window.__hm.map;
    return m.loaded() && m.getLayer('border-fill-han');
  }, null, { timeout: 15000 });
}

test('qinhan default shows xian marker and no shanghai marker', async ({ page }) => {
  await waitForLoadedMap(page);
  await page.waitForSelector('.city-marker[data-city-id="xian"]', { timeout: 15000 });
  expect(await page.locator('.city-marker[data-city-id="shanghai"]').count()).toBe(0);
});

test('switching to yuanmingqing shows shanghai marker', async ({ page }) => {
  await waitForLoadedMap(page);
  await page.waitForSelector('.city-marker[data-city-id="xian"]', { timeout: 15000 });
  await page.click('[data-period="yuanmingqing"]');
  await page.waitForSelector('.city-marker[data-city-id="shanghai"]', { timeout: 15000 });
});

test('city-dot circle layer follows period filter', async ({ page }) => {
  await waitForLoadedMap(page);
  await page.waitForSelector('.city-marker[data-city-id="xian"]', { timeout: 15000 });
  const getFilterIds = () => page.evaluate(() => {
    const f = window.__hm.map.getFilter('city-dot');
    return f && f[2] && f[2][1] ? f[2][1] : [];
  });
  let ids = await getFilterIds();
  expect(ids).not.toContain('shanghai');
  await page.click('[data-period="yuanmingqing"]');
  await page.waitForSelector('.city-marker[data-city-id="shanghai"]', { timeout: 15000 });
  ids = await getFilterIds();
  expect(ids).toContain('shanghai');
});

test('yuanmingqing shows ming wall and jinghang canal, hides qinhan wall', async ({ page }) => {
  await waitForLoadedMap(page);
  await page.click('[data-period="yuanmingqing"]');
  expect(await layerVisibility(page, 'wall-ming-line')).toBe('visible');
  expect(await layerVisibility(page, 'canal-jinghang-line')).toBe('visible');
  expect(await layerVisibility(page, 'wall-qinhan-line')).toBe('none');
});
