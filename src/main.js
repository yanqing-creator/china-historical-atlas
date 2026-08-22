import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './styles.css';
import { PALETTE, buildStyle } from './style.js';
import { PERIODS, ALL_BORDER_IDS, borderIdsByPeriod, periodById } from './periods.js';
import { initTimeline, markActive } from './ui/timeline.js';
import { loadMarkers, refreshMarkers } from './markers.js';

const map = new maplibregl.Map({
  container: 'map',
  style: buildStyle(),
  center: [110, 36],
  zoom: 3.4,
  minZoom: 2.5,
  maxZoom: 10,
  attributionControl: false
});

let currentPeriod = PERIODS[0].id;

function applyPeriodVisibility(periodId) {
  const visible = new Set(borderIdsByPeriod(periodId));
  for (const id of ALL_BORDER_IDS) {
    const on = visible.has(id) ? 'visible' : 'none';
    if (map.getLayer(`border-fill-${id}`)) map.setLayoutProperty(`border-fill-${id}`, 'visibility', on);
    if (map.getLayer(`border-line-${id}`)) map.setLayoutProperty(`border-line-${id}`, 'visibility', on);
  }
}

export function setPeriod(periodId) {
  currentPeriod = periodId;
  const p = periodById(periodId);
  applyPeriodVisibility(periodId);
  const lineVis = (layerId, periods) => {
    const vis = periods.includes(periodId) ? 'visible' : 'none';
    if (map.getLayer(layerId)) map.setLayoutProperty(layerId, 'visibility', vis);
  };
  lineVis('wall-qinhan-line', ['qinhan']);
  lineVis('wall-ming-line', ['yuanmingqing']);
  lineVis('canal-suitang-line', ['suitang']);
  lineVis('canal-jinghang-line', ['yuanmingqing']);
  lineVis('silk-land-line', ['qinhan', 'suitang', 'songliaojin', 'yuanmingqing']);
  lineVis('silk-sea-line', ['songliaojin', 'yuanmingqing']);
  refreshMarkers(periodId);
  markActive(periodId);
  const el = document.getElementById('map');
  el.classList.add('period-fading');
  setTimeout(() => el.classList.remove('period-fading'), 350);
  map.flyTo({ center: p.center, zoom: p.zoom, duration: 1200 });
  window.currentPeriod = periodId;
}

map.on('load', async () => {
  map.addSource('land', { type: 'geojson', data: './data/basemap/land.geojson' });
  map.addSource('countries', { type: 'geojson', data: './data/basemap/countries.geojson' });
  map.addSource('rivers', { type: 'geojson', data: './data/geo/rivers.geojson' });
  map.addSource('lakes', { type: 'geojson', data: './data/geo/lakes.geojson' });

  map.addLayer({ id: 'land-fill', type: 'fill', source: 'land',
    paint: { 'fill-color': PALETTE.land } });
  map.addLayer({ id: 'land-edge', type: 'line', source: 'land',
    paint: { 'line-color': PALETTE.landEdge, 'line-width': 1.2 } });
  map.addLayer({ id: 'country-line', type: 'line', source: 'countries',
    paint: { 'line-color': PALETTE.countryLine, 'line-width': 0.6, 'line-dasharray': [2, 2] } });
  map.addLayer({ id: 'lake-fill', type: 'fill', source: 'lakes',
    paint: { 'fill-color': PALETTE.lake } });
  map.addLayer({ id: 'lake-edge', type: 'line', source: 'lakes',
    paint: { 'line-color': PALETTE.river, 'line-width': 0.7 } });
  map.addLayer({ id: 'river-line', type: 'line', source: 'rivers',
    paint: { 'line-color': PALETTE.river, 'line-width': ['match', ['get', 'kind'], 'major', 1.4, 0.8] } });

  map.addSource('borders', { type: 'geojson', data: './data/geo/borders.geojson' });
  for (const id of ALL_BORDER_IDS) {
    map.addLayer({
      id: `border-fill-${id}`, type: 'fill', source: 'borders',
      filter: ['==', ['get', 'id'], id],
      paint: { 'fill-color': ['coalesce', ['get', 'color'], '#9c4a3a'], 'fill-opacity': 0.16 }
    });
    map.addLayer({
      id: `border-line-${id}`, type: 'line', source: 'borders',
      filter: ['==', ['get', 'id'], id],
      paint: { 'line-color': PALETTE.borderLine, 'line-width': 1.6, 'line-opacity': 0.85 }
    });
  }

  map.addSource('wall', { type: 'geojson', data: './data/geo/wall.geojson' });
  map.addSource('canal', { type: 'geojson', data: './data/geo/canal.geojson' });
  map.addSource('silkroad', { type: 'geojson', data: './data/geo/silkroad.geojson' });
  map.addSource('cities', { type: 'geojson', data: './data/geo/cities.geojson' });

  map.addLayer({ id: 'city-dot', type: 'circle', source: 'cities',
    paint: { 'circle-radius': 4, 'circle-color': '#4a3b2a', 'circle-stroke-color': '#f3e9d2', 'circle-stroke-width': 1.5 } });
  map.addLayer({ id: 'wall-qinhan-line', type: 'line', source: 'wall',
    filter: ['==', ['get', 'id'], 'wall-qinhan'],
    paint: { 'line-color': PALETTE.wall, 'line-width': 2.2, 'line-dasharray': [4, 2, 1, 2] } });
  map.addLayer({ id: 'wall-ming-line', type: 'line', source: 'wall',
    filter: ['==', ['get', 'id'], 'wall-ming'],
    paint: { 'line-color': PALETTE.wall, 'line-width': 2.2, 'line-dasharray': [4, 2, 1, 2] } });
  map.addLayer({ id: 'canal-suitang-line', type: 'line', source: 'canal',
    filter: ['==', ['get', 'id'], 'canal-suitang'],
    paint: { 'line-color': PALETTE.canal, 'line-width': 1.8, 'line-dasharray': [2, 2] } });
  map.addLayer({ id: 'canal-jinghang-line', type: 'line', source: 'canal',
    filter: ['==', ['get', 'id'], 'canal-jinghang'],
    paint: { 'line-color': PALETTE.canal, 'line-width': 1.8, 'line-dasharray': [2, 2] } });
  map.addLayer({ id: 'silk-land-line', type: 'line', source: 'silkroad',
    filter: ['==', ['get', 'id'], 'silk-land'],
    paint: { 'line-color': PALETTE.silkLand, 'line-width': 1.6, 'line-dasharray': [6, 3] } });
  map.addLayer({ id: 'silk-sea-line', type: 'line', source: 'silkroad',
    filter: ['==', ['get', 'id'], 'silk-sea'],
    paint: { 'line-color': PALETTE.silkSea, 'line-width': 1.6, 'line-dasharray': [2, 4] } });

  initTimeline((id) => setPeriod(id));
  await loadMarkers();
  setPeriod(PERIODS[0].id);
});

window.__hm = { map, setPeriod };

export { map, currentPeriod };

import { setLang } from './i18n.js';
import { openCity } from './ui/panel.js';
import { openEvent } from './ui/eventpanel.js';

window.currentPeriod = currentPeriod;
document.getElementById('lang-btn').addEventListener('click', () => {
  setLang(document.body.classList.contains('lang-en') ? 'zh' : 'en');
});
document.addEventListener('city-click', (e) => openCity(e.detail.id));
document.addEventListener('event-click', (e) => openEvent(e.detail.id));
