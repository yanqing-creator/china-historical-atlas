import { test, expect } from '@playwright/test';

async function waitForLoadedMap(page) {
  await page.goto('/');
  await page.waitForSelector('.maplibregl-canvas', { timeout: 15000 });
  await page.waitForFunction(() => {
    const m = window.__hm.map;
    return m.loaded() && m.getLayer('border-fill-han');
  }, null, { timeout: 15000 });
}

test('legend renders with 7 items including Great Wall', async ({ page }) => {
  await waitForLoadedMap(page);
  await page.waitForSelector('#legend .lg-item', { timeout: 15000 });
  await expect(page.locator('#legend .lg-item')).toHaveCount(7);
  await expect(page.locator('#legend')).toContainText('长城');
  await expect(page.locator('#legend h4.cn')).toHaveText('图例');
  await expect(page.locator('#legend h4.en')).toHaveText('Legend');
});

test('clicking legend title toggles collapsed class', async ({ page }) => {
  await waitForLoadedMap(page);
  await page.waitForSelector('#legend h4.cn', { timeout: 15000 });
  await expect(page.locator('#legend')).not.toHaveClass(/collapsed/);
  await page.click('#legend h4.cn');
  await expect(page.locator('#legend')).toHaveClass(/collapsed/);
  await page.click('#legend h4.cn');
  await expect(page.locator('#legend')).not.toHaveClass(/collapsed/);
});

test('switching period re-renders legend body', async ({ page }) => {
  await waitForLoadedMap(page);
  await page.waitForSelector('#legend-body .lg-item', { timeout: 15000 });
  await page.evaluate(() => { window.__lgNode = document.querySelector('#legend-body .lg-item'); });
  await page.click('[data-period="suitang"]');
  await page.waitForFunction(() => {
    const cur = document.querySelector('#legend-body .lg-item');
    return cur && cur !== window.__lgNode;
  }, null, { timeout: 15000 });
  await expect(page.locator('#legend-body .lg-item')).toHaveCount(7);
});

test('mobile viewport turns panel into bottom drawer with wrapping topbar', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await waitForLoadedMap(page);
  const box = await page.locator('#panel').boundingBox();
  expect(box).not.toBeNull();
  expect(Math.abs(box.width - 375)).toBeLessThanOrEqual(1);
  expect(Math.abs(box.y + box.height - 667)).toBeLessThanOrEqual(2);
  const order = await page.evaluate(() => getComputedStyle(document.getElementById('timeline')).order);
  expect(order).toBe('3');
  const wrap = await page.evaluate(() => getComputedStyle(document.getElementById('topbar')).flexWrap);
  expect(wrap).toBe('wrap');
  await expect(page.locator('.maplibregl-canvas')).toBeVisible();
});
