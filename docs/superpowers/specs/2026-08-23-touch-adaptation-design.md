# 触屏适配 — 设计文档

日期：2026-08-23
状态：已确认

## 1. 目标

优化华夏舆图在触屏手机/平板上的使用体验。当前 MapLibre 原生支持触摸手势（拖拽/双指缩放），详情面板已有 ≤768px 底部抽屉布局。本设计聚焦「整体触屏优化」：
- 手机（≤768px）图例默认收起，可手动展开
- 手机端城市/事件标记触控目标与字号加大
- 手机端按钮触控目标加大
- 平板/桌面端行为不变

## 2. 方案（A：CSS 媒体查询为主 + 少量 JS）

### 2.1 CSS 触屏适配（src/styles.css）

在现有 `@media (max-width: 768px)` 块内追加/调整：

**标记加大**
```css
.city-marker .dot { width: 12px; height: 12px; }
.city-marker .label { font-size: 15px; }
.event-marker .dot { width: 15px; height: 15px; }
.event-marker .label { font-size: 13px; }
.city-marker, .event-marker { padding: 6px; margin: -6px; }
```
marker 为 `position: absolute`，`padding` + 负 `margin` 扩大点击热区且不移动视觉位置。

**按钮加大**
```css
#top-actions button, .tl-btn { min-width: 44px; min-height: 44px; }
.ptab, .edit-btn, .restore-btn { padding: 8px 12px; font-size: 14px; }
.editor-box { width: 96vw; }
```

### 2.2 图例默认收起（src/ui/legend.js）

- `initLegend()` 用 `window.matchMedia('(max-width: 768px)')` 判断视口：
  - 手机：给 `#legend` 加 `collapsed` 类（收起）
  - 监听 `change` 事件：视口跨过 768px 时自动收起/展开
  - 平板/桌面：保持展开
- 用户手动点标题切换折叠/展开逻辑不变（`#legend.collapsed #legend-body` 样式已存在）

## 3. 测试（TDD，Playwright）

新增 `tests/task16-touch.spec.js`：
1. 手机视口（375×667）打开页面 → `#legend` 有 `collapsed` 类（默认收起）
2. 点 `#legend h4` → 收起解除；再点 → 收起
3. 桌面视口（1280×800）→ `#legend` 无 `collapsed` 类（默认展开）
4. 手机视口下城市标记可点击并打开详情面板
5. 手机视口下 `.city-marker .dot` 计算样式宽 ≥12px（CSS 生效验证）

全量 Playwright 回归（现有 41 + 新增）+ build + validate 通过。

## 4. 验收标准

1. 手机加载时图例默认收起，可手动展开/收起
2. 手机端标记/按钮触控目标加大
3. 视口跨 768px 时图例自动收起/展开
4. 平板/桌面行为不变
5. 全量测试 + 构建通过

## 5. 文件清单

- 修改 src/styles.css（@media 块扩充）
- 修改 src/ui/legend.js（matchMedia 默认收起）
- 新增 tests/task16-touch.spec.js
