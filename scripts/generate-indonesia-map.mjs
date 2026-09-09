import { readFile, writeFile } from 'node:fs/promises';

const input = process.argv[2];
if (!input) throw new Error('Usage: node scripts/generate-indonesia-map.mjs <natural-earth.geojson>');
const data = JSON.parse(await readFile(input, 'utf8'));
const feature = data.features.find(item => item.properties?.ISO_A3 === 'IDN' || item.properties?.ADMIN === 'Indonesia');
if (!feature) throw new Error('Indonesia geometry was not found.');
const polygons = feature.geometry.type === 'MultiPolygon' ? feature.geometry.coordinates : [feature.geometry.coordinates];
const project = ([longitude, latitude]) => [
  Math.round((longitude - 94.5) / (141.5 - 94.5) * 1000 * 10) / 10,
  Math.round((6.5 - latitude) / (6.5 - (-11.5)) * 520 * 10) / 10
];
const paths = polygons.flatMap(polygon => polygon.map(ring => {
  const points = ring.map(project).filter((point, index, all) => index === 0 || point[0] !== all[index - 1][0] || point[1] !== all[index - 1][1]);
  return points.map((point, index) => `${index ? 'L' : 'M'}${point[0]} ${point[1]}`).join('') + 'Z';
}));
const output = `// Generated from Natural Earth 1:10m Admin 0 Countries (public domain).\n// Do not edit manually; run scripts/generate-indonesia-map.mjs with the source GeoJSON.\nexport const INDONESIA_PATHS = ${JSON.stringify(paths)} as const;\n`;
await writeFile('src/lib/indonesia-map.ts', output);
console.log(`Generated ${paths.length} geographic rings.`);
