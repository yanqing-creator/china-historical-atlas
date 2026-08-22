import { test, expect } from '@playwright/test';
import { layerVisibility } from './helpers.mjs';

test('default period is qinhan with active timeline button and only Han visible', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.maplibregl-canvas', { timeout: 15000 });
  await page.waitForFunction(() => {
    const m = window.__hm.map;
    return m.loaded() && m.getLayer('border-fill-han');
  }, null, { timeout: 15000 });
  await page.waitForSelector('[data-period="qinhan"].tl-btn.active', { timeout: 15000 });
  expect(await layerVisibility(page, 'border-fill-han')).toBe('visible');
});

test('clicking songliaojin shows Liao and hides Han', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.maplibregl-canvas', { timeout: 15000 });
  await page.waitForFunction(() => {
    const m = window.__hm.map;
    return m.loaded() && m.getLayer('border-fill-han');
  }, null, { timeout: 15000 });
  await page.click('[data-period="songliaojin"]');
  expect(await layerVisibility(page, 'border-fill-liao')).toBe('visible');
  expect(await layerVisibility(page, 'border-fill-han')).toBe('none');
});

test('clicking sanguo shows Shu', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.maplibregl-canvas', { timeout: 15000 });
  await page.waitForFunction(() => {
    const m = window.__hm.map;
    return m.loaded() && m.getLayer('border-fill-han');
  }, null, { timeout: 15000 });
  await page.click('[data-period="sanguo"]');
  expect(await layerVisibility(page, 'border-fill-shu')).toBe('visible');
});
