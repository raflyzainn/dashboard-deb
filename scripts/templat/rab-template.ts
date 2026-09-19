/**
 * Writes the downloadable RAB template, static/templat/RAB_DEB.xlsx, from the same builder the app uses for exports:
 * Petunjuk, RAB 100%, RAB 70%, RAB 30%. Run from the repo root: npx tsx scripts/templat/rab-template.ts
 */
import ExcelJS from 'exceljs';
import { buildRabWorkbook, exampleRows } from '../../src/lib/rab-excel';

const OUT = 'static/templat/RAB_DEB.xlsx';
const wb = buildRabWorkbook(ExcelJS, { penuh: exampleRows('penuh'), tahap1: exampleRows('tahap1'), tahap2: exampleRows('tahap2') });
await wb.xlsx.writeFile(OUT);
console.log('written', OUT, 'rows', exampleRows('penuh').length, exampleRows('tahap1').length, exampleRows('tahap2').length);
