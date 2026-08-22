import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './styles.css';
import { PALETTE, buildStyle } from './style.js';

const map = new maplibregl.Map({
  container: 'map',
  style: buildStyle(),
  center: [110, 36],
  zoom: 3.4,
  minZoom: 2.5,
  maxZoom: 10,
  attributionControl: false
});

map.on('load', () => {
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
});

window.__hm = { map };

export { map };
