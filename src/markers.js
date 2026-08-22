import maplibregl from 'maplibre-gl';
import { map } from './main.js';

let citiesData = [];
let currentPeriodId = null;
let markers = [];

export async function loadMarkers() {
  const res = await fetch('./data/geo/cities.geojson');
  citiesData = (await res.json()).features;
}

export function refreshMarkers(periodId) {
  currentPeriodId = periodId;
  for (const m of markers) m.remove();
  markers = [];
  const visibleCityIds = [];
  for (const f of citiesData) {
    if (!f.properties.period.includes(periodId)) continue;
    visibleCityIds.push(f.properties.id);
    const el = document.createElement('div');
    el.className = 'city-marker';
    el.dataset.cityId = f.properties.id;
    el.innerHTML = `<span class="dot"></span><span class="label cn">${f.properties.name_zh}</span><span class="label en">${f.properties.name_en}</span>`;
    el.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('city-click', { detail: { id: f.properties.id } }));
    });
    const m = new maplibregl.Marker({ element: el, anchor: 'center' })
      .setLngLat(f.geometry.coordinates)
      .addTo(map);
    markers.push(m);
  }
  if (map.getLayer('city-dot')) {
    if (visibleCityIds.length) {
      map.setFilter('city-dot', ['in', ['get', 'id'], ['literal', visibleCityIds]]);
    } else {
      map.setFilter('city-dot', ['==', ['get', 'id'], '']);
    }
  }
}
