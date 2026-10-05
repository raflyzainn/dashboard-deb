/**
 * Opens every template in static/templat with docxtemplater, lists its placeholders and renders it once with sample values,
 * so a broken template is caught before the app uses it. Run from the repo root:  node scripts/templat/check.mjs
 * Sample values are labels only, never real campus data. The rendered files go to the system temp folder.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

const dir = path.resolve('static/templat');
/** Placeholders used by a template: the text of the body, headers and footers without XML tags, so a tag split over runs still counts. */
function templateTags(zip) {
  const found = new Set();
  for (const name of Object.keys(zip.files)) {
    if (!/^word\/(document|header\d*|footer\d*)\.xml$/.test(name)) continue;
    const text = zip.files[name].asText().replace(/<[^>]+>/g, '');
    for (const m of text.matchAll(/\{([A-Za-z0-9]+)\}/g)) found.add(m[1]);
  }
  return Array.from(found).sort();
}
const out = path.join(tmpdir(), 'deb-templat-check');
mkdirSync(out, { recursive: true });
let failed = false;
for (const name of ['pks-standar.docx', 'permohonan.docx', 'invois.docx', 'kuitansi.docx']) {
  try {
    const zip = new PizZip(readFileSync(path.join(dir, name)));
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true, nullGetter: () => '' });
    const tags = templateTags(zip);
    const data = Object.fromEntries(tags.map(tag => [tag, `«${tag}»`]));
    doc.render(data);
    const bytes = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });
    writeFileSync(path.join(out, name), bytes);
    const text = doc.getFullText();
    const left = text.match(/\{[A-Za-z0-9]+\}/g) || [];
    console.log(`${name}: ${tags.length} placeholders, rendered ${bytes.length} bytes${left.length ? ', UNRENDERED ' + left.join(' ') : ''}`);
    console.log('  ' + tags.join(' '));
    if (left.length) failed = true;
  } catch (error) {
    failed = true;
    const details = error?.properties?.errors?.map(e => `${e.properties?.explanation || e.message}`) || [error.message];
    console.log(`${name}: FAILED\n  ` + details.join('\n  '));
  }
}
console.log(failed ? 'Some templates failed.' : `All templates open and render. Samples in ${out}`);
process.exitCode = failed ? 1 : 0;
