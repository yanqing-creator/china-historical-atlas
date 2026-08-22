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
