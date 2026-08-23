# 城市攻略本地编辑功能 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在华夏舆图网页上增加攻略相关字段（景点/美食/3 日攻略）的本地编辑：全局编辑开关、弹窗编辑（中英双栏、增删改）、localStorage 保存、单城恢复默认。

**Architecture:** 覆盖层 + 覆盖式渲染。默认数据（public/content/cities.json）与用户编辑覆盖层隔离：新建 `src/editstore.js` 读写 localStorage 覆盖层并提供合并函数；新建 `src/ui/editor.js` 弹窗表单；`src/ui/panel.js` 渲染取数走 `applyOverrides` 并挂编辑/恢复按钮；`src/main.js` + `index.html` 加全局编辑开关；`src/i18n.js` 补文案。历史/地理/气候字段不可编辑。

**Tech Stack:** Vite + MapLibre GL（既有）、原生 ES Modules、localStorage、@playwright/test（TDD 红绿）。

## Global Constraints

- 所有代码文件不加注释（house rule）
- 提交信息用 conventional commit：`feat:` / `fix:` / `docs:`
- TDD：每个任务先写失败 Playwright 测试 → 红 → 实现 → 绿 → 全量回归 → 构建 → 提交
- `src/main.js` 保留 `window.__hm = { map, setPeriod }` 与 `export { map, currentPeriod }`
- UI 文案中英成对（zh/en），放 `src/i18n.js` UI 字典
- localStorage 键：编辑覆盖 `hmap-city-edits`；仅存被编辑过的城市，不污染源数据文件
- 历史/地理/气候字段不可编辑，仅景点/美食/攻略可编辑
- 语言切换不影响编辑弹窗内中英双栏内容

---

### Task 1: 数据层 src/editstore.js（覆盖层读写 + 合并）

**Files:**
- Create: `src/editstore.js`
- Create: `tests/task15-editstore.spec.js`

**Interfaces:**
- Produces: `src/editstore.js` 导出：
  - `getOverrides(cityId)` → `{ attractions_zh, attractions_en, food_zh, food_en, guide_zh, guide_en } | null`
  - `saveCity(cityId, data)` → void
  - `resetCity(cityId)` → void
  - `hasEdit(cityId)` → boolean
  - `applyOverrides(content, cityId)` → 新对象（content 的浅拷贝，被覆盖字段替换为覆盖值；无覆盖时返回浅拷贝）
  - 覆盖数据结构 `{ [cityId]: { attractions_zh: [], attractions_en: [], food_zh: [], food_en: [], guide_zh: [{day,title,items:[]}], guide_en: [...] } }`，localStorage 键 `hmap-city-edits`

- [ ] **Step 1: 写失败测试（红）**

`tests/task15-editstore.spec.js`：

```js
import { test, expect } from '@playwright/test';

const EDIT_KEY = 'hmap-city-edits';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate((k) => localStorage.removeItem(k), EDIT_KEY);
});

async function loadStore(page) {
  return page.evaluate(async () => {
    const m = await import('/src/editstore.js');
    return m;
  });
}

test('saveCity stores and getOverrides returns the overrides', async ({ page }) => {
  const store = await loadStore(page);
  await page.evaluate((m) => m.saveCity('xian', {
    attractions_zh: ['兵马俑', '大雁塔'],
    attractions_en: ['Terracotta Army', 'Big Wild Goose Pagoda'],
    food_zh: ['泡馍'], food_en: ['Pita bread soup'],
    guide_zh: [{ day: '第1天', title: '城墙', items: ['骑行'] }],
    guide_en: [{ day: 'Day 1', title: 'City wall', items: ['cycling'] }]
  }), store);
  const data = await page.evaluate((m) => m.getOverrides('xian'), store);
  expect(data.attractions_zh).toEqual(['兵马俑', '大雁塔']);
  expect(data.guide_zh[0].day).toBe('第1天');
  expect(await page.evaluate((m) => m.hasEdit('xian'), store)).toBe(true);
});

test('resetCity clears the override for that city only', async ({ page }) => {
  const store = await loadStore(page);
  await page.evaluate((m) => m.saveCity('xian', {
    attractions_zh: ['x'], attractions_en: ['x'], food_zh: ['f'], food_en: ['f'],
    guide_zh: [{ day: 'd', title: 't', items: ['i'] }], guide_en: [{ day: 'd', title: 't', items: ['i'] }]
  }), store);
  await page.evaluate((m) => m.saveCity('beijing', {
    attractions_zh: ['b'], attractions_en: ['b'], food_zh: ['bf'], food_en: ['bf'],
    guide_zh: [{ day: 'd', title: 't', items: ['i'] }], guide_en: [{ day: 'd', title: 't', items: ['i'] }]
  }), store);
  await page.evaluate((m) => m.resetCity('xian'), store);
  expect(await page.evaluate((m) => m.hasEdit('xian'), store)).toBe(false);
  expect(await page.evaluate((m) => m.hasEdit('beijing'), store)).toBe(true);
});

test('applyOverrides merges overrides into content without mutating it', async ({ page }) => {
  const store = await loadStore(page);
  const base = {
    name_zh: '西安', history_zh: '十三朝古都', attractions_zh: ['默认景点'], food_zh: ['默认美食'],
    guide_zh: [{ day: '第1天', title: '默认', items: ['x'] }], attractions_en: ['Default'], food_en: ['Default'],
    guide_en: [{ day: 'Day 1', title: 'Default', items: ['x'] }]
  };
  await page.evaluate((m) => m.saveCity('xian', {
    attractions_zh: ['编辑景点'], attractions_en: ['Edited'], food_zh: ['编辑美食'], food_en: ['Edited food'],
    guide_zh: [{ day: '第1天', title: '编辑标题', items: ['y'] }], guide_en: [{ day: 'Day 1', title: 'Edited', items: ['y'] }]
  }), store);
  const merged = await page.evaluate((m) => m.applyOverrides(JSON.parse(JSON.stringify(base)), 'xian'), store);
  expect(merged.attractions_zh).toEqual(['编辑景点']);
  expect(merged.history_zh).toBe('十三朝古都');
  expect(merged.guide_zh[0].title).toBe('编辑标题');
  expect(base.attractions_zh).toEqual(['默认景点']);
});

test('corrupted storage is ignored (treated as no overrides)', async ({ page }) => {
  await page.evaluate((k) => localStorage.setItem(k, '{not valid json'), EDIT_KEY);
  const store = await loadStore(page);
  expect(await page.evaluate((m) => m.hasEdit('xian'), store)).toBe(false);
  const merged = await page.evaluate((m) => m.applyOverrides({ name_zh: '西安' }, 'xian'), store);
  expect(merged.name_zh).toBe('西安');
});
```

- [ ] **Step 2: 运行测试确认失败（红）**

```bash
npx playwright test tests/task15-editstore.spec.js
```

Expected: FAIL（`/src/editstore.js` 不存在，import 404）。

- [ ] **Step 3: 写 src/editstore.js**

```js
const KEY = 'hmap-city-edits';

function readAll() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const data = JSON.parse(raw);
    return data && typeof data === 'object' ? data : {};
  } catch {
    return {};
  }
}

function writeAll(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function getOverrides(cityId) {
  const all = readAll();
  return all[cityId] || null;
}

export function hasEdit(cityId) {
  return !!getOverrides(cityId);
}

export function saveCity(cityId, data) {
  const all = readAll();
  all[cityId] = data;
  writeAll(all);
}

export function resetCity(cityId) {
  const all = readAll();
  if (all[cityId]) {
    delete all[cityId];
    writeAll(all);
  }
}

export function applyOverrides(content, cityId) {
  const overrides = getOverrides(cityId);
  if (!overrides) return { ...content };
  return { ...content, ...overrides };
}
```

- [ ] **Step 4: 运行测试确认通过（绿）**

```bash
npx playwright test tests/task15-editstore.spec.js
```

Expected: PASS（4 tests）。

- [ ] **Step 5: 全量回归 + 构建**

```bash
npx playwright test
npm run build
```

Expected: 24 + 4 = 28 全过；build 成功。

- [ ] **Step 6: 提交**

```bash
git add src/editstore.js tests/task15-editstore.spec.js
git commit -m "feat: city edits override store with merge and reset"
```

### Task 2: 编辑弹窗 src/ui/editor.js + 全局编辑开关

**Files:**
- Create: `src/ui/editor.js`
- Modify: `index.html`（top-actions 加 `#edit-toggle` 按钮）
- Modify: `src/main.js`（绑定开关、维护 `window.isEditMode`、派发 `edit-mode-change`）
- Modify: `src/i18n.js`（加编辑相关文案）
- Modify: `src/styles.css`（开关高亮 + 弹窗样式）
- Create: `tests/task15-editor.spec.js`

**Interfaces:**
- Consumes: `editstore.js`（getOverrides/saveCity/resetCity/hasEdit）、`t`/`lang` from i18n、`currentCityId` 由 panel 传入
- Produces: `src/ui/editor.js` 导出 `openEditor(cityId, currentContent, onSave)`：
  - `cityId`: string
  - `currentContent`: 合并覆盖后的城市对象
  - `onSave(data)`: 保存成功回调
  - 弹窗模态 id `editor-modal`；保存按钮 `#editor-save`；取消 `#editor-cancel`；景点添加 `add-attr`、删除 `del-attr`；美食 `add-food`/`del-food`；攻略条目 `add-guide-item`/`del-guide-item`；`guide-title` 输入攻略标题
- `window.isEditMode`: boolean（main.js 维护）；`#edit-toggle` 激活 class `active`

- [ ] **Step 1: 修改 index.html 加编辑开关**

在 `#top-actions` 内、`#lang-btn` 前插入：

```html
      <button id="edit-toggle" title="Edit mode">✎</button>
```

- [ ] **Step 2: 修改 src/i18n.js 加编辑文案**

zh 行 `contributors: '合作者'` 后追加（并入同一行对象内，以逗号分隔）：

```js
, editMode: '编辑模式', editContent: '编辑内容', restoreDefault: '恢复默认', restoreConfirm: '确定恢复该城市的默认内容吗？本地编辑将丢失。', addItem: '添加', removeItem: '删除', cancel: '取消', editTitle: '编辑 · ', dayTitle: '日', storageUnavailable: '本地存储不可用，无法保存'
```

en 行 `contributors: 'Contributors'` 后追加：

```js
, editMode: 'Edit mode', editContent: 'Edit content', restoreDefault: 'Restore default', restoreConfirm: 'Restore this city to its default content? Your local edits will be lost.', addItem: 'Add', removeItem: 'Remove', cancel: 'Cancel', editTitle: 'Edit · ', dayTitle: 'Day', storageUnavailable: 'Local storage unavailable, cannot save'
```

注意：zh/en 对象里已有 `save: '保存'`/`save: 'Save'`，不要再加 `save` 键。`cancel` 两行都还没有，必须加。

- [ ] **Step 3: 写失败测试（红）**

`tests/task15-editor.spec.js`：

```js
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.removeItem('hmap-city-edits'));
});

async function openCityPanel(page, id) {
  await page.waitForSelector(`.city-marker[data-city-id="${id}"]`, { timeout: 15000 });
  await page.locator(`.city-marker[data-city-id="${id}"]`).click();
  await page.waitForSelector('#panel:not(.closed)', { timeout: 5000 });
}

test('default: no edit button when edit mode off', async ({ page }) => {
  await openCityPanel(page, 'xian');
  await expect(page.locator('#panel .edit-btn')).toHaveCount(0);
});

test('turning on edit mode reveals edit button in panel', async ({ page }) => {
  await page.locator('#edit-toggle').click();
  await expect(page.locator('#edit-toggle')).toHaveClass(/active/);
  await openCityPanel(page, 'xian');
  await expect(page.locator('#panel .edit-btn')).toHaveCount(1);
});

test('add a city attraction in editor, save, and it persists after reload', async ({ page }) => {
  await page.locator('#edit-toggle').click();
  await openCityPanel(page, 'xian');
  await page.locator('#panel .edit-btn').click();
  await page.waitForSelector('#editor-modal:not(.hidden)', { timeout: 5000 });
  await page.locator('.add-attr').first().click();
  const lastAttr = page.locator('.attr-row').last().locator('input');
  await lastAttr.fill('新测试景点');
  await page.locator('#editor-save').click();
  await page.waitForSelector('#editor-modal', { state: 'detached', timeout: 5000 });
  await expect(page.locator('#panel .panel-body')).toContainText('新测试景点');
  await page.reload();
  await openCityPanel(page, 'xian');
  await expect(page.locator('#panel .panel-body')).toContainText('新测试景点');
});

test('restore default clears local edit for that city', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem('hmap-city-edits', JSON.stringify({ xian: {
      attractions_zh: ['被编辑景点'], attractions_en: ['Edited'], food_zh: ['x'], food_en: ['x'],
      guide_zh: [{ day: '第1天', title: 't', items: ['i'] }], guide_en: [{ day: 'Day 1', title: 't', items: ['i'] }]
    } }));
  });
  await page.locator('#edit-toggle').click();
  await openCityPanel(page, 'xian');
  await expect(page.locator('#panel .panel-body')).toContainText('被编辑景点');
  await page.locator('#panel .restore-btn').click();
  await page.waitForSelector('#restore-confirm', { timeout: 5000 });
  await page.locator('#restore-confirm-yes').click();
  await expect(page.locator('#panel .panel-body')).not.toContainText('被编辑景点');
  await page.reload();
  await openCityPanel(page, 'xian');
  await expect(page.locator('#panel .panel-body')).not.toContainText('被编辑景点');
});
```

- [ ] **Step 4: 运行测试确认失败（红）**

```bash
npx playwright test tests/task15-editor.spec.js
```

Expected: FAIL（`#edit-toggle` 不存在 → 超时；editor.js 未实现）。

- [ ] **Step 5: 写 src/ui/editor.js**

```js
import { t } from '../i18n.js';

let onSaveCb = null;

function esc(s) {
  return String(s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function escAttr(s) {
  return esc(s);
}

function currentState() {
  return window.__editorState;
}

export function openEditor(cityId, currentContent, onSave) {
  onSaveCb = onSave;
  window.__editorState = {
    cityId,
    name: currentContent.name_zh,
    attractions_zh: [...currentContent.attractions_zh],
    attractions_en: [...currentContent.attractions_en],
    food_zh: [...currentContent.food_zh],
    food_en: [...currentContent.food_en],
    guide_zh: currentContent.guide_zh.map((d) => ({ ...d, items: [...d.items] })),
    guide_en: currentContent.guide_en.map((d) => ({ ...d, items: [...d.items] }))
  };
  const name = currentContent.name_zh;
  const modal = document.createElement('div');
  modal.id = 'editor-modal';
  modal.className = 'hidden';
  modal.innerHTML = `
    <div class="editor-box">
      <h3>${esc(t('editTitle'))}${esc(name)}</h3>
      ${edSection('attractions_zh', 'add-attr', 'del-attr')}
      ${edSection('food_zh', 'add-food', 'del-food')}
      <div class="ed-block"><h4>${esc(t('tabs.guide'))}</h4>${guideSection('guide_zh')}</div>
      <div class="ed-en">
        <h4>EN</h4>
        ${edSection('attractions_en', 'add-attr-en', 'del-attr-en')}
        ${edSection('food_en', 'add-food-en', 'del-food-en')}
        ${guideSection('guide_en')}
      </div>
      <div class="ed-actions">
        <button id="editor-cancel">${esc(t('cancel'))}</button>
        <button id="editor-save">${esc(t('save'))}</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.classList.remove('hidden');

  modal.addEventListener('click', (e) => {
    const st = currentState();
    const add = (key, cls) => {
      if (e.target.classList.contains(cls)) { st[key].push(''); rebuild(); }
    };
    const del = (key, cls) => {
      if (e.target.classList.contains(cls)) {
        const i = Number(e.target.previousElementSibling.dataset.i);
        st[key].splice(i, 1);
        rebuild();
      }
    };
    del('attractions_zh', 'del-attr');
    del('attractions_en', 'del-attr-en');
    del('food_zh', 'del-food');
    del('food_en', 'del-food-en');
    add('attractions_zh', 'add-attr');
    add('attractions_en', 'add-attr-en');
    add('food_zh', 'add-food');
    add('food_en', 'add-food-en');
    if (e.target.classList.contains('add-guide-item')) {
      const di = Number(e.target.closest('.ed-guide-day').querySelector('.guide-title').dataset.di);
      const g = e.target.closest('.ed-guide-day').querySelector('.guide-title').dataset.g;
      st[`guide_${g}`][di].items.push('');
      rebuild();
    }
    if (e.target.classList.contains('del-guide-item')) {
      const inp = e.target.previousElementSibling;
      const { g, di, ii } = inp.dataset;
      st[`guide_${g}`][di].items.splice(Number(ii), 1);
      rebuild();
    }
  });

  modal.addEventListener('input', (e) => {
    if (!e.target.matches('input')) return;
    const st = currentState();
    const el = e.target;
    if (el.classList.contains('guide-title')) {
      const { g, di } = el.dataset;
      st[`guide_${g}`][Number(di)].title = el.value;
    } else if (el.dataset.ii !== undefined) {
      const { g, di, ii } = el.dataset;
      st[`guide_${g}`][Number(di)].items[Number(ii)] = el.value;
    } else if (el.dataset.key) {
      st[el.dataset.key][Number(el.dataset.i)] = el.value;
    }
  });

  modal.querySelector('#editor-cancel').addEventListener('click', () => closeEditor(modal));
  modal.querySelector('#editor-save').addEventListener('click', () => {
    const s = currentState();
    try {
      onSaveCb({
        attractions_zh: s.attractions_zh.filter((v) => v.trim() !== ''),
        attractions_en: s.attractions_en.filter((v) => v.trim() !== ''),
        food_zh: s.food_zh.filter((v) => v.trim() !== ''),
        food_en: s.food_en.filter((v) => v.trim() !== ''),
        guide_zh: s.guide_zh,
        guide_en: s.guide_en
      });
      closeEditor(modal);
    } catch {
      alert(t('storageUnavailable'));
    }
  });
}

function edSection(key, addClass, delClass) {
  const label = key.startsWith('attractions') ? 'tabs.attractions' : 'tabs.food';
  const items = currentState()[key];
  return `<div class="ed-block"><h4>${esc(t(label))}</h4>${items.map((item, i) =>
    `<div class="attr-row"><input data-key="${key}" data-i="${i}" value="${escAttr(item)}" /><button class="${delClass}">${esc(t('removeItem'))}</button></div>`
  ).join('')}<button class="${addClass}">+ ${esc(t('addItem'))}</button></div>`;
}

function guideSection(key) {
  const g = key === 'guide_zh' ? 'zh' : 'en';
  return currentState()[key].map((d, di) =>
    `<div class="ed-guide-day"><h5>${esc(t('dayTitle'))} ${di + 1}</h5><input class="guide-title" data-g="${g}" data-di="${di}" value="${escAttr(d.title)}" /><div class="guide-items">${d.items.map((it, ii) =>
      `<div class="guide-item-row"><input data-g="${g}" data-di="${di}" data-ii="${ii}" value="${escAttr(it)}" /><button class="del-guide-item">${esc(t('removeItem'))}</button></div>`
    ).join('')}</div><button class="add-guide-item">+ ${esc(t('addItem'))}</button></div>`
  ).join('');
}

function rebuild() {
  const modal = document.getElementById('editor-modal');
  const s = window.__editorState;
  const stub = {
    name_zh: s.name,
    attractions_zh: s.attractions_zh,
    attractions_en: s.attractions_en,
    food_zh: s.food_zh,
    food_en: s.food_en,
    guide_zh: s.guide_zh,
    guide_en: s.guide_en
  };
  closeEditor(modal);
  openEditor(s.cityId, stub, onSaveCb);
}

function closeEditor(modal) {
  modal.classList.add('hidden');
  modal.remove();
  window.__editorState = null;
  onSaveCb = null;
}
```

- [ ] **Step 6: 修改 src/main.js 绑定编辑开关**

在 `map.on('load')` 回调之前定义并调用：

```js
function initEditorToggle() {
  document.getElementById('edit-toggle').addEventListener('click', () => {
    window.isEditMode = !window.isEditMode;
    document.getElementById('edit-toggle').classList.toggle('active', window.isEditMode);
    document.dispatchEvent(new CustomEvent('edit-mode-change', { detail: { on: window.isEditMode } }));
  });
}
```

在 `map.on('load')` 回调内 `initSettings();` 之后追加 `initEditorToggle();`。

- [ ] **Step 7: 修改 src/styles.css 加开关与弹窗样式**

文件末尾追加：

```css
#edit-toggle.active { background: #8a6f4d; color: #f3e9d2; border-color: #8a6f4d; }
#editor-modal { position: fixed; inset: 0; z-index: 30; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.4); }
#editor-modal.hidden { display: none; }
.editor-box { width: 720px; max-width: 92vw; max-height: 86vh; overflow-y: auto; background: #faf4e4; border: 1px solid #8a6f4d; border-radius: 4px; padding: 18px; }
.editor-box h3 { color: #4a3b2a; margin-bottom: 12px; }
.ed-block { margin-bottom: 16px; }
.ed-block h4 { color: #6b4f2e; font-size: 14px; margin-bottom: 6px; }
.ed-block input { width: 100%; padding: 5px 8px; border: 1px solid #b9a888; background: #fffdf5; font-family: inherit; font-size: 13px; border-radius: 3px; margin-bottom: 4px; }
.attr-row { display: flex; gap: 6px; margin-bottom: 4px; }
.attr-row input { flex: 1; margin-bottom: 0; }
.attr-row button { flex-shrink: 0; border: 1px solid #8a6f4d; background: transparent; color: #8c2f2f; cursor: pointer; font-family: inherit; border-radius: 3px; }
.ed-block > button { margin-top: 4px; border: 1px dashed #8a6f4d; background: transparent; color: #4a3b2a; cursor: pointer; font-family: inherit; border-radius: 3px; padding: 4px 10px; }
.ed-en { border-top: 1px dashed #b9a888; padding-top: 10px; margin-top: 6px; }
.ed-guide-day { border: 1px solid #d9c9a8; border-radius: 3px; padding: 8px; margin-bottom: 8px; }
.ed-guide-day h5 { color: #4a3b2a; font-size: 13px; }
.guide-item-row { display: flex; gap: 6px; margin: 4px 0; }
.guide-item-row input { flex: 1; margin-bottom: 0; }
.guide-item-row button { flex-shrink: 0; }
.ed-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 14px; }
.ed-actions button { padding: 7px 18px; border: 1px solid #8a6f4d; background: #4a3b2a; color: #f3e9d2; cursor: pointer; font-family: inherit; border-radius: 3px; }
#editor-cancel { background: transparent; color: #4a3b2a; }
.restore-btn { border: 1px solid #8a6f4d; background: transparent; color: #8c2f2f; cursor: pointer; font-family: inherit; border-radius: 3px; padding: 4px 10px; margin-left: 8px; }
.edit-btn { border: 1px solid #8a6f4d; background: transparent; color: #4a3b2a; cursor: pointer; font-family: inherit; border-radius: 3px; padding: 4px 10px; }
#restore-confirm { position: fixed; inset: 0; z-index: 31; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.4); }
#restore-confirm .restore-box { background: #faf4e4; border: 1px solid #8a6f4d; border-radius: 4px; padding: 18px; max-width: 360px; }
#restore-confirm .restore-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; }
#restore-confirm button { padding: 6px 14px; border: 1px solid #8a6f4d; background: #4a3b2a; color: #f3e9d2; cursor: pointer; font-family: inherit; border-radius: 3px; }
#restore-confirm-yes { background: #8c2f2f !important; }
```

- [ ] **Step 8: 运行测试确认通过（绿）**

```bash
npx playwright test tests/task15-editor.spec.js
```

Expected: PASS（4 tests）。如 editor.js 细节与测试不符（rebuild 状态保留、onSave 引用等），修复直到通过。

- [ ] **Step 9: 全量回归 + 构建**

```bash
npx playwright test
npm run build
```

Expected: 28 + 4 = 32 全过；build 成功。

- [ ] **Step 10: 提交**

```bash
git add src/ui/editor.js index.html src/main.js src/i18n.js src/styles.css tests/task15-editor.spec.js
git commit -m "feat: city editor modal with global edit toggle"
```

### Task 3: 面板集成（编辑/恢复按钮 + applyOverrides 渲染）

**Files:**
- Modify: `src/ui/panel.js`
- Modify: `tests/task15-editor.spec.js`（追加 1 个测试）

**Interfaces:**
- Consumes: `editstore.js`（hasEdit/applyOverrides/resetCity/saveCity）、`editor.js`（openEditor）、`t`/`lang` from i18n、`window.isEditMode`、`edit-mode-change` 事件
- Produces: panel 内「编辑内容」按钮 class `edit-btn`、恢复按钮 class `restore-btn`、确认框 `#restore-confirm`（含 `#restore-confirm-yes`）

- [ ] **Step 1: 写失败测试（红）**

在 `tests/task15-editor.spec.js` 追加：

```js
test('closing edit mode hides edit button but saved edits still render', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem('hmap-city-edits', JSON.stringify({ xian: {
      attractions_zh: ['编辑后景点'], attractions_en: ['Edited'], food_zh: ['x'], food_en: ['x'],
      guide_zh: [{ day: '第1天', title: 't', items: ['i'] }], guide_en: [{ day: 'Day 1', title: 't', items: ['i'] }]
    } }));
  });
  await page.locator('#edit-toggle').click();
  await openCityPanel(page, 'xian');
  await expect(page.locator('#panel .edit-btn')).toHaveCount(1);
  await expect(page.locator('#panel .panel-body')).toContainText('编辑后景点');
  await page.locator('#edit-toggle').click();
  await page.waitForTimeout(300);
  await expect(page.locator('#panel .edit-btn')).toHaveCount(0);
  await expect(page.locator('#panel .panel-body')).toContainText('编辑后景点');
});
```

- [ ] **Step 2: 运行测试确认失败（红）**

```bash
npx playwright test tests/task15-editor.spec.js
```

Expected: 新测试 FAIL（关闭开关后面板仍显示编辑按钮；applyOverrides 未接入）。

- [ ] **Step 3: 修改 src/ui/panel.js**

改动点：
1. import 区加：

```js
import { hasEdit, applyOverrides, resetCity, saveCity } from '../editstore.js';
import { openEditor } from './editor.js';
```

2. `openCity` 中 `const c = contentCache[id];` 改为：

```js
  const c = applyOverrides(contentCache[id], id);
```

3. `renderHeader` 返回的 HTML 在 `</p>`（tagline）后追加编辑按钮区；函数改为：

```js
function renderHeader(c, meta) {
  const l = lang();
  const ancient = meta.ancient && meta.ancient[currentCityPeriod] ? meta.ancient[currentCityPeriod][l] : null;
  const editBtns = window.isEditMode
    ? `<div class="panel-actions"><button class="edit-btn">${esc(t('editContent'))}</button>${hasEdit(currentCityId) ? `<button class="restore-btn">${esc(t('restoreDefault'))}</button>` : ''}</div>`
    : '';
  return `<div class="panel-head">
    <button class="panel-close">×</button>
    <h2>${esc(c[`name_${l}`])}${ancient ? ` <span class="ancient">· ${esc(ancient)}</span>` : ''}</h2>
    <p class="tagline">${esc(c[`tagline_${l}`])}</p>${editBtns}
  </div>`;
}
```

4. `bindPanel` 中 `.panel-close` 绑定之后追加：

```js
  const editBtn = panel.querySelector('.edit-btn');
  if (editBtn) {
    editBtn.addEventListener('click', () => openEditor(currentCityId, c, (data) => {
      try {
        saveCity(currentCityId, data);
      } catch {
        alert(t('storageUnavailable'));
      }
      openCity(currentCityId);
    }));
  }
  const restoreBtn = panel.querySelector('.restore-btn');
  if (restoreBtn) {
    restoreBtn.addEventListener('click', () => {
      const box = document.createElement('div');
      box.id = 'restore-confirm';
      box.innerHTML = `<div class="restore-box"><p>${esc(t('restoreConfirm'))}</p><div class="restore-actions"><button id="restore-confirm-no">${esc(t('cancel'))}</button><button id="restore-confirm-yes">${esc(t('restoreDefault'))}</button></div></div>`;
      document.body.appendChild(box);
      box.querySelector('#restore-confirm-no').addEventListener('click', () => box.remove());
      box.querySelector('#restore-confirm-yes').addEventListener('click', () => {
        resetCity(currentCityId);
        box.remove();
        openCity(currentCityId);
      });
    });
  }
```

5. 文件末尾 `lang-change` 监听之后追加：

```js
document.addEventListener('edit-mode-change', () => {
  if (currentCityId) openCity(currentCityId);
});
```

- [ ] **Step 4: 运行测试确认通过（绿）**

```bash
npx playwright test tests/task15-editor.spec.js
```

Expected: 全部 PASS（5 tests）。

- [ ] **Step 5: 全量回归 + 构建 + 校验**

```bash
npx playwright test
npm run build
npm run validate
```

Expected: 24 + 5 = 29 全过；build 成功；`VALIDATION OK — 27 cities, 25 events`。

- [ ] **Step 6: 提交**

```bash
git add src/ui/panel.js tests/task15-editor.spec.js
git commit -m "feat: integrate editor into city panel with applyOverrides and restore"
```

