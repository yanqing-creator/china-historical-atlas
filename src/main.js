import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import './styles.css';
import { buildStyle } from './style.js';

const map = new maplibregl.Map({
  container: 'map',
  style: buildStyle(),
  center: [110, 36],
  zoom: 3.4,
  minZoom: 2.5,
  maxZoom: 10,
  attributionControl: false
});

window.__hm = { map };

export { map };
