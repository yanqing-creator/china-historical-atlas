# 华夏舆图 · Historical Atlas of China Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个古风交互式中国历史地图网页（MapLibre GL），含 5 时期时间轴、27 城双语弹窗（历史/地理/气候/景点/美食/旅游攻略）、25 个历史事件、长城/大运河/丝绸之路图层、可选 LLM 攻略增强。

**Architecture:** Vite + MapLibre GL JS 纯前端静态站。地理数据全部为本地 GeoJSON（底图用 world-atlas npm 包转换，历史图层为手绘简化数据），构建时无需切瓦片、运行时零后端。内容数据与几何数据分离：`data/geo/*.geojson` 存几何与元信息，`content/*.json` 存中英双语正文，`scripts/validate.mjs` 校验二者一致性。

**Tech Stack:** Vite 5、MapLibre GL JS 4、world-atlas 2（TopoJSON）、topojson-client 3、@playwright/test 1（冒烟测试）、原生 ES Modules（无 TypeScript、无框架）、Google Fonts（Noto Serif SC + EB Garamond，离线回退系统宋体）。

## Global Constraints

- Node.js >= 20（@playwright/test 1.62 要求），包管理器 npm
- 依赖版本：vite ^5.4.0、maplibre-gl ^4.7.0、world-atlas ^2.0.2（dev）、topojson-client ^3.1.0（dev）、@playwright/test ^1.46.0（dev）
- 所有代码文件不加注释（house rule）
- 提交信息用 conventional commit：`feat:` / `fix:` / `docs:` 前缀，每个任务结束时提交一次
- UI 默认中文，右上角可切英文；所有内容字段必须是 zh/en 成对出现
- 数据文件一律 UTF-8 JSON；GeoJSON 使用 WGS84 经纬度（lon,lat 顺序）
- 城市中文名用标记 `<span class="cn">`、英文用 `<span class="en">` 包装，语言切换通过 body class `lang-en` 控制显示
- **全程 TDD（用户选定）：每个任务先写失败的 @playwright/test 测试 → 运行确认失败 → 实现 → 运行确认通过 → 提交**。任务 7-10 的数据任务以 `npm run validate` 的失败/通过作为红绿门
- `src/main.js` 必须暴露 `window.__hm = { map, setPeriod }`（Task 4 起含 setPeriod），供 Playwright 在页面上断言图层状态；每次全文替换 main.js 都要保留这一行

## File Structure

```
世界地图/
├─ index.html                    入口 + 静态容器（header/timeline/legend/panel/settings）
├─ package.json
├─ vite.config.js                base './'，dist 输出
├─ data/
│  ├─ basemap/land.geojson       由脚本生成（全球陆地）
│  ├─ basemap/countries.geojson  由脚本生成（国界线）
│  ├─ geo/rivers.geojson         手绘主要河流
│  ├─ geo/lakes.geojson          手绘主要湖泊
│  ├─ geo/borders.geojson        10 个政权疆域多边形
│  ├─ geo/wall.geojson           秦汉长城 + 明长城
│  ├─ geo/canal.geojson          隋唐大运河 + 京杭大运河
│  ├─ geo/silkroad.geojson       陆上丝路 + 海上丝路
│  ├─ geo/cities.geojson         27 城点位 + 元信息
│  └─ geo/events.geojson         25 事件点位 + 元信息
├─ content/cities.json           27 城双语正文
├─ content/events.json           25 事件双语简介
├─ scripts/fetch-basemap.mjs     转换 world-atlas 数据
├─ scripts/validate.mjs          数据一致性校验
├─ scripts/smoke.mjs             Playwright 冒烟测试
└─ src/
   ├─ main.js                    入口：装配各模块
   ├─ style.js                   颜色常量 + 基础样式
   ├─ periods.js                 时期定义（id/名称/都城/视野）
   ├─ map.js                     MapLibre 初始化、图层、时期切换
   ├─ markers.js                 城市/事件 HTML 标记
   ├─ i18n.js                    语言状态 + UI 文案字典
   ├─ llm.js                     LLM 攻略生成
   ├─ ui/timeline.js             时间轴按钮
   ├─ ui/panel.js                城市详情面板（6 标签）
   ├─ ui/eventpanel.js           事件面板
   ├─ ui/settings.js             设置面板（API Key）
   ├─ ui/legend.js               图例
   └─ styles.css                 全部样式（含古风纸纹）
```

---
## Testing Convention（用户选定：全程 TDD 自动化）

本约定**取代**各任务中「验证：npm run dev」的手动检查步骤（手动步骤仅作补充参考）。

**基础设施（Task 1 一并完成）：**
- `playwright.config.js`：`testDir: 'tests'`，`webServer: { command: 'npm run dev', port: 5173, reuseExistingServer: true }`，`use: { baseURL: 'http://localhost:5173' }`
- `tests/` 目录；测试文件命名 `tests/taskNN-<topic>.spec.js`
- 断言图层状态的通用辅助 `tests/helpers.mjs`：

```js
export async function layerVisibility(page, layerId) {
  return page.evaluate((id) => window.__hm.map.getLayoutProperty(id, 'visibility') ?? 'visible', layerId);
}
export async function hasLayer(page, layerId) {
  return page.evaluate((id) => !!window.__hm.map.getLayer(id), layerId);
}
```

**每任务测试要求：**

| 任务 | 测试文件 | 断言内容 |
|------|----------|----------|
| 1 脚手架 | tests/task01-scaffold.spec.js | 页面加载、`.maplibregl-canvas` 出现、`#title` 含「华夏舆图」、无 pageerror |
| 2 底图 | tests/task02-basemap.spec.js | `hasLayer('land-fill'/'river-line'/'lake-fill')` 全 true；`data/basemap/land.geojson` fetch 200 |
| 3 疆域 | tests/task03-borders.spec.js | `hasLayer('border-fill-han')` 等 10 个 fill/line 图层存在；默认 `border-fill-han` visibility=visible |
| 4 时间轴 | tests/task04-timeline.spec.js | 默认「秦汉」active；点击 `[data-period="songliaojin"]` 后 `border-fill-liao` visible 且 `border-fill-han` none；点击 `[data-period="sanguo"]` 后 `border-fill-shu` visible |
| 5 点位与工程线 | tests/task05-layers.spec.js | 秦汉：`.city-marker[data-city-id="xian"]` 存在、`[data-city-id="shanghai"]` 不存在；切元明清后 shanghai 存在；`wall-ming-line`/`canal-jinghang-line` visible |
| 6 校验脚本 | `npm run validate` 退出码 1（红） | 报告含空字段清单 |
| 7 古都正文 | tests/task07-capitals.spec.js | 点击 xian → 面板 `.panel-body` 含「兵马俑」；`npm run validate` 报告中无古都 8 城条目 |
| 8 名城正文 | tests/task08-cities.spec.js | 点击 suzhou → 含「拙政园」；点击 quanzhou（宋辽金）→ 含「开元寺」；validate 无本批 13 城条目 |
| 9 风景正文 | tests/task09-scenic.spec.js | 点击 guilin → 含「漓江」；点击 lasa（隋唐）→ 含「布达拉宫」；validate 退出码 0 或仅剩 events 错误 |
| 10 事件 | tests/task10-events.spec.js | 秦汉：`.event-marker[data-event-id="unify-qin"]` 存在；点击后面板含事件标题；validate 退出码 0 |
| 11 面板 | tests/task11-panel.spec.js | 点 xian → 6 标签存在；切 guide 标签含「D1」或「Day」；点 `#lang-btn` → body.lang-en 且面板标签变 Guide；切「宋辽金」点 kaifeng → 标题含「汴京」 |
| 12 LLM | tests/task12-llm.spec.js | 无 Key：guide 无 `#ai-btn`；设置面板保存假 Key 后 guide 出现 `#ai-btn`；点击触发错误提示 `.ai-error`（断网/假 Key，等待失败提示出现） |
| 13 图例响应式 | tests/task13-legend.spec.js | `#legend` 存在且含「长城」；viewport 375×667 下面板变底部抽屉（`.maplibregl-canvas` 仍在、`#panel` 宽度≈viewport）；`#legend-body` 点击标题可折叠 |
| 14 冒烟 | scripts/smoke.mjs + `npm run build` | 全流程（同计划 Task 14 原文） |

**TDD 节奏（每个前端任务）：** Step A 写测试（先用 `tests/helpers.mjs` 与上一任务的产物）→ 运行 `npx playwright test tests/taskNN-*.spec.js` 确认失败 → Step B 实现 → 再运行确认通过 → 运行全量 `npx playwright test` 防回归 → 提交。

---

### Task 1: 项目脚手架（Vite + MapLibre 最小可运行）

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `playwright.config.js`
- Create: `index.html`
- Create: `src/main.js`
- Create: `src/style.js`
- Create: `src/styles.css`
- Create: `tests/helpers.mjs`
- Create: `tests/task01-scaffold.spec.js`

**Interfaces:**
- Produces: `src/style.js` 导出 `PALETTE`（颜色常量对象）与 `buildStyle()`（返回 MapLibre style spec）；`src/main.js` 导出 `map` 并设置 `window.__hm = { map }`；后续任务 import 这些。

- [ ] **Step 1: 初始化 npm 项目并安装依赖**

```bash
npm init -y
npm install maplibre-gl@^4.7.0
npm install -D vite@^5.4.0 world-atlas@^2.0.2 topojson-client@^3.1.0 @playwright/test@^1.46.0
npx playwright install chromium
```

- [ ] **Step 2: 写 package.json scripts**

`package.json` 全文替换为：

```json
{
  "name": "china-historical-atlas",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "playwright test",
    "fetch-basemap": "node scripts/fetch-basemap.mjs",
    "validate": "node scripts/validate.mjs",
    "smoke": "node scripts/smoke.mjs"
  },
  "dependencies": {
    "maplibre-gl": "^4.7.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.46.0",
    "topojson-client": "^3.1.0",
    "vite": "^5.4.0",
    "world-atlas": "^2.0.2"
  }
}
```

- [ ] **Step 3: 写 vite.config.js 与 playwright.config.js**

`vite.config.js`：

```js
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: { outDir: 'dist' }
});
```

`playwright.config.js`：

```js
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  use: { baseURL: 'http://localhost:5173' },
  webServer: {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: true,
    timeout: 60000
  }
});
```

- [ ] **Step 4: 写失败测试（红）**

`tests/helpers.mjs`：

```js
export async function layerVisibility(page, layerId) {
  return page.evaluate((id) => window.__hm.map.getLayoutProperty(id, 'visibility') ?? 'visible', layerId);
}
export async function hasLayer(page, layerId) {
  return page.evaluate((id) => !!window.__hm.map.getLayer(id), layerId);
}
```

`tests/task01-scaffold.spec.js`：

```js
import { test, expect } from '@playwright/test';

test('page loads with map canvas, title and no page errors', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.waitForSelector('.maplibregl-canvas', { timeout: 15000 });
  await expect(page.locator('#title .cn')).toContainText('华夏舆图');
  expect(errors).toEqual([]);
});
```

- [ ] **Step 5: 运行测试确认失败（红）**

```bash
npx playwright test tests/task01-scaffold.spec.js
```

Expected: FAIL（`index.html` 尚不存在，dev server 404）。

- [ ] **Step 6: 写 index.html**

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>华夏舆图 · Historical Atlas of China</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600;700&family=EB+Garamond:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet" />
</head>
<body>
  <div id="map"></div>
  <div id="paper-texture"></div>
  <header id="topbar">
    <h1 id="title"><span class="cn">华夏舆图</span><span class="en">Historical Atlas of China</span></h1>
    <nav id="timeline"></nav>
    <div id="top-actions">
      <button id="lang-btn">EN</button>
      <button id="settings-btn">⚙</button>
    </div>
  </header>
  <aside id="legend" class="open"></aside>
  <aside id="panel" class="closed"></aside>
  <div id="settings-modal" class="hidden"></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

- [ ] **Step 7: 写 src/style.js（颜色常量 + 基础样式）**

```js
export const PALETTE = {
  paper: '#f3e9d2',
  paperDeep: '#eadfc3',
  land: '#f7efd9',
  landEdge: '#4a3b2a',
  river: '#3f5c7a',
  lake: '#a8c4d4',
  borderLine: '#4a3b2a',
  borderFillOpacity: 0.16,
  countryLine: '#b9a888',
  event: '#8c2f2f',
  wall: '#7a5c3e',
  canal: '#2e5f7a',
  silkLand: '#b0743c',
  silkSea: '#2e7d8c'
};

export function buildStyle() {
  return {
    version: 8,
    sources: {},
    layers: [
      { id: 'background', type: 'background', paint: { 'background-color': PALETTE.paper } }
    ]
  };
}
```

- [ ] **Step 8: 写 src/main.js（最小可运行，含 window.__hm）**

```js
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './styles.css';
import { buildStyle } from './style.js';

const map = new maplibregl.Map({
  container: 'map',
  style: buildStyle(),
  center: [110, 36],
  zoom: 3.4,
  minZoom: 2.5,
  maxZoom: 10,
  attributionControl: false
});

window.__hm = { map };

export { map };
```

- [ ] **Step 9: 写 src/styles.css（基础布局 + 古风底色）**

```css
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { height: 100%; }
body { font-family: 'Noto Serif SC', 'Songti SC', 'SimSun', serif; overflow: hidden; }
#map { position: absolute; inset: 0; }
#paper-texture { position: absolute; inset: 0; pointer-events: none; z-index: 1;
  opacity: 0.35; mix-blend-mode: multiply;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3CfeColorMatrix values='0 0 0 0 0.4 0 0 0 0 0.35 0 0 0 0 0.25 0 0 0 0.06 0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E"); }
#topbar { position: absolute; top: 0; left: 0; right: 0; z-index: 10;
  display: flex; align-items: center; gap: 12px; padding: 10px 16px;
  background: linear-gradient(180deg, rgba(243,233,210,0.96), rgba(243,233,210,0.82) 70%, transparent);
  pointer-events: none; }
#topbar > * { pointer-events: auto; }
#title { font-size: 20px; font-weight: 700; letter-spacing: 2px; color: #4a3b2a; white-space: nowrap; }
#title .en { display: none; font-family: 'EB Garamond', Georgia, serif; font-size: 15px; font-weight: 400; letter-spacing: 1px; }
body.lang-en #title .cn { display: none; }
body.lang-en #title .en { display: inline; }
#timeline { display: flex; gap: 6px; flex: 1; justify-content: center; flex-wrap: wrap; }
.tl-btn { border: 1px solid #8a6f4d; background: rgba(255,252,240,0.7); color: #4a3b2a;
  padding: 5px 14px; cursor: pointer; font-family: inherit; font-size: 14px; border-radius: 3px; }
.tl-btn.active { background: #4a3b2a; color: #f3e9d2; }
.tl-btn .en { display: none; }
body.lang-en .tl-btn .cn { display: none; }
body.lang-en .tl-btn .en { display: inline; }
#top-actions { display: flex; gap: 8px; }
#top-actions button { border: 1px solid #8a6f4d; background: rgba(255,252,240,0.7);
  color: #4a3b2a; width: 34px; height: 34px; cursor: pointer; font-family: inherit; font-size: 14px; border-radius: 3px; }
#legend { position: absolute; left: 12px; top: 78px; z-index: 10; width: 180px;
  background: rgba(250,244,228,0.92); border: 1px solid #8a6f4d; border-radius: 4px; padding: 10px; }
#panel { position: absolute; right: 0; top: 64px; bottom: 0; z-index: 10; width: 380px;
  background: rgba(250,244,228,0.97); border-left: 1px solid #8a6f4d;
  transition: transform 0.3s ease; overflow-y: auto; }
#panel.closed { transform: translateX(100%); }
#settings-modal { position: absolute; z-index: 20; right: 16px; top: 56px; width: 300px;
  background: rgba(250,244,228,0.98); border: 1px solid #8a6f4d; border-radius: 4px; padding: 14px; }
#settings-modal.hidden { display: none; }
```

- [ ] **Step 10: 运行测试确认通过（绿）**

```bash
npx playwright test tests/task01-scaffold.spec.js
```

Expected: PASS（地图画布出现、标题正确、无 pageerror）。

- [ ] **Step 11: 验证构建**

```bash
npm run build
```

Expected: `dist/` 生成成功，无报错。

- [ ] **Step 12: 提交**

```bash
git add -A
git commit -m "feat: scaffold vite + maplibre project with antique paper base"
```

### Task 2: 古风底图（陆地/国界/河流/湖泊）

**Files:**
- Create: `scripts/fetch-basemap.mjs`
- Create: `data/geo/rivers.geojson`
- Create: `data/geo/lakes.geojson`
- Modify: `src/main.js`（加载底图源与图层）
- Modify: `src/styles.css`（无）

**Interfaces:**
- Consumes: `PALETTE`、`buildStyle()` from `src/style.js`
- Produces: `data/basemap/land.geojson`、`data/basemap/countries.geojson`（脚本生成）；`map` 对象上新增 sources：`land`、`countries`、`rivers`、`lakes`；layers：`land-fill`、`land-edge`、`country-line`、`river-line`、`lake-fill`、`lake-edge`

- [ ] **Step 1: 写 scripts/fetch-basemap.mjs**

```js
import fs from 'node:fs';
import path from 'node:path';
import { feature } from 'topojson-client';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const outDir = path.join(process.cwd(), 'data', 'basemap');
fs.mkdirSync(outDir, { recursive: true });

const write = (name, geojson) => {
  fs.writeFileSync(path.join(outDir, name), JSON.stringify(geojson));
  console.log('wrote', name, 'features:', geojson.features.length);
};

const landTopo = require('world-atlas/land-110m.json');
const countriesTopo = require('world-atlas/countries-110m.json');

write('land.geojson', feature(landTopo, landTopo.objects.land));
write('countries.geojson', feature(countriesTopo, countriesTopo.objects.countries));
```

- [ ] **Step 2: 生成底图数据**

```bash
npm run fetch-basemap
```

Expected: 输出 `wrote land.geojson features: 1`、`wrote countries.geojson features: 177`。

- [ ] **Step 3: 写 data/geo/rivers.geojson（手绘主要河流）**

```json
{
  "type": "FeatureCollection",
  "features": [
    { "type": "Feature", "properties": { "id": "yangtze", "name_zh": "长江", "name_en": "Yangtze River", "kind": "major" },
      "geometry": { "type": "LineString", "coordinates": [[91.2,34.2],[93.5,33.5],[96.0,33.0],[98.5,32.0],[100.5,31.2],[102.0,30.0],[103.5,29.0],[104.0,28.6],[105.0,28.8],[106.0,29.5],[107.0,30.3],[108.5,30.8],[110.0,30.5],[111.5,30.3],[112.5,29.8],[114.0,30.2],[115.0,30.0],[116.5,30.0],[118.0,30.5],[119.0,31.5],[120.5,31.8],[121.5,31.4],[121.8,31.2]] } },
    { "type": "Feature", "properties": { "id": "yellow", "name_zh": "黄河", "name_en": "Yellow River", "kind": "major" },
      "geometry": { "type": "LineString", "coordinates": [[96.5,35.5],[99.0,36.2],[100.5,36.0],[102.5,35.8],[103.8,36.2],[104.8,36.5],[105.5,37.2],[106.5,38.3],[107.0,39.0],[108.0,39.8],[109.5,40.3],[111.0,40.4],[110.5,39.0],[111.0,38.0],[110.0,37.2],[110.5,36.2],[110.8,35.2],[111.5,34.9],[113.0,34.8],[114.5,34.9],[116.0,35.0],[117.0,35.6],[117.5,36.5],[118.0,37.5],[118.8,37.8],[119.2,37.8]] } },
    { "type": "Feature", "properties": { "id": "pearl", "name_zh": "珠江", "name_en": "Pearl River", "kind": "major" },
      "geometry": { "type": "LineString", "coordinates": [[106.0,23.8],[108.0,23.7],[109.5,23.4],[110.5,23.2],[111.5,23.2],[112.5,23.1],[113.2,23.1],[113.5,22.8]] } },
    { "type": "Feature", "properties": { "id": "heilong", "name_zh": "黑龙江", "name_en": "Heilong River (Amur)", "kind": "major" },
      "geometry": { "type": "LineString", "coordinates": [[115.0,49.5],[118.0,50.2],[121.0,50.0],[124.0,50.5],[126.5,50.2],[128.5,50.0],[130.5,48.5],[132.5,48.0],[135.0,48.5]] } },
    { "type": "Feature", "properties": { "id": "lancang", "name_zh": "澜沧江", "name_en": "Lancang River (Mekong)", "kind": "minor" },
      "geometry": { "type": "LineString", "coordinates": [[94.0,32.5],[97.0,31.0],[99.5,30.0],[100.5,28.5],[101.5,27.0],[102.0,25.5],[101.5,24.0],[100.5,22.5],[100.0,21.5]] } },
    { "type": "Feature", "properties": { "id": "yarlung", "name_zh": "雅鲁藏布江", "name_en": "Yarlung Tsangpo", "kind": "minor" },
      "geometry": { "type": "LineString", "coordinates": [[82.0,30.5],[84.0,29.5],[86.0,29.3],[88.0,29.2],[90.0,29.3],[92.0,29.4],[94.0,29.5],[95.0,29.5]] } },
    { "type": "Feature", "properties": { "id": "huai", "name_zh": "淮河", "name_en": "Huai River", "kind": "minor" },
      "geometry": { "type": "LineString", "coordinates": [[114.5,32.4],[115.5,32.7],[116.8,32.8],[117.8,32.9],[118.5,33.0],[119.2,33.0]] } }
  ]
}
```

- [ ] **Step 4: 写 data/geo/lakes.geojson（手绘主要湖泊）**

```json
{
  "type": "FeatureCollection",
  "features": [
    { "type": "Feature", "properties": { "id": "qinghai", "name_zh": "青海湖", "name_en": "Qinghai Lake" },
      "geometry": { "type": "Polygon", "coordinates": [[[99.6,36.9],[100.0,37.2],[100.7,37.1],[100.5,36.7],[100.0,36.6],[99.7,36.7],[99.6,36.9]]] } },
    { "type": "Feature", "properties": { "id": "dongting", "name_zh": "洞庭湖", "name_en": "Dongting Lake" },
      "geometry": { "type": "Polygon", "coordinates": [[[112.4,29.3],[112.7,29.5],[113.0,29.4],[112.9,29.1],[112.6,29.0],[112.4,29.1],[112.4,29.3]]] } },
    { "type": "Feature", "properties": { "id": "poyang", "name_zh": "鄱阳湖", "name_en": "Poyang Lake" },
      "geometry": { "type": "Polygon", "coordinates": [[[116.0,29.3],[116.3,29.6],[116.5,29.3],[116.3,28.9],[116.0,28.9],[115.9,29.1],[116.0,29.3]]] } },
    { "type": "Feature", "properties": { "id": "taihu", "name_zh": "太湖", "name_en": "Taihu Lake" },
      "geometry": { "type": "Polygon", "coordinates": [[[120.1,31.2],[120.3,31.4],[120.5,31.2],[120.3,31.0],[120.1,31.0],[120.1,31.2]]] } }
  ]
}
```

- [ ] **Step 5: 在 src/main.js 中加载底图源与图层**

`src/main.js` 全文替换为：

```js
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './styles.css';
import { PALETTE, buildStyle } from './style.js';

const map = new maplibregl.Map({
  container: 'map',
  style: buildStyle(),
  center: [110, 36],
  zoom: 3.4,
  minZoom: 2.5,
  maxZoom: 10,
  attributionControl: false
});

map.on('load', () => {
  map.addSource('land', { type: 'geojson', data: './data/basemap/land.geojson' });
  map.addSource('countries', { type: 'geojson', data: './data/basemap/countries.geojson' });
  map.addSource('rivers', { type: 'geojson', data: './data/geo/rivers.geojson' });
  map.addSource('lakes', { type: 'geojson', data: './data/geo/lakes.geojson' });

  map.addLayer({ id: 'land-fill', type: 'fill', source: 'land',
    paint: { 'fill-color': PALETTE.land } });
  map.addLayer({ id: 'land-edge', type: 'line', source: 'land',
    paint: { 'line-color': PALETTE.landEdge, 'line-width': 1.2 } });
  map.addLayer({ id: 'country-line', type: 'line', source: 'countries',
    paint: { 'line-color': PALETTE.countryLine, 'line-width': 0.6, 'line-dasharray': [2, 2] } });
  map.addLayer({ id: 'lake-fill', type: 'fill', source: 'lakes',
    paint: { 'fill-color': PALETTE.lake } });
  map.addLayer({ id: 'lake-edge', type: 'line', source: 'lakes',
    paint: { 'line-color': PALETTE.river, 'line-width': 0.7 } });
  map.addLayer({ id: 'river-line', type: 'line', source: 'rivers',
    paint: { 'line-color': PALETTE.river, 'line-width': ['match', ['get', 'kind'], 'major', 1.4, 0.8] } });
});

window.__hm = { map };

export { map };
```

- [ ] **Step 6: 验证**

```bash
npm run dev
```

Expected: 浏览器显示宣纸底图 + 墨色陆地轮廓 + 蓝色河流湖泊。注意：`data/basemap/*.geojson` 必须在第 2 步生成后才可见。

- [ ] **Step 7: 提交**

```bash
git add -A
git commit -m "feat: antique basemap with land, borders, rivers and lakes"
```

### Task 3: 历史疆域多边形（borders.geojson + 渲染）

**Files:**
- Create: `data/geo/borders.geojson`
- Modify: `src/main.js`（加载 borders 源与图层）
- Modify: `src/style.js`（无需改，颜色已备）

**Interfaces:**
- Consumes: `PALETTE` from `src/style.js`
- Produces: source `borders`；每个政权一个图层，id 格式 `border-<polityId>`，图层 `layout.visibility` 由 Task 4 控制。政权的 `id` 为：`han`、`wei`、`shu`、`wu`、`tang`、`north-song`、`liao`、`xixia`、`dali`、`qing`。

- [ ] **Step 1: 写 data/geo/borders.geojson**

每个 feature 的 properties 为 `{ id, period, name_zh, name_en, color }`，period 取 `qinhan` / `sanguo` / `suitang` / `songliaojin` / `yuanmingqing`。完整内容如下：

```json
{
  "type": "FeatureCollection",
  "features": [
    { "type": "Feature",
      "properties": { "id": "han", "period": "qinhan", "name_zh": "汉", "name_en": "Han Empire", "color": "#9c4a3a" },
      "geometry": { "type": "Polygon", "coordinates": [[
        [121.5,41.5],[125.5,40.6],[127.2,39.6],[126.6,38.9],[124.6,39.8],[122.2,39.1],[119.5,40.0],[118.5,39.7],[117.7,39.0],[118.0,38.5],[119.5,37.5],[119.3,36.0],[119.5,34.5],[120.2,33.2],[120.8,32.0],[121.8,31.0],[121.0,30.5],[120.5,28.5],[120.0,26.0],[119.0,24.5],[117.5,23.5],[116.0,23.0],[114.5,22.8],[113.5,22.2],[112.0,21.8],[111.0,21.5],[110.0,20.8],[109.5,19.5],[108.5,19.5],[107.5,20.5],[106.5,21.0],[105.5,21.8],[104.5,22.5],[105.0,23.0],[105.5,23.8],[106.0,24.8],[106.3,25.5],[105.5,26.3],[104.5,26.8],[103.5,27.2],[102.5,27.8],[101.5,29.0],[100.3,30.0],[98.5,30.8],[96.5,31.5],[94.5,32.2],[92.5,32.8],[90.0,33.5],[87.5,34.2],[85.0,34.8],[83.0,35.2],[80.5,35.5],[78.0,35.8],[76.0,37.0],[74.5,38.0],[73.5,39.5],[74.0,40.5],[76.0,42.0],[80.0,42.8],[83.0,43.5],[86.0,43.0],[90.0,42.0],[95.0,42.8],[97.5,42.0],[100.8,40.5],[104.2,40.0],[106.8,40.2],[108.5,40.5],[110.5,41.0],[113.8,40.8],[117.5,39.2],[121.5,41.5]
      ]] } },
    { "type": "Feature",
      "properties": { "id": "wei", "period": "sanguo", "name_zh": "魏", "name_en": "Cao Wei", "color": "#4a6b8a" },
      "geometry": { "type": "Polygon", "coordinates": [[
        [104.0,40.5],[108.5,40.5],[110.5,41.0],[113.8,40.8],[117.5,39.2],[119.5,40.0],[121.5,41.5],[125.5,40.6],[127.2,39.6],[126.6,38.9],[124.6,39.8],[122.2,39.1],[121.0,37.5],[120.0,36.5],[119.0,35.0],[117.0,34.0],[116.5,33.0],[116.5,32.5],[114.0,33.0],[113.5,32.5],[112.0,32.0],[111.0,32.0],[110.0,31.5],[109.5,32.0],[108.5,32.5],[107.0,33.5],[106.5,34.5],[105.5,35.5],[104.0,37.0],[103.0,38.0],[104.0,40.5]
      ]] } },
    { "type": "Feature",
      "properties": { "id": "shu", "period": "sanguo", "name_zh": "蜀", "name_en": "Shu Han", "color": "#7a9a5e" },
      "geometry": { "type": "Polygon", "coordinates": [[
        [102.5,33.0],[104.5,32.8],[106.0,32.0],[107.0,31.5],[108.0,31.0],[108.5,30.0],[108.0,29.0],[107.0,28.5],[106.0,28.0],[105.0,27.5],[104.5,26.8],[103.5,26.2],[103.0,25.5],[102.5,24.8],[101.5,24.5],[100.5,24.8],[99.5,25.5],[99.0,26.5],[98.5,27.5],[99.0,28.5],[100.0,29.5],[101.0,30.5],[101.8,31.5],[102.5,33.0]
      ]] } },
    { "type": "Feature",
      "properties": { "id": "wu", "period": "sanguo", "name_zh": "吴", "name_en": "Eastern Wu", "color": "#b08a3e" },
      "geometry": { "type": "Polygon", "coordinates": [[
        [116.5,32.5],[117.0,33.5],[118.0,33.8],[119.5,33.5],[120.2,33.2],[120.8,32.0],[121.8,31.0],[121.0,30.5],[120.5,28.5],[120.0,26.0],[119.0,24.5],[117.5,23.5],[116.0,23.0],[114.5,22.8],[113.5,22.2],[112.0,21.8],[111.0,21.5],[110.0,20.8],[109.5,19.5],[108.5,19.5],[107.5,20.5],[108.0,22.0],[109.0,23.0],[110.0,24.0],[111.0,25.0],[112.5,25.5],[113.5,26.5],[114.5,27.5],[115.5,28.5],[116.0,29.5],[116.0,30.5],[115.5,31.5],[116.5,32.5]
      ]] } },
    { "type": "Feature",
      "properties": { "id": "tang", "period": "suitang", "name_zh": "唐", "name_en": "Tang Empire", "color": "#9c4a3a" },
      "geometry": { "type": "Polygon", "coordinates": [[
        [121.5,41.5],[125.5,40.6],[127.2,39.6],[126.6,38.9],[124.6,39.8],[122.2,39.1],[119.5,40.0],[118.5,39.7],[117.7,39.0],[118.0,38.5],[119.5,37.5],[119.3,36.0],[119.5,34.5],[120.2,33.2],[120.8,32.0],[121.8,31.0],[121.0,30.5],[120.5,28.5],[120.0,26.0],[119.0,24.5],[117.5,23.5],[116.0,23.0],[114.5,22.8],[113.5,22.2],[112.0,21.8],[111.0,21.5],[110.0,20.8],[109.5,19.5],[108.5,19.5],[107.5,20.5],[106.5,21.0],[105.5,21.8],[104.5,22.5],[105.0,23.0],[105.5,23.8],[106.0,24.8],[106.3,25.5],[105.5,26.3],[104.5,26.8],[103.5,27.2],[102.5,27.8],[101.5,29.0],[100.3,30.0],[99.0,30.5],[98.0,31.0],[97.5,32.0],[97.0,33.0],[97.5,34.0],[98.5,35.0],[100.0,36.0],[101.5,37.0],[103.0,37.8],[104.5,38.2],[105.5,38.8],[106.5,39.5],[108.0,40.2],[109.5,40.8],[111.0,41.3],[112.5,41.6],[114.0,41.6],[115.5,41.4],[117.0,41.0],[118.5,40.5],[119.5,40.0],[121.0,40.0],[121.5,41.5]
      ]] } },
    { "type": "Feature",
      "properties": { "id": "north-song", "period": "songliaojin", "name_zh": "北宋", "name_en": "Northern Song", "color": "#9c4a3a" },
      "geometry": { "type": "Polygon", "coordinates": [[
        [106.5,39.0],[108.0,39.8],[109.5,40.3],[110.5,40.0],[112.0,39.5],[114.0,39.8],[115.5,39.5],[116.5,39.3],[117.5,39.0],[118.0,38.5],[119.5,37.5],[119.3,36.0],[119.5,34.5],[120.2,33.2],[120.8,32.0],[121.8,31.0],[121.0,30.5],[120.5,28.5],[120.0,26.0],[119.0,24.5],[117.5,23.5],[116.0,23.0],[114.5,22.8],[113.5,22.2],[112.0,21.8],[111.0,21.5],[110.0,20.8],[109.5,19.5],[108.5,19.5],[107.5,20.5],[106.5,21.0],[105.5,21.8],[104.5,22.5],[105.0,23.0],[105.5,23.8],[106.0,24.8],[106.3,25.5],[105.5,26.3],[104.5,26.8],[103.5,27.2],[102.5,27.8],[101.5,29.0],[100.3,30.0],[98.5,30.8],[97.0,31.0],[96.0,32.0],[95.0,33.0],[94.5,34.0],[95.5,34.8],[97.0,35.5],[98.5,36.0],[100.0,36.5],[101.5,37.0],[103.0,37.5],[104.2,37.8],[105.2,38.0],[106.5,39.0]
      ]] } },
    { "type": "Feature",
      "properties": { "id": "liao", "period": "songliaojin", "name_zh": "辽", "name_en": "Liao Dynasty", "color": "#6a7d4a" },
      "geometry": { "type": "Polygon", "coordinates": [[
        [124.5,40.5],[127.2,41.5],[129.5,42.5],[131.0,44.0],[130.5,46.5],[128.5,48.0],[126.0,49.0],[123.0,50.0],[120.0,50.5],[117.5,49.5],[116.0,48.5],[115.5,47.0],[115.0,45.5],[113.5,44.5],[112.0,43.5],[110.5,42.5],[109.5,41.5],[110.0,40.8],[112.0,40.8],[114.0,41.0],[116.0,41.3],[118.0,41.0],[120.0,41.5],[122.0,41.5],[124.5,40.5]
      ]] } },
    { "type": "Feature",
      "properties": { "id": "xixia", "period": "songliaojin", "name_zh": "西夏", "name_en": "Western Xia", "color": "#8a5a9a" },
      "geometry": { "type": "Polygon", "coordinates": [[
        [100.5,41.5],[102.5,41.0],[104.5,40.8],[105.8,40.0],[106.5,39.0],[105.5,38.0],[105.0,37.0],[104.0,36.5],[103.5,36.0],[103.0,35.5],[102.5,35.8],[101.5,36.2],[100.0,36.5],[98.5,37.0],[97.5,38.0],[97.0,39.0],[97.5,40.0],[98.5,40.8],[99.5,41.2],[100.5,41.5]
      ]] } },
    { "type": "Feature",
      "properties": { "id": "dali", "period": "songliaojin", "name_zh": "大理", "name_en": "Dali Kingdom", "color": "#b08a3e" },
      "geometry": { "type": "Polygon", "coordinates": [[
        [99.5,28.5],[101.5,28.5],[102.5,27.8],[103.0,26.8],[103.5,25.8],[103.0,24.8],[102.0,24.0],[101.5,23.0],[100.5,22.5],[99.5,22.0],[98.5,22.0],[97.5,22.5],[97.5,23.5],[98.0,24.5],[98.5,25.5],[98.5,26.5],[98.5,27.5],[99.5,28.5]
      ]] } },
    { "type": "Feature",
      "properties": { "id": "qing", "period": "yuanmingqing", "name_zh": "清", "name_en": "Qing Empire", "color": "#9c4a3a" },
      "geometry": { "type": "Polygon", "coordinates": [[
        [142.5,46.8],[142.0,48.0],[141.0,48.2],[140.0,48.7],[138.5,49.5],[136.5,50.3],[134.5,51.0],[132.5,51.8],[130.5,52.3],[128.5,52.8],[126.5,53.0],[124.0,53.2],[121.5,53.2],[119.0,53.0],[117.0,52.3],[115.0,51.5],[113.0,50.7],[111.0,49.8],[109.5,48.8],[108.0,47.8],[106.5,46.8],[105.0,46.0],[103.5,45.5],[102.0,45.3],[100.5,45.5],[99.0,45.8],[97.5,46.2],[96.0,46.5],[94.5,47.0],[93.0,47.3],[91.5,47.5],[90.0,47.5],[88.5,47.0],[87.0,46.3],[85.5,45.8],[84.0,45.2],[82.5,44.8],[81.0,44.3],[79.5,44.0],[78.0,43.8],[76.5,43.5],[75.0,43.0],[73.5,42.5],[72.0,41.8],[70.5,41.2],[69.0,40.5],[68.0,40.0],[67.5,39.5],[68.0,39.0],[69.5,38.5],[71.0,38.2],[72.5,38.0],[74.0,37.8],[75.5,37.5],[77.0,37.2],[78.5,36.8],[80.0,36.5],[81.5,36.2],[83.0,35.8],[84.5,35.3],[86.0,34.8],[87.5,34.3],[89.0,33.8],[90.5,33.2],[92.0,32.5],[93.5,31.8],[95.0,31.0],[96.0,30.3],[97.0,29.5],[97.5,28.8],[97.5,28.0],[97.0,27.2],[96.5,26.3],[95.8,25.5],[95.2,24.8],[94.8,24.2],[95.0,23.8],[96.0,23.5],[97.0,23.3],[98.0,23.2],[99.0,23.2],[100.0,23.3],[101.0,23.2],[102.0,22.8],[103.0,22.3],[104.0,21.8],[104.5,21.3],[105.0,21.0],[105.5,21.2],[106.0,21.5],[106.5,21.8],[107.0,22.0],[107.5,22.2],[108.0,22.0],[108.5,21.7],[109.0,21.5],[109.5,21.3],[110.0,21.3],[110.5,21.5],[111.0,21.8],[111.5,22.0],[112.0,22.0],[112.5,22.3],[113.0,22.5],[113.5,22.8],[114.0,23.0],[114.5,23.2],[115.0,23.5],[115.5,23.8],[116.0,24.0],[116.5,24.2],[117.0,24.5],[117.5,24.8],[118.0,25.2],[118.5,25.7],[119.0,26.3],[119.5,27.0],[120.0,27.8],[120.5,28.7],[121.0,29.5],[121.5,30.2],[122.0,30.8],[122.5,31.2],[123.0,31.8],[123.5,32.3],[124.0,32.8],[124.5,33.3],[125.0,33.8],[125.5,34.3],[126.0,34.8],[126.5,35.3],[127.0,35.8],[127.5,36.3],[128.0,36.8],[128.5,37.3],[129.0,37.8],[129.5,38.3],[130.0,38.8],[130.5,39.3],[131.0,39.8],[131.5,40.3],[132.0,40.8],[132.5,41.3],[133.0,41.8],[133.5,42.3],[134.0,42.8],[134.5,43.3],[135.0,43.8],[135.5,44.3],[136.0,44.8],[136.5,45.3],[137.0,45.8],[137.5,46.3],[138.0,46.8],[138.5,47.3],[139.0,47.8],[139.5,48.3],[140.0,48.8],[140.5,49.3],[141.0,49.8],[141.5,50.3],[142.0,50.8],[142.0,51.3],[141.5,51.8],[141.0,52.3],[140.5,52.8],[140.0,53.3],[140.5,53.8],[141.2,54.0],[142.0,53.8],[142.3,53.2],[142.2,52.5],[141.8,51.8],[141.2,51.0],[140.8,50.2],[141.0,49.3],[141.5,48.5],[142.5,47.5],[142.5,46.8]
      ]] } }
  ]
}
```

- [ ] **Step 2: 在 src/main.js 中加载 borders 源与图层**

在 `map.on('load', ...)` 回调内、河流图层之后追加：

```js
  map.addSource('borders', { type: 'geojson', data: './data/geo/borders.geojson' });

  const BORDER_IDS = ['han', 'wei', 'shu', 'wu', 'tang', 'north-song', 'liao', 'xixia', 'dali', 'qing'];
  for (const id of BORDER_IDS) {
    map.addLayer({
      id: `border-fill-${id}`, type: 'fill', source: 'borders',
      filter: ['==', ['get', 'id'], id],
      paint: { 'fill-color': ['match', ['get', 'color'], '', ['get', 'color'], '#9c4a3a'],
               'fill-opacity': 0.16 }
    });
    map.addLayer({
      id: `border-line-${id}`, type: 'line', source: 'borders',
      filter: ['==', ['get', 'id'], id],
      paint: { 'line-color': PALETTE.borderLine, 'line-width': 1.6, 'line-opacity': 0.85 }
    });
  }
```

- [ ] **Step 3: 验证**

```bash
npm run dev
```

Expected: 默认视野显示汉朝疆域朱砂色多边形 + 墨线描边（此时所有政权都显示，属预期；Task 4 会按时期控制显隐）。

- [ ] **Step 4: 提交**

```bash
git add -A
git commit -m "feat: historical polity polygons for all five periods"
```

### Task 4: 时期时间轴切换

**Files:**
- Create: `src/periods.js`
- Create: `src/ui/timeline.js`
- Modify: `src/main.js`（引入 periods/timeline，初始化默认时期）
- Modify: `src/styles.css`（追加过渡动画类）

**Interfaces:**
- Consumes: `map`（export from `src/main.js`）、borders 图层 `border-fill-<id>` / `border-line-<id>`
- Produces: `src/periods.js` 导出 `PERIODS`（数组，元素 `{ id, zh, en, center:[lon,lat], zoom }`）与 `borderIdsByPeriod(id)`（返回该时期政权 id 数组）；`src/ui/timeline.js` 导出 `initTimeline(onChange)`；`src/main.js` 导出 `currentPeriod`（字符串）与 `setPeriod(id)`

- [ ] **Step 1: 写 src/periods.js**

```js
export const PERIODS = [
  { id: 'qinhan', zh: '秦汉', en: 'Qin & Han', center: [108.94, 34.34], zoom: 3.8 },
  { id: 'sanguo', zh: '三国两晋南北朝', en: 'Three Kingdoms–North & South', center: [111.0, 32.5], zoom: 4.0 },
  { id: 'suitang', zh: '隋唐', en: 'Sui & Tang', center: [108.94, 34.34], zoom: 3.8 },
  { id: 'songliaojin', zh: '宋辽金', en: 'Song·Liao·Jin', center: [114.0, 37.0], zoom: 4.0 },
  { id: 'yuanmingqing', zh: '元明清', en: 'Yuan·Ming·Qing', center: [116.41, 39.9], zoom: 3.6 }
];

const BORDER_IDS_BY_PERIOD = {
  qinhan: ['han'],
  sanguo: ['wei', 'shu', 'wu'],
  suitang: ['tang'],
  songliaojin: ['north-song', 'liao', 'xixia', 'dali'],
  yuanmingqing: ['qing']
};

export const ALL_BORDER_IDS = ['han', 'wei', 'shu', 'wu', 'tang', 'north-song', 'liao', 'xixia', 'dali', 'qing'];

export function borderIdsByPeriod(periodId) {
  return BORDER_IDS_BY_PERIOD[periodId] || [];
}

export function periodById(id) {
  return PERIODS.find((p) => p.id === id);
}
```

- [ ] **Step 2: 写 src/ui/timeline.js**

```js
import { PERIODS } from '../periods.js';

export function initTimeline(onChange) {
  const nav = document.getElementById('timeline');
  nav.innerHTML = '';
  for (const p of PERIODS) {
    const btn = document.createElement('button');
    btn.className = 'tl-btn';
    btn.dataset.period = p.id;
    btn.innerHTML = `<span class="cn">${p.zh}</span><span class="en">${p.en}</span>`;
    btn.addEventListener('click', () => onChange(p.id));
    nav.appendChild(btn);
  }
}

export function markActive(periodId) {
  document.querySelectorAll('.tl-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.period === periodId);
  });
}
```

- [ ] **Step 3: 在 src/main.js 中实现 setPeriod 并接入时间轴**

`src/main.js` 全文替换为：

```js
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './styles.css';
import { PALETTE, buildStyle } from './style.js';
import { PERIODS, ALL_BORDER_IDS, borderIdsByPeriod, periodById } from './periods.js';
import { initTimeline, markActive } from './ui/timeline.js';

const map = new maplibregl.Map({
  container: 'map',
  style: buildStyle(),
  center: [110, 36],
  zoom: 3.4,
  minZoom: 2.5,
  maxZoom: 10,
  attributionControl: false
});

let currentPeriod = PERIODS[0].id;

function applyPeriodVisibility(periodId) {
  const visible = new Set(borderIdsByPeriod(periodId));
  for (const id of ALL_BORDER_IDS) {
    const on = visible.has(id) ? 'visible' : 'none';
    if (map.getLayer(`border-fill-${id}`)) map.setLayoutProperty(`border-fill-${id}`, 'visibility', on);
    if (map.getLayer(`border-line-${id}`)) map.setLayoutProperty(`border-line-${id}`, 'visibility', on);
  }
}

export function setPeriod(periodId) {
  currentPeriod = periodId;
  const p = periodById(periodId);
  applyPeriodVisibility(periodId);
  markActive(periodId);
  const el = document.getElementById('map');
  el.classList.add('period-fading');
  setTimeout(() => el.classList.remove('period-fading'), 350);
  map.flyTo({ center: p.center, zoom: p.zoom, duration: 1200 });
}

map.on('load', () => {
  map.addSource('land', { type: 'geojson', data: './data/basemap/land.geojson' });
  map.addSource('countries', { type: 'geojson', data: './data/basemap/countries.geojson' });
  map.addSource('rivers', { type: 'geojson', data: './data/geo/rivers.geojson' });
  map.addSource('lakes', { type: 'geojson', data: './data/geo/lakes.geojson' });

  map.addLayer({ id: 'land-fill', type: 'fill', source: 'land',
    paint: { 'fill-color': PALETTE.land } });
  map.addLayer({ id: 'land-edge', type: 'line', source: 'land',
    paint: { 'line-color': PALETTE.landEdge, 'line-width': 1.2 } });
  map.addLayer({ id: 'country-line', type: 'line', source: 'countries',
    paint: { 'line-color': PALETTE.countryLine, 'line-width': 0.6, 'line-dasharray': [2, 2] } });
  map.addLayer({ id: 'lake-fill', type: 'fill', source: 'lakes',
    paint: { 'fill-color': PALETTE.lake } });
  map.addLayer({ id: 'lake-edge', type: 'line', source: 'lakes',
    paint: { 'line-color': PALETTE.river, 'line-width': 0.7 } });
  map.addLayer({ id: 'river-line', type: 'line', source: 'rivers',
    paint: { 'line-color': PALETTE.river, 'line-width': ['match', ['get', 'kind'], 'major', 1.4, 0.8] } });

  map.addSource('borders', { type: 'geojson', data: './data/geo/borders.geojson' });
  for (const id of ALL_BORDER_IDS) {
    map.addLayer({
      id: `border-fill-${id}`, type: 'fill', source: 'borders',
      filter: ['==', ['get', 'id'], id],
      paint: { 'fill-color': '#9c4a3a', 'fill-opacity': 0.16 }
    });
    map.addLayer({
      id: `border-line-${id}`, type: 'line', source: 'borders',
      filter: ['==', ['get', 'id'], id],
      paint: { 'line-color': PALETTE.borderLine, 'line-width': 1.6, 'line-opacity': 0.85 }
    });
  }

  initTimeline((id) => setPeriod(id));
  setPeriod(PERIODS[0].id);
});

window.__hm = { map, setPeriod };

export { map, currentPeriod };
```

- [ ] **Step 4: 在 src/styles.css 追加过渡动画**

在文件末尾追加：

```css
#map { transition: opacity 0.25s ease; }
#map.period-fading { opacity: 0.55; }
```

（fade 类切换已包含在 Step 3 的 `setPeriod` 中。）

- [ ] **Step 5: 验证**

```bash
npm run dev
```

Expected: 顶部出现 5 个时期按钮，默认「秦汉」高亮且只显示汉疆域；点击「三国两晋南北朝」→ 显示魏蜀吴三色疆域，视野飞到中原；点击「宋辽金」→ 显示北宋/辽/西夏/大理四色。

- [ ] **Step 6: 提交**

```bash
git add -A
git commit -m "feat: period timeline switching with fly-to and fade"
```

### Task 5: 城市点位 + 长城/运河/丝路图层

**Files:**
- Create: `data/geo/cities.geojson`
- Create: `data/geo/wall.geojson`
- Create: `data/geo/canal.geojson`
- Create: `data/geo/silkroad.geojson`
- Create: `src/markers.js`
- Modify: `src/main.js`（加载新源/图层，挂接 markers 点击）
- Modify: `src/styles.css`（标记样式）

**Interfaces:**
- Consumes: `map`、`setPeriod`、`currentPeriod`（`src/main.js`）；`PALETTE`
- Produces: sources `cities` / `wall` / `canal` / `silkroad`；layers `city-dot`、`event-dot`（Task 10 加）、`wall-line`、`canal-line`、`silk-land-line`、`silk-sea-line`；`src/markers.js` 导出 `renderCityMarkers()`、`renderEventMarkers()`（Task 10 实现后者）、`refreshMarkers(periodId)`；每个城市 marker DOM：`<div class="city-marker" data-city-id="...">`；点击派发 `city-click` 事件（Task 11 消费）。`cities.geojson` 的 properties：`{ id, name_zh, name_en, period: <数组，出现时期>, ancient: { <periodId>: { zh, en } } }`

- [ ] **Step 1: 写 data/geo/cities.geojson**

完整内容（27 城；坐标见下，period 数组与古名按 Global Constraints 中文名称要求填写）：

```json
{
  "type": "FeatureCollection",
  "features": [
    { "type": "Feature", "properties": { "id": "xian", "name_zh": "西安", "name_en": "Xi'an", "period": ["qinhan","sanguo","suitang","songliaojin","yuanmingqing"], "ancient": { "qinhan": { "zh": "长安", "en": "Chang'an" }, "sanguo": { "zh": "长安", "en": "Chang'an" }, "suitang": { "zh": "长安", "en": "Chang'an" }, "songliaojin": { "zh": "长安", "en": "Chang'an" }, "yuanmingqing": { "zh": "西安", "en": "Xi'an" } } }, "geometry": { "type": "Point", "coordinates": [108.94, 34.34] } },
    { "type": "Feature", "properties": { "id": "beijing", "name_zh": "北京", "name_en": "Beijing", "period": ["qinhan","sanguo","suitang","songliaojin","yuanmingqing"], "ancient": { "qinhan": { "zh": "蓟", "en": "Ji" }, "sanguo": { "zh": "蓟", "en": "Ji" }, "suitang": { "zh": "幽州", "en": "Youzhou" }, "songliaojin": { "zh": "燕京·中都", "en": "Yanjing·Zhongdu" }, "yuanmingqing": { "zh": "大都·北京", "en": "Dadu·Beijing" } } }, "geometry": { "type": "Point", "coordinates": [116.41, 39.9] } },
    { "type": "Feature", "properties": { "id": "luoyang", "name_zh": "洛阳", "name_en": "Luoyang", "period": ["qinhan","sanguo","suitang","songliaojin","yuanmingqing"], "ancient": { "qinhan": { "zh": "雒阳", "en": "Luoyang" }, "sanguo": { "zh": "洛阳", "en": "Luoyang" }, "suitang": { "zh": "东都·洛阳", "en": "Eastern Capital" }, "songliaojin": { "zh": "西京", "en": "Western Capital" }, "yuanmingqing": { "zh": "洛阳", "en": "Luoyang" } } }, "geometry": { "type": "Point", "coordinates": [112.45, 34.62] } },
    { "type": "Feature", "properties": { "id": "nanjing", "name_zh": "南京", "name_en": "Nanjing", "period": ["qinhan","sanguo","suitang","songliaojin","yuanmingqing"], "ancient": { "qinhan": { "zh": "秣陵", "en": "Muling" }, "sanguo": { "zh": "建业", "en": "Jianye" }, "suitang": { "zh": "金陵", "en": "Jinling" }, "songliaojin": { "zh": "建康", "en": "Jiankang" }, "yuanmingqing": { "zh": "应天·南京", "en": "Yingtian·Nanjing" } } }, "geometry": { "type": "Point", "coordinates": [118.8, 32.06] } },
    { "type": "Feature", "properties": { "id": "kaifeng", "name_zh": "开封", "name_en": "Kaifeng", "period": ["qinhan","sanguo","suitang","songliaojin","yuanmingqing"], "ancient": { "qinhan": { "zh": "大梁", "en": "Daliang" }, "sanguo": { "zh": "开封", "en": "Kaifeng" }, "suitang": { "zh": "汴州", "en": "Bianzhou" }, "songliaojin": { "zh": "汴京·东京", "en": "Bianjing·Dongjing" }, "yuanmingqing": { "zh": "开封", "en": "Kaifeng" } } }, "geometry": { "type": "Point", "coordinates": [114.35, 34.8] } },
    { "type": "Feature", "properties": { "id": "hangzhou", "name_zh": "杭州", "name_en": "Hangzhou", "period": ["qinhan","sanguo","suitang","songliaojin","yuanmingqing"], "ancient": { "qinhan": { "zh": "钱塘", "en": "Qiantang" }, "sanguo": { "zh": "钱塘", "en": "Qiantang" }, "suitang": { "zh": "杭州", "en": "Hangzhou" }, "songliaojin": { "zh": "临安", "en": "Lin'an" }, "yuanmingqing": { "zh": "杭州", "en": "Hangzhou" } } }, "geometry": { "type": "Point", "coordinates": [120.15, 30.28] } },
    { "type": "Feature", "properties": { "id": "anyang", "name_zh": "安阳", "name_en": "Anyang", "period": ["qinhan","sanguo","suitang","songliaojin","yuanmingqing"], "ancient": { "qinhan": { "zh": "安阳", "en": "Anyang" }, "sanguo": { "zh": "邺城", "en": "Yecheng" }, "suitang": { "zh": "相州", "en": "Xiangzhou" }, "songliaojin": { "zh": "安阳", "en": "Anyang" }, "yuanmingqing": { "zh": "彰德府", "en": "Zhangde" } } }, "geometry": { "type": "Point", "coordinates": [114.35, 36.1] } },
    { "type": "Feature", "properties": { "id": "chengdu", "name_zh": "成都", "name_en": "Chengdu", "period": ["qinhan","sanguo","suitang","songliaojin","yuanmingqing"], "ancient": { "qinhan": { "zh": "蜀郡", "en": "Shu Commandery" }, "sanguo": { "zh": "成都", "en": "Chengdu" }, "suitang": { "zh": "益州", "en": "Yizhou" }, "songliaojin": { "zh": "成都府", "en": "Chengdu" }, "yuanmingqing": { "zh": "成都", "en": "Chengdu" } } }, "geometry": { "type": "Point", "coordinates": [104.07, 30.66] } },
    { "type": "Feature", "properties": { "id": "suzhou", "name_zh": "苏州", "name_en": "Suzhou", "period": ["qinhan","sanguo","suitang","songliaojin","yuanmingqing"], "ancient": { "qinhan": { "zh": "吴", "en": "Wu" }, "sanguo": { "zh": "吴", "en": "Wu" }, "suitang": { "zh": "苏州", "en": "Suzhou" }, "songliaojin": { "zh": "平江府", "en": "Pingjiang" }, "yuanmingqing": { "zh": "苏州", "en": "Suzhou" } } }, "geometry": { "type": "Point", "coordinates": [120.59, 31.3] } },
    { "type": "Feature", "properties": { "id": "yangzhou", "name_zh": "扬州", "name_en": "Yangzhou", "period": ["qinhan","sanguo","suitang","songliaojin","yuanmingqing"], "ancient": { "qinhan": { "zh": "广陵", "en": "Guangling" }, "sanguo": { "zh": "广陵", "en": "Guangling" }, "suitang": { "zh": "江都", "en": "Jiangdu" }, "songliaojin": { "zh": "扬州", "en": "Yangzhou" }, "yuanmingqing": { "zh": "扬州", "en": "Yangzhou" } } }, "geometry": { "type": "Point", "coordinates": [119.41, 32.39] } },
    { "type": "Feature", "properties": { "id": "shaoxing", "name_zh": "绍兴", "name_en": "Shaoxing", "period": ["qinhan","sanguo","suitang","songliaojin","yuanmingqing"], "ancient": { "qinhan": { "zh": "会稽", "en": "Kuaiji" }, "sanguo": { "zh": "会稽", "en": "Kuaiji" }, "suitang": { "zh": "越州", "en": "Yuezhou" }, "songliaojin": { "zh": "越州·绍兴", "en": "Yuezhou·Shaoxing" }, "yuanmingqing": { "zh": "绍兴", "en": "Shaoxing" } } }, "geometry": { "type": "Point", "coordinates": [120.58, 30.01] } },
    { "type": "Feature", "properties": { "id": "jingzhou", "name_zh": "荆州", "name_en": "Jingzhou", "period": ["qinhan","sanguo","suitang","songliaojin","yuanmingqing"], "ancient": { "qinhan": { "zh": "江陵", "en": "Jiangling" }, "sanguo": { "zh": "江陵", "en": "Jiangling" }, "suitang": { "zh": "荆州", "en": "Jingzhou" }, "songliaojin": { "zh": "江陵府", "en": "Jiangling" }, "yuanmingqing": { "zh": "荆州", "en": "Jingzhou" } } }, "geometry": { "type": "Point", "coordinates": [112.24, 30.33] } },
    { "type": "Feature", "properties": { "id": "xiangyang", "name_zh": "襄阳", "name_en": "Xiangyang", "period": ["qinhan","sanguo","suitang","songliaojin","yuanmingqing"], "ancient": { "qinhan": { "zh": "襄阳", "en": "Xiangyang" }, "sanguo": { "zh": "襄阳", "en": "Xiangyang" }, "suitang": { "zh": "襄州", "en": "Xiangzhou" }, "songliaojin": { "zh": "襄阳府", "en": "Xiangyang" }, "yuanmingqing": { "zh": "襄阳", "en": "Xiangyang" } } }, "geometry": { "type": "Point", "coordinates": [112.12, 32.01] } },
    { "type": "Feature", "properties": { "id": "datong", "name_zh": "大同", "name_en": "Datong", "period": ["qinhan","sanguo","suitang","songliaojin","yuanmingqing"], "ancient": { "qinhan": { "zh": "平城", "en": "Pingcheng" }, "sanguo": { "zh": "平城", "en": "Pingcheng" }, "suitang": { "zh": "云州", "en": "Yunzhou" }, "songliaojin": { "zh": "大同", "en": "Datong" }, "yuanmingqing": { "zh": "大同", "en": "Datong" } } }, "geometry": { "type": "Point", "coordinates": [113.3, 40.08] } },
    { "type": "Feature", "properties": { "id": "quanzhou", "name_zh": "泉州", "name_en": "Quanzhou", "period": ["suitang","songliaojin","yuanmingqing"], "ancient": { "suitang": { "zh": "泉州", "en": "Quanzhou" }, "songliaojin": { "zh": "刺桐", "en": "Zayton" }, "yuanmingqing": { "zh": "刺桐·泉州", "en": "Zayton·Quanzhou" } } }, "geometry": { "type": "Point", "coordinates": [118.68, 24.87] } },
    { "type": "Feature", "properties": { "id": "guangzhou", "name_zh": "广州", "name_en": "Guangzhou", "period": ["qinhan","sanguo","suitang","songliaojin","yuanmingqing"], "ancient": { "qinhan": { "zh": "番禺", "en": "Panyu" }, "sanguo": { "zh": "番禺", "en": "Panyu" }, "suitang": { "zh": "广州", "en": "Guangzhou" }, "songliaojin": { "zh": "广州", "en": "Guangzhou" }, "yuanmingqing": { "zh": "广州", "en": "Guangzhou" } } }, "geometry": { "type": "Point", "coordinates": [113.26, 23.13] } },
    { "type": "Feature", "properties": { "id": "shanghai", "name_zh": "上海", "name_en": "Shanghai", "period": ["yuanmingqing"], "ancient": { "yuanmingqing": { "zh": "上海县", "en": "Shanghai County" } } }, "geometry": { "type": "Point", "coordinates": [121.47, 31.23] } },
    { "type": "Feature", "properties": { "id": "jiujiang", "name_zh": "九江", "name_en": "Jiujiang", "period": ["qinhan","sanguo","suitang","songliaojin","yuanmingqing"], "ancient": { "qinhan": { "zh": "浔阳", "en": "Xunyang" }, "sanguo": { "zh": "浔阳", "en": "Xunyang" }, "suitang": { "zh": "江州", "en": "Jiangzhou" }, "songliaojin": { "zh": "江州", "en": "Jiangzhou" }, "yuanmingqing": { "zh": "九江", "en": "Jiujiang" } } }, "geometry": { "type": "Point", "coordinates": [116.0, 29.71] } },
    { "type": "Feature", "properties": { "id": "qufu", "name_zh": "曲阜", "name_en": "Qufu", "period": ["qinhan","sanguo","suitang","songliaojin","yuanmingqing"], "ancient": { "qinhan": { "zh": "鲁", "en": "Lu" }, "sanguo": { "zh": "鲁", "en": "Lu" }, "suitang": { "zh": "兖州", "en": "Yanzhou" }, "songliaojin": { "zh": "仙源", "en": "Xianyuan" }, "yuanmingqing": { "zh": "曲阜", "en": "Qufu" } } }, "geometry": { "type": "Point", "coordinates": [116.99, 35.58] } },
    { "type": "Feature", "properties": { "id": "dunhuang", "name_zh": "敦煌", "name_en": "Dunhuang", "period": ["qinhan","sanguo","suitang","songliaojin","yuanmingqing"], "ancient": { "qinhan": { "zh": "敦煌", "en": "Dunhuang" }, "sanguo": { "zh": "敦煌", "en": "Dunhuang" }, "suitang": { "zh": "沙州", "en": "Shazhou" }, "songliaojin": { "zh": "沙州", "en": "Shazhou" }, "yuanmingqing": { "zh": "敦煌", "en": "Dunhuang" } } }, "geometry": { "type": "Point", "coordinates": [94.66, 40.14] } },
    { "type": "Feature", "properties": { "id": "kashgar", "name_zh": "喀什", "name_en": "Kashgar", "period": ["qinhan","sanguo","suitang","songliaojin","yuanmingqing"], "ancient": { "qinhan": { "zh": "疏勒", "en": "Shule" }, "sanguo": { "zh": "疏勒", "en": "Shule" }, "suitang": { "zh": "疏勒", "en": "Shule" }, "songliaojin": { "zh": "喀什噶尔", "en": "Kashgar" }, "yuanmingqing": { "zh": "喀什噶尔", "en": "Kashgar" } } }, "geometry": { "type": "Point", "coordinates": [75.99, 39.47] } },
    { "type": "Feature", "properties": { "id": "guilin", "name_zh": "桂林", "name_en": "Guilin", "period": ["qinhan","sanguo","suitang","songliaojin","yuanmingqing"], "ancient": { "qinhan": { "zh": "始安", "en": "Shi'an" }, "sanguo": { "zh": "始安", "en": "Shi'an" }, "suitang": { "zh": "桂州", "en": "Guizhou" }, "songliaojin": { "zh": "静江府", "en": "Jingjiang" }, "yuanmingqing": { "zh": "桂林", "en": "Guilin" } } }, "geometry": { "type": "Point", "coordinates": [110.29, 25.27] } },
    { "type": "Feature", "properties": { "id": "lijiang", "name_zh": "丽江", "name_en": "Lijiang", "period": ["yuanmingqing"], "ancient": { "yuanmingqing": { "zh": "丽江府", "en": "Lijiang Prefecture" } } }, "geometry": { "type": "Point", "coordinates": [100.23, 26.86] } },
    { "type": "Feature", "properties": { "id": "dali", "name_zh": "大理", "name_en": "Dali", "period": ["suitang","songliaojin","yuanmingqing"], "ancient": { "suitang": { "zh": "太和城", "en": "Taihe City" }, "songliaojin": { "zh": "大理国都", "en": "Dali Kingdom Capital" }, "yuanmingqing": { "zh": "大理", "en": "Dali" } } }, "geometry": { "type": "Point", "coordinates": [100.23, 25.61] } },
    { "type": "Feature", "properties": { "id": "lasa", "name_zh": "拉萨", "name_en": "Lhasa", "period": ["suitang","songliaojin","yuanmingqing"], "ancient": { "suitang": { "zh": "逻些", "en": "Luoxie" }, "songliaojin": { "zh": "逻些", "en": "Luoxie" }, "yuanmingqing": { "zh": "拉萨", "en": "Lhasa" } } }, "geometry": { "type": "Point", "coordinates": [91.11, 29.65] } },
    { "type": "Feature", "properties": { "id": "zhangjiajie", "name_zh": "张家界", "name_en": "Zhangjiajie", "period": ["yuanmingqing"], "ancient": { "yuanmingqing": { "zh": "大庸", "en": "Dayong" } } }, "geometry": { "type": "Point", "coordinates": [110.48, 29.12] } },
    { "type": "Feature", "properties": { "id": "huangshan", "name_zh": "黄山", "name_en": "Huangshan", "period": ["qinhan","sanguo","suitang","songliaojin","yuanmingqing"], "ancient": { "qinhan": { "zh": "新安", "en": "Xin'an" }, "sanguo": { "zh": "新都郡", "en": "Xindu" }, "suitang": { "zh": "歙州", "en": "Shezhou" }, "songliaojin": { "zh": "徽州", "en": "Huizhou" }, "yuanmingqing": { "zh": "徽州", "en": "Huizhou" } } }, "geometry": { "type": "Point", "coordinates": [118.34, 29.71] } }
  ]
}
```

- [ ] **Step 2: 写 data/geo/wall.geojson**

```json
{
  "type": "FeatureCollection",
  "features": [
    { "type": "Feature", "properties": { "id": "wall-qinhan", "period": "qinhan", "name_zh": "秦汉长城", "name_en": "Great Wall (Qin-Han)" },
      "geometry": { "type": "LineString", "coordinates": [[124.5,40.5],[122.0,41.5],[119.5,41.8],[116.5,41.5],[114.0,41.3],[112.0,40.8],[110.5,40.3],[108.5,40.2],[106.8,39.8],[105.5,39.5],[104.0,38.8],[103.0,38.0],[102.0,37.5],[100.5,37.2],[99.0,36.8],[97.5,36.5],[96.5,36.0],[95.8,35.6]] } },
    { "type": "Feature", "properties": { "id": "wall-ming", "period": "yuanmingqing", "name_zh": "明长城", "name_en": "Great Wall (Ming)" },
      "geometry": { "type": "LineString", "coordinates": [[124.0,40.5],[122.5,40.5],[120.5,40.8],[119.0,40.5],[117.5,40.3],[116.0,40.7],[114.5,40.8],[113.5,40.5],[112.5,40.5],[111.0,40.3],[110.5,39.5],[109.5,39.0],[108.5,38.5],[107.5,38.0],[106.5,37.5],[105.5,37.3],[104.5,37.2],[103.5,37.0],[102.5,37.0],[101.5,37.2],[100.5,37.3],[99.5,37.8],[98.5,38.5],[97.8,39.2],[97.5,39.8],[98.0,39.9],[98.3,39.8]] } }
  ]
}
```

- [ ] **Step 3: 写 data/geo/canal.geojson**

```json
{
  "type": "FeatureCollection",
  "features": [
    { "type": "Feature", "properties": { "id": "canal-suitang", "period": "suitang", "name_zh": "隋唐大运河", "name_en": "Grand Canal (Sui-Tang)" },
      "geometry": { "type": "LineString", "coordinates": [[116.5,39.5],[115.0,39.0],[114.0,38.0],[113.5,37.0],[113.0,36.2],[114.5,35.5],[116.0,34.9],[117.0,34.7],[118.0,34.5],[119.0,34.0],[119.5,33.5],[119.3,32.7],[119.4,32.3],[119.5,31.7],[120.0,31.2],[120.5,30.5],[120.8,30.2]] } },
    { "type": "Feature", "properties": { "id": "canal-jinghang", "period": "yuanmingqing", "name_zh": "京杭大运河", "name_en": "Grand Canal (Beijing-Hangzhou)" },
      "geometry": { "type": "LineString", "coordinates": [[116.6,39.9],[116.8,39.4],[117.2,39.1],[116.5,38.3],[116.2,37.7],[116.0,37.0],[115.8,36.6],[116.4,36.2],[116.8,35.8],[116.8,35.2],[117.2,34.6],[117.5,34.2],[117.9,33.8],[118.3,33.6],[118.7,33.2],[119.0,32.9],[119.3,32.6],[119.4,32.2],[119.5,31.8],[120.0,31.3],[120.5,30.7],[120.6,30.4]] } }
  ]
}
```

- [ ] **Step 4: 写 data/geo/silkroad.geojson**

```json
{
  "type": "FeatureCollection",
  "features": [
    { "type": "Feature", "properties": { "id": "silk-land", "periods": ["qinhan","suitang","songliaojin","yuanmingqing"], "name_zh": "陆上丝绸之路", "name_en": "Silk Road (Land)" },
      "geometry": { "type": "LineString", "coordinates": [[108.9,34.3],[107.6,34.4],[106.6,34.6],[105.5,35.5],[104.5,36.6],[103.8,37.2],[102.8,38.0],[101.5,38.2],[100.5,39.0],[99.5,39.7],[98.0,39.8],[96.5,39.5],[95.5,39.8],[94.7,40.1],[93.0,40.3],[91.0,40.5],[89.0,41.0],[87.0,42.0],[85.0,42.0],[83.0,42.3],[80.0,42.5],[77.0,42.8],[75.0,42.8],[73.0,43.0],[71.5,43.0],[70.0,43.5],[68.0,44.5],[67.0,45.5],[66.0,46.5],[64.5,47.5]] } },
    { "type": "Feature", "properties": { "id": "silk-sea", "periods": ["songliaojin","yuanmingqing"], "name_zh": "海上丝绸之路", "name_en": "Silk Road (Maritime)" },
      "geometry": { "type": "LineString", "coordinates": [[118.6,24.9],[117.5,23.5],[116.0,22.5],[114.0,22.0],[112.0,21.5],[110.0,20.5],[108.5,18.5],[108.0,16.0],[107.5,14.0],[106.5,12.0],[105.5,10.5],[104.5,9.0],[103.5,7.0],[102.5,5.0],[101.5,3.0],[100.5,1.5],[100.0,0.5]] } }
  ]
}
```

- [ ] **Step 5: 写 src/markers.js**

```js
import maplibregl from 'maplibre-gl';
import { map } from './main.js';

let citiesData = [];
let currentPeriodId = null;
let markers = [];

export async function loadMarkers() {
  const res = await fetch('./data/geo/cities.geojson');
  citiesData = (await res.json()).features;
}

export function refreshMarkers(periodId) {
  currentPeriodId = periodId;
  for (const m of markers) m.remove();
  markers = [];
  for (const f of citiesData) {
    if (!f.properties.period.includes(periodId)) continue;
    const el = document.createElement('div');
    el.className = 'city-marker';
    el.dataset.cityId = f.properties.id;
    el.innerHTML = `<span class="dot"></span><span class="label cn">${f.properties.name_zh}</span><span class="label en">${f.properties.name_en}</span>`;
    el.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('city-click', { detail: { id: f.properties.id } }));
    });
    const m = new maplibregl.Marker({ element: el, anchor: 'center' })
      .setLngLat(f.geometry.coordinates)
      .addTo(map);
    markers.push(m);
  }
}
```

- [ ] **Step 6: 修改 src/main.js：接入新源、图层与 markers**

在 `map.on('load')` 回调中 `borders` 循环之后追加：

```js
  map.addSource('wall', { type: 'geojson', data: './data/geo/wall.geojson' });
  map.addSource('canal', { type: 'geojson', data: './data/geo/canal.geojson' });
  map.addSource('silkroad', { type: 'geojson', data: './data/geo/silkroad.geojson' });
  map.addSource('cities', { type: 'geojson', data: './data/geo/cities.geojson' });

  map.addLayer({ id: 'city-dot', type: 'circle', source: 'cities',
    paint: { 'circle-radius': 4, 'circle-color': '#4a3b2a', 'circle-stroke-color': '#f3e9d2', 'circle-stroke-width': 1.5 } });
  map.addLayer({ id: 'wall-qinhan-line', type: 'line', source: 'wall',
    filter: ['==', ['get', 'id'], 'wall-qinhan'],
    paint: { 'line-color': PALETTE.wall, 'line-width': 2.2, 'line-dasharray': [4, 2, 1, 2] } });
  map.addLayer({ id: 'wall-ming-line', type: 'line', source: 'wall',
    filter: ['==', ['get', 'id'], 'wall-ming'],
    paint: { 'line-color': PALETTE.wall, 'line-width': 2.2, 'line-dasharray': [4, 2, 1, 2] } });
  map.addLayer({ id: 'canal-suitang-line', type: 'line', source: 'canal',
    filter: ['==', ['get', 'id'], 'canal-suitang'],
    paint: { 'line-color': PALETTE.canal, 'line-width': 1.8, 'line-dasharray': [2, 2] } });
  map.addLayer({ id: 'canal-jinghang-line', type: 'line', source: 'canal',
    filter: ['==', ['get', 'id'], 'canal-jinghang'],
    paint: { 'line-color': PALETTE.canal, 'line-width': 1.8, 'line-dasharray': [2, 2] } });
  map.addLayer({ id: 'silk-land-line', type: 'line', source: 'silkroad',
    filter: ['==', ['get', 'id'], 'silk-land'],
    paint: { 'line-color': PALETTE.silkLand, 'line-width': 1.6, 'line-dasharray': [6, 3] } });
  map.addLayer({ id: 'silk-sea-line', type: 'line', source: 'silkroad',
    filter: ['==', ['get', 'id'], 'silk-sea'],
    paint: { 'line-color': PALETTE.silkSea, 'line-width': 1.6, 'line-dasharray': [2, 4] } });
```

在 `setPeriod` 函数体内 `applyPeriodVisibility(periodId);` 之后追加（线图层按时期切换显隐）：

```js
  const lineVis = (layerId, periods) => {
    const vis = periods.includes(periodId) ? 'visible' : 'none';
    if (map.getLayer(layerId)) map.setLayoutProperty(layerId, 'visibility', vis);
  };
  lineVis('wall-qinhan-line', ['qinhan']);
  lineVis('wall-ming-line', ['yuanmingqing']);
  lineVis('canal-suitang-line', ['suitang']);
  lineVis('canal-jinghang-line', ['yuanmingqing']);
  lineVis('silk-land-line', ['qinhan', 'suitang', 'songliaojin', 'yuanmingqing']);
  lineVis('silk-sea-line', ['songliaojin', 'yuanmingqing']);
  refreshMarkers(periodId);
```

在文件末尾导入并调用：

```js
import { loadMarkers, refreshMarkers } from './markers.js';
```

在 `map.on('load')` 回调的 `setPeriod(PERIODS[0].id);` 之前加 `await loadMarkers();`，并将回调声明改为 `map.on('load', async () => { ... })`。

- [ ] **Step 7: 在 src/styles.css 追加标记样式**

```css
.city-marker { position: relative; display: flex; align-items: center; gap: 4px; cursor: pointer; }
.city-marker .dot { width: 9px; height: 9px; border-radius: 50%;
  background: #4a3b2a; border: 2px solid #f3e9d2; box-shadow: 0 0 0 1px #4a3b2a; }
.city-marker .label { font-family: 'Noto Serif SC', 'Songti SC', serif; font-size: 13px;
  font-weight: 600; color: #3d2f1e; white-space: nowrap;
  text-shadow: 0 0 3px #f3e9d2, 0 0 3px #f3e9d2; }
.city-marker .label.en { display: none; font-family: 'EB Garamond', Georgia, serif; font-size: 11px; font-weight: 400; }
body.lang-en .city-marker .label.cn { display: none; }
body.lang-en .city-marker .label.en { display: inline; }
```

- [ ] **Step 8: 验证**

```bash
npm run dev
```

Expected: 27 个城市点位出现，默认秦汉时期可见（上海/丽江/张家界/泉州等不出现在秦汉）；切换时期城市出现/消失；长城/运河/丝路按时期出现。

- [ ] **Step 9: 提交**

```bash
git add -A
git commit -m "feat: city markers, great wall, grand canal and silk road layers"
```

### Task 6: 数据校验脚本 + 内容骨架（红）

**Files:**
- Create: `scripts/validate.mjs`
- Create: `content/cities.json`（骨架：27 城空字段）
- Create: `content/events.json`（骨架：25 事件空字段）
- Create: `data/geo/events.geojson`（25 事件点位，正文在 content）
- Modify: `package.json`（无需改，validate script 已在 Task 1 定义）

**Interfaces:**
- Produces: `scripts/validate.mjs`（退出码 0=通过 / 1=失败，打印逐项报告）；`content/cities.json` 结构：`{ "<cityId>": { name_zh, name_en, tagline_zh, tagline_en, history_zh, history_en, geography_zh, geography_en, climate_zh, climate_en, attractions_zh:[], attractions_en:[], food_zh:[], food_en:[], guide_zh:[{day, title, items:[]}], guide_en:[{day, title, items:[]}] } }`；`content/events.json` 结构：`{ "<eventId>": { name_zh, name_en, year_zh, year_en, desc_zh, desc_en } }`；`data/geo/events.geojson` properties：`{ id, period, city_hint }`

- [ ] **Step 1: 写 scripts/validate.mjs**

```js
import fs from 'node:fs';

const read = (p) => JSON.parse(fs.readFileSync(new URL(p, import.meta.url), 'utf-8'));
const CITY_IDS = read('../data/geo/cities.geojson').features.map((f) => f.properties.id);
const EVENT_IDS = read('../data/geo/events.geojson').features.map((f) => f.properties.id);
const VALID_PERIODS = ['qinhan', 'sanguo', 'suitang', 'songliaojin', 'yuanmingqing'];

const cities = read('../content/cities.json');
const events = read('../content/events.json');

const errors = [];
const nonEmpty = (v) => typeof v === 'string' && v.trim().length > 0;
const nonEmptyList = (v) => Array.isArray(v) && v.length > 0 && v.every((x) => typeof x === 'string' && x.trim().length > 0);

for (const id of CITY_IDS) {
  if (!cities[id]) { errors.push(`cities.json missing key: ${id}`); continue; }
  const c = cities[id];
  for (const k of ['name_zh', 'name_en', 'tagline_zh', 'tagline_en', 'history_zh', 'history_en', 'geography_zh', 'geography_en', 'climate_zh', 'climate_en']) {
    if (!nonEmpty(c[k])) errors.push(`cities.${id}.${k} empty`);
  }
  for (const k of ['attractions_zh', 'attractions_en', 'food_zh', 'food_en']) {
    if (!nonEmptyList(c[k])) errors.push(`cities.${id}.${k} empty list`);
  }
  for (const g of ['guide_zh', 'guide_en']) {
    if (!Array.isArray(c[g]) || c[g].length !== 3) { errors.push(`cities.${id}.${g} must have exactly 3 days`); continue; }
    c[g].forEach((d, i) => {
      if (!nonEmpty(d.day) || !nonEmpty(d.title) || !nonEmptyList(d.items)) {
        errors.push(`cities.${id}.${g}[${i}] incomplete`);
      }
    });
  }
}
for (const id of Object.keys(cities)) {
  if (!CITY_IDS.includes(id)) errors.push(`cities.json has unknown id: ${id}`);
}

for (const id of EVENT_IDS) {
  if (!events[id]) { errors.push(`events.json missing key: ${id}`); continue; }
  const e = events[id];
  for (const k of ['name_zh', 'name_en', 'year_zh', 'year_en', 'desc_zh', 'desc_en']) {
    if (!nonEmpty(e[k])) errors.push(`events.${id}.${k} empty`);
  }
}
for (const id of Object.keys(events)) {
  if (!EVENT_IDS.includes(id)) errors.push(`events.json has unknown id: ${id}`);
}

for (const f of read('../data/geo/cities.geojson').features) {
  if (!VALID_PERIODS.some((p) => f.properties.period.includes(p))) errors.push(`city ${f.properties.id} has invalid period`);
  for (const p of f.properties.period) {
    if (!f.properties.ancient[p]) errors.push(`city ${f.properties.id} missing ancient name for period ${p}`);
  }
}
for (const f of read('../data/geo/events.geojson').features) {
  if (!VALID_PERIODS.includes(f.properties.period)) errors.push(`event ${f.properties.id} has invalid period`);
}

if (errors.length) {
  console.log(`VALIDATION FAILED — ${errors.length} issues`);
  for (const e of errors) console.log(' - ' + e);
  process.exit(1);
}
console.log(`VALIDATION OK — ${CITY_IDS.length} cities, ${EVENT_IDS.length} events`);
```

- [ ] **Step 2: 写 data/geo/events.geojson（25 事件点位）**

```json
{
  "type": "FeatureCollection",
  "features": [
    { "type": "Feature", "properties": { "id": "unify-qin", "period": "qinhan" }, "geometry": { "type": "Point", "coordinates": [108.7, 34.4] } },
    { "type": "Feature", "properties": { "id": "burn-books", "period": "qinhan" }, "geometry": { "type": "Point", "coordinates": [108.94, 34.34] } },
    { "type": "Feature", "properties": { "id": "chenshe-uprising", "period": "qinhan" }, "geometry": { "type": "Point", "coordinates": [117.0, 33.5] } },
    { "type": "Feature", "properties": { "id": "zhangqian", "period": "qinhan" }, "geometry": { "type": "Point", "coordinates": [108.94, 34.34] } },
    { "type": "Feature", "properties": { "id": "silkroad-open", "period": "qinhan" }, "geometry": { "type": "Point", "coordinates": [94.66, 40.14] } },
    { "type": "Feature", "properties": { "id": "guandu", "period": "sanguo" }, "geometry": { "type": "Point", "coordinates": [114.0, 34.7] } },
    { "type": "Feature", "properties": { "id": "chibi", "period": "sanguo" }, "geometry": { "type": "Point", "coordinates": [113.6, 29.8] } },
    { "type": "Feature", "properties": { "id": "yiling", "period": "sanguo" }, "geometry": { "type": "Point", "coordinates": [111.3, 30.7] } },
    { "type": "Feature", "properties": { "id": "feishui", "period": "sanguo" }, "geometry": { "type": "Point", "coordinates": [116.8, 32.6] } },
    { "type": "Feature", "properties": { "id": "xiaowen-move", "period": "sanguo" }, "geometry": { "type": "Point", "coordinates": [112.45, 34.62] } },
    { "type": "Feature", "properties": { "id": "grand-canal", "period": "suitang" }, "geometry": { "type": "Point", "coordinates": [112.45, 34.62] } },
    { "type": "Feature", "properties": { "id": "zhenguan", "period": "suitang" }, "geometry": { "type": "Point", "coordinates": [108.94, 34.34] } },
    { "type": "Feature", "properties": { "id": "xuanzang", "period": "suitang" }, "geometry": { "type": "Point", "coordinates": [108.94, 34.34] } },
    { "type": "Feature", "properties": { "id": "anshi", "period": "suitang" }, "geometry": { "type": "Point", "coordinates": [116.6, 39.9] } },
    { "type": "Feature", "properties": { "id": "huangchao", "period": "suitang" }, "geometry": { "type": "Point", "coordinates": [109.0, 34.3] } },
    { "type": "Feature", "properties": { "id": "chanyuan", "period": "songliaojin" }, "geometry": { "type": "Point", "coordinates": [115.0, 35.8] } },
    { "type": "Feature", "properties": { "id": "jingkang", "period": "songliaojin" }, "geometry": { "type": "Point", "coordinates": [114.35, 34.8] } },
    { "type": "Feature", "properties": { "id": "yuefei", "period": "songliaojin" }, "geometry": { "type": "Point", "coordinates": [114.2, 34.6] } },
    { "type": "Feature", "properties": { "id": "maritime-peak", "period": "songliaojin" }, "geometry": { "type": "Point", "coordinates": [118.68, 24.87] } },
    { "type": "Feature", "properties": { "id": "yashan", "period": "songliaojin" }, "geometry": { "type": "Point", "coordinates": [113.1, 22.4] } },
    { "type": "Feature", "properties": { "id": "kublai-yuan", "period": "yuanmingqing" }, "geometry": { "type": "Point", "coordinates": [116.41, 39.9] } },
    { "type": "Feature", "properties": { "id": "zhenghe", "period": "yuanmingqing" }, "geometry": { "type": "Point", "coordinates": [118.8, 32.06] } },
    { "type": "Feature", "properties": { "id": "tumubao", "period": "yuanmingqing" }, "geometry": { "type": "Point", "coordinates": [115.5, 40.4] } },
    { "type": "Feature", "properties": { "id": "yakesa", "period": "yuanmingqing" }, "geometry": { "type": "Point", "coordinates": [127.3, 53.5] } },
    { "type": "Feature", "properties": { "id": "humen", "period": "yuanmingqing" }, "geometry": { "type": "Point", "coordinates": [113.7, 22.8] } }
  ]
}
```

- [ ] **Step 3: 写 content/cities.json 骨架**

27 个键（与 cities.geojson id 一致：xian、beijing、luoyang、nanjing、kaifeng、hangzhou、anyang、chengdu、suzhou、yangzhou、shaoxing、jingzhou、xiangyang、datong、quanzhou、guangzhou、shanghai、jiujiang、qufu、dunhuang、kashgar、guilin、lijiang、dali、lasa、zhangjiajie、huangshan），每个键值统一为：

```json
{
  "xian": { "name_zh": "", "name_en": "", "tagline_zh": "", "tagline_en": "", "history_zh": "", "history_en": "", "geography_zh": "", "geography_en": "", "climate_zh": "", "climate_en": "", "attractions_zh": [], "attractions_en": [], "food_zh": [], "food_en": [], "guide_zh": [ { "day": "", "title": "", "items": [] }, { "day": "", "title": "", "items": [] }, { "day": "", "title": "", "items": [] } ], "guide_en": [ { "day": "", "title": "", "items": [] }, { "day": "", "title": "", "items": [] }, { "day": "", "title": "", "items": [] } ] }
}
```

（其余 26 键复制同样结构，只改键名。）

- [ ] **Step 4: 写 content/events.json 骨架**

25 个键（id 同 events.geojson），每个键值统一为：

```json
{ "name_zh": "", "name_en": "", "year_zh": "", "year_en": "", "desc_zh": "", "desc_en": "" }
```

- [ ] **Step 5: 运行校验，确认失败（红）**

```bash
npm run validate
```

Expected: 退出码 1，输出 `VALIDATION FAILED — N issues` 且逐条列出空字段。

- [ ] **Step 6: 提交**

```bash
git add -A
git commit -m "feat: data validation script and content skeletons (failing)"
```

### Task 7: 城市正文 — 古都 8 城（西安/北京/洛阳/南京/开封/杭州/安阳/成都）

**Files:**
- Modify: `content/cities.json`（填写 8 城的全部字段）

**Interfaces:**
- Consumes: `content/cities.json` 骨架结构（Task 6）
- Produces: 8 城完整双语正文；`npm run validate` 对这批城市的错误消失

- [ ] **Step 1: 填写 8 城正文**

对每个城市，`history_zh` 写成 3-4 句连贯短文（融合下列要点），`geography_zh` / `climate_zh` 各 1-2 句，`attractions_zh` / `food_zh` 用下列列表，`guide_zh` 3 天照抄下列安排并扩写为句子条目。`name_zh/name_en` 与 cities.geojson 一致。**所有 `_en` 字段是对应 `_zh` 字段的忠实英文翻译**。`tagline_zh` 用一句话点睛（示例：西安「十三朝古都，丝绸之路的东方起点」）。

**西安 xian**
- tagline: 十三朝古都，丝绸之路的东方起点
- history: 周秦汉唐十三朝建都；汉长安城是当时世界最大城市之一；唐长安人口百万、万国来朝；兵马俑为世界第八大奇迹
- geography: 关中平原腹地，渭河南岸，南依秦岭，八水绕长安
- climate: 温带季风气候，四季分明，冬冷夏热，春秋短暂，秋季最宜游览
- attractions: 秦始皇兵马俑博物馆、大雁塔·大慈恩寺、西安城墙、钟鼓楼、陕西历史博物馆、华清宫
- food: 羊肉泡馍、肉夹馍、凉皮、biangbiang 面
- guide: D1 西安城墙骑行+钟鼓楼+回民街美食；D2 秦始皇兵马俑+华清宫《长恨歌》；D3 陕西历史博物馆+大雁塔+大唐不夜城

**北京 beijing**
- tagline: 三千年建城史，元明清三代帝都
- history: 燕国蓟城、唐幽州、辽南京金中都；元大都奠定格局；明清紫禁城六百年；中轴线申遗
- geography: 华北平原北端，燕山太行环抱，永定河冲积扇
- climate: 暖温带半湿润季风气候，春短多风，夏热多雨，秋高气爽最宜人，冬寒干燥
- attractions: 故宫、长城(八达岭/慕田峪)、天坛、颐和园、景山公园、胡同与什刹海
- food: 北京烤鸭、炸酱面、涮羊肉、豆汁焦圈
- guide: D1 天安门+故宫+景山俯瞰中轴线；D2 八达岭长城+明十三陵；D3 天坛+颐和园+什刹海胡同

**洛阳 luoyang**
- tagline: 十三朝古都，华夏文明的源头之一
- history: 夏商周三代都城、东汉北魏都城、隋唐东都；丝绸之路东方起点之一；白马寺为中国第一古刹；龙门石窟世界遗产
- geography: 伊洛盆地，黄河之南，洛水穿城，邙山为屏
- climate: 暖温带季风气候，四季分明，牡丹四月盛开
- attractions: 龙门石窟、白马寺、关林、洛阳博物馆、应天门·隋唐洛阳城、老君山
- food: 洛阳水席、牛肉汤、浆面条、牡丹饼
- guide: D1 龙门石窟+关林；D2 白马寺+应天门+老城十字街；D3 洛阳博物馆+牡丹园（4 月）

**南京 nanjing**
- tagline: 六朝古都，十朝都会
- history: 东吴建业、东晋南朝建康；明初京师与郑和下西洋出发地；近代风云（太平天国、民国首都）
- geography: 长江下游南岸，紫金山龙蟠、石头城虎踞，秦淮河穿城
- climate: 亚热带季风气候，冬温夏热，梅雨季节湿润，春秋舒适
- attractions: 中山陵、明孝陵、夫子庙·秦淮河、总统府、南京博物院、中华门瓮城
- food: 盐水鸭、鸭血粉丝汤、金陵汤包、赤豆元宵
- guide: D1 中山陵+明孝陵；D2 总统府+南京博物院；D3 夫子庙秦淮河+中华门

**开封 kaifeng**
- tagline: 八朝古都，北宋汴京清明上河图之地
- history: 战国魏都大梁、五代及北宋都城；汴京为当时世界最大城市；清明上河图描绘之地
- geography: 黄河之南的平原，汴河漕运故道穿城
- climate: 暖温带季风气候，四季分明，春秋最佳
- attractions: 清明上河园、开封府、大相国寺、铁塔公园、龙亭公园
- food: 灌汤包、桶子鸡、炒凉粉、花生糕
- guide: D1 清明上河园；D2 开封府+大相国寺；D3 铁塔+龙亭+夜市

**杭州 hangzhou**
- tagline: 人间天堂，南宋临安
- history: 吴越国都、南宋行在临安；马可·波罗笔下最华贵之城；京杭大运河南端
- geography: 钱塘江入海口，西湖群山环抱，江南水乡
- climate: 亚热带季风气候，湿润温和，春秋最美，夏季梅雨
- attractions: 西湖（苏堤/断桥/三潭印月）、灵隐寺、雷峰塔、京杭大运河杭州段、良渚古城遗址
- food: 西湖醋鱼、龙井虾仁、东坡肉、片儿川
- guide: D1 西湖环湖（苏堤+三潭印月游船）；D2 灵隐寺+龙井茶园；D3 京杭大运河+桥西历史街区

**安阳 anyang**
- tagline: 殷商故都，甲骨文故乡
- history: 殷墟为商代晚期都城；甲骨文发现地；魏晋邺城六朝古都之一
- geography: 豫北平原，洹水之畔，太行山东麓
- climate: 暖温带季风气候，四季分明
- attractions: 殷墟博物院、中国文字博物馆、曹操高陵、红旗渠
- food: 道口烧鸡、粉浆饭、安阳烩菜、皮渣
- guide: D1 殷墟+中国文字博物馆；D2 曹操高陵+文峰塔；D3 红旗渠

**成都 chengdu**
- tagline: 天府之国，蜀汉故都
- history: 古蜀文明（金沙/三星堆）、秦汉蜀郡、三国蜀汉都城；唐有扬一益二；花重锦官城
- geography: 成都平原，岷江冲积扇，都江堰灌溉千年
- climate: 亚热带湿润季风气候，冬暖夏凉，多云雾，四季可游
- attractions: 武侯祠、杜甫草堂、大熊猫繁育研究基地、金沙遗址、都江堰·青城山、宽窄巷子
- food: 火锅、串串香、担担面、夫妻肺片
- guide: D1 武侯祠+锦里；D2 大熊猫基地+宽窄巷子；D3 都江堰+青城山

- [ ] **Step 2: 运行校验，确认这 8 城的错误消失**

```bash
npm run validate
```

Expected: 输出仍为 FAILED，但报告中不再包含这 8 个城市的条目。

- [ ] **Step 3: 提交**

```bash
git add -A
git commit -m "feat: bilingual content for 8 ancient capitals"
```

### Task 8: 城市正文 — 名城 13 城（苏州/扬州/绍兴/荆州/襄阳/大同/泉州/广州/上海/九江/曲阜/敦煌/喀什）

**Files:**
- Modify: `content/cities.json`

**Interfaces:**
- 同 Task 7；本批 13 城。

- [ ] **Step 1: 填写 13 城正文**

规则同 Task 7（EN 为忠实翻译，guide 3 天）。

**苏州 suzhou**
- tagline: 东方威尼斯，园林之城
- history: 吴国姑苏；唐白居易开山塘；明清江南经济中心；古典园林世界遗产
- geography: 太湖之滨，水网密布，京杭大运河穿城
- climate: 亚热带季风，湿润温和，春秋最佳
- attractions: 拙政园、留园、虎丘、平江路、苏州博物馆、山塘街
- food: 松鼠桂鱼、苏式汤面、糖粥、蟹粉小笼
- guide: D1 拙政园+苏州博物馆；D2 虎丘+留园；D3 平江路+山塘街夜游

**扬州 yangzhou**
- tagline: 淮左名都，竹西佳处
- history: 汉广陵、隋江都（隋炀帝南巡）、唐盐商都会；二十四桥明月夜
- geography: 长江与京杭大运河交汇，江淮平原
- climate: 亚热带季风，四季分明，烟花三月最美
- attractions: 瘦西湖、个园、何园、东关街、大明寺
- food: 扬州炒饭、狮子头、三丁包、烫干丝
- guide: D1 瘦西湖+大明寺；D2 个园+东关街；D3 何园+皮市街

**绍兴 shaoxing**
- tagline: 水乡桥都，名士之乡
- history: 越国都城会稽；兰亭雅集之地；鲁迅故里；黄酒之源
- geography: 浙东水乡，鉴湖之畔，河道纵横
- climate: 亚热带季风，湿润，春秋最佳
- attractions: 鲁迅故里、沈园、兰亭、东湖、安昌古镇
- food: 绍兴黄酒、梅干菜扣肉、茴香豆、醉蟹
- guide: D1 鲁迅故里+沈园；D2 兰亭+东湖；D3 安昌古镇

**荆州 jingzhou**
- tagline: 三国名城，楚国故都
- history: 楚都纪南城；三国争夺重镇（借荆州/失荆州）；江陵自古兵家必争
- geography: 江汉平原，长江北岸，荆江之畔
- climate: 亚热带季风，湿润，春秋最佳
- attractions: 荆州古城墙、荆州博物馆、张居正故居、关帝庙、楚纪南城遗址
- food: 鱼糕、锅盔、早堂面、藕汤
- guide: D1 古城墙+荆州博物馆；D2 关帝庙+张居正故居；D3 纪南城遗址+夜游护城河

**襄阳 xiangyang**
- tagline: 铁打的襄阳，华夏第一城池
- history: 楚之北津；汉末隆中对；宋元襄阳之战；金庸笔下侠客之城
- geography: 汉水中游，岘山为屏，南船北马
- climate: 北亚热带季风，四季分明
- attractions: 襄阳古城墙、古隆中、米公祠、习家池、唐城影视基地
- food: 襄阳牛肉面、大头菜、糊辣汤、黄酒
- guide: D1 古城墙+北街；D2 古隆中+米公祠；D3 唐城+汉江夜游

**大同 datong**
- tagline: 北魏平城，云冈佛国
- history: 北魏都城平城近百年；云冈石窟世界遗产；辽金西京
- geography: 晋北高原，桑干河畔，内外长城之间
- climate: 温带半干旱季风，夏凉冬冷，避暑胜地
- attractions: 云冈石窟、华严寺、悬空寺、九龙壁、大同古城墙
- food: 刀削面、浑源凉粉、羊杂、兔头
- guide: D1 云冈石窟+华严寺；D2 悬空寺+恒山；D3 古城墙+九龙壁

**泉州 quanzhou**
- tagline: 刺桐古城，海上丝路起点
- history: 宋元东方第一大港（刺桐 Zayton）；马可·波罗笔下巨港；世界遗产城市
- geography: 闽南沿海，晋江出海口，群山环海
- climate: 南亚热带季风，温暖湿润，冬无严寒
- attractions: 开元寺、清净寺、洛阳桥、清源山、西街、崇武古城
- food: 面线糊、土笋冻、烧肉粽、海蛎煎
- guide: D1 开元寺+西街；D2 清源山+洛阳桥；D3 清净寺+崇武古城

**广州 guangzhou**
- tagline: 千年商都，海上丝路重港
- history: 秦番禺城；唐宋市舶司；近代开埠与革命策源地；广交会之都
- geography: 珠江三角洲北缘，白云山越秀山环城
- climate: 南亚热带季风，长夏暖冬，花城四季如春
- attractions: 陈家祠、越秀山·五羊石像、沙面岛、广州塔、中山纪念堂、北京路千年古道
- food: 早茶点心、白切鸡、肠粉、老火靓汤
- guide: D1 陈家祠+沙面；D2 越秀山+中山纪念堂+北京路；D3 早茶+广州塔夜景

**上海 shanghai**
- tagline: 从渔村到魔都，开埠两百年
- history: 宋元华亭、明上海县；1843 开埠；外滩万国建筑；浦东开发
- geography: 长江入海口，黄浦江两岸，江海交汇
- climate: 北亚热带季风，湿润，梅雨季明显
- attractions: 外滩、豫园·城隍庙、上海博物馆、武康路、东方明珠、朱家角古镇
- food: 小笼包、生煎、本帮红烧肉、蟹壳黄
- guide: D1 外滩+南京路；D2 豫园+上海博物馆+武康路；D3 朱家角古镇

**九江 jiujiang**
- tagline: 浔阳江头，庐山之麓
- history: 汉浔阳、晋江州；白居易《琵琶行》；庐山会议；陶渊明故里
- geography: 长江中游南岸，鄱阳湖口，庐山北麓
- climate: 中亚热带季风，湿润，庐山为避暑胜地
- attractions: 庐山（含鄱口/三叠泉/美庐）、浔阳楼、烟水亭、东林寺、白鹿洞书院
- food: 庐山石鸡、九江茶饼、鄱阳湖鱼、米粉
- guide: D1 庐山牯岭+美庐；D2 三叠泉+含鄱口；D3 白鹿洞书院+浔阳楼

**曲阜 qufu**
- tagline: 东方圣城，孔子故里
- history: 鲁国都城；孔子诞生与安葬之地；孔庙孔府孔林世界遗产
- geography: 鲁中南平原，泗水之滨
- climate: 暖温带季风，四季分明
- attractions: 孔庙、孔府、孔林、尼山圣境、颜庙
- food: 孔府菜、熏豆腐、煎饼、孔府糕点
- guide: D1 孔庙+孔府；D2 孔林+颜庙；D3 尼山圣境

**敦煌 dunhuang**
- tagline: 丝路明珠，大漠佛国
- history: 汉置敦煌郡；丝路咽喉玉门关阳关；莫高窟千年营造；藏经洞发现
- geography: 河西走廊西端，党河绿洲，鸣沙山环抱
- climate: 温带大陆性干旱气候，昼夜温差大，春秋最佳
- attractions: 莫高窟、鸣沙山·月牙泉、玉门关、雅丹地质公园、阳关
- food: 驴肉黄面、杏皮水、胡羊焖饼、浆水面
- guide: D1 莫高窟+鸣沙山月牙泉；D2 玉门关+雅丹；D3 阳关+敦煌夜市

**喀什 kashgar**
- tagline: 丝路西陲重镇，西域风情之都
- history: 汉疏勒国；丝路南北道交汇；喀什噶尔回城；香妃故里
- geography: 帕米尔高原东北，塔里木盆地西缘绿洲
- climate: 暖温带大陆性干旱气候，日照充足，春秋最佳
- attractions: 喀什老城、艾提尕尔清真寺、香妃园、高台民居、中巴友谊公路沿途
- food: 烤羊肉串、抓饭、拉条子、烤包子
- guide: D1 老城+艾提尕尔清真寺；D2 香妃园+国际大巴扎；D3 帕米尔高原一日（白沙湖/慕士塔格）

- [ ] **Step 2: 运行校验，确认这 13 城的错误消失**

```bash
npm run validate
```

Expected: 报告中不再包含这 13 个城市条目。

- [ ] **Step 3: 提交**

```bash
git add -A
git commit -m "feat: bilingual content for 13 historic cities"
```

### Task 9: 城市正文 — 风景 6 城（桂林/丽江/大理/拉萨/张家界/黄山）

**Files:**
- Modify: `content/cities.json`

**Interfaces:**
- 同 Task 7；本批 6 城。完成后 `npm run validate` 应全部通过（事件正文 Task 10 完成前，校验仍会因事件失败）。

- [ ] **Step 1: 填写 6 城正文**

**桂林 guilin**
- tagline: 桂林山水甲天下
- history: 秦始安郡（灵渠沟通湘漓）；唐桂州；抗战文化城
- geography: 漓江两岸喀斯特峰林，岩溶地貌世界典范
- climate: 中亚热带季风，湿润，4-10 月最佳
- attractions: 漓江游船、象鼻山、芦笛岩、阳朔西街、遇龙河、龙脊梯田
- food: 桂林米粉、啤酒鱼、田螺酿、荔浦芋扣肉
- guide: D1 象鼻山+两江四湖夜游；D2 漓江游船至阳朔；D3 遇龙河骑行+龙脊梯田

**丽江 lijiang**
- tagline: 高原姑苏，纳西古城
- history: 元丽江路；纳西木氏土司；茶马古道重镇；世界遗产
- geography: 云贵高原，玉龙雪山脚下，金沙江畔
- climate: 高原季风气候，冬暖夏凉，四季如春
- attractions: 丽江古城、玉龙雪山、束河古镇、泸沽湖、黑龙潭公园
- food: 腊排骨、鸡豆凉粉、纳西烤鱼、丽江粑粑
- guide: D1 丽江古城+黑龙潭；D2 玉龙雪山；D3 束河古镇或泸沽湖

**大理 dali**
- tagline: 风花雪月，南诏故地
- history: 南诏太和城、大理国都城；段氏三百余年；金庸《天龙八部》之地
- geography: 苍山洱海之间，高原湖泊与雪山相映
- climate: 高原季风气候，四季温差小，春秋最佳
- attractions: 大理古城、洱海、苍山、崇圣寺三塔、喜洲古镇、蝴蝶泉
- food: 酸辣鱼、乳扇、生皮、饵块
- guide: D1 古城+崇圣寺三塔；D2 洱海环湖；D3 苍山+喜洲古镇

**拉萨 lasa**
- tagline: 日光之城，雪域圣殿
- history: 吐蕃逻些；松赞干布建大昭寺；布达拉宫千年；文成公主入藏
- geography: 拉萨河谷，海拔 3650 米，群山环绕
- climate: 高原温带半干旱气候，日照强烈，夏季舒适
- attractions: 布达拉宫、大昭寺、八廓街、罗布林卡、色拉寺、纳木错
- food: 酥油茶、甜茶、藏面、牦牛肉
- guide: D1 布达拉宫+八廓街；D2 大昭寺+罗布林卡；D3 色拉寺辩经或纳木错一日

**张家界 zhangjiajie**
- tagline: 三千奇峰，八百秀水
- history: 古大庸；《阿凡达》取景地；武陵源世界自然遗产
- geography: 武陵山脉，石英砂岩峰林地貌独一无二
- climate: 中亚热带季风，山地气候，云雾缭绕
- attractions: 张家界国家森林公园、天门山、大峡谷玻璃桥、宝峰湖、黄龙洞
- food: 三下锅、土家腊肉、葛根粉、猕猴桃
- guide: D1 森林公园（袁家界/哈利路亚山）；D2 天门山玻璃栈道；D3 大峡谷玻璃桥+宝峰湖

**黄山 huangshan**
- tagline: 五岳归来不看山，黄山归来不看岳
- history: 古徽州；徐霞客赞绝；徽商故里与徽派建筑
- geography: 皖南花岗岩峰林，奇松怪石云海温泉四绝
- climate: 亚热带山地气候，四季各异，冬有雪景
- attractions: 黄山风景区（光明顶/迎客松/西海大峡谷）、宏村、西递、屯溪老街
- food: 臭鳜鱼、毛豆腐、徽州烧饼、石耳炖鸡
- guide: D1 上山（迎客松+光明顶日落）；D2 西海大峡谷+云海日出；D3 宏村+西递徽派古村

- [ ] **Step 2: 运行校验**

```bash
npm run validate
```

Expected: 报告中城市部分全部消失，仅剩 events 相关错误。

- [ ] **Step 3: 提交**

```bash
git add -A
git commit -m "feat: bilingual content for 6 scenic destinations"
```

### Task 10: 事件正文（25 个）与事件点渲染

**Files:**
- Modify: `content/events.json`（25 事件双语正文）
- Modify: `src/markers.js`（renderEventMarkers + refreshMarkers 扩展）
- Modify: `src/main.js`（加载 events 源）
- Modify: `src/styles.css`（事件印章式图标样式）

**Interfaces:**
- Consumes: `map`、`refreshMarkers`；`data/geo/events.geojson`（Task 6）
- Produces: 事件 marker DOM `<div class="event-marker" data-event-id="...">`，点击派发 `event-click`（Task 11 消费）；`refreshMarkers(periodId)` 同时刷新城市与事件标记

- [ ] **Step 1: 填写 content/events.json**

每条含 `year_zh`（如「公元前 221 年」）、`year_en`（如「221 BCE」）、`desc_zh`（2-3 句）、`desc_en`（忠实翻译）。内容要点：

1. unify-qin 秦统一六国 | 前221 | 秦王嬴政灭六国，建立中国历史上第一个大一统中央集权王朝，自称始皇帝
2. burn-books 焚书坑儒 | 前213 | 秦始皇采纳李斯建议焚毁民间藏书、坑杀儒生，控制思想舆论
3. chenshe-uprising 陈胜吴广起义 | 前209 | 大泽乡揭竿而起，发出「王侯将相宁有种乎」，秦末民变序幕
4. zhangqian 张骞出使西域 | 前138 | 张骞凿空西域，带回中亚信息，为丝绸之路开辟奠基
5. silkroad-open 丝绸之路开通 | 前60 | 汉设西域都护府，丝路全线贯通，东西文明开始大规模交流
6. guandu 官渡之战 | 200 | 曹操以少胜多击败袁绍，奠定统一北方的基础
7. chibi 赤壁之战 | 208 | 孙刘联军火攻破曹，奠定三国鼎立格局
8. yiling 夷陵之战 | 222 | 刘备伐吴惨败，蜀汉元气大伤
9. feishui 淝水之战 | 383 | 前秦苻坚八十万大军败于东晋八万，草木皆兵典故来源
10. xiaowen-move 孝文帝迁都 | 494 | 北魏孝文帝迁都洛阳，推行汉化改革
11. grand-canal 开凿大运河 | 605 | 隋炀帝开凿贯通南北的大运河，连接五大水系
12. zhenguan 贞观之治 | 627 | 唐太宗李世民开创贞观之治，大唐盛世开端
13. xuanzang 玄奘西行 | 629 | 玄奘西行五万里取经，《大唐西域记》与《西游记》之源
14. anshi 安史之乱 | 755 | 安禄山范阳起兵，唐朝由盛转衰的转折点
15. huangchao 黄巢起义 | 875 | 黄巢率军攻入长安，唐朝名存实亡
16. chanyuan 澶渊之盟 | 1005 | 宋辽订立澶渊之盟，以岁币换和平，开启百年和局
17. jingkang 靖康之变 | 1127 | 金兵攻破汴京，徽钦二帝被俘，北宋灭亡
18. yuefei 岳飞北伐 | 1140 | 岳飞郾城朱仙镇大捷，后被十二道金牌召回
19. maritime-peak 海上丝路鼎盛 | 12-13世纪 | 泉州刺桐港成为东方第一大港，海上丝路进入黄金时代
20. yashan 崖山海战 | 1279 | 陆秀夫负帝投海，南宋灭亡
21. kublai-yuan 忽必烈建元 | 1271 | 忽必烈定都大都（北京），建立元朝
22. zhenghe 郑和下西洋 | 1405 | 郑和七下西洋，船队远达东非，规模空前
23. tumubao 土木堡之变 | 1449 | 明英宗亲征被俘，明朝由盛转衰
24. yakesa 雅克萨之战 | 1685 | 清军两次击败沙俄，签订《尼布楚条约》
25. humen 虎门销烟 | 1839 | 林则徐虎门销烟，揭开近代史序幕

- [ ] **Step 2: 扩展 src/markers.js**

`src/markers.js` 全文替换为：

```js
import maplibregl from 'maplibre-gl';
import { map } from './main.js';

let citiesData = [];
let eventsData = [];
let currentPeriodId = null;
let markers = [];

export async function loadMarkers() {
  const [cRes, eRes] = await Promise.all([
    fetch('./data/geo/cities.geojson'),
    fetch('./data/geo/events.geojson')
  ]);
  citiesData = (await cRes.json()).features;
  eventsData = (await eRes.json()).features;
  const content = await (await fetch('./content/events.json')).json();
  for (const f of eventsData) {
    f.properties.name_zh = content[f.properties.id].name_zh;
    f.properties.name_en = content[f.properties.id].name_en;
  }
}

function makeMarker(content, dataAttr, eventName, extraClass) {
  const el = document.createElement('div');
  el.className = extraClass;
  el.dataset[dataAttr] = content.properties.id;
  el.innerHTML = `<span class="dot"></span><span class="label cn">${content.properties.name_zh}</span><span class="label en">${content.properties.name_en}</span>`;
  el.addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent(eventName, { detail: { id: content.properties.id } }));
  });
  return new maplibregl.Marker({ element: el, anchor: 'center' })
    .setLngLat(content.geometry.coordinates)
    .addTo(map);
}

export function refreshMarkers(periodId) {
  currentPeriodId = periodId;
  for (const m of markers) m.remove();
  markers = [];
  for (const f of citiesData) {
    if (!f.properties.period.includes(periodId)) continue;
    markers.push(makeMarker(f, 'cityId', 'city-click', 'city-marker'));
  }
  for (const f of eventsData) {
    if (f.properties.period !== periodId) continue;
    markers.push(makeMarker(f, 'eventId', 'event-click', 'event-marker'));
  }
}
```

- [ ] **Step 3: src/styles.css 追加事件图标样式**

```css
.event-marker { position: relative; display: flex; align-items: center; gap: 4px; cursor: pointer; }
.event-marker .dot { width: 12px; height: 12px; border-radius: 2px;
  background: #8c2f2f; border: 1.5px solid #f3e9d2; box-shadow: 0 0 0 1px #8c2f2f;
  transform: rotate(45deg); }
.event-marker .label { font-family: 'Noto Serif SC', 'Songti SC', serif; font-size: 11px;
  font-weight: 600; color: #8c2f2f; white-space: nowrap;
  text-shadow: 0 0 3px #f3e9d2, 0 0 3px #f3e9d2; }
.event-marker .label.en { display: none; font-family: 'EB Garamond', Georgia, serif; font-size: 10px; }
body.lang-en .event-marker .label.cn { display: none; }
body.lang-en .event-marker .label.en { display: inline; }
```

- [ ] **Step 4: 验证校验全绿**

```bash
npm run validate
```

Expected: 退出码 0，输出 `VALIDATION OK — 27 cities, 25 events`。

- [ ] **Step 5: 浏览器验证**

```bash
npm run dev
```

Expected: 各时期出现印章式红色事件点，标签显示事件名；切换时期事件点刷新。

- [ ] **Step 6: 提交**

```bash
git add -A
git commit -m "feat: bilingual content for 25 events with seal-style markers"
```

### Task 11: 城市详情面板（6 标签 + 双语切换）与事件面板

**Files:**
- Create: `src/i18n.js`
- Create: `src/ui/panel.js`
- Create: `src/ui/eventpanel.js`
- Modify: `src/main.js`（语言按钮、city-click/event-click 挂接）
- Modify: `src/styles.css`（面板内部样式）

**Interfaces:**
- Consumes: `content/cities.json`、`content/events.json`、`data/geo/cities.geojson`；`currentPeriod`（main.js）；CustomEvents `city-click` / `event-click`（markers.js）
- Produces: `src/i18n.js` 导出 `lang()`（返回 'zh'|'en'）、`setLang(l)`、`UI`（界面文案字典 `{ zh: {...}, en: {...} }`）；`src/ui/panel.js` 导出 `openCity(id)`、`closePanel()`；`src/ui/eventpanel.js` 导出 `openEvent(id)`

- [ ] **Step 1: 写 src/i18n.js**

```js
export const UI = {
  zh: {
    tabs: { history: '历史', geography: '地理', climate: '气候', attractions: '景点', food: '美食', guide: '旅游攻略' },
    day: '第', dayUnit: '天', ai: 'AI 增强', aiLoading: '生成中…', aiError: '生成失败，请检查 API Key 与网络',
    eventTitle: '历史事件', legend: '图例', settings: '设置', apiKey: 'API Key', apiBase: '接口地址', apiModel: '模型', save: '保存', close: '关闭', saved: '已保存', ancientName: '当时称', yearLabel: '时间'
  },
  en: {
    tabs: { history: 'History', geography: 'Geography', climate: 'Climate', attractions: 'Attractions', food: 'Cuisine', guide: 'Travel Guide' },
    day: 'Day ', dayUnit: '', ai: 'AI Enhance', aiLoading: 'Generating…', aiError: 'Generation failed. Check your API key and network.',
    eventTitle: 'Historical Event', legend: 'Legend', settings: 'Settings', apiKey: 'API Key', apiBase: 'API Base URL', apiModel: 'Model', save: 'Save', close: 'Close', saved: 'Saved', ancientName: 'Known as', yearLabel: 'Date'
  }
};

let current = 'zh';

export function lang() {
  return current;
}

export function setLang(l) {
  current = l;
  document.body.classList.toggle('lang-en', l === 'en');
  document.getElementById('lang-btn').textContent = l === 'en' ? '中' : 'EN';
  document.dispatchEvent(new CustomEvent('lang-change', { detail: { lang: l } }));
}

export function t(key) {
  return UI[current][key];
}
```

- [ ] **Step 2: 写 src/ui/panel.js**

```js
import { lang, setLang, t, UI } from '../i18n.js';

let contentCache = null;
let cityMeta = null;

async function ensureData() {
  if (!contentCache) {
    const [c, g] = await Promise.all([
      fetch('./content/cities.json').then((r) => r.json()),
      fetch('./data/geo/cities.geojson').then((r) => r.json())
    ]);
    contentCache = c;
    cityMeta = Object.fromEntries(g.features.map((f) => [f.properties.id, f.properties]));
  }
}

const TABS = ['history', 'geography', 'climate', 'attractions', 'food', 'guide'];
let activeTab = 'history';
let currentCityId = null;

function esc(s) {
  return String(s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function renderTabs() {
  return `<div class="panel-tabs">${TABS.map((k) =>
    `<button class="ptab ${k === activeTab ? 'active' : ''}" data-tab="${k}">${t('tabs.' + k)}</button>`).join('')}</div>`;
}

function renderGuide(c, l) {
  const g = c[`guide_${l}`];
  return g.map((d) =>
    `<div class="guide-day"><h4>${esc(d.day)} · ${esc(d.title)}</h4><ul>${d.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul></div>`
  ).join('');
}

function renderBody(c) {
  const l = lang();
  if (activeTab === 'guide') {
    return `<div class="guide-body">${renderGuide(c, l)}<div id="ai-box"></div></div>`;
  }
  if (activeTab === 'attractions' || activeTab === 'food') {
    return `<ul class="plain-list">${c[`${activeTab}_${l}`].map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`;
  }
  return `<p class="prose">${esc(c[`${activeTab}_${l}`])}</p>`;
}

function renderHeader(c, meta) {
  const l = lang();
  const ancient = meta.ancient && meta.ancient[currentCityPeriod] ? meta.ancient[currentCityPeriod][l] : null;
  return `<div class="panel-head">
    <button class="panel-close">×</button>
    <h2>${esc(c[`name_${l}`])}${ancient ? ` <span class="ancient">· ${esc(ancient)}</span>` : ''}</h2>
    <p class="tagline">${esc(c[`tagline_${l}`])}</p>
  </div>`;
}

let currentCityPeriod = '';

export async function openCity(id) {
  await ensureData();
  currentCityId = id;
  currentCityPeriod = window.currentPeriod || 'qinhan';
  activeTab = 'history';
  const c = contentCache[id];
  const meta = cityMeta[id];
  const panel = document.getElementById('panel');
  panel.classList.remove('closed');
  panel.innerHTML = `${renderHeader(c, meta)}${renderTabs()}<div class="panel-body">${renderBody(c)}</div>`;
  bindPanel(panel, c);
  document.dispatchEvent(new CustomEvent('panel-opened', { detail: { id } }));
}

function bindPanel(panel, c) {
  panel.querySelector('.panel-close').addEventListener('click', closePanel);
  panel.querySelectorAll('.ptab').forEach((b) => b.addEventListener('click', () => {
    activeTab = b.dataset.tab;
    panel.querySelector('.panel-body').innerHTML = renderBody(c);
    panel.querySelectorAll('.ptab').forEach((x) => x.classList.toggle('active', x.dataset.tab === activeTab));
  }));
}

export function closePanel() {
  document.getElementById('panel').classList.add('closed');
  document.getElementById('panel').innerHTML = '';
  currentCityId = null;
}

document.addEventListener('lang-change', () => {
  if (currentCityId) openCity(currentCityId);
});
```

- [ ] **Step 3: 写 src/ui/eventpanel.js**

```js
import { lang, t } from '../i18n.js';

let eventsCache = null;

export async function openEvent(id) {
  if (!eventsCache) eventsCache = await fetch('./content/events.json').then((r) => r.json());
  const e = eventsCache[id];
  const l = lang();
  const panel = document.getElementById('panel');
  panel.classList.remove('closed');
  panel.innerHTML = `<div class="panel-head">
      <button class="panel-close">×</button>
      <h2>${t('eventTitle')}</h2>
    </div>
    <div class="panel-body event-body">
      <h3>${e[`name_${l}`]}</h3>
      <p class="event-year">${t('yearLabel')}：${e[`year_${l}`]}</p>
      <p class="prose">${e[`desc_${l}`]}</p>
    </div>`;
  panel.querySelector('.panel-close').addEventListener('click', () => {
    panel.classList.add('closed');
    panel.innerHTML = '';
  });
}
```

- [ ] **Step 4: 修改 src/main.js 挂接语言与点击事件**

在文件末尾追加：

```js
import { setLang } from './i18n.js';
import { openCity } from './ui/panel.js';
import { openEvent } from './ui/eventpanel.js';

window.currentPeriod = currentPeriod;
document.getElementById('lang-btn').addEventListener('click', () => {
  setLang(document.body.classList.contains('lang-en') ? 'zh' : 'en');
});
document.addEventListener('city-click', (e) => openCity(e.detail.id));
document.addEventListener('event-click', (e) => openEvent(e.detail.id));
```

并在 `setPeriod` 函数体末尾追加 `window.currentPeriod = periodId;`。

- [ ] **Step 5: src/styles.css 追加面板样式**

```css
.panel-head { padding: 18px 20px 10px; border-bottom: 1px solid #d9c9a8; }
.panel-head h2 { font-size: 24px; color: #3d2f1e; letter-spacing: 1px; }
.panel-head .ancient { font-size: 16px; color: #8a6f4d; font-weight: 400; }
.panel-head .tagline { margin-top: 6px; color: #7a6348; font-size: 14px; font-style: italic; }
.panel-close { position: absolute; right: 12px; top: 10px; border: none; background: none;
  font-size: 24px; cursor: pointer; color: #4a3b2a; }
.panel-head { position: relative; }
.panel-tabs { display: flex; flex-wrap: wrap; gap: 4px; padding: 10px 14px; border-bottom: 1px solid #d9c9a8; }
.ptab { border: 1px solid #8a6f4d; background: transparent; color: #4a3b2a;
  padding: 4px 10px; cursor: pointer; font-family: inherit; font-size: 13px; border-radius: 3px; }
.ptab.active { background: #4a3b2a; color: #f3e9d2; }
.panel-body { padding: 16px 20px 30px; }
.prose { line-height: 1.9; color: #3d2f1e; font-size: 15px; text-align: justify; }
.plain-list { padding-left: 20px; }
.plain-list li { margin: 8px 0; line-height: 1.6; color: #3d2f1e; font-size: 14px; }
.guide-day { margin-bottom: 16px; }
.guide-day h4 { color: #6b4f2e; font-size: 15px; margin-bottom: 6px; }
.guide-day ul { padding-left: 20px; }
.guide-day li { margin: 5px 0; font-size: 14px; line-height: 1.7; color: #3d2f1e; }
.event-body h3 { color: #8c2f2f; font-size: 20px; margin-bottom: 8px; }
.event-year { color: #8a6f4d; font-size: 13px; margin-bottom: 10px; }
```

- [ ] **Step 6: 验证**

```bash
npm run dev
```

Expected: 点击西安 → 右侧滑出面板，6 个标签可切换，旅游攻略显示 3 天；点「EN」→ 全站（含面板、标记、按钮）切英文；点击事件点 → 事件面板。

- [ ] **Step 7: 提交**

```bash
git add -A
git commit -m "feat: bilingual city detail panel and event panel"
```

### Task 12: LLM 可选增强（设置面板 + AI 攻略按钮）

**Files:**
- Create: `src/llm.js`
- Create: `src/ui/settings.js`
- Modify: `src/ui/panel.js`（AI 按钮挂接）
- Modify: `src/main.js`（设置按钮）
- Modify: `src/styles.css`（设置面板与 AI 按钮样式）

**Interfaces:**
- Consumes: `content/cities.json`；`openCity` 面板渲染流程；`lang()`、`t()`（i18n.js）
- Produces: `src/ui/settings.js` 导出 `initSettings()`、`getLLMConfig()`（返回 `{ baseUrl, apiKey, model } | null`）；`src/llm.js` 导出 `generateGuide(cityId)`（返回 Promise<string>，失败 reject）

- [ ] **Step 1: 写 src/ui/settings.js**

```js
const KEY = 'hmap-llm-config';

export function getLLMConfig() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const cfg = JSON.parse(raw);
    if (!cfg.apiKey || !cfg.baseUrl || !cfg.model) return null;
    return cfg;
  } catch {
    return null;
  }
}

export function initSettings() {
  const modal = document.getElementById('settings-modal');
  const btn = document.getElementById('settings-btn');
  const saved = getLLMConfig();
  btn.addEventListener('click', () => {
    modal.classList.toggle('hidden');
    if (!modal.classList.contains('hidden')) {
      modal.innerHTML = `
        <h3 class="cn">设置</h3><h3 class="en">Settings</h3>
        <label>API Key</label>
        <input id="cfg-key" type="password" placeholder="sk-..." value="${saved ? saved.apiKey : ''}" />
        <label>Base URL</label>
        <input id="cfg-base" type="text" placeholder="https://api.openai.com/v1" value="${saved ? saved.baseUrl : 'https://api.openai.com/v1'}" />
        <label>Model</label>
        <input id="cfg-model" type="text" placeholder="gpt-4o-mini" value="${saved ? saved.model : 'gpt-4o-mini'}" />
        <div class="cfg-actions">
          <button id="cfg-save">保存</button>
          <button id="cfg-close">关闭</button>
        </div>`;
      modal.querySelector('#cfg-save').addEventListener('click', () => {
        const cfg = {
          apiKey: modal.querySelector('#cfg-key').value.trim(),
          baseUrl: modal.querySelector('#cfg-base').value.trim(),
          model: modal.querySelector('#cfg-model').value.trim()
        };
        if (cfg.apiKey && cfg.baseUrl && cfg.model) localStorage.setItem(KEY, JSON.stringify(cfg));
        modal.classList.add('hidden');
        document.dispatchEvent(new CustomEvent('llm-config-change'));
      });
      modal.querySelector('#cfg-close').addEventListener('click', () => modal.classList.add('hidden'));
    }
  });
}
```

- [ ] **Step 2: 写 src/llm.js**

```js
import { getLLMConfig } from './ui/settings.js';
import { lang } from './i18n.js';

export async function generateGuide(cityId) {
  const cfg = getLLMConfig();
  if (!cfg) throw new Error('no llm config');
  const content = await fetch('./content/cities.json').then((r) => r.json());
  const c = content[cityId];
  const l = lang();
  const langName = l === 'zh' ? '简体中文' : 'English';
  const prompt = `你是资深旅行规划师。基于以下${langName}城市资料，用${langName}生成一份个性化3日深度游攻略（每天含上午/下午/晚上安排与美食推荐），共300字以内，用Markdown格式输出。\n\n城市：${c.name_zh} (${c.name_en})\n历史：${c.history_zh}\n地理：${c.geography_zh}\n气候：${c.climate_zh}\n景点：${c.attractions_zh.join('、')}\n美食：${c.food_zh.join('、')}`;
  const res = await fetch(`${cfg.baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.apiKey}` },
    body: JSON.stringify({
      model: cfg.model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 800
    })
  });
  if (!res.ok) throw new Error(`llm http ${res.status}`);
  const data = await res.json();
  return data.choices[0].message.content;
}
```

- [ ] **Step 3: 修改 src/ui/panel.js 挂接 AI 按钮**

`renderBody` 中 guide 分支改为（增加 AI 按钮逻辑与结果容器）：

```js
  if (activeTab === 'guide') {
    const hasKey = window.getLLMConfig ? !!window.getLLMConfig() : false;
    return `<div class="guide-body">${renderGuide(c, l)}${hasKey ? '<button id="ai-btn" class="ai-btn">✨ ' + t('ai') + '</button>' : ''}<div id="ai-box"></div></div>`;
  }
```

`bindPanel` 中追加：

```js
  const aiBtn = panel.querySelector('#ai-btn');
  if (aiBtn) {
    aiBtn.addEventListener('click', async () => {
      const box = panel.querySelector('#ai-box');
      aiBtn.disabled = true;
      aiBtn.textContent = t('aiLoading');
      try {
        const { generateGuide } = await import('../llm.js');
        const md = await generateGuide(currentCityId);
        box.innerHTML = '<h4 class="ai-title">AI</h4><pre class="ai-md">' + esc(md) + '</pre>';
      } catch {
        box.innerHTML = '<p class="ai-error">' + t('aiError') + '</p>';
      } finally {
        aiBtn.disabled = false;
        aiBtn.textContent = '✨ ' + t('ai');
      }
    });
  }
```

`panel.js` 顶部新增 `import { getLLMConfig } from './settings.js';` 并在模块顶部执行 `window.getLLMConfig = getLLMConfig;`。

- [ ] **Step 4: 修改 src/main.js**

在 import 区追加：

```js
import { initSettings } from './ui/settings.js';
```

在 `map.on('load')` 回调内 `initTimeline(...)` 之后追加 `initSettings();`。

- [ ] **Step 5: src/styles.css 追加样式**

```css
#settings-modal label { display: block; font-size: 12px; color: #6b4f2e; margin: 8px 0 3px; }
#settings-modal input { width: 100%; padding: 6px 8px; border: 1px solid #b9a888;
  background: #fffdf5; font-family: inherit; font-size: 13px; border-radius: 3px; }
#settings-modal h3 { color: #4a3b2a; font-size: 15px; }
#settings-modal .en { display: none; }
body.lang-en #settings-modal .cn { display: none; }
body.lang-en #settings-modal .en { display: block; }
.cfg-actions { display: flex; gap: 8px; margin-top: 12px; }
.cfg-actions button { flex: 1; padding: 6px; border: 1px solid #8a6f4d; background: #4a3b2a;
  color: #f3e9d2; cursor: pointer; font-family: inherit; border-radius: 3px; }
.ai-btn { margin-top: 14px; padding: 8px 16px; border: 1px solid #8a6f4d; background: transparent;
  color: #4a3b2a; cursor: pointer; font-family: inherit; font-size: 14px; border-radius: 3px; }
.ai-btn:disabled { opacity: 0.6; }
.ai-title { color: #8a6f4d; margin: 12px 0 6px; }
.ai-md { white-space: pre-wrap; font-family: inherit; font-size: 14px; line-height: 1.8; color: #3d2f1e; }
.ai-error { color: #8c2f2f; margin-top: 10px; font-size: 13px; }
```

- [ ] **Step 6: 验证**

```bash
npm run dev
```

Expected: 未配置 Key → 攻略标签页无 AI 按钮；打开 ⚙ 填写（可用任意假 Key）→ 攻略页出现「✨ AI 增强」；点击后若无有效 Key 显示错误提示（不崩溃）。

- [ ] **Step 7: 提交**

```bash
git add -A
git commit -m "feat: optional llm-enhanced travel guide with settings panel"
```

### Task 13: 图例、响应式与整体打磨

**Files:**
- Create: `src/ui/legend.js`
- Modify: `src/main.js`（引入 legend）
- Modify: `src/styles.css`（图例 + 移动端样式）

**Interfaces:**
- Consumes: `PALETTE`（style.js）、`PERIODS`/`borderIdsByPeriod`（periods.js）
- Produces: `src/ui/legend.js` 导出 `initLegend()`、`renderLegend(periodId)`

- [ ] **Step 1: 写 src/ui/legend.js**

```js
import { t } from '../i18n.js';

export function initLegend() {
  const el = document.getElementById('legend');
  el.innerHTML = `<h4 class="cn">图例</h4><h4 class="en">Legend</h4><div id="legend-body"></div>`;
  el.addEventListener('click', (e) => {
    if (e.target.tagName === 'H4') el.classList.toggle('collapsed');
  });
}

export function renderLegend(periodId) {
  const body = document.getElementById('legend-body');
  const items = [
    { c: '#9c4a3a', zh: '疆域', en: 'Territory' },
    { c: '#4a3b2a', zh: '城市', en: 'City' },
    { c: '#8c2f2f', zh: '历史事件', en: 'Event' },
    { c: '#7a5c3e', zh: '长城', en: 'Great Wall' },
    { c: '#2e5f7a', zh: '大运河', en: 'Grand Canal' },
    { c: '#b0743c', zh: '陆上丝路', en: 'Silk Road (Land)' },
    { c: '#2e7d8c', zh: '海上丝路', en: 'Silk Road (Sea)' }
  ];
  body.innerHTML = items.map((i) =>
    `<div class="lg-item"><span class="lg-swatch" style="background:${i.c}"></span><span class="cn">${i.zh}</span><span class="en">${i.en}</span></div>`
  ).join('');
}
```

- [ ] **Step 2: 修改 src/main.js**

import 区追加 `import { initLegend, renderLegend } from './ui/legend.js';`；`map.on('load')` 回调内 `initSettings();` 之后追加 `initLegend();`；`setPeriod` 内 `markActive(periodId);` 之后追加 `renderLegend(periodId);`。

- [ ] **Step 3: src/styles.css 追加图例与移动端样式**

```css
#legend h4 { font-size: 14px; color: #4a3b2a; cursor: pointer; margin-bottom: 8px; }
#legend .en { display: none; }
body.lang-en #legend .cn { display: none; }
body.lang-en #legend .en { display: inline; }
#legend.collapsed #legend-body { display: none; }
.lg-item { display: flex; align-items: center; gap: 8px; margin: 6px 0; font-size: 13px; color: #3d2f1e; }
.lg-swatch { width: 14px; height: 14px; border-radius: 3px; border: 1px solid #4a3b2a; flex-shrink: 0; }
.lg-item .en { display: none; font-family: 'EB Garamond', Georgia, serif; }
body.lang-en .lg-item .cn { display: none; }
body.lang-en .lg-item .en { display: inline; }

@media (max-width: 768px) {
  #panel { width: 100%; top: auto; bottom: 0; height: 55vh; border-left: none; border-top: 1px solid #8a6f4d; }
  #legend { width: 140px; top: 70px; }
  #title { font-size: 16px; }
  #timeline { order: 3; width: 100%; }
  #topbar { flex-wrap: wrap; }
}
```

- [ ] **Step 4: 验证**

```bash
npm run dev
```

Expected: 左侧图例可见可折叠；浏览器缩至 375px 宽：面板变为底部抽屉、时间轴换行、整体无横向滚动。

- [ ] **Step 5: 提交**

```bash
git add -A
git commit -m "feat: legend panel, responsive layout and polish"
```

### Task 14: 冒烟测试 + README + 构建部署

**Files:**
- Create: `scripts/smoke.mjs`
- Create: `README.md`
- Modify: `package.json`（无需改，smoke script 已定义）

**Interfaces:**
- Consumes: 全部已完成功能

- [ ] **Step 1: 写 scripts/smoke.mjs**

```js
import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';

const server = spawn('npx', ['vite', 'preview', '--port', '4173', '--strictPort'], {
  cwd: process.cwd(), stdio: 'pipe'
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let browser;

try {
  await sleep(2500);
  browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
  await page.waitForSelector('.maplibregl-canvas', { timeout: 10000 });

  await page.click('[data-period="songliaojin"]');
  await page.waitForTimeout(1600);
  await page.click('.city-marker[data-city-id="kaifeng"]');
  await page.waitForSelector('#panel:not(.closed) .panel-tabs', { timeout: 5000 });
  const title = await page.textContent('#panel .panel-head h2');
  if (!title.includes('开封') && !title.includes('Kaifeng')) throw new Error('kaifeng panel title wrong: ' + title);

  await page.click('#lang-btn');
  await page.waitForTimeout(400);
  const bodyClass = await page.getAttribute('body', 'class');
  if (!bodyClass.includes('lang-en')) throw new Error('language toggle failed');

  await page.click('[data-period="yuanmingqing"]');
  await page.waitForTimeout(1600);
  await page.click('.city-marker[data-city-id="shanghai"]');
  await page.waitForSelector('#panel:not(.closed)', { timeout: 5000 });
  const guideTab = await page.textContent('.ptab[data-tab="guide"]');
  if (!guideTab.includes('Guide')) throw new Error('guide tab EN label missing');

  if (errors.length) throw new Error('page errors: ' + errors.join(' | '));
  console.log('SMOKE OK');
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
```

- [ ] **Step 2: 安装 Playwright 浏览器并运行冒烟测试**

```bash
npx playwright install chromium
npm run build
npm run smoke
```

Expected: 输出 `SMOKE OK`。

- [ ] **Step 3: 写 README.md**

```markdown
# 华夏舆图 · Historical Atlas of China

古风交互式中国历史地图：5 时期时间轴、27 城双语详情与旅游攻略、25 个历史事件、长城/大运河/丝绸之路图层，可选 LLM 攻略增强。

## 运行
npm install
npm run dev

## 校验与测试
npm run validate   # 数据一致性
npm run smoke      # 需先 npm run build，Playwright 冒烟测试

## 部署
npm run build 后把 dist/ 部署到任意静态托管（GitHub Pages / Vercel / Netlify）。

## 可选 LLM
右上角 ⚙ 填入 OpenAI 兼容 API Key / Base URL / 模型名，即可在攻略页使用「AI 增强」。
配置仅存于浏览器 localStorage，不会上传。

## 数据
data/geo/*.geojson 为几何与元信息，content/*.json 为中英双语正文。
历史疆域为风格化简化绘制，仅供参考示意，非精确历史边界。
```

- [ ] **Step 4: 最终验收清单核对**

逐项运行：`npm run validate`（退出码 0）、`npm run build`（成功）、`npm run smoke`（SMOKE OK）；浏览器人工检查：5 时期切换、27 城面板、语言切换、事件点、长城/运河/丝路时期显示、移动端抽屉。

- [ ] **Step 5: 提交**

```bash
git add -A
git commit -m "feat: smoke test, readme and final build verification"
```

## Self-Review（计划自查）

**1. Spec 覆盖对照：**

| 设计文档要求 | 对应任务 |
|--------------|----------|
| Vite + MapLibre 静态站、`base './'` 任意静态托管 | Task 1、Task 14 |
| 古风宣纸底图 + 纸纹 + 墨线/青花配色 + 字体 | Task 1（纸纹/字体）、Task 2（配色） |
| 疆域边界 10 政权（含宋辽金并立分色） | Task 3（颜色在 properties.color，图例用统一色板；并立政权各有独立图层与填充色值） |
| 5 时期时间轴 + 淡入淡出 + flyTo | Task 4 |
| 长城（秦汉/明）、运河（隋唐/京杭）、丝路（陆/海）按时期显示 | Task 5 |
| 27 城点位按朝代出现/消失 + 古名 | Task 5（cities.geojson）、Task 7-9（正文） |
| 城市弹窗 6 标签双语 + 3 日攻略 | Task 11、Task 7-9 |
| 25 事件点双语 | Task 6（geometry）、Task 10（正文+渲染） |
| LLM 可选增强（localStorage Key，无 Key 不显示按钮） | Task 12 |
| 语言切换全站生效 | Task 11（i18n）、Task 1/5/10（cn/en span CSS） |
| 图例 + 移动端底部抽屉 | Task 13 |
| 数据校验脚本 | Task 6 |
| 冒烟测试 + README | Task 14 |

**2. 占位符扫描：** 所有代码步骤包含完整代码；数据步骤包含完整坐标/内容要点；无 TBD/TODO。

**3. 类型/命名一致性：**
- 图层 id：`border-fill-<id>`/`border-line-<id>`（Task 3/4）、`wall-qinhan-line` 等 6 个线图层（Task 5 的 setPeriod lineVis 与 Step 6 定义一致）
- 政權 id 集合 `ALL_BORDER_IDS` 与 borders.geojson 的 10 个 id 一致
- 时期 id 5 个：`qinhan/sanguo/suitang/songliaojin/yuanmingqing` 在 periods.js、geojson period 字段、validator 中一致
- 事件：`refreshMarkers` 用 `event-click` / `city-click`，main.js 监听同名事件；`openCity(id)` / `openEvent(id)` 消费 detail.id
- `window.currentPeriod` 在 Task 11 写入、panel.js 读取，setPeriod 中同步更新
- 城市 id（27 个）在 cities.geojson / content/cities.json / Task 7-9 列表三处一致
- 事件 id（25 个）在 events.geojson / content/events.json / Task 10 列表三处一致

**4. 已知简化（与设计文档一致的风格化取舍）：**
- 历史疆域为示意性简化多边形，非精确边界（README 中已声明）
- 城市圆点层 `city-dot` 为视觉辅助，交互标签由 HTML markers 承载（保证 CJK 字体渲染）
- 三国时期仅示魏蜀吴（不含两晋南北朝更细分期）、元明清时期示清极盛疆域




