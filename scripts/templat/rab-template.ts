/**
 * Writes the downloadable RAB template, static/templat/RAB_DEB_Tahap_1.xlsx, from the same builder the app uses for exports.
 * Run from the repo root: npx tsx scripts/templat/rab-template.ts
 */
import ExcelJS from 'exceljs';
import { buildRabWorkbook, EXAMPLE_ROWS } from '../../src/lib/rab-excel';

const OUT = 'static/templat/RAB_DEB_Tahap_1.xlsx';
const wb = buildRabWorkbook(ExcelJS, { tahap1: EXAMPLE_ROWS });
await wb.xlsx.writeFile(OUT);
console.log('written', OUT, 'example rows', EXAMPLE_ROWS.length);
