import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { PDFDocument } from 'pdf-lib';
import { samplePdf } from '../../src/lib/data/demo/fixtures/pdf';

test('finance dashboard summarizes the payment workload', async ({ page }) => {
  await login(page, 'finance-1');

  await expect(page.getByRole('heading', { name: 'Dashboard keuangan', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Ringkasan pencairan' })).toContainText(
    'Total pengajuan'
  );
  await expect(page.getByRole('region', { name: 'Daftar pencairan kampus' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Distribusi tahap pencairan' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Buka detail pencairan' }).first()).toBeVisible();
  await page.getByLabel('Cari kampus').fill('Universitas Pertamina');
  await expect(page.getByRole('region', { name: 'Daftar pencairan kampus' })).toContainText(
    'Universitas Pertamina'
  );
  await page.getByLabel('Tahap').selectOption('ready');
  await expect(page.getByText('Kampus tidak ditemukan')).toBeVisible();
});

test('broken proposals are rejected and notifications open an older payment instead of the latest', async ({
  page
}) => {
  page.setDefaultTimeout(15000);
  await login(page, 'campus-001');
  await page.goto('/campus/proposal');
  await page.getByRole('button', { name: 'Perbarui', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('textbox')
    .fill('Pengujian validasi PDF dan pengajuan versi baru.');
  await page.locator('input[type=file]').setInputFiles({
    name: 'broken.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-\nbroken')
  });
  await page.getByRole('button', { name: 'Ajukan versi baru', exact: true }).click();
  await expect(page.getByText(/PDF rusak, terenkripsi/)).toBeVisible();
  await expect(page.locator('iframe')).not.toHaveAttribute('title', 'Pratinjau broken.pdf');
  await page.locator('input[type=file]').setInputFiles({
    name: 'versi-baru.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from(await samplePdf('Versi baru', 4).arrayBuffer())
  });
  await page.getByRole('button', { name: 'Ajukan versi baru', exact: true }).click();
  await expect(page.locator('iframe')).toHaveAttribute('title', 'Pratinjau versi-baru.pdf');
  await login(page, 'admin-1');
  await page.goto('/admin/payments');
  await page.getByText('Ajukan pencairan untuk versi proposal lain', { exact: true }).click();
  await page.getByLabel('Nominal pengajuan baru').fill('123000');
  await page.getByRole('button', { name: 'Buat pengajuan', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Status pembayaran', exact: true })).toContainText(
    '123.000'
  );
  await login(page, 'admin-1');
  await page.goto('/admin/payments?campus=campus-001&payment=payment-campus-001');
  await page.getByLabel('Catatan tindakan pencairan').fill('Bukti versi awal diperiksa.');
  await page.getByRole('button', { name: 'Nyatakan KPI sesuai', exact: true }).click();
  await stage(page, 'Kelengkapan dokumen');
  await login(page, 'campus-001-pic2');
  await page.goto('/campus/notifications');
  await page.getByRole('link', { name: 'Periksa berkas' }).first().click();
  await expect(page).toHaveURL(/payment=payment-campus-001/);
  await stage(page, 'Kelengkapan dokumen');
  await expect(
    page.getByRole('region', { name: 'Status pembayaran', exact: true })
  ).not.toContainText('Rp');
});

async function login(page: Page, account: string) {
  // Each account selection is a separate user session in the same demo browser database.
  if (page.url() !== 'about:blank')
    await page.evaluate(() => sessionStorage.removeItem('deb-standalone-demo-account'));
  await page.goto('/login');
  if (account.startsWith('admin'))
    await page.getByRole('button', { name: /Administrator/ }).click();
  if (account.startsWith('finance')) await page.getByRole('button', { name: /Keuangan/ }).click();
  await page.locator(`input[name="preview-account"][value="${account}"]`).check();
  await page.getByRole('button', { name: 'Buka ruang kerja', exact: true }).click();
  await expect(page).toHaveURL(/dashboard$/);
}
async function stage(page: Page, name: string) {
  await expect(
    page
      .getByRole('region', { name: 'Status pembayaran', exact: true })
      .getByRole('heading', { name, exact: true })
  ).toBeVisible();
}

test('campus accounts only track payment; admin completes all stages and archives PDF', async ({
  page
}) => {
  page.setDefaultTimeout(15000);
  test.setTimeout(240000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await login(page, 'campus-001');
  await page.goto('/campus/profile');
  await page
    .getByLabel('Deskripsi program', { exact: true })
    .fill('Pemasangan PLTS di desa\nPelatihan warga');
  await page.getByRole('button', { name: /Simpan/ }).click();
  await expect(page.getByText('Perubahan tersimpan.', { exact: true })).toBeVisible();
  await page.goto('/campus/payments');
  await stage(page, 'Penilaian KPI');
  await trackingOnly(page);
  await page.screenshot({ path: '.qa/payment-mentor-tracking.png', fullPage: true });
  await login(page, 'campus-001-pic2');
  await page.goto('/campus/profile');
  await expect(page.getByLabel('Deskripsi program', { exact: true })).toHaveValue(
    'Pemasangan PLTS di desa\nPelatihan warga'
  );
  await page
    .getByLabel('Deskripsi program', { exact: true })
    .fill('Pemasangan PLTS di desa\nPelatihan warga\nEvaluasi oleh SoBI');
  await page.getByRole('button', { name: /Simpan/ }).click();
  await expect(page.getByText('Perubahan tersimpan.', { exact: true })).toBeVisible();
  await page.goto('/campus/dashboard');
  await expect(
    page.getByRole('list', { name: 'Poin deskripsi program' }).getByRole('listitem')
  ).toHaveCount(3);
  await page.goto('/campus/proposal');
  await page
    .getByLabel('Komentar proposal', { exact: true })
    .fill('SoBI sudah melengkapi bukti contoh.');
  await page.getByRole('button', { name: 'Kirim komentar', exact: true }).click();
  await expect(
    page.getByText('SoBI sudah melengkapi bukti contoh.', { exact: true })
  ).toBeVisible();
  await page.goto('/campus/payments');
  await trackingOnly(page);
  await page.screenshot({ path: '.qa/payment-sobi-tracking.png', fullPage: true });
  await expect(page.getByRole('button', { name: 'Nyatakan KPI sesuai' })).toHaveCount(0);
  await login(page, 'admin-1');
  await page.goto('/admin/payments');
  await page.getByLabel('Target Energi terbarukan', { exact: true }).fill('3');
  await page.getByRole('button', { name: 'Simpan bukti KPI', exact: true }).click();
  await expect(page.getByText('Bukti KPI tersimpan.', { exact: true })).toBeVisible();
  await page
    .getByLabel('Catatan tindakan pencairan')
    .fill('Bukti halaman proposal sudah diperiksa PF.');
  await page.getByRole('button', { name: 'Nyatakan KPI sesuai', exact: true }).click();
  await stage(page, 'Kelengkapan dokumen');
  for (const label of ['Kuitansi', 'Invoice', 'Berita acara (BA)', 'Nota']) {
    await page.getByLabel(`Unggah ${label}`, { exact: true }).setInputFiles({
      name: `${label.replace(/\W/g, '')}.pdf`,
      mimeType: 'application/pdf',
      buffer: Buffer.from(await samplePdf(label, 1).arrayBuffer())
    });
    await expect(
      page.getByRole('button', { name: `Periksa berkas ${label}`, exact: true })
    ).toBeVisible();
  }
  await login(page, 'admin-1');
  await page.goto('/admin/payments');
  await expect(page.getByRole('button', { name: 'Selesaikan pemeriksaan berkas' })).toBeDisabled();
  for (const label of ['Kuitansi', 'Invoice', 'Berita acara (BA)', 'Nota']) {
    await page.getByRole('button', { name: `Validkan ${label}`, exact: true }).click();
    await expect(
      page
        .locator('article')
        .filter({ has: page.getByRole('heading', { name: label, exact: true }) })
        .getByText('Valid', { exact: true })
    ).toBeVisible();
  }
  await page.getByRole('button', { name: 'Selesaikan pemeriksaan berkas', exact: true }).click();
  await stage(page, 'Approval PF');
  await page.getByRole('button', { name: 'Catat persetujuan', exact: true }).click();
  await stage(page, 'Approval kampus');
  await expect(page.getByRole('button', { name: 'Catat persetujuan' })).toBeEnabled();
  await page.getByRole('heading', { name: 'Pencairan program', exact: true }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: '.qa/payment-admin-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Catat persetujuan', exact: true }).click();
  await stage(page, 'Approval keuangan');
  await page.getByRole('button', { name: 'Catat persetujuan', exact: true }).click();
  await stage(page, 'Siap dikirim');
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Ekspor PDF & kirim ke keuangan', exact: true }).click();
  const download = await downloading;
  await download.saveAs('.qa/payment-package.pdf');
  const pdf = await PDFDocument.load(await readFile('.qa/payment-package.pdf'));
  expect(pdf.getPageCount()).toBeGreaterThanOrEqual(6);
  await stage(page, 'Diproses keuangan');
  await page.reload();
  await expect(
    page.getByRole('region', { name: 'Arsip pencairan', exact: true }).getByRole('button')
  ).toHaveCount(1);
  await page.getByLabel('Catatan tindakan pencairan').fill('SIMULASI-2026-001');
  await page.getByRole('button', { name: 'Tandai sudah dicairkan', exact: true }).click();
  await stage(page, 'Sudah dicairkan');
  await login(page, 'finance-1');
  await page.goto('/finance/payments');
  await stage(page, 'Sudah dicairkan');
  await page.getByLabel('Cari kampus pencairan').fill('Universitas Pertamina');
  await expect(page.getByLabel('Kampus pencairan').locator('option')).toHaveCount(1);
  await page.getByLabel('Filter tahap pencairan').selectOption('documents');
  await expect(page.getByLabel('Kampus pencairan')).toHaveValue('campus-026');
  await page.getByLabel('Filter tahap pencairan').selectOption('');
  await page.getByLabel('Cari kampus pencairan').fill('');
  await expect(page.getByLabel('Catatan tindakan pencairan')).toHaveCount(0);
  await expect(
    page.getByRole('button', {
      name: /Catat persetujuan|Simpan bukti KPI|Tandai sudah dicairkan|Ekspor PDF & kirim/
    })
  ).toHaveCount(0);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: '.qa/payment-finance-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '.qa/payment-finance-mobile.png', fullPage: true });
  await login(page, 'campus-002-pic2');
  await page.goto('/campus/payments?campus=campus-001');
  await stage(page, 'Kelengkapan dokumen');
  await expect(page.getByText('SIMULASI-2026-001', { exact: false })).toHaveCount(0);
  await expect(page.getByLabel('Kampus pencairan')).toHaveCount(0);
  await page.screenshot({ path: '.qa/payment-campus-mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('admin revision resets approvals and campus can only observe the returned stage', async ({
  page
}) => {
  page.setDefaultTimeout(15000);
  await login(page, 'admin-1');
  await page.goto('/admin/payments');
  await page.getByLabel('Kampus pencairan').selectOption('campus-005');
  await stage(page, 'Approval keuangan');
  await page
    .getByLabel('Catatan tindakan pencairan')
    .fill('Nominal dan bukti invoice perlu disesuaikan.');
  await page.getByRole('button', { name: 'Kembalikan untuk revisi', exact: true }).click();
  await stage(page, 'Penilaian KPI');
  await expect(
    page
      .getByRole('region', { name: 'Persetujuan pencairan' })
      .getByText('Menunggu persetujuan', { exact: true })
  ).toHaveCount(3);
  await login(page, 'campus-005');
  await page.goto('/campus/notifications');
  await expect(page.getByText(/Nominal dan bukti invoice perlu disesuaikan/).first()).toBeVisible();
  await page.getByRole('link', { name: 'Periksa berkas' }).first().click();
  await stage(page, 'Penilaian KPI');
  await trackingOnly(page);
});

async function trackingOnly(page: Page) {
  const main = page.getByRole('main');
  await expect(main.getByRole('region', { name: 'Status pembayaran', exact: true })).toBeVisible();
  await expect(main.locator('ol > li')).toHaveCount(8);
  await expect(main.locator('input, textarea, select, button, iframe, form')).toHaveCount(0);
  await expect(main).not.toContainText('Rp');
  await expect(main).not.toContainText('50.000.000');
}

test('admin creating a payment after switching campuses uses the selected campus proposal', async ({
  page
}) => {
  await login(page, 'admin-1');
  await page.goto('/admin/payments');
  await page.getByText('Ajukan pencairan untuk versi proposal lain', { exact: true }).click();
  await page.getByLabel('Versi untuk pencairan').selectOption({ index: 1 });
  await page.getByLabel('Kampus pencairan').selectOption('campus-002');
  await expect(page.getByLabel('Versi untuk pencairan')).toHaveValue('');
  await page.getByLabel('Nominal pengajuan baru').fill('987654');
  await page.getByRole('button', { name: 'Buat pengajuan', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Status pembayaran', exact: true })).toContainText(
    '987.654'
  );
  await page.reload();
  await page.getByLabel('Kampus pencairan').selectOption('campus-002');
  await expect(page.getByRole('region', { name: 'Status pembayaran', exact: true })).toContainText(
    '987.654'
  );
});
