import { test, expect, type Page } from '@playwright/test';
import { samplePdf } from '../../src/lib/data/pdf';

async function upload(page: Page, name: string, bytes: Buffer) {
  await page.getByRole('button', { name: 'Unggah versi baru', exact: true }).click();
  await page.getByLabel('File proposal PDF').setInputFiles({ name, mimeType: 'application/pdf', buffer: bytes });
  await page.getByLabel('Catatan perubahan', { exact: true }).fill('Catatan manual yang sengaja sama.');
  await page.getByRole('button', { name: 'Ajukan versi baru' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
}

test('compare actual PDF versions, arbitrary pairs, reverse, identical files and admin scope', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('/login');
  await page.getByRole('button', { name: 'Masuk sebagai Kampus' }).click();
  await expect(page).toHaveURL(/campus\/dashboard$/);
  await page.goto('/campus/proposal');
  const comparison = page.getByRole('region', { name: 'Perbandingan proposal', exact: true });
  const diff = page.getByRole('region', { name: 'Hasil perbedaan teks PDF', exact: true });
  await expect(diff).toContainText('Versi 2 - Dokumen simulasi');
  await expect(diff).toContainText('Versi 3 - Dokumen simulasi');
  const v4 = Buffer.from(await samplePdf('QA Anggaran Awal', 4).arrayBuffer());
  const v5 = Buffer.from(await samplePdf('QA Anggaran Revisi', 5).arrayBuffer());
  await upload(page, 'qa-original.pdf', v4);
  await upload(page, 'qa-revisi.pdf', v5);
  await upload(page, 'qa-identik.pdf', v5);
  await page.reload();
  await expect(comparison.getByRole('status')).toContainText('Tidak ada perbedaan pada teks');
  await page.getByLabel('Versi dasar', { exact: true }).selectOption({ label: 'Versi 4 · qa-original.pdf' });
  await page.getByLabel('Versi pembanding', { exact: true }).selectOption({ label: 'Versi 6 · qa-identik.pdf' });
  await expect(diff.locator('td.deleted')).toContainText(['', 'QA Anggaran Awal']);
  await expect(diff.locator('.inserted .line-text').filter({ hasText: 'QA Anggaran Revisi' })).toBeVisible();
  await page.getByRole('button', { name: 'Gabungan', exact: true }).click();
  await expect(diff.locator('tr.deleted')).toContainText(['QA Anggaran Awal', 'Versi 4']);
  await page.getByLabel('Hanya perubahan').check();
  await expect(diff).not.toContainText('Tujuan:');
  await page.getByRole('button', { name: 'Tukar versi perbandingan' }).click();
  await expect(diff.locator('tr.inserted')).toContainText(['QA Anggaran Awal', 'Versi 4']);
  await page.getByLabel('Versi dasar', { exact: true }).selectOption({ label: 'Versi 4 · qa-original.pdf' });
  await expect(comparison.getByRole('status')).toContainText('Pilih dua versi yang berbeda');
  await expect(diff).toHaveCount(0);
  await page.getByLabel('Versi dasar', { exact: true }).selectOption({ label: 'Versi 1 · Proposal-DEB-1-v1.pdf' });
  await expect(diff).toContainText('QA Anggaran Awal');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByLabel('Versi dasar', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/proposal-compare-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('button', { name: 'Berdampingan', exact: true }).click();
  const gutter = await diff.locator('td.line-number').first().boundingBox();
  expect(gutter!.width).toBeLessThanOrEqual(45);
  const textCell = await diff.locator('td').nth(1).boundingBox();
  const table = await diff.locator('table').boundingBox();
  expect(textCell!.x - table!.x).toBeLessThanOrEqual(45);
  await comparison.screenshot({ path: 'test-results/proposal-compare-desktop.png' });
  await page.getByRole('button', { name: 'Buka PDF dasar' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Tutup dialog' }).click();
  await page.locator('.sidebar').getByRole('button', { name: 'Keluar / ganti peran' }).click();
  await page.getByRole('button', { name: 'Masuk sebagai Admin PF' }).click();
  await expect(page).toHaveURL(/admin\/dashboard$/);
  await page.goto('/admin/proposal');
  await expect(comparison.getByRole('status')).toContainText('Tidak ada perbedaan pada teks');
  await page.getByLabel('Pilih kampus proposal').selectOption('campus-002');
  await expect(diff).toContainText('Universitas Simulasi 02');
  await expect(page.getByLabel('Versi dasar', { exact: true }).locator('option')).toHaveCount(2);
  await expect(diff).not.toContainText('QA Anggaran');
  await page.getByLabel('Pilih kampus proposal').selectOption('campus-003');
  await expect(comparison).toContainText('minimal dua versi');
  await expect(diff).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('unreadable PDFs show a recoverable error without a false identical result', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Masuk sebagai Kampus' }).click();
  await expect(page).toHaveURL(/campus\/dashboard$/);
  await page.goto('/campus/proposal');
  await upload(page, 'qa-rusak.pdf', Buffer.from('%PDF-bukan dokumen valid'));
  await page.reload();
  const comparison = page.getByRole('region', { name: 'Perbandingan proposal', exact: true });
  await expect(comparison.getByRole('alert')).toContainText('PDF tidak dapat dibaca');
  await page.getByLabel('Versi pembanding', { exact: true }).selectOption({ label: 'Versi 2 · Proposal-DEB-1-v2.pdf' });
  await expect(comparison.getByRole('alert')).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Hasil perbedaan teks PDF' })).toContainText('Versi 2');
});

test('PDF without readable text is not reported as identical and switching pairs recovers', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Masuk sebagai Kampus' }).click();
  await expect(page).toHaveURL(/campus\/dashboard$/);
  await page.goto('/campus/proposal');
  const original = await samplePdf('QA Kosong', 4).text();
  // Preserve stream byte lengths and xref offsets, while producing a valid empty page.
  const blank = original.replace(/(?<=stream\n)[\s\S]*?(?=\nendstream)/, content => ' '.repeat(content.length));
  await upload(page, 'qa-tanpa-teks.pdf', Buffer.from(blank));
  await page.reload();
  const comparison = page.getByRole('region', { name: 'Perbandingan proposal', exact: true });
  await expect(comparison.getByRole('alert')).toContainText('Teks tidak ditemukan');
  await expect(comparison).not.toContainText('Tidak ada perbedaan pada teks');
  await page.getByLabel('Versi dasar', { exact: true }).selectOption({ label: 'Versi 1 · Proposal-DEB-1-v1.pdf' });
  await page.getByLabel('Versi pembanding', { exact: true }).selectOption({ label: 'Versi 2 · Proposal-DEB-1-v2.pdf' });
  await page.getByLabel('Versi pembanding', { exact: true }).selectOption({ label: 'Versi 3 · Proposal-DEB-1-v3.pdf' });
  const diff = page.getByRole('region', { name: 'Hasil perbedaan teks PDF' });
  await expect(diff).toContainText('Versi 3 - Dokumen simulasi');
  await expect(diff).not.toContainText('Versi 2 - Dokumen simulasi');
});
