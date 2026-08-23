import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.removeItem('hmap-city-edits'));
});

const STUB = {
  name_zh: '西安',
  attractions_zh: ['兵马俑', '大雁塔'],
  attractions_en: ['Terracotta Army', 'Big Wild Goose Pagoda'],
  food_zh: ['羊肉泡馍'],
  food_en: ['Pita bread soup'],
  guide_zh: [{ day: '第1天', title: '城墙', items: ['骑行'] }],
  guide_en: [{ day: 'Day 1', title: 'City wall', items: ['cycling'] }]
};

async function openEditorHarness(page, content) {
  await page.evaluate(async (c) => {
    const mod = await import('/src/ui/editor.js');
    window.__saveResult = null;
    window.__saveCount = 0;
    mod.openEditor('xian', c, (data) => {
      window.__saveResult = data;
      window.__saveCount += 1;
    });
  }, content);
}

async function openCityPanel(page, id) {
  await page.waitForSelector(`.city-marker[data-city-id="${id}"]`, { timeout: 15000 });
  await page.locator(`.city-marker[data-city-id="${id}"]`).click();
  await page.waitForSelector('#panel:not(.closed)', { timeout: 15000 });
}

const OVERRIDE_XIAN = {
  attractions_zh: ['编辑后景点'],
  attractions_en: ['Edited'],
  food_zh: ['x'],
  food_en: ['x'],
  guide_zh: [{ day: '第1天', title: 't', items: ['i'] }],
  guide_en: [{ day: 'Day 1', title: 't', items: ['i'] }]
};

test('edit toggle flips isEditMode, active class, and dispatches edit-mode-change', async ({ page }) => {
  await page.evaluate(() => {
    window.__editEvents = [];
    document.addEventListener('edit-mode-change', (e) => window.__editEvents.push(e.detail.on));
  });
  await page.locator('#edit-toggle').click();
  expect(await page.evaluate(() => window.isEditMode)).toBe(true);
  await expect(page.locator('#edit-toggle')).toHaveClass(/active/);
  await page.locator('#edit-toggle').click();
  expect(await page.evaluate(() => window.isEditMode)).toBe(false);
  await expect(page.locator('#edit-toggle')).not.toHaveClass(/active/);
  expect(await page.evaluate(() => window.__editEvents)).toEqual([true, false]);
});

test('openEditor renders modal with title and controls', async ({ page }) => {
  await openEditorHarness(page, STUB);
  await page.waitForSelector('#editor-modal:not(.hidden)', { timeout: 5000 });
  await expect(page.locator('#editor-modal .editor-box h3')).toContainText('西安');
  await expect(page.locator('#editor-modal .add-attr')).toHaveCount(1);
  await expect(page.locator('#editor-modal .del-attr')).toHaveCount(2);
  await expect(page.locator('#editor-modal .add-food')).toHaveCount(1);
  await expect(page.locator('#editor-modal .add-guide-item')).toHaveCount(2);
  await expect(page.locator('#editor-modal .ed-guide-day')).toHaveCount(2);
  await expect(page.locator('#editor-modal #editor-save')).toHaveCount(1);
  await expect(page.locator('#editor-modal #editor-cancel')).toHaveCount(1);
});

test('add a city attraction, save, and onSave receives the new data', async ({ page }) => {
  await openEditorHarness(page, STUB);
  await page.waitForSelector('#editor-modal:not(.hidden)', { timeout: 5000 });
  await page.locator('#editor-modal .ed-block').first().locator('.add-attr').click();
  const lastAttr = page.locator('#editor-modal .ed-block').first().locator('.attr-row').last().locator('input');
  await lastAttr.fill('新测试景点');
  await page.locator('#editor-save').click();
  await page.waitForSelector('#editor-modal', { state: 'detached', timeout: 5000 });
  const data = await page.evaluate(() => window.__saveResult);
  expect(data.attractions_zh).toContain('新测试景点');
  expect(data.attractions_zh).toEqual(['兵马俑', '大雁塔', '新测试景点']);
  expect(await page.evaluate(() => window.__saveCount)).toBe(1);
});

test('remove a city attraction drops it from saved data', async ({ page }) => {
  await openEditorHarness(page, STUB);
  await page.waitForSelector('#editor-modal:not(.hidden)', { timeout: 5000 });
  const rows = page.locator('#editor-modal .ed-block').first().locator('.attr-row');
  await rows.first().locator('.del-attr').click();
  await page.locator('#editor-save').click();
  await page.waitForSelector('#editor-modal', { state: 'detached', timeout: 5000 });
  const data = await page.evaluate(() => window.__saveResult);
  expect(data.attractions_zh).toEqual(['大雁塔']);
});

test('add and remove guide items, save persists the edits', async ({ page }) => {
  await openEditorHarness(page, STUB);
  await page.waitForSelector('#editor-modal:not(.hidden)', { timeout: 5000 });
  await page.locator('#editor-modal .ed-guide-day').first().locator('.add-guide-item').click();
  const lastItem = page.locator('#editor-modal .ed-guide-day').first().locator('.guide-item-row').last().locator('input');
  await lastItem.fill('夜游钟楼');
  await page.locator('#editor-modal .ed-guide-day').first().locator('.guide-item-row').first().locator('.del-guide-item').click();
  await page.locator('#editor-save').click();
  await page.waitForSelector('#editor-modal', { state: 'detached', timeout: 5000 });
  const data = await page.evaluate(() => window.__saveResult);
  expect(data.guide_zh[0].items).toEqual(['夜游钟楼']);
});

test('cancel closes the modal without saving', async ({ page }) => {
  await openEditorHarness(page, STUB);
  await page.waitForSelector('#editor-modal:not(.hidden)', { timeout: 5000 });
  await page.locator('#editor-modal .ed-block').first().locator('.add-attr').click();
  await page.locator('#editor-cancel').click();
  await page.waitForSelector('#editor-modal', { state: 'detached', timeout: 5000 });
  expect(await page.evaluate(() => window.__saveCount)).toBe(0);
});

test('save filters empty rows out of list fields', async ({ page }) => {
  await openEditorHarness(page, STUB);
  await page.waitForSelector('#editor-modal:not(.hidden)', { timeout: 5000 });
  await page.locator('#editor-modal .ed-block').first().locator('.add-attr').click();
  await page.locator('#editor-modal .ed-block').first().locator('.add-attr').click();
  await page.locator('#editor-save').click();
  await page.waitForSelector('#editor-modal', { state: 'detached', timeout: 5000 });
  const data = await page.evaluate(() => window.__saveResult);
  expect(data.attractions_zh).toEqual(['兵马俑', '大雁塔']);
});

test('default: no edit button without edit mode', async ({ page }) => {
  await openCityPanel(page, 'xian');
  await expect(page.locator('#panel .edit-btn')).toHaveCount(0);
  await expect(page.locator('#panel .restore-btn')).toHaveCount(0);
});

test('turning on edit mode reveals edit button', async ({ page }) => {
  await page.locator('#edit-toggle').click();
  await openCityPanel(page, 'xian');
  await expect(page.locator('#panel .edit-btn')).toHaveCount(1);
  await expect(page.locator('#panel .restore-btn')).toHaveCount(0);
});

test('closing edit mode hides edit button but saved edits still render', async ({ page }) => {
  await page.evaluate((o) => {
    localStorage.setItem('hmap-city-edits', JSON.stringify({ xian: o }));
  }, OVERRIDE_XIAN);
  await page.locator('#edit-toggle').click();
  await openCityPanel(page, 'xian');
  await expect(page.locator('#panel .edit-btn')).toHaveCount(1);
  await page.click('#panel .ptab[data-tab="attractions"]');
  await expect(page.locator('#panel .panel-body')).toContainText('编辑后景点');
  await page.locator('#edit-toggle').click();
  await page.waitForTimeout(300);
  await page.click('#panel .ptab[data-tab="attractions"]');
  await expect(page.locator('#panel .edit-btn')).toHaveCount(0);
  await expect(page.locator('#panel .panel-body')).toContainText('编辑后景点');
});

test('full flow: edit attraction via panel, save, panel reflects it and shows restore', async ({ page }) => {
  await page.locator('#edit-toggle').click();
  await openCityPanel(page, 'xian');
  await page.locator('#panel .edit-btn').click();
  await page.waitForSelector('#editor-modal:not(.hidden)', { timeout: 5000 });
  await page.locator('#editor-modal .ed-block').first().locator('.add-attr').click();
  const lastAttr = page.locator('#editor-modal .ed-block').first().locator('.attr-row').last().locator('input');
  await lastAttr.fill('新测试景点');
  await page.locator('#editor-save').click();
  await page.waitForSelector('#editor-modal', { state: 'detached', timeout: 5000 });
  await page.click('#panel .ptab[data-tab="attractions"]');
  await expect(page.locator('#panel .panel-body')).toContainText('新测试景点');
  await expect(page.locator('#panel .restore-btn')).toHaveCount(1);
});

test('saved edits persist after page reload', async ({ page }) => {
  await page.locator('#edit-toggle').click();
  await openCityPanel(page, 'xian');
  await page.locator('#panel .edit-btn').click();
  await page.waitForSelector('#editor-modal:not(.hidden)', { timeout: 5000 });
  await page.locator('#editor-modal .ed-block').first().locator('.add-attr').click();
  const lastAttr = page.locator('#editor-modal .ed-block').first().locator('.attr-row').last().locator('input');
  await lastAttr.fill('持久化景点');
  await page.locator('#editor-save').click();
  await page.waitForSelector('#editor-modal', { state: 'detached', timeout: 5000 });
  await page.reload();
  await page.locator('#edit-toggle').click();
  await openCityPanel(page, 'xian');
  await page.click('#panel .ptab[data-tab="attractions"]');
  await expect(page.locator('#panel .panel-body')).toContainText('持久化景点');
  await expect(page.locator('#panel .restore-btn')).toHaveCount(1);
});

test('restore default resets the city content and clears storage', async ({ page }) => {
  await page.evaluate((o) => {
    localStorage.setItem('hmap-city-edits', JSON.stringify({ xian: o }));
  }, OVERRIDE_XIAN);
  await page.locator('#edit-toggle').click();
  await openCityPanel(page, 'xian');
  await page.click('#panel .ptab[data-tab="attractions"]');
  await expect(page.locator('#panel .panel-body')).toContainText('编辑后景点');
  await page.locator('#panel .restore-btn').click();
  await page.waitForSelector('#restore-confirm', { timeout: 5000 });
  await page.locator('#restore-confirm-yes').click();
  await page.waitForSelector('#restore-confirm', { state: 'detached', timeout: 5000 });
  await expect(page.locator('#panel .restore-btn')).toHaveCount(0);
  await expect(page.locator('#panel .panel-body')).not.toContainText('编辑后景点');
  await expect(page.locator('#panel .panel-body')).toContainText('兵马俑');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('hmap-city-edits')))).toEqual({});
});
