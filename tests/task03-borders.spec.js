import { test, expect } from '@playwright/test';
import { hasLayer, layerVisibility } from './helpers.mjs';

const BORDER_IDS = ['han', 'wei', 'shu', 'wu', 'tang', 'north-song', 'liao', 'xixia', 'dali', 'qing'];

test('renders fill and line layers for all ten historical polities, visible by default', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.waitForSelector('.maplibregl-canvas', { timeout: 15000 });
  await page.waitForFunction(() => {
    const m = window.__hm.map;
    return m.loaded() && m.getLayer('border-fill-han') && m.getLayer('border-line-qing');
  }, null, { timeout: 15000 });
  for (const id of BORDER_IDS) {
    expect(await hasLayer(page, `border-fill-${id}`)).toBe(true);
    expect(await hasLayer(page, `border-line-${id}`)).toBe(true);
  }
  expect(await layerVisibility(page, 'border-fill-han')).toBe('visible');
  expect(await layerVisibility(page, 'border-line-han')).toBe('visible');
  const res = await page.request.get('/data/geo/borders.geojson');
  expect(res.status()).toBe(200);
  expect(errors).toEqual([]);
});
