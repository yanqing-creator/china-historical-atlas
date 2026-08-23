# 城市攻略本地编辑功能 — 设计文档

日期：2026-08-23
状态：已确认

## 1. 目标

在华夏舆图网页上增加「攻略相关字段」的本地编辑能力：
- 顶部全局编辑开关，打开后城市详情面板出现「编辑内容」按钮
- 弹窗编辑：景点、美食、3 日旅游攻略，中英双栏，支持增删改
- 保存到浏览器 localStorage（仅本机生效）
- 每个城市可单独「恢复默认」，清除该城本地编辑
- 历史、地理、气候字段不可编辑

## 2. 架构（方案 A：覆盖层 + 覆盖式渲染）

默认数据（public/content/cities.json）与用户编辑覆盖层隔离，渲染时用覆盖数据替换对应字段。可随时恢复默认。

### 数据层：src/editstore.js（新增）

localStorage 键 `hmap-city-edits`，值 `{ "<cityId>": { attractions_zh, attractions_en, food_zh, food_en, guide_zh, guide_en } }`，只存被编辑过的城市。

API：
- `getOverrides(cityId)` → 覆盖数据或 null
- `saveCity(cityId, data)` → 写覆盖层
- `resetCity(cityId)` → 删除该城覆盖
- `applyOverrides(content, cityId)` → 合并覆盖数据进默认内容（返回新对象，不改原对象）
- `hasEdit(cityId)` → 布尔

### 渲染层：src/ui/panel.js（修改）

- `openCity` 加载内容后先 `applyOverrides` 再渲染
- 编辑模式开启时显示「✎ 编辑内容」按钮；有本地编辑的城市显示「↺ 恢复默认」按钮
- 保存/恢复后刷新面板

### 编辑弹窗：src/ui/editor.js（新增）

- 模态居中，标题「编辑 · 城市名」
- 六个区块，中英双栏（左中/右英）：
  1. 景点列表：每行输入框 + 删除按钮，「+ 添加景点」
  2. 美食列表：同上
  3. 攻略 Day 1/2/3：每天含标题输入 + 条目列表（可增删）
- 底部按钮：取消（不保存）、保存（写 localStorage + 刷新面板）
- 保存允许空列表，但给提示

### 入口与样式

- `index.html`：顶部 top-actions 加编辑开关按钮 `#edit-toggle`
- `src/main.js`：绑定开关，维护 `window.isEditMode` 状态并派发 `edit-mode-change` 事件
- `src/i18n.js`：补编辑相关文案 zh/en（editMode、editContent、restoreDefault、save、cancel、addItem、remove、dayTitle 等）
- `src/styles.css`：开关高亮、弹窗、表单、按钮样式

## 3. 交互细节

- 编辑开关：点击切换激活态；开启时面板出现编辑/恢复按钮，关闭时隐藏（已保存的编辑仍生效显示）
- 恢复默认：点击 → 确认提示 → 删除该城覆盖 → 刷新面板
- 语言切换：编辑弹窗按当前语言显示 UI 文案，内容始终中英双栏

## 4. 错误处理

- localStorage 不可用（隐私模式）→ 提示「本地存储不可用，无法保存」
- JSON 损坏 → 忽略损坏数据，视为无覆盖

## 5. 数据流

```
默认 cities.json ──┐
                   ├─→ applyOverrides ──→ 面板渲染
localStorage 覆盖 ──┘
编辑弹窗 ──save──→ localStorage ──→ 面板刷新
恢复默认 ──reset──→ localStorage ──→ 面板刷新
```

## 6. 测试（TDD，Playwright）

tests/task15-editor.spec.js：
1. 默认（无开关）→ 面板无编辑按钮
2. 开编辑模式 → 面板出现「✎ 编辑内容」
3. 弹窗编辑景点（增一条）→ 保存 → 面板显示新景点；刷新页面后仍在
4. 点「↺ 恢复默认」→ 面板回默认；刷新后不再显示编辑内容
5. 语言切换后编辑弹窗正常

npm run validate 不受影响（覆盖层不影响源数据文件）。

## 7. 验收标准

1. 编辑模式开关可切换
2. 弹窗增删改景点/美食/攻略并保存生效
3. 刷新后编辑内容保留（localStorage）
4. 恢复默认清除该城编辑
5. 全量 Playwright 测试通过

## 8. 文件清单

- 新增 src/editstore.js
- 新增 src/ui/editor.js
- 新增 tests/task15-editor.spec.js
- 修改 src/ui/panel.js
- 修改 src/main.js
- 修改 index.html
- 修改 src/i18n.js
- 修改 src/styles.css
