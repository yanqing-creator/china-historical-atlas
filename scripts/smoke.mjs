import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';

const server = spawn('npx', ['vite', 'preview', '--port', '4173', '--strictPort'], {
  cwd: process.cwd(), stdio: 'pipe'
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let browser;

try {
  await sleep(2500);
  browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
  await page.waitForSelector('.maplibregl-canvas', { timeout: 10000 });

  await page.click('[data-period="songliaojin"]');
  await page.waitForTimeout(1600);
  await page.click('.city-marker[data-city-id="kaifeng"]');
  await page.waitForSelector('#panel:not(.closed) .panel-tabs', { timeout: 5000 });
  const title = await page.textContent('#panel .panel-head h2');
  if (!title.includes('开封') && !title.includes('Kaifeng')) throw new Error('kaifeng panel title wrong: ' + title);

  await page.click('#lang-btn');
  await page.waitForTimeout(400);
  const bodyClass = await page.getAttribute('body', 'class');
  if (!bodyClass.includes('lang-en')) throw new Error('language toggle failed');

  await page.click('[data-period="yuanmingqing"]');
  await page.waitForTimeout(1600);
  await page.click('.city-marker[data-city-id="shanghai"]');
  await page.waitForSelector('#panel:not(.closed)', { timeout: 5000 });
  const guideTab = await page.textContent('.ptab[data-tab="guide"]');
  if (!guideTab.includes('Guide')) throw new Error('guide tab EN label missing');

  if (errors.length) throw new Error('page errors: ' + errors.join(' | '));
  console.log('SMOKE OK');
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
