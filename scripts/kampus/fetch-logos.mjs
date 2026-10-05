/**
 * Fetches the logo of every partner campus from the infobox of its Wikipedia article (Indonesian first, then English)
 * into static/logo-kampus/<slug>.<ext> and prints one line per campus. Review the images before shipping them:
 * an infobox may carry a photo instead of a logo. Then run scripts/kampus/logos.py to normalise them to 256px PNG.
 * Usage: node scripts/kampus/fetch-logos.mjs [CODE ...]
 */
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';

const OUT = 'static/logo-kampus';
const UA = 'DashboardDEB/1.0 (Pertamina Foundation partner directory)';
/** Campus code to Wikipedia article title, or a search query when the title is uncertain. */
const CAMPUSES = {
  UNS: 'Universitas Sebelas Maret', UIR: 'Universitas Islam Riau', USB: 'Universitas Sunan Bonang', UNDIP: 'Universitas Diponegoro',
  UB: 'Universitas Brawijaya', UNY: 'Universitas Negeri Yogyakarta', IPB: 'Institut Pertanian Bogor', ITS: 'Institut Teknologi Sepuluh Nopember',
  'STAI TUNTAS': { search: 'STAI Tuanku Tambusai Pasir Pengaraian' }, 'STT MIGAS': { search: 'Sekolah Tinggi Teknologi Migas Balikpapan' },
  PNK: 'Politeknik Negeri Kupang', USK: 'Universitas Syiah Kuala', UGM: 'Universitas Gadjah Mada', UNAIR: 'Universitas Airlangga',
  ITB: 'Institut Teknologi Bandung', UNHAS: 'Universitas Hasanuddin', ITERA: 'Institut Teknologi Sumatera', UNRI: 'Universitas Riau',
  UNPATTI: 'Universitas Pattimura', UNIPA: 'Universitas Papua', UNMUL: 'Universitas Mulawarman', IVET: 'Universitas Ivet',
  UNIROW: 'Universitas PGRI Ronggolawe', 'PKP Sorong': 'Politeknik Kelautan dan Perikanan Sorong', UNWIR: 'Universitas Wiralodra',
  UPER: 'Universitas Pertamina', UPP: 'Universitas Pasir Pengaraian', 'STAI SIAK': { search: 'STAI Sulthan Syarif Hasyim Siak' },
  UNSRI: 'Universitas Sriwijaya', UNUD: 'Universitas Udayana', PNC: 'Politeknik Negeri Cilacap', UNTIRTA: 'Universitas Sultan Ageng Tirtayasa',
  UNSIKA: 'Universitas Singaperbangsa Karawang', ITK: 'Institut Teknologi Kalimantan', UNCEN: 'Universitas Cenderawasih',
  ITPB: { search: 'Institut Teknologi Petroleum Balongan' }, UI: 'Universitas Indonesia', USU: 'Universitas Sumatera Utara',
  UBT: 'Universitas Borneo Tarakan', POLINEF: 'Politeknik Negeri Fakfak'
};
export const slug = code => code.toLowerCase().replace(/[^a-z0-9]+/g, '-');

const sleep = ms => new Promise(r => setTimeout(r, ms));
/** One call at a time, a pause between calls, and a longer pause when the API asks us to slow down. */
async function api(lang, params) {
  const url = `https://${lang}.wikipedia.org/w/api.php?` + new URLSearchParams({ format: 'json', formatversion: '2', ...params });
  for (let attempt = 0; ; attempt++) {
    await sleep(1200);
    const r = await fetch(url, { headers: { 'User-Agent': UA } });
    if (r.status === 429 && attempt < 5) { await sleep(Number(r.headers.get('retry-after') || 10) * 1000); continue; }
    if (!r.ok) throw new Error(`${lang} ${r.status}`);
    return r.json();
  }
}
const INSTITUTION = /universitas|institut|politeknik|sekolah tinggi|stai|stt|akademi|university|institute|polytechnic|college/i;

/** The infobox image parameter of an article, in the order a logo is most likely to sit. */
function infoboxFile(wikitext) {
  for (const key of ['logo', 'lambang', 'seal', 'logo_image', 'image_logo', 'image', 'gambar', 'image_name']) {
    const m = wikitext.match(new RegExp(`^\\s*\\|\\s*${key}\\s*=\\s*(.+)$`, 'mi'));
    if (!m) continue;
    let v = m[1].trim().replace(/<!--.*?-->/g, '').trim();
    v = v.replace(/^\[\[\s*(?:Berkas|File|Image)\s*:\s*/i, '').split('|')[0].split(']]')[0].trim();
    v = v.replace(/^(?:Berkas|File|Image)\s*:\s*/i, '');
    if (v && /\.(png|jpe?g|svg|gif|webp)$/i.test(v)) return v;
  }
  return null;
}

async function resolve(lang, title) {
  const parsed = await api(lang, { action: 'parse', page: title, prop: 'wikitext', redirects: '1' });
  if (parsed.error) return null;
  const file = infoboxFile(parsed.parse.wikitext);
  if (!file) return { page: parsed.parse.title, file: null };
  const info = await api(lang, { action: 'query', titles: `File:${file}`, prop: 'imageinfo', iiprop: 'url|mime', iiurlwidth: '512' });
  const ii = info.query?.pages?.[0]?.imageinfo?.[0];
  if (!ii) return { page: parsed.parse.title, file, url: null };
  return { page: parsed.parse.title, file, url: ii.thumburl || ii.url, mime: ii.thumbmime || ii.mime };
}

async function find(lang, spec) {
  if (typeof spec === 'string') {
    const hit = await resolve(lang, spec);
    if (hit?.url) return hit;
  }
  const q = typeof spec === 'string' ? spec : spec.search;
  const s = await api(lang, { action: 'query', list: 'search', srsearch: q, srlimit: '3' });
  for (const r of (s.query?.search || []).filter(r => INSTITUTION.test(r.title))) {
    const hit = await resolve(lang, r.title);
    if (hit?.url) return hit;
  }
  return null;
}

mkdirSync(OUT, { recursive: true });
const only = process.argv.slice(2);
const results = [];
for (const [code, spec] of Object.entries(CAMPUSES)) {
  if (only.length && !only.includes(code)) continue;
  if (!only.length && ['png', 'jpg', 'svg', 'gif'].some(ext => existsSync(`${OUT}/${slug(code)}.${ext}`))) { results.push(`${code}: kept`); continue; }
  let hit = null, lang = 'id';
  try { hit = await find('id', spec); if (!hit) { lang = 'en'; hit = await find('en', spec); } } catch (e) { results.push(`${code}: error ${e.message}`); continue; }
  if (!hit) { results.push(`${code}: no logo found`); continue; }
  const r = await fetch(hit.url, { headers: { 'User-Agent': UA } });
  const ext = (hit.mime || '').includes('png') ? 'png' : (hit.mime || '').includes('jpeg') ? 'jpg' : (hit.mime || '').includes('svg') ? 'svg' : (hit.mime || '').includes('gif') ? 'gif' : 'bin';
  const path = `${OUT}/${slug(code)}.${ext}`;
  writeFileSync(path, Buffer.from(await r.arrayBuffer()));
  results.push(`${code}: ${lang} "${hit.page}" ${hit.file} -> ${path}`);
}
console.log(results.join('\n'));
