/** Debug: parses one sheet of one workbook with the grid parser and prints the tree's levels and totals. Usage: npx tsx scripts/templat/rab-grid-debug.ts <xlsx> <sheet> */
import * as XLSX from 'xlsx';
import { readFileSync } from 'node:fs';
import { parseGridSheet } from '../../src/lib/server/deb/rab-grid';
import { arrange, totalsOf, MAX_LEVEL } from '../../src/lib/rab';

const [path, sheetName] = process.argv.slice(2);
const book = XLSX.read(new Uint8Array(readFileSync(path)), { type: 'array' });
const rows = XLSX.utils.sheet_to_json<unknown[]>(book.Sheets[sheetName], { header: 1, raw: true, defval: null });
const grid = parseGridSheet(rows);
const nodes = arrange(grid.lines);
const byLevel = [1, 2, 3, 4].map(l => nodes.filter(n => n.level === l).length);
console.log('items', grid.items, 'lines', grid.lines.length, 'by level', byLevel.join('/'), 'totals', totalsOf(nodes), 'problems', grid.problems.length);
const itemSum = nodes.filter(n => n.level === MAX_LEVEL).reduce((s, n) => s + n.amountSen, 0);
console.log('sum of level 4 amounts', itemSum / 100);
for (const n of nodes.slice(0, 14)) console.log(' ', n.level, n.code, JSON.stringify(n.title).slice(0, 50), n.level === MAX_LEVEL ? n.amountSen / 100 : '');
for (const p of grid.problems.slice(0, 6)) console.log('  problem', p.row, p.text);
for (const k of nodes.filter(n => n.level === 1)) console.log('kelompok', k.code, JSON.stringify(k.title).slice(0, 60), 'sum', k.sumSen / 100);
const big = nodes.filter(n => n.level === MAX_LEVEL).sort((a, b) => b.amountSen - a.amountSen).slice(0, 6);
for (const n of big) console.log('big', n.code, n.title.slice(0, 40), n.amountSen / 100, 'vol', n.volume, 'harga', n.unitPriceSen / 100);
console.log('suspicious titles', nodes.filter(n => /sub ?total|jumlah|total/i.test(n.title)).map(n => `${n.code} ${n.title}`).slice(0, 8));
