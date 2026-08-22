const KEY = 'hmap-llm-config';

export function getLLMConfig() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const cfg = JSON.parse(raw);
    if (!cfg.apiKey || !cfg.baseUrl || !cfg.model) return null;
    return cfg;
  } catch {
    return null;
  }
}

export function initSettings() {
  const modal = document.getElementById('settings-modal');
  const btn = document.getElementById('settings-btn');
  const saved = getLLMConfig();
  btn.addEventListener('click', () => {
    modal.classList.toggle('hidden');
    if (!modal.classList.contains('hidden')) {
      modal.innerHTML = `
        <h3 class="cn">设置</h3><h3 class="en">Settings</h3>
        <label>API Key</label>
        <input id="cfg-key" type="password" placeholder="sk-..." value="${saved ? saved.apiKey : ''}" />
        <label>Base URL</label>
        <input id="cfg-base" type="text" placeholder="https://api.openai.com/v1" value="${saved ? saved.baseUrl : 'https://api.openai.com/v1'}" />
        <label>Model</label>
        <input id="cfg-model" type="text" placeholder="gpt-4o-mini" value="${saved ? saved.model : 'gpt-4o-mini'}" />
        <div class="cfg-actions">
          <button id="cfg-save">保存</button>
          <button id="cfg-close">关闭</button>
        </div>`;
      modal.querySelector('#cfg-save').addEventListener('click', () => {
        const cfg = {
          apiKey: modal.querySelector('#cfg-key').value.trim(),
          baseUrl: modal.querySelector('#cfg-base').value.trim(),
          model: modal.querySelector('#cfg-model').value.trim()
        };
        if (cfg.apiKey && cfg.baseUrl && cfg.model) localStorage.setItem(KEY, JSON.stringify(cfg));
        modal.classList.add('hidden');
        document.dispatchEvent(new CustomEvent('llm-config-change'));
      });
      modal.querySelector('#cfg-close').addEventListener('click', () => modal.classList.add('hidden'));
    }
  });
}
