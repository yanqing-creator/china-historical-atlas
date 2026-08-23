# 华夏舆图 · Historical Atlas of China

An antique-style interactive historical map of China: a 5-period timeline (Qin-Han → Yuan-Ming-Qing), 10 polity territories, bilingual details and 3-day travel guides for 27 cities, 25 historical events, and Great Wall / Grand Canal / Silk Road layers, with optional LLM-enhanced guides.

古风交互式中国历史地图：5 时期时间轴（秦汉→元明清）、10 个政权疆域、27 城中英双语详情与 3 日旅游攻略、25 个历史事件、长城/大运河/丝绸之路图层，可选 LLM 攻略增强。

**Online Preview 在线预览:** https://yanqing-creator.github.io/china-historical-atlas/

## One-Click Launch 一键启动

| Script 脚本 | Purpose 用途 |
|------|------|
| `打开地图.cmd` / `打开地图.command` | Open the **online version** (GitHub Pages) 双击打开**在线版** |
| `本地打开.cmd` / `本地打开.command` | Open **offline locally** (auto-builds on first run, starts a local server and opens the browser) 双击**离线本地浏览** |

- Use `.command` on macOS, `.cmd` on Windows
- Local launch requires Node.js (nvm handled automatically); close the terminal window to stop the server
- Works fully offline: all map and content data is bundled locally; only fonts need network (falls back to system Songti offline)

## Development 开发运行

```bash
npm install
npm run dev        # dev server at http://localhost:5173
```

## Validation & Testing 校验与测试

```bash
npm run validate                    # data consistency (all bilingual fields for 27 cities / 25 events)
npx playwright test                 # 24 end-to-end browser tests
npm run build && npm run smoke      # smoke test on the built output
```

## Deployment (GitHub Pages) 部署

A GitHub Actions workflow (`.github/workflows/pages.yml`) is configured: every push to `main` auto-builds and deploys.

可以手动构建后部署到任意静态托管（Vercel / Netlify 等）：

```bash
npm run build   # output in dist/
```

## Optional LLM 可选 LLM

Click the gear ⚙ in the top-right to enter an OpenAI-compatible API Key / Base URL / model name, then use the "AI Enhance" button on the travel-guide tab.
配置仅存于浏览器 localStorage，不会上传。

- Only stored in browser localStorage; never uploaded.

## Data 数据

- `public/data/geo/*.geojson` — geometry & metadata (territories / cities / events / Great Wall / Grand Canal / Silk Road)
- `public/content/*.json` — bilingual content (27 city profiles + 25 events)

Historical territories are stylized and simplified for display only; they are not precise historical borders.
历史疆域为风格化简化绘制，仅供参考示意，非精确历史边界。

## Contributors 合作者

- yanqing-creator
- Yuchen-Zou
