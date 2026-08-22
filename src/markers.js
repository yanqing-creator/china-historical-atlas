import maplibregl from 'maplibre-gl';
import { map } from './main.js';

let citiesData = [];
let eventsData = [];
let currentPeriodId = null;
let markers = [];

export async function loadMarkers() {
  try {
    const [cRes, eRes] = await Promise.all([
      fetch('./data/geo/cities.geojson'),
      fetch('./data/geo/events.geojson')
    ]);
    citiesData = (await cRes.json()).features;
    eventsData = (await eRes.json()).features;
    const content = await (await fetch('./content/events.json')).json();
    for (const f of eventsData) {
      f.properties.name_zh = content[f.properties.id].name_zh;
      f.properties.name_en = content[f.properties.id].name_en;
    }
  } catch (err) {
    console.error('Failed to load marker data:', err);
    citiesData = [];
    eventsData = [];
  }
}

function makeMarker(content, dataAttr, eventName, extraClass) {
  const el = document.createElement('div');
  el.className = extraClass;
  el.dataset[dataAttr] = content.properties.id;
  el.innerHTML = `<span class="dot"></span><span class="label cn">${content.properties.name_zh}</span><span class="label en">${content.properties.name_en}</span>`;
  el.addEventListener('click', () => {
    document.dispatchEvent(new CustomEvent(eventName, { detail: { id: content.properties.id } }));
  });
  return new maplibregl.Marker({ element: el, anchor: 'center' })
    .setLngLat(content.geometry.coordinates)
    .addTo(map);
}

export function refreshMarkers(periodId) {
  currentPeriodId = periodId;
  for (const m of markers) m.remove();
  markers = [];
  const visibleCityIds = [];
  for (const f of citiesData) {
    if (!f.properties.period.includes(periodId)) continue;
    visibleCityIds.push(f.properties.id);
    markers.push(makeMarker(f, 'cityId', 'city-click', 'city-marker'));
  }
  for (const f of eventsData) {
    if (f.properties.period !== periodId) continue;
    markers.push(makeMarker(f, 'eventId', 'event-click', 'event-marker'));
  }
  if (map.getLayer('city-dot')) {
    if (visibleCityIds.length) {
      map.setFilter('city-dot', ['in', ['get', 'id'], ['literal', visibleCityIds]]);
    } else {
      map.setFilter('city-dot', ['==', ['get', 'id'], '']);
    }
  }
}
