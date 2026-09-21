/** Parses one workbook with the app's import reader and prints what would be imported. Usage: npx tsx scripts/templat/rab-parse-file.ts <xlsx> */
import { readFileSync } from 'node:fs';
import { parseWorkbook } from '../../src/lib/server/deb/rab';
import { formatSen } from '../../src/lib/pencairan';
const path = process.argv[2];
const r = parseWorkbook(readFileSync(path), 'UJI', path.split(/[\/]/).pop() || '');
console.log(`kind ${r.kind}, share ${r.share}, ${r.rows} items, ${r.lines.length} lines, 100% ${formatSen(r.totalSen)}, 70% ${formatSen(r.term1Sen)}, 30% ${formatSen(r.term2Sen || 0)}, ${r.problems.length} problems`);
for (const p of r.problems.slice(0, 10)) console.log('  problem', p.row, p.text);
for (const l of r.lines.filter(l => !l.parentKey)) console.log('  kelompok', l.title.slice(0, 70));
