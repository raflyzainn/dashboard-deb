/**
 * Loads the Profil DEB of every campus from the action plan sheet "Rencana Aksi DEB SoBI Naik Kelas.xlsx" into campuses.program.
 * One row per campus, matched by the campus code (column B); the merged "Tim ..." rows give the PF team of the rows below them.
 * Keys the sheet does not carry (signatory, theme, programTitle, standard address ids) are kept as they are.
 * Usage: npx tsx scripts/pencairan/load-profil.ts            (dry run: matches and field counts only, no personal data printed)
 *        npx tsx scripts/pencairan/load-profil.ts --apply    (writes program json, bumps programRevision, writes one audit row per campus)
 * Source file: D:\deb (never copied into the repo). Secrets come from .env and are never printed.
 */
import PocketBase from 'pocketbase';
import * as XLSX from 'xlsx';
import { readFileSync } from 'node:fs';
import { loadEnv, requireEnv } from '../pocketbase/env';
import { writeAudit } from '../../src/lib/server/deb/audit';

const SOURCE = 'D:/deb/Rencana Aksi DEB SoBI Naik Kelas.xlsx';

/** Sheet column (0 based) to program key. Column E (per capita) is recomputed, column A is the row number. */
const COLUMNS: [number, string][] = [
  [2, 'income'], [3, 'beneficiaries'], [5, 'currentClass'], [6, 'targetClass'], [7, 'subholding'], [8, 'operatingUnit'],
  [9, 'mentor'], [10, 'coordinator'], [11, 'localHero'], [12, 'address'], [13, 'mapUrl'], [14, 'coordinates'], [15, 'existingEbt'],
  [16, 'socialMapping'], [17, 'conflict'], [18, 'ikm'], [19, 'institution'], [20, 'description'], [21, 'intervention'], [22, 'budget'],
  [23, 'landPermit'], [24, 'siteSurvey'], [25, 'actionPlanTemplate'], [26, 'province'], [27, 'interventionSummary'], [28, 'replicationVillage'], [29, 'sourceStatus']
];
const MONEY_KEYS = new Set(['income', 'budget']);
const NUMBER_KEYS = new Set(['beneficiaries']);

const norm = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]+/g, '');
const idDate = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });

/** Cell text with the invisible marks some phones paste (bidi isolates, no break spaces, non breaking hyphens) removed. */
function clean(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return idDate.format(value);
  const text = String(value).replace(/[\u202a-\u202e\u2066-\u2069]/g, '').replace(/\u00a0/g, ' ').replace(/\u2011/g, '-').replace(/\r/g, '').trim();
  if (!text || /^[-\u2013\u2014]+$/.test(text) || /^#(DIV\/0!|VALUE!|REF!|N\/A)$/.test(text)) return null;
  return text;
}

/** Whole Rupiah from 75000000, "Rp28.000.000", "Rp 51,860,000", "Rp65.347.000,00", "71.237.320" or "Rp. 75.000.000,". Text stays text. */
function money(value: unknown): number | string | null {
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? Math.round(value) : null;
  const text = clean(value);
  if (!text) return null;
  let s = text.replace(/^rp\.?\s*/i, '').replace(/[.,\s]+$/, '');
  if (/[^\d.,\s]/.test(s)) return text;
  s = s.replace(/[.,]\d{1,2}$/, '').replace(/\D/g, '');
  return s ? Number(s) : text;
}

function count(value: unknown): number | string | null {
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? Math.round(value) : null;
  const text = clean(value);
  if (!text) return null;
  return /^\d+([.,]0+)?$/.test(text) ? Number(text.replace(/[.,]0+$/, '')) : text;
}

interface Parsed { code: string; team: string | null; program: Record<string, unknown> }

function parseSheet(): Parsed[] {
  const wb = XLSX.read(readFileSync(SOURCE), { type: 'buffer', cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: null });
  const out: Parsed[] = [];
  let team: string | null = null;
  for (const row of rows.slice(1)) {
    const code = clean(row[1]);
    if (!code) { const t = clean(row[0]); if (t && !/^\d+(\.0)?$/.test(t)) team = t.replace(/^tim\s+/i, ''); continue; }
    const program: Record<string, unknown> = {};
    for (const [col, key] of COLUMNS) {
      const raw = row[col];
      program[key] = MONEY_KEYS.has(key) ? money(raw) : NUMBER_KEYS.has(key) ? count(raw) : clean(raw);
    }
    const income = program.income, people = program.beneficiaries;
    program.incomePerCapita = typeof income === 'number' && typeof people === 'number' && people > 0 ? Math.round(income / people) : null;
    program.pfTeam = team;
    out.push({ code, team, program });
  }
  return out;
}

async function main() {
  loadEnv();
  const apply = process.argv.includes('--apply');
  const env = requireEnv('PB_URL', 'PB_SUPERUSER_EMAIL', 'PB_SUPERUSER_PASSWORD');
  const pb = new PocketBase(new URL(env.PB_URL).origin);
  pb.autoCancellation(false);
  await pb.collection('_superusers').authWithPassword(env.PB_SUPERUSER_EMAIL, env.PB_SUPERUSER_PASSWORD);
  const campuses = await pb.collection('campuses').getFullList({ fields: 'id,name,code,acronym,initials,programRevision,program' });
  const byCode = new Map<string, typeof campuses[number]>();
  for (const c of campuses) for (const k of [c.code, c.acronym, c.initials]) if (k) byCode.set(norm(String(k)), c);
  const byName = new Map(campuses.map(c => [norm(c.name), c]));
  const parsed = parseSheet();
  const KEYS = [...COLUMNS.map(([, k]) => k), 'incomePerCapita', 'pfTeam'];
  let matched = 0, edited = 0;
  const unmatched: string[] = [];
  const matchedIds = new Set<string>();
  for (const p of parsed) {
    const campus = byCode.get(norm(p.code)) || byName.get(norm(p.code));
    if (!campus) { unmatched.push(p.code); continue; }
    matched++;
    matchedIds.add(campus.id);
    const filled = KEYS.filter(k => p.program[k] !== null && p.program[k] !== undefined).length;
    const revision = Number(campus.programRevision || 0);
    // Values an admin already changed in the app win over the sheet; the audit rows of the profile page say which keys those are.
    const kept = new Set<string>();
    if (revision > 0) {
      edited++;
      const rows = await pb.collection('audit').getFullList({ filter: pb.filter('context = {:c} && action = {:a}', { c: `kampus:${campus.id}/profil`, a: 'mengubah Profil DEB' }), fields: 'after' });
      for (const r of rows) for (const k of Object.keys((r.after && typeof r.after === 'object' ? r.after : {}) as object)) kept.add(k);
    }
    console.log(`${campus.code || campus.acronym}: ${campus.name} | team ${p.team || '-'} | ${filled}/${KEYS.length} fields | revision ${revision}${kept.size ? ` | kept from the app: ${[...kept].join(', ')}` : ''}`);
    if (!apply) continue;
    const before = (campus.program && typeof campus.program === 'object' ? campus.program : {}) as Record<string, unknown>;
    const fromSheet = Object.fromEntries(Object.entries(p.program).filter(([k]) => !kept.has(k)));
    const program = { ...before, ...fromSheet };
    const changed = KEYS.filter(k => (before[k] ?? null) !== (program[k] ?? null));
    if (!changed.length) continue;
    await pb.collection('campuses').update(campus.id, { program, programRevision: revision + 1 });
    await writeAudit(pb, {
      actor: { id: '', name: 'Sistem', email: '' }, action: 'memuat Profil DEB dari Rencana Aksi Naik Kelas', context: `kampus:${campus.id}/profil`,
      collection: 'campuses', record: campus.id, campus: campus.id,
      before: Object.fromEntries(changed.map(k => [k, before[k] ?? ''])), after: Object.fromEntries(changed.map(k => [k, program[k] ?? ''])), note: `${changed.length} isian`
    });
  }
  const missing = campuses.filter(c => !matchedIds.has(c.id)).map(c => c.code || c.acronym || c.name);
  console.log(`Sheet rows ${parsed.length}, matched ${matched}, unmatched rows: ${unmatched.join(', ') || 'none'}; campuses without a row: ${missing.join(', ') || 'none'}; campuses edited in the app before: ${edited}.`);
  if (!apply) console.log('Dry run. Add --apply to write.');
}

main().catch(e => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
