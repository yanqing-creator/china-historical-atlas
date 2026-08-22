import { test, expect } from '@playwright/test';

test('page loads with map canvas, title and no page errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.waitForSelector('.maplibregl-canvas', { timeout: 15000 });
  await expect(page.locator('#title .cn')).toContainText('华夏舆图');
  expect(errors).toEqual([]);
});
