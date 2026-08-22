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
