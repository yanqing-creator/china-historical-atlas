import { PERIODS } from '../periods.js';

export function initTimeline(onChange) {
  const nav = document.getElementById('timeline');
  nav.innerHTML = '';
  for (const p of PERIODS) {
    const btn = document.createElement('button');
    btn.className = 'tl-btn';
    btn.dataset.period = p.id;
    btn.innerHTML = `<span class="cn">${p.zh}</span><span class="en">${p.en}</span>`;
    btn.addEventListener('click', () => onChange(p.id));
    nav.appendChild(btn);
  }
}

export function markActive(periodId) {
  document.querySelectorAll('.tl-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.period === periodId);
  });
}
