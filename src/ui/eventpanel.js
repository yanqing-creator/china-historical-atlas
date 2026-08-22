import { lang, t } from '../i18n.js';

let eventsCache = null;

export async function openEvent(id) {
  if (!eventsCache) eventsCache = await fetch('./content/events.json').then((r) => r.json());
  const e = eventsCache[id];
  const l = lang();
  const panel = document.getElementById('panel');
  panel.classList.remove('closed');
  panel.innerHTML = `<div class="panel-head">
      <button class="panel-close">×</button>
      <h2>${t('eventTitle')}</h2>
    </div>
    <div class="panel-body event-body">
      <h3>${e[`name_${l}`]}</h3>
      <p class="event-year">${t('yearLabel')}：${e[`year_${l}`]}</p>
      <p class="prose">${e[`desc_${l}`]}</p>
    </div>`;
  panel.querySelector('.panel-close').addEventListener('click', () => {
    panel.classList.add('closed');
    panel.innerHTML = '';
  });
}
