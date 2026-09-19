/**
 * Compares a campus specific PKS template with the standard one, paragraph by paragraph, the same way the 19 campus drafts were
 * analysed: placeholders masked, digits and punctuation dropped, a Dice similarity on character bigrams below 0.97 counts as changed,
 * grouped by lampiran and pasal heading. The custom template must keep the placeholders; a filled draft would show every field
 * paragraph as changed. Pure TypeScript, usable on the server and in scripts.
 */
import PizZip from 'pizzip';
import { templateTags } from './merge';

export interface Differences { changed: number; added: number; pasal: { name: string; section: string; changed: number; added: number }[]; missingTags: string[] }

/** The pasal headings of Lampiran 1 (11, including K3L) and Lampiran 2 (12), as written in the standard template. */
export const HEADINGS = [
  'DEFINISI', 'KORESPONDENSI', 'KERAHASIAAN DAN JAMINAN', 'HAK ATAS KEKAYAAN INTELEKTUAL (HKI)', 'KESELAMATAN, KESEHATAN KERJA DAN LINGKUNGAN (K3L)', 'ADENDUM', 'FORCE MAJEURE / KEADAAAN KAHAR',
  'SANKSI', 'PENYELESAIAN PERSELISIHAN', 'HUKUM YANG BERLAKU', 'ETIKA KERJA SAMA',
  'MAKSUD DAN TUJUAN', 'OBJEK DAN RUANG LINGKUP', 'BANTUAN DANA', 'JANGKA WAKTU', 'TATA CARA PENYERAHAN BANTUAN DANA', 'PELAPORAN', 'HAK DAN KEWAJIBAN',
  'LUARAN DARI PELAKSANAAN PROGRAM', 'LARANGAN DAN SANKSI', 'PENGAKHIRAN PERJANJIAN', 'PERPAJAKAN', 'PERWAKILAN PARA PIHAK'
];
const titleCase = (value: string) => value.toLowerCase().replace(/(^|[\s(/])([a-z])/g, (_, before: string, letter: string) => before + letter.toUpperCase()).replace(/\(hki\)/i, '(HKI)').replace(/\(k3l\)/i, '(K3L)');

interface Para { n: string; section: string; head: string }

/** Paragraph texts of a docx body, in order. */
export function paragraphs(bytes: Uint8Array | ArrayBuffer): string[] {
  const xml = new PizZip(bytes).files['word/document.xml']?.asText() || '';
  const out: string[] = [];
  for (const match of xml.matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)) {
    const text = match[0].replace(/<w:tab\/>/g, ' ').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (text) out.push(text);
  }
  return out;
}
const normalize = (line: string) => line.replace(/\{[A-Za-z0-9]+\}/g, ' ').replace(/\[\[.*?\]\]/g, ' ').replace(/[\d.,/-]+/g, ' ').replace(/[^A-Za-z ]+/g, ' ').toLowerCase().replace(/\s+/g, ' ').trim();

/** Long paragraphs grouped by lampiran and pasal heading. */
function items(lines: string[]): Para[] {
  const out: Para[] = [];
  let section = 'Perjanjian', head = 'Perjanjian';
  for (const line of lines) {
    const upper = line.toUpperCase().trim();
    if (upper === 'LAMPIRAN 1' || upper === 'LAMPIRAN 2') { section = upper === 'LAMPIRAN 1' ? 'Lampiran 1' : 'Lampiran 2'; head = section; continue; }
    if (section !== 'Perjanjian') {
      const heading = HEADINGS.find(h => upper === h || upper.startsWith(h + ' '));
      if (heading) { head = titleCase(heading); continue; }
    }
    const n = normalize(line);
    if (n.length > 60) out.push({ n, section, head });
  }
  return out;
}
function bigrams(text: string) {
  const map = new Map<string, number>();
  for (let i = 0; i < text.length - 1; i++) { const key = text.slice(i, i + 2); map.set(key, (map.get(key) || 0) + 1); }
  return { map, size: Math.max(0, text.length - 1) };
}
type Grams = ReturnType<typeof bigrams>;
/** Dice coefficient on character bigrams, 0 to 1. */
function similarity(a: Grams, b: Grams) {
  if (!a.size || !b.size) return 0;
  let shared = 0;
  for (const [key, count] of a.map) { const other = b.map.get(key); if (other) shared += Math.min(count, other); }
  return (2 * shared) / (a.size + b.size);
}
const best = (one: Grams, against: Grams[]) => against.reduce((top, g) => Math.max(top, similarity(one, g)), 0);

export function compareTemplates(standard: Uint8Array | ArrayBuffer, custom: Uint8Array | ArrayBuffer): Differences {
  const base = items(paragraphs(standard)), other = items(paragraphs(custom));
  const baseSet = new Set(base.map(p => p.n)), otherSet = new Set(other.map(p => p.n));
  const baseGrams = base.map(p => bigrams(p.n)), otherGrams = other.map(p => bigrams(p.n));
  const pasal = new Map<string, { name: string; section: string; changed: number; added: number }>();
  const bucket = (p: Para) => { const key = p.section + '|' + p.head; if (!pasal.has(key)) pasal.set(key, { name: p.head, section: p.section, changed: 0, added: 0 }); return pasal.get(key)!; };
  let changed = 0, added = 0;
  // Each changed standard paragraph is paired with its closest custom paragraph; custom paragraphs left unpaired are new text.
  const paired = new Set<number>();
  base.forEach((p, i) => {
    if (otherSet.has(p.n)) return;
    let top = 0, candidate = 0, at = -1;
    otherGrams.forEach((g, j) => {
      const score = similarity(baseGrams[i], g);
      if (score > top) top = score;
      if (!baseSet.has(other[j].n) && score > candidate) { candidate = score; at = j; }
    });
    if (top >= 0.97) return;
    changed++; bucket(p).changed++;
    if (at >= 0) paired.add(at);
  });
  other.forEach((p, j) => { if (baseSet.has(p.n) || paired.has(j)) return; if (best(otherGrams[j], baseGrams) < 0.97) { added++; bucket(p).added++; } });
  const customTags = new Set(templateTags(custom));
  return { changed, added, pasal: Array.from(pasal.values()), missingTags: templateTags(standard).filter(tag => !customTags.has(tag)) };
}
