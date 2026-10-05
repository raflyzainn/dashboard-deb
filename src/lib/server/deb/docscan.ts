/**
 * Reads a Word file for two findings the reviewers repeat most in the review sheet:
 * a Termin 2 page left inside a Termin 1 letter, and yellow highlight left in the text.
 * The result is stored on the document version and shown as an automatic check; a person still decides.
 * Pure data: whether a Termin 2 mention is a finding depends on the document kind and is decided by the caller.
 * Runs on the edge: pizzip only, no Node APIs.
 */
import PizZip from 'pizzip';

export interface DocScan {
  /** Text fragments around every mention of Termin 2, empty when none. */
  termin2Hits: string[];
  /** Number of highlighted runs left in the document. */
  highlight: number;
  /** Rough word count, for the panel. */
  words: number;
  scannedAt: string;
}

const MAX_HITS = 10;
const FRAGMENT = 120;
/** "Termin 2", "Termin-2", "TERMIN II", "termin kedua"; a hyphen or space between is common in the campus files. */
const TERMIN2 = /\btermin[\s-]*(?:2|ii|dua|kedua)\b/i;
const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

/** Decodes the few entities Word writes inside w:t. */
function decode(text: string) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, body: string) => {
    if (body[0] === '#') {
      const code = body[1] === 'x' || body[1] === 'X' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
    }
    return ENTITIES[body.toLowerCase()] ?? whole;
  });
}

/** The text of every paragraph in one part: w:t joined, w:tab and line breaks as spaces. */
export function paragraphsOf(xml: string): string[] {
  const out: string[] = [];
  const body = xml.replace(/<w:p\b[^>]*\/>/g, '');
  const para = /<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g;
  const piece = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<w:tab\s*\/>|<w:br\b[^>]*\/>|<w:cr\s*\/>/g;
  let p: RegExpExecArray | null;
  while ((p = para.exec(body))) {
    let text = '';
    let m: RegExpExecArray | null;
    piece.lastIndex = 0;
    while ((m = piece.exec(p[1]))) text += m[1] !== undefined ? decode(m[1]) : ' ';
    const clean = text.replace(/\s+/g, ' ').trim();
    if (clean) out.push(clean);
  }
  return out;
}

/** Highlighted runs: w:highlight with a colour, and w:shd filled yellow. */
export function highlightCount(xml: string) {
  let count = 0;
  for (const tag of xml.match(/<w:highlight\b[^>]*>/g) || []) {
    const val = /w:val="([^"]*)"/.exec(tag)?.[1] || '';
    if (val && val.toLowerCase() !== 'none') count++;
  }
  for (const tag of xml.match(/<w:shd\b[^>]*>/g) || []) {
    const fill = (/w:fill="([^"]*)"/.exec(tag)?.[1] || '').toUpperCase();
    if (fill === 'FFFF00' || fill === 'YELLOW') count++;
  }
  return count;
}

/** A fragment of at most FRAGMENT characters around the first Termin 2 mention in a paragraph, or null. */
function fragmentOf(paragraph: string): string | null {
  const m = TERMIN2.exec(paragraph);
  if (!m) return null;
  if (paragraph.length <= FRAGMENT) return paragraph;
  const start = Math.max(0, Math.min(m.index - Math.floor((FRAGMENT - m[0].length) / 2), paragraph.length - FRAGMENT));
  return paragraph.slice(start, start + FRAGMENT).trim();
}

/** Reads a .docx: body, headers and footers. Returns null only when the bytes are not a Word package. */
export async function scanDocx(bytes: ArrayBuffer | Uint8Array): Promise<DocScan | null> {
  let zip: PizZip;
  try { zip = new PizZip(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)); } catch { return null; }
  const document = zip.file('word/document.xml');
  if (!document) return null;
  const bodyXml = document.asText();
  const partsXml = [bodyXml, ...zip.file(/^word\/(header|footer)\d*\.xml$/).map(f => f.asText())];
  const termin2Hits: string[] = [];
  let highlight = 0;
  let words = 0;
  partsXml.forEach((xml, i) => {
    const paragraphs = paragraphsOf(xml);
    if (i === 0) words = paragraphs.reduce((n, p) => n + p.split(' ').length, 0);
    highlight += highlightCount(xml);
    for (const paragraph of paragraphs) {
      if (termin2Hits.length >= MAX_HITS) break;
      const fragment = fragmentOf(paragraph);
      if (fragment) termin2Hits.push(fragment);
    }
  });
  return { termin2Hits, highlight, words, scannedAt: new Date().toISOString() };
}
