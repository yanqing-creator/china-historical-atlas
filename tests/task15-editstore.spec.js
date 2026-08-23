import { test, expect } from '@playwright/test';

const EDIT_KEY = 'hmap-city-edits';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate((k) => localStorage.removeItem(k), EDIT_KEY);
});

async function loadStore(page) {
  return page.evaluateHandle(async () => {
    const m = await import('/src/editstore.js');
    return m;
  });
}

test('saveCity stores and getOverrides returns the overrides', async ({ page }) => {
  const store = await loadStore(page);
  await store.evaluate((m) => m.saveCity('xian', {
    attractions_zh: ['兵马俑', '大雁塔'],
    attractions_en: ['Terracotta Army', 'Big Wild Goose Pagoda'],
    food_zh: ['泡馍'], food_en: ['Pita bread soup'],
    guide_zh: [{ day: '第1天', title: '城墙', items: ['骑行'] }],
    guide_en: [{ day: 'Day 1', title: 'City wall', items: ['cycling'] }]
  }));
  const data = await store.evaluate((m) => m.getOverrides('xian'));
  expect(data.attractions_zh).toEqual(['兵马俑', '大雁塔']);
  expect(data.guide_zh[0].day).toBe('第1天');
  expect(await store.evaluate((m) => m.hasEdit('xian'))).toBe(true);
});

test('resetCity clears the override for that city only', async ({ page }) => {
  const store = await loadStore(page);
  await store.evaluate((m) => m.saveCity('xian', {
    attractions_zh: ['x'], attractions_en: ['x'], food_zh: ['f'], food_en: ['f'],
    guide_zh: [{ day: 'd', title: 't', items: ['i'] }], guide_en: [{ day: 'd', title: 't', items: ['i'] }]
  }));
  await store.evaluate((m) => m.saveCity('beijing', {
    attractions_zh: ['b'], attractions_en: ['b'], food_zh: ['bf'], food_en: ['bf'],
    guide_zh: [{ day: 'd', title: 't', items: ['i'] }], guide_en: [{ day: 'd', title: 't', items: ['i'] }]
  }));
  await store.evaluate((m) => m.resetCity('xian'));
  expect(await store.evaluate((m) => m.hasEdit('xian'))).toBe(false);
  expect(await store.evaluate((m) => m.hasEdit('beijing'))).toBe(true);
});

test('applyOverrides merges overrides into content without mutating it', async ({ page }) => {
  const store = await loadStore(page);
  const base = {
    name_zh: '西安', history_zh: '十三朝古都', attractions_zh: ['默认景点'], food_zh: ['默认美食'],
    guide_zh: [{ day: '第1天', title: '默认', items: ['x'] }], attractions_en: ['Default'], food_en: ['Default'],
    guide_en: [{ day: 'Day 1', title: 'Default', items: ['x'] }]
  };
  await store.evaluate((m) => m.saveCity('xian', {
    attractions_zh: ['编辑景点'], attractions_en: ['Edited'], food_zh: ['编辑美食'], food_en: ['Edited food'],
    guide_zh: [{ day: '第1天', title: '编辑标题', items: ['y'] }], guide_en: [{ day: 'Day 1', title: 'Edited', items: ['y'] }]
  }));
  const merged = await store.evaluate((m, base) => m.applyOverrides(JSON.parse(JSON.stringify(base)), 'xian'), base);
  expect(merged.attractions_zh).toEqual(['编辑景点']);
  expect(merged.history_zh).toBe('十三朝古都');
  expect(merged.guide_zh[0].title).toBe('编辑标题');
  expect(base.attractions_zh).toEqual(['默认景点']);
});

test('corrupted storage is ignored (treated as no overrides)', async ({ page }) => {
  await page.evaluate((k) => localStorage.setItem(k, '{not valid json'), EDIT_KEY);
  const store = await loadStore(page);
  expect(await store.evaluate((m) => m.hasEdit('xian'))).toBe(false);
  const merged = await store.evaluate((m) => m.applyOverrides({ name_zh: '西安' }, 'xian'));
  expect(merged.name_zh).toBe('西安');
});
