import { test, expect } from '@playwright/test';

async function waitForLoadedMap(page) {
  await page.goto('/');
  await page.waitForSelector('.maplibregl-canvas', { timeout: 15000 });
  await page.waitForFunction(() => {
    const m = window.__hm.map;
    return m.loaded() && m.getLayer('border-fill-han');
  }, null, { timeout: 15000 });
}

async function clickCityMarker(page, id) {
  await page.locator(`.city-marker[data-city-id="${id}"]`).click();
}

test('clicking xian city marker opens panel with 6 tabs', async ({ page }) => {
  await waitForLoadedMap(page);
  const marker = page.locator('.city-marker[data-city-id="xian"]');
  await marker.waitFor({ timeout: 15000 });
  await clickCityMarker(page, 'xian');
  await page.waitForSelector('#panel:not(.closed)', { timeout: 15000 });
  await expect(page.locator('#panel .ptab')).toHaveCount(6);
  await expect(page.locator('#panel h2')).toContainText('西安');
});

test('guide tab shows 3-day itinerary with day 1 content', async ({ page }) => {
  await waitForLoadedMap(page);
  const marker = page.locator('.city-marker[data-city-id="xian"]');
  await marker.waitFor({ timeout: 15000 });
  await clickCityMarker(page, 'xian');
  await page.waitForSelector('#panel:not(.closed)', { timeout: 15000 });
  await page.click('#panel .ptab[data-tab="guide"]');
  await expect(page.locator('#panel .guide-body')).toContainText('第1天');
  await expect(page.locator('#panel .guide-body .guide-day')).toHaveCount(3);
});

test('lang button toggles english and retranslates panel tabs', async ({ page }) => {
  await waitForLoadedMap(page);
  const marker = page.locator('.city-marker[data-city-id="xian"]');
  await marker.waitFor({ timeout: 15000 });
  await clickCityMarker(page, 'xian');
  await page.waitForSelector('#panel:not(.closed)', { timeout: 15000 });
  await page.click('#lang-btn');
  await expect(page.locator('body')).toHaveClass(/lang-en/);
  await expect(page.locator('#panel .ptab[data-tab="guide"]')).toHaveText('Travel Guide');
  await page.click('#panel .ptab[data-tab="guide"]');
  await expect(page.locator('#panel .guide-body')).toContainText('Day 1');
});

test('kaifeng panel in songliaojin period shows ancient name', async ({ page }) => {
  await waitForLoadedMap(page);
  await page.click('[data-period="songliaojin"]');
  await page.waitForFunction(() => !window.__hm.map.isMoving(), null, { timeout: 15000 });
  const marker = page.locator('.city-marker[data-city-id="kaifeng"]');
  await marker.waitFor({ timeout: 15000 });
  await clickCityMarker(page, 'kaifeng');
  await page.waitForSelector('#panel:not(.closed)', { timeout: 15000 });
  await expect(page.locator('#panel h2')).toContainText('汴京');
});

test('clicking event marker opens event panel', async ({ page }) => {
  await waitForLoadedMap(page);
  const marker = page.locator('.event-marker[data-event-id="unify-qin"]');
  await marker.waitFor({ timeout: 15000 });
  await marker.click();
  await page.waitForSelector('#panel:not(.closed)', { timeout: 15000 });
  await expect(page.locator('#panel h2')).toHaveText('历史事件');
  await expect(page.locator('#panel .event-body h3')).toHaveText('秦统一六国');
  await expect(page.locator('#panel .event-year')).toContainText('公元前 221 年');
});

