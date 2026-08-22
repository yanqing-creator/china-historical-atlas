import { lang, setLang, t, UI } from '../i18n.js';
import { getLLMConfig } from './settings.js';

window.getLLMConfig = getLLMConfig;

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
    const hasKey = window.getLLMConfig ? !!window.getLLMConfig() : false;
    return `<div class="guide-body">${renderGuide(c, l)}${hasKey ? '<button id="ai-btn" class="ai-btn">✨ ' + t('ai') + '</button>' : ''}<div id="ai-box"></div></div>`;
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

document.getElementById('panel').addEventListener('click', async (e) => {
  const aiBtn = e.target.closest('#ai-btn');
  if (!aiBtn) return;
  const box = document.getElementById('ai-box');
  aiBtn.disabled = true;
  aiBtn.textContent = t('aiLoading');
  try {
    const { generateGuide } = await import('../llm.js');
    const md = await generateGuide(currentCityId);
    box.innerHTML = '<h4 class="ai-title">AI</h4><pre class="ai-md">' + esc(md) + '</pre>';
  } catch {
    box.innerHTML = '<p class="ai-error">' + t('aiError') + '</p>';
  } finally {
    if (aiBtn.isConnected) {
      aiBtn.disabled = false;
      aiBtn.textContent = '✨ ' + t('ai');
    }
  }
});

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
