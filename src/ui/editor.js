import { t } from '../i18n.js';

let onSaveCb = null;

function esc(s) {
  return String(s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function escAttr(s) {
  return esc(s);
}

function currentState() {
  return window.__editorState;
}

function cleanGuide(days) {
  return days
    .map((d) => ({ ...d, items: d.items.filter((v) => v.trim() !== '') }))
    .filter((d) => d.title.trim() !== '' || d.items.length > 0);
}

export function openEditor(cityId, currentContent, onSave) {
  onSaveCb = onSave;
  window.__editorState = {
    cityId,
    name: currentContent.name_zh,
    attractions_zh: [...currentContent.attractions_zh],
    attractions_en: [...currentContent.attractions_en],
    food_zh: [...currentContent.food_zh],
    food_en: [...currentContent.food_en],
    guide_zh: currentContent.guide_zh.map((d) => ({ ...d, items: [...d.items] })),
    guide_en: currentContent.guide_en.map((d) => ({ ...d, items: [...d.items] }))
  };
  const name = currentContent.name_zh;
  const modal = document.createElement('div');
  modal.id = 'editor-modal';
  modal.className = 'hidden';
  modal.innerHTML = `
    <div class="editor-box">
      <h3>${esc(t('editTitle'))}${esc(name)}</h3>
      ${edSection('attractions_zh', 'add-attr', 'del-attr')}
      ${edSection('food_zh', 'add-food', 'del-food')}
      <div class="ed-block"><h4>${esc(t('tabs.guide'))}</h4>${guideSection('guide_zh')}</div>
      <div class="ed-en">
        <h4>EN</h4>
        ${edSection('attractions_en', 'add-attr-en', 'del-attr-en')}
        ${edSection('food_en', 'add-food-en', 'del-food-en')}
        ${guideSection('guide_en')}
      </div>
      <div class="ed-actions">
        <button id="editor-cancel">${esc(t('cancel'))}</button>
        <button id="editor-save">${esc(t('save'))}</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.classList.remove('hidden');

  modal.addEventListener('click', (e) => {
    const st = currentState();
    const add = (key, cls) => {
      if (e.target.classList.contains(cls)) { st[key].push(''); rebuild(); }
    };
    const del = (key, cls) => {
      if (e.target.classList.contains(cls)) {
        const i = Number(e.target.previousElementSibling.dataset.i);
        st[key].splice(i, 1);
        rebuild();
      }
    };
    del('attractions_zh', 'del-attr');
    del('attractions_en', 'del-attr-en');
    del('food_zh', 'del-food');
    del('food_en', 'del-food-en');
    add('attractions_zh', 'add-attr');
    add('attractions_en', 'add-attr-en');
    add('food_zh', 'add-food');
    add('food_en', 'add-food-en');
    if (e.target.classList.contains('add-guide-item')) {
      const di = Number(e.target.closest('.ed-guide-day').querySelector('.guide-title').dataset.di);
      const g = e.target.closest('.ed-guide-day').querySelector('.guide-title').dataset.g;
      st[`guide_${g}`][di].items.push('');
      rebuild();
    }
    if (e.target.classList.contains('del-guide-item')) {
      const inp = e.target.previousElementSibling;
      const { g, di, ii } = inp.dataset;
      st[`guide_${g}`][di].items.splice(Number(ii), 1);
      rebuild();
    }
  });

  modal.addEventListener('input', (e) => {
    if (!e.target.matches('input')) return;
    const st = currentState();
    const el = e.target;
    if (el.classList.contains('guide-title')) {
      const { g, di } = el.dataset;
      st[`guide_${g}`][Number(di)].title = el.value;
    } else if (el.dataset.ii !== undefined) {
      const { g, di, ii } = el.dataset;
      st[`guide_${g}`][Number(di)].items[Number(ii)] = el.value;
    } else if (el.dataset.key) {
      st[el.dataset.key][Number(el.dataset.i)] = el.value;
    }
  });

  modal.querySelector('#editor-cancel').addEventListener('click', () => closeEditor(modal));
  modal.querySelector('#editor-save').addEventListener('click', () => {
    const s = currentState();
    try {
      onSaveCb({
        attractions_zh: s.attractions_zh.filter((v) => v.trim() !== ''),
        attractions_en: s.attractions_en.filter((v) => v.trim() !== ''),
        food_zh: s.food_zh.filter((v) => v.trim() !== ''),
        food_en: s.food_en.filter((v) => v.trim() !== ''),
        guide_zh: cleanGuide(s.guide_zh),
        guide_en: cleanGuide(s.guide_en)
      });
      closeEditor(modal);
    } catch {
      alert(t('storageUnavailable'));
    }
  });
}

function edSection(key, addClass, delClass) {
  const label = key.startsWith('attractions') ? 'tabs.attractions' : 'tabs.food';
  const items = currentState()[key];
  return `<div class="ed-block"><h4>${esc(t(label))}</h4>${items.map((item, i) =>
    `<div class="attr-row"><input data-key="${key}" data-i="${i}" value="${escAttr(item)}" /><button class="${delClass}">${esc(t('removeItem'))}</button></div>`
  ).join('')}<button class="${addClass}">+ ${esc(t('addItem'))}</button></div>`;
}

function guideSection(key) {
  const g = key === 'guide_zh' ? 'zh' : 'en';
  return currentState()[key].map((d, di) =>
    `<div class="ed-guide-day"><h5>${esc(t('dayTitle'))} ${di + 1}</h5><input class="guide-title" data-g="${g}" data-di="${di}" value="${escAttr(d.title)}" /><div class="guide-items">${d.items.map((it, ii) =>
      `<div class="guide-item-row"><input data-g="${g}" data-di="${di}" data-ii="${ii}" value="${escAttr(it)}" /><button class="del-guide-item">${esc(t('removeItem'))}</button></div>`
    ).join('')}</div><button class="add-guide-item">+ ${esc(t('addItem'))}</button></div>`
  ).join('');
}

function rebuild() {
  const modal = document.getElementById('editor-modal');
  const s = window.__editorState;
  const cb = onSaveCb;
  const stub = {
    name_zh: s.name,
    attractions_zh: s.attractions_zh,
    attractions_en: s.attractions_en,
    food_zh: s.food_zh,
    food_en: s.food_en,
    guide_zh: s.guide_zh,
    guide_en: s.guide_en
  };
  closeEditor(modal);
  openEditor(s.cityId, stub, cb);
}

function closeEditor(modal) {
  modal.classList.add('hidden');
  modal.remove();
  window.__editorState = null;
  onSaveCb = null;
}
