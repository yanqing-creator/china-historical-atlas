export const UI = {
  zh: {
    tabs: { history: '历史', geography: '地理', climate: '气候', attractions: '景点', food: '美食', guide: '旅游攻略' },
    day: '第', dayUnit: '天', ai: 'AI 增强', aiLoading: '生成中…', aiError: '生成失败，请检查 API Key 与网络',
    eventTitle: '历史事件', legend: '图例', settings: '设置', apiKey: 'API Key', apiBase: '接口地址', apiModel: '模型', save: '保存', close: '关闭', saved: '已保存', ancientName: '当时称', yearLabel: '时间', contributors: '合作者'
  },
  en: {
    tabs: { history: 'History', geography: 'Geography', climate: 'Climate', attractions: 'Attractions', food: 'Cuisine', guide: 'Travel Guide' },
    day: 'Day ', dayUnit: '', ai: 'AI Enhance', aiLoading: 'Generating…', aiError: 'Generation failed. Check your API key and network.',
    eventTitle: 'Historical Event', legend: 'Legend', settings: 'Settings', apiKey: 'API Key', apiBase: 'API Base URL', apiModel: 'Model', save: 'Save', close: 'Close', saved: 'Saved', ancientName: 'Known as', yearLabel: 'Date', contributors: 'Contributors'
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
  return key.split('.').reduce((o, k) => (o ? o[k] : undefined), UI[current]);
}
