import fs from 'node:fs';

const read = (p) => JSON.parse(fs.readFileSync(new URL(p, import.meta.url), 'utf-8'));
const CITY_IDS = read('../public/data/geo/cities.geojson').features.map((f) => f.properties.id);
const EVENT_IDS = read('../public/data/geo/events.geojson').features.map((f) => f.properties.id);
const VALID_PERIODS = ['qinhan', 'sanguo', 'suitang', 'songliaojin', 'yuanmingqing'];

const cities = read('../public/content/cities.json');
const events = read('../public/content/events.json');

const errors = [];
const nonEmpty = (v) => typeof v === 'string' && v.trim().length > 0;
const nonEmptyList = (v) => Array.isArray(v) && v.length > 0 && v.every((x) => typeof x === 'string' && x.trim().length > 0);

for (const id of CITY_IDS) {
  if (!cities[id]) { errors.push(`cities.json missing key: ${id}`); continue; }
  const c = cities[id];
  for (const k of ['name_zh', 'name_en', 'tagline_zh', 'tagline_en', 'history_zh', 'history_en', 'geography_zh', 'geography_en', 'climate_zh', 'climate_en']) {
    if (!nonEmpty(c[k])) errors.push(`cities.${id}.${k} empty`);
  }
  for (const k of ['attractions_zh', 'attractions_en', 'food_zh', 'food_en']) {
    if (!nonEmptyList(c[k])) errors.push(`cities.${id}.${k} empty list`);
  }
  for (const g of ['guide_zh', 'guide_en']) {
    if (!Array.isArray(c[g]) || c[g].length !== 3) { errors.push(`cities.${id}.${g} must have exactly 3 days`); continue; }
    c[g].forEach((d, i) => {
      if (!nonEmpty(d.day) || !nonEmpty(d.title) || !nonEmptyList(d.items)) {
        errors.push(`cities.${id}.${g}[${i}] incomplete`);
      }
    });
  }
}
for (const id of Object.keys(cities)) {
  if (!CITY_IDS.includes(id)) errors.push(`cities.json has unknown id: ${id}`);
}

for (const id of EVENT_IDS) {
  if (!events[id]) { errors.push(`events.json missing key: ${id}`); continue; }
  const e = events[id];
  for (const k of ['name_zh', 'name_en', 'year_zh', 'year_en', 'desc_zh', 'desc_en']) {
    if (!nonEmpty(e[k])) errors.push(`events.${id}.${k} empty`);
  }
}
for (const id of Object.keys(events)) {
  if (!EVENT_IDS.includes(id)) errors.push(`events.json has unknown id: ${id}`);
}

for (const f of read('../public/data/geo/cities.geojson').features) {
  if (!VALID_PERIODS.some((p) => f.properties.period.includes(p))) errors.push(`city ${f.properties.id} has invalid period`);
  for (const p of f.properties.period) {
    if (!f.properties.ancient[p]) errors.push(`city ${f.properties.id} missing ancient name for period ${p}`);
  }
}
for (const f of read('../public/data/geo/events.geojson').features) {
  if (!VALID_PERIODS.includes(f.properties.period)) errors.push(`event ${f.properties.id} has invalid period`);
}

if (errors.length) {
  console.log(`VALIDATION FAILED — ${errors.length} issues`);
  for (const e of errors) console.log(' - ' + e);
  process.exit(1);
}
console.log(`VALIDATION OK — ${CITY_IDS.length} cities, ${EVENT_IDS.length} events`);
