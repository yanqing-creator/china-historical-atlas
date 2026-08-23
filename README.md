# 华夏舆图 · Historical Atlas of China

古风交互式中国历史地图：5 时期时间轴（秦汉→元明清）、10 个政权疆域、27 城中英双语详情与 3 日旅游攻略、25 个历史事件、长城/大运河/丝绸之路图层，可选 LLM 攻略增强。

**在线预览：** https://yanqing-creator.github.io/china-historical-atlas/

## 一键启动

| 脚本 | 用途 |
|------|------|
| `打开地图.cmd` / `打开地图.command` | 双击打开**在线版**（GitHub Pages） |
| `本地打开.cmd` / `本地打开.command` | 双击**离线本地浏览**（首次自动构建，起本地服务并打开浏览器） |

- macOS 用 `.command`，Windows 用 `.cmd`
- 本地打开依赖 Node.js（nvm 已自动处理），关闭终端窗口即停止服务
- 离线可用：地图与内容数据全部本地打包；仅字体需联网（离线回退系统宋体）

## 开发运行

```bash
npm install
npm run dev        # 开发服务器 http://localhost:5173
```

## 校验与测试

```bash
npm run validate        # 数据一致性（27 城 / 25 事件全字段中英齐全）
npx playwright test     # 24 个浏览器端到端测试
npm run build && npm run smoke   # 构建产物冒烟测试
```

## 部署（GitHub Pages）

已配置 GitHub Actions（`.github/workflows/pages.yml`）：每次 push 到 `main` 自动构建并部署。

也可手动构建后部署到任意静态托管（Vercel / Netlify 等）：

```bash
npm run build   # 产物在 dist/
```

## 可选 LLM

右上角 ⚙ 填入 OpenAI 兼容 API Key / Base URL / 模型名，即可在攻略页使用「AI 增强」。
配置仅存于浏览器 localStorage，不会上传。

## 数据

- `public/data/geo/*.geojson` — 几何与元信息（疆域/城市/事件/长城/运河/丝路）
- `public/content/*.json` — 中英双语正文（27 城详情 + 25 事件）

历史疆域为风格化简化绘制，仅供参考示意，非精确历史边界。

## 合作者

- yanqing-creator
- Yuchen-Zou
