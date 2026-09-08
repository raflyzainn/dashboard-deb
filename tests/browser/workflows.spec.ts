import { test, expect, type Page } from '@playwright/test';
import { samplePdf } from '../../src/lib/data/pdf';

async function login(page: Page, role: 'campus' | 'admin') {
  await page.goto('/login');
  await page.getByRole('button', { name: role === 'campus' ? 'Masuk sebagai Kampus' : 'Masuk sebagai Admin PF' }).click();
  await expect(page).toHaveURL(new RegExp(`/${role}/dashboard$`));
  await expect(page.locator('.stats-grid')).toBeVisible();
}
async function logout(page: Page) {
  await page.locator('.sidebar').getByRole('button', { name: 'Keluar / ganti peran' }).click();
  await expect(page).toHaveURL(/\/login$/);
}
test('cross-role revision, PDF history, shared forum, FAQ, persistence and reset', async ({ page }) => {
  const unexpected: string[] = [];
  const exceptions: string[] = [];
  page.on('pageerror', e => exceptions.push(e.message));
  page.on('request', r => { if (/^https?:/.test(r.url()) && !r.url().startsWith('http://127.0.0.1:5176/')) unexpected.push(r.url()); });
  await login(page, 'admin');
  await page.goto('/admin/campuses/campus-001');
  await page.getByRole('button', { name: 'Indikator', exact: true }).click();
  await page.getByRole('button', { name: 'Tinjau Pemetaan kebutuhan desa', exact: true }).click();
  await page.getByLabel('Feedback baru').fill('QA: mohon perbarui periode dan capaian.');
  await page.getByRole('button', { name: 'Kirim feedback' }).click();
  await expect(page.getByText('QA: mohon perbarui periode dan capaian.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Tutup dialog' }).click();
  await logout(page);
  await login(page, 'campus');
  await page.goto('/campus/indicators');
  await page.getByRole('button', { name: 'Perbarui Pemetaan kebutuhan desa', exact: true }).click();
  await expect(page.getByText('QA: mohon perbarui periode dan capaian.', { exact: true })).toBeVisible();
  await page.getByLabel('Nilai aktual', { exact: true }).fill('15');
  await page.getByLabel('Catatan perkembangan').fill('QA: data telah diperbarui.');
  await page.getByRole('button', { name: 'Simpan perubahan' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Perbarui Pemetaan kebutuhan desa', exact: true }).click();
  await expect(page.getByLabel('Nilai aktual', { exact: true })).toHaveValue('15');
  await expect(page.getByText('Sudah ditanggapi', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Tutup dialog' }).click();
  await logout(page);
  await login(page, 'admin');
  await page.goto('/admin/campuses/campus-001');
  await page.getByRole('button', { name: 'Indikator', exact: true }).click();
  await page.getByRole('button', { name: 'Tinjau Pemetaan kebutuhan desa', exact: true }).click();
  await expect(page.getByText('QA: data telah diperbarui.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Tandai selesai' }).click();
  await expect(page.getByRole('dialog').getByText('Selesai', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Tutup dialog' }).click();
  await logout(page);
  await login(page, 'campus');
  await page.goto('/campus/proposal');
  const bytes = Buffer.from(await samplePdf('QA Simulasi', 1).arrayBuffer());
  for (const version of [4, 5]) {
    await page.getByRole('button', { name: 'Unggah versi baru', exact: true }).click();
    await page.getByLabel('File proposal PDF').setInputFiles({ name: `qa-versi-${version}.pdf`, mimeType: 'application/pdf', buffer: bytes });
    await page.getByLabel('Catatan perubahan', { exact: true }).fill(`QA perubahan versi ${version}`);
    await page.getByRole('button', { name: 'Ajukan versi baru' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  }
  await page.reload();
  for (const version of [4, 5]) {
    await page.getByRole('button', { name: `Lihat proposal versi ${version}`, exact: true }).click();
    await expect(page.getByTitle(`Pratinjau qa-versi-${version}.pdf`)).toBeVisible();
    const download = page.waitForEvent('download');
    await page.getByRole('link', { name: 'Unduh PDF' }).click();
    expect((await download).suggestedFilename()).toBe(`qa-versi-${version}.pdf`);
    await page.getByRole('button', { name: 'Tutup dialog' }).click();
  }
  await page.getByRole('button', { name: 'Unggah versi baru', exact: true }).click();
  await page.getByLabel('File proposal PDF').setInputFiles({ name: 'invalid.pdf', mimeType: 'application/pdf', buffer: Buffer.from('not a PDF') });
  await page.getByLabel('Catatan perubahan', { exact: true }).fill('Harus gagal');
  await page.getByRole('button', { name: 'Ajukan versi baru' }).click();
  await expect(page.getByRole('alert')).toContainText('signature PDF');
  await page.getByRole('button', { name: 'Tutup dialog' }).click();
  await expect(page.getByRole('button', { name: 'Lihat proposal versi 6', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Tutup pesan kesalahan' }).click();
  await page.goto('/campus/questions');
  await expect(page.locator('.question-list').getByText('Universitas Gadjah Mada', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Ajukan pertanyaan' }).click();
  await page.getByLabel('Judul pertanyaan').fill('QA: kolaborasi kampus bersama');
  await page.getByLabel('Uraian pertanyaan').fill('Bagaimana berbagi hasil evaluasi program?');
  await page.getByRole('button', { name: 'Bagikan pertanyaan' }).click();
  await expect(page).toHaveURL(/\/campus\/questions\/[^/]+$/);
  await expect(page.getByRole('heading', { name: 'QA: kolaborasi kampus bersama' })).toBeVisible();
  const questionId = page.url().split('/').at(-1)!;
  await page.getByRole('button', { name: '0 suka', exact: true }).click();
  await expect(page.getByRole('button', { name: '1 suka', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await logout(page);
  await login(page, 'admin');
  await page.goto(`/admin/questions/${questionId}`);
  await page.getByLabel('Jawaban untuk semua kampus').fill('QA: bagikan ringkasan pada catatan indikator.');
  await page.getByRole('button', { name: 'Simpan jawaban' }).click();
  await page.getByRole('button', { name: 'Jadikan FAQ' }).click();
  await expect(page.getByRole('button', { name: 'Sudah masuk FAQ' })).toBeDisabled();
  await logout(page);
  await login(page, 'campus');
  await page.goto('/campus/faq');
  await page.getByText('QA: kolaborasi kampus bersama', { exact: true }).click();
  await expect(page.getByText('QA: bagikan ringkasan pada catatan indikator.', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('QA: kolaborasi kampus bersama', { exact: true })).toBeVisible();
  await page.evaluate(() => localStorage.setItem('unrelated-project-check', 'preserve'));
  await page.locator('.sidebar').getByRole('button', { name: 'Reset data demo' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Reset data demo', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(await page.evaluate(() => localStorage.getItem('unrelated-project-check'))).toBe('preserve');
  await login(page, 'campus');
  await page.goto('/campus/proposal');
  await expect(page.getByRole('button', { name: 'Lihat proposal versi 4', exact: true })).toHaveCount(0);
  await page.goto('/campus/questions');
  await expect(page.getByRole('heading', { name: 'QA: kolaborasi kampus bersama' })).toHaveCount(0);
  expect(exceptions).toEqual([]);
  expect(unexpected).toEqual([]);
});
test('guards, all pages, mobile drawer, search, empty and not-found states', async ({ page }) => {
  await page.goto('/campus/questions');
  await expect(page).toHaveURL(/\/login$/);
  await login(page, 'campus');
  await page.goto('/admin/dashboard');
  await expect(page).toHaveURL(/\/campus\/dashboard$/);
  for (const path of ['dashboard', 'indicators', 'proposal', 'questions', 'faq', 'questions/question-1']) {
    await page.goto(`/campus/${path}`);
    await expect(page.locator('main')).toBeVisible();
  }
  await page.goto('/campus/questions/missing');
  await expect(page.getByRole('heading', { name: 'Pertanyaan tidak ditemukan' })).toBeVisible();
  await page.goto('/campus/questions');
  await page.getByRole('textbox', { name: 'Cari pertanyaan' }).fill('tidakada-qa-123');
  await expect(page.getByRole('heading', { name: 'Belum ada pertanyaan yang cocok' })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Buka navigasi' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('dialog').getByRole('link', { name: 'Ringkasan' }).click();
  await expect(page).toHaveURL(/\/campus\/dashboard$/);
  await expect(page.getByRole('dialog')).not.toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await logout(page);
  await login(page, 'admin');
  for (const path of ['dashboard', 'campuses', 'campuses/campus-001', 'indicators', 'proposal', 'questions', 'faq']) {
    await page.goto(`/admin/${path}`);
    await expect(page.locator('main')).toBeVisible();
  }
  await page.goto('/admin/campuses');
  await page.getByRole('textbox', { name: 'Cari kampus' }).fill('Poltek KP Sorong');
  await expect(page.locator('.campus-name').filter({ hasText: 'Politeknik Kelautan dan Perikanan Sorong' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Cari kampus' }).fill('UGM');
  await expect(page.locator('.campus-name').filter({ hasText: 'Universitas Gadjah Mada' })).toBeVisible();
  await page.getByLabel('Filter wilayah kampus').selectOption('Sumatra');
  await expect(page.getByRole('heading', { name: 'Kampus tidak ditemukan' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Cari kampus' }).fill('');
  await expect(page.locator('.campus-name')).toHaveCount(10);
  await expect(page.locator('.campus-name').filter({ hasText: 'Universitas Syiah Kuala' })).toBeVisible();
  await page.goto('/admin/campuses/missing');
  await expect(page.getByRole('heading', { name: 'Kampus tidak ditemukan' })).toBeVisible();
  // Explicit filesystem routes must reject nonexistent sections and extra segments.
  for (const path of ['/admin/not-a-page', '/campus/campuses', '/admin/dashboard/extra']) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { name: 'Halaman tidak ditemukan' })).toBeVisible();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ['dashboard', 'campuses', 'indicators', 'proposal', 'questions', 'faq']) {
    await page.goto(`/admin/${path}`);
    await expect(page.locator('main')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `No document overflow on /admin/${path}`).toBe(true);
  }
});
test('FAQ management and keyboard modal dismissal work through the UI', async ({ page }) => {
  await login(page, 'admin');
  await page.goto('/admin/faq');
  await page.getByRole('button', { name: 'Tambah FAQ' }).click();
  await page.getByLabel('Pertanyaan FAQ', { exact: true }).fill('QA panduan manual');
  await page.getByLabel('Jawaban FAQ', { exact: true }).fill('QA jawaban manual.');
  await page.getByRole('button', { name: 'Simpan FAQ' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('button', { name: 'Naikkan FAQ QA panduan manual', exact: true }).click();
  await expect(page.locator('.faq-entry').nth(1)).toContainText('QA panduan manual');
  await page.getByRole('button', { name: 'Edit FAQ QA panduan manual', exact: true }).click();
  await page.getByLabel('Jawaban FAQ', { exact: true }).fill('QA jawaban diperbarui.');
  await page.getByRole('button', { name: 'Simpan FAQ' }).click();
  await page.getByText('QA panduan manual', { exact: true }).click();
  await expect(page.getByText('QA jawaban diperbarui.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Tambah FAQ' }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('button', { name: 'Hapus FAQ QA panduan manual', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Hapus FAQ', exact: true }).click();
  await expect(page.getByText('QA panduan manual', { exact: true })).toHaveCount(0);
});
test('storage failure is visible and does not pretend login succeeded', async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(window, 'indexedDB', { get() { throw new Error('QA: penyimpanan diblokir'); } }); });
  await page.goto('/login');
  await page.getByRole('button', { name: 'Masuk sebagai Kampus' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});
test('failed save keeps form input and rolls back the IndexedDB mutation', async ({ page }) => {
  await login(page, 'campus');
  await page.goto('/campus/indicators');
  await page.getByRole('button', { name: 'Perbarui Pemetaan kebutuhan desa', exact: true }).click();
  await page.getByLabel('Nilai aktual', { exact: true }).fill('27');
  await page.getByLabel('Catatan perkembangan').fill('QA input harus tetap tersedia.');
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put;
    Object.defineProperty(window, 'restoreDebStorage', { configurable: true, value: () => { IDBObjectStore.prototype.put = original; } });
    IDBObjectStore.prototype.put = function (...args: Parameters<IDBObjectStore['put']>) {
      if (this.name === 'state') throw new DOMException('QA: ruang penyimpanan penuh', 'QuotaExceededError');
      return original.apply(this, args);
    };
  });
  await page.getByRole('button', { name: 'Simpan perubahan' }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('ruang penyimpanan penuh');
  await expect(page.getByLabel('Nilai aktual', { exact: true })).toHaveValue('27');
  await expect(page.getByLabel('Catatan perkembangan')).toHaveValue('QA input harus tetap tersedia.');
  await page.evaluate(() => (window as unknown as { restoreDebStorage(): void }).restoreDebStorage());
  await page.getByRole('button', { name: 'Tutup dialog' }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Perbarui Pemetaan kebutuhan desa', exact: true }).click();
  await expect(page.getByLabel('Nilai aktual', { exact: true })).toHaveValue('10');
});
