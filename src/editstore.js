const KEY = 'hmap-city-edits';

function readAll() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const data = JSON.parse(raw);
    return data && typeof data === 'object' ? data : {};
  } catch {
    return {};
  }
}

function writeAll(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function getOverrides(cityId) {
  const all = readAll();
  return all[cityId] || null;
}

export function hasEdit(cityId) {
  return !!getOverrides(cityId);
}

export function saveCity(cityId, data) {
  const all = readAll();
  all[cityId] = data;
  writeAll(all);
}

export function resetCity(cityId) {
  const all = readAll();
  if (all[cityId]) {
    delete all[cityId];
    writeAll(all);
  }
}

export function applyOverrides(content, cityId) {
  const overrides = getOverrides(cityId);
  if (!overrides) return { ...content };
  return { ...content, ...overrides };
}
