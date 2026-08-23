# 触屏适配 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 优化华夏舆图在触屏手机/平板上的使用体验：手机（≤768px）图例默认收起、城市/事件标记与按钮触控目标加大；平板/桌面行为不变。

**Architecture:** 纯 CSS 媒体查询 + 少量 JS。在现有 `@media (max-width: 768px)` 块内扩充触屏样式（marker 用 padding+负 margin 扩大热区不改视觉位置）；`src/ui/legend.js` 用 `window.matchMedia('(max-width: 768px)')` 实现图例默认收起与视口变化自动切换。

**Tech Stack:** Vite + MapLibre（既有）、原生 ES Modules、@playwright/test（TDD 红绿）。

## Global Constraints

- 所有代码文件不加注释（house rule）
- 提交信息用 conventional commit：`feat:` / `fix:` / `docs:`
- TDD：先写失败 Playwright 测试 → 红 → 实现 → 绿 → 全量回归 → 构建 → 提交
- 平板/桌面（>768px）行为不变：图例默认展开、标记/按钮保持现有尺寸
- 手机（≤768px）：图例默认收起（可手动切换）、标记/按钮触控目标加大
- `#legend.collapsed #legend-body` 收起样式已存在，无需新增
- marker 视觉位置不变（仅扩大点击热区）

---

### Task 1: 触屏 CSS 适配 + 图例默认收起 + 测试

**Files:**
- Modify: `src/styles.css`（@media (max-width: 768px) 块扩充）
- Modify: `src/ui/legend.js`（matchMedia 默认收起）
- Create: `tests/task16-touch.spec.js`

**Interfaces:**
- Consumes: 现有 `#legend`（含 `collapsed` 类切换逻辑）、`#legend-body`、`.city-marker`/`.event-marker`、`#top-actions button`、`.tl-btn`、`.ptab`、`.edit-btn`、`.restore-btn`、`.editor-box`
- Produces: `initLegend()` 内新增 matchMedia 逻辑（无新导出）；手机视口下 `#legend` 初始含 `collapsed` 类

- [ ] **Step 1: 写失败测试（红）**

`tests/task16-touch.spec.js`：

```js
import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 375, height: 667 } });

test('mobile: legend starts collapsed by default', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('#legend', { timeout: 15000 });
  await expect(page.locator('#legend')).toHaveClass(/collapsed/);
});

test('mobile: clicking legend title expands then collapses', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('#legend', { timeout: 15000 });
  await page.locator('#legend h4').first().click();
  await expect(page.locator('#legend')).not.toHaveClass(/collapsed/);
  await page.locator('#legend h4').first().click();
  await expect(page.locator('#legend')).toHaveClass(/collapsed/);
});

test('mobile: city marker dot computed size is enlarged (>= 12px)', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.city-marker[data-city-id="xian"]', { timeout: 15000 });
  const size = await page.locator('.city-marker[data-city-id="xian"] .dot').evaluate((el) => {
    const s = getComputedStyle(el);
    return parseFloat(s.width);
  });
  expect(size).toBeGreaterThanOrEqual(12);
});

test('mobile: city marker opens the detail panel on tap', async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.city-marker[data-city-id="xian"]', { timeout: 15000 });
  await page.locator('.city-marker[data-city-id="xian"]').click();
  await page.waitForSelector('#panel:not(.closed)', { timeout: 5000 });
  await expect(page.locator('#panel .panel-head h2')).toContainText('西安');
});

test('desktop: legend starts expanded', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await page.waitForSelector('#legend', { timeout: 15000 });
  await expect(page.locator('#legend')).not.toHaveClass(/collapsed/);
});
```

- [ ] **Step 2: 运行测试确认失败（红）**

```bash
npx playwright test tests/task16-touch.spec.js
```

Expected: `mobile: legend starts collapsed` FAIL（图例未收起）；`desktop` PASS 属预期。

- [ ] **Step 3: 修改 src/ui/legend.js 实现图例默认收起**

`initLegend` 改为：

```js
export function initLegend() {
  const el = document.getElementById('legend');
  el.innerHTML = `<h4 class="cn">图例</h4><h4 class="en">Legend</h4><div id="legend-body"></div><div class="legend-contrib"><span class="cn">${t('contributors')}</span><span class="en">${t('contributors')}</span><ul><li>yanqing-creator</li><li>Yuchen-Zou</li></ul></div>`;
  const mq = window.matchMedia('(max-width: 768px)');
  const applyCollapse = (collapsed) => el.classList.toggle('collapsed', collapsed);
  applyCollapse(mq.matches);
  mq.addEventListener('change', (e) => applyCollapse(e.matches));
  el.addEventListener('click', (e) => {
    if (e.target.tagName === 'H4') el.classList.toggle('collapsed');
  });
}
```

- [ ] **Step 4: 修改 src/styles.css 扩充触屏样式**

在 `@media (max-width: 768px)` 块内、现有规则之后追加：

```css
  .city-marker .dot { width: 12px; height: 12px; }
  .city-marker .label { font-size: 15px; }
  .event-marker .dot { width: 15px; height: 15px; }
  .event-marker .label { font-size: 13px; }
  .city-marker, .event-marker { padding: 6px; margin: -6px; }
  #top-actions button, .tl-btn { min-width: 44px; min-height: 44px; }
  .ptab, .edit-btn, .restore-btn { padding: 8px 12px; font-size: 14px; }
  .editor-box { width: 96vw; }
```

- [ ] **Step 5: 运行测试确认通过（绿）**

```bash
npx playwright test tests/task16-touch.spec.js
```

Expected: 全部 PASS（5 tests）。

- [ ] **Step 6: 全量回归 + 构建**

```bash
npx playwright test
npm run build
```

Expected: 41 + 5 = 46 全过；build 成功。

- [ ] **Step 7: 提交**

```bash
git add src/styles.css src/ui/legend.js tests/task16-touch.spec.js
git commit -m "feat: touch adaptation for mobile with collapsible legend and larger targets"
```

