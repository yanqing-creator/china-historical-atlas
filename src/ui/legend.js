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
