// Read-only smoke QA. Requires a complete local QA application with generated documents.
import { chromium } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';
import fs from 'node:fs/promises';

const origin = process.env.QA_ORIGIN || 'http://127.0.0.1:5176';
const output = '.qa/browser-document-pdf';
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: false });
const page = await browser.newPage();
page.setDefaultTimeout(60000);
const errors = [];
page.on('pageerror', error => errors.push(error.message));
try {
 await page.goto(origin + '/login');
 await page.getByRole('combobox').selectOption(process.env.QA_CAMPUS_ALIAS || 'campus-904');
 await page.getByRole('button', { name: 'Masuk ke ruang kerja' }).click();
 await page.waitForURL('**/campus/dashboard');
 await page.goto(origin + '/campus/pencairan?butir=ringkasan');
 for (const [kind, label] of [['pks', 'PKS'], ['permohonan', 'Surat permohonan'], ['invois', 'Invois'], ['kuitansi', 'Kuitansi']]) {
  await page.locator(`iframe[title="${kind}.pdf"]`).waitFor({ timeout: 240000 });
  const pending = page.waitForEvent('download', { timeout: 240000 });
  await page.getByRole('button', { name: 'Unduh PDF ' + label, exact: true }).click();
  const path = `${output}/${kind}.pdf`;
  await (await pending).saveAs(path);
  const bytes = await fs.readFile(path);
  if (bytes.subarray(0, 5).toString() !== '%PDF-') throw Error('PDF tidak valid: ' + kind);
  const pages = (await PDFDocument.load(bytes)).getPageCount();
  if (!pages) throw Error('PDF kosong: ' + kind);
  console.log(kind, pages, 'halaman');
 }
 if (errors.length) throw Error(errors.join('\n'));
 await page.screenshot({ path: output + '/campus.png', fullPage: true });
} finally {
 await browser.close();
}
