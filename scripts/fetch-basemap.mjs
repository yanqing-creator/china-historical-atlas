import fs from 'node:fs';
import path from 'node:path';
import { feature } from 'topojson-client';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const outDir = path.join(process.cwd(), 'public', 'data', 'basemap');
fs.mkdirSync(outDir, { recursive: true });

const write = (name, geojson) => {
  fs.writeFileSync(path.join(outDir, name), JSON.stringify(geojson));
  console.log('wrote', name, 'features:', geojson.features.length);
};

const landTopo = require('world-atlas/land-110m.json');
const countriesTopo = require('world-atlas/countries-110m.json');

write('land.geojson', feature(landTopo, landTopo.objects.land));
write('countries.geojson', feature(countriesTopo, countriesTopo.objects.countries));
