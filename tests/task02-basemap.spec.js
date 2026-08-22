import { test, expect } from '@playwright/test';
import { hasLayer } from './helpers.mjs';

test('antique basemap renders land, rivers and lakes layers with land data', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.waitForSelector('.maplibregl-canvas', { timeout: 15000 });
  await page.waitForFunction(() => {
    const m = window.__hm.map;
    return m.loaded() && !!m.getLayer('land-fill') && !!m.getLayer('river-line') && !!m.getLayer('lake-fill');
  }, null, { timeout: 15000 });
  expect(await hasLayer(page, 'land-fill')).toBe(true);
  expect(await hasLayer(page, 'river-line')).toBe(true);
  expect(await hasLayer(page, 'lake-fill')).toBe(true);
  const res = await page.request.get('/data/basemap/land.geojson');
  expect(res.status()).toBe(200);
  expect(errors).toEqual([]);
});
