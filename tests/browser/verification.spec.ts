import { test, expect, type Page } from '@playwright/test';

async function login(page: Page, role: 'campus' | 'admin') {
  await page.goto('/login');
  await page.getByRole('button', { name: role === 'campus' ? 'Masuk sebagai Kampus' : 'Masuk sebagai Admin PF' }).click();
  await expect(page).toHaveURL(new RegExp(`/${role}/dashboard$`));
}
async function logout(page: Page) {
  await page.locator('.sidebar').getByRole('button', { name: 'Keluar / ganti peran' }).click();
  await expect(page).toHaveURL(/\/login$/);
}
test('campus submission, admin revision and confirmation with responsive review UI', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await login(page, 'campus');
  await page.goto('/campus/indicators');
  await page.getByRole('button', { name: 'Kirim untuk verifikasi', exact: true }).click();
  await page.getByRole('button', { name: 'Kirim data DEB', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Perbarui Pemetaan kebutuhan desa', exact: true })).toBeDisabled();
  await logout(page);
  await login(page, 'admin');
  await expect(page.locator('.sidebar').getByRole('link', { name: 'Indikator DEB' })).toHaveCount(0);
  await page.goto('/admin/indicators');
  await expect(page).toHaveURL(/\/admin\/verifikasi$/);
  await expect(page.getByRole('heading', { name: 'Tinjauan & Konfirmasi DEB' })).toBeVisible();
  await page.getByLabel('Cari pengajuan kampus').fill('Universitas Contoh');
  await page.locator('.queue-item').filter({ hasText: 'Universitas Contoh' }).click();
  await expect(page.getByRole('button', { name: /Perbarui / })).toHaveCount(0);
  await expect(page.getByLabel('Nilai aktual', { exact: true })).toHaveCount(0);
  await page.screenshot({ path: 'test-results/review-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByLabel('Catatan keputusan').fill('QA: mohon perbarui periode data sebelum konfirmasi.');
  await page.getByRole('button', { name: 'Minta Revisi', exact: true }).click();
  await page.getByRole('button', { name: 'Konfirmasi keputusan' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await logout(page);
  await login(page, 'campus');
  await page.goto('/campus/indicators');
  await expect(page.getByText('QA: mohon perbarui periode data sebelum konfirmasi.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Perbarui Pemetaan kebutuhan desa', exact: true }).click();
  await page.getByLabel('Nilai aktual', { exact: true }).fill('25');
  await page.getByLabel('Catatan perkembangan').fill('QA: periode data terbaru sudah diperiksa.');
  await page.getByRole('button', { name: 'Simpan perubahan' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('button', { name: 'Kirim ulang untuk verifikasi' }).click();
  await page.getByRole('button', { name: 'Kirim data DEB', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await logout(page);
  await login(page, 'admin');
  await page.goto('/admin/verifikasi');
  await page.getByLabel('Cari pengajuan kampus').fill('Universitas Contoh');
  await page.locator('.queue-item').filter({ hasText: 'Universitas Contoh' }).click();
  await page.getByLabel('Catatan keputusan').fill('QA: data sudah sesuai.');
  const close = page.locator('.comments-panel').getByRole('button', { name: 'Tandai selesai' });
  while (await close.count()) {
    const count = await close.count();
    await close.first().click();
    await expect(close).toHaveCount(count - 1);
  }
  await expect(page.getByLabel('Catatan keputusan')).toHaveValue('QA: data sudah sesuai.');
  await page.getByRole('button', { name: 'Konfirmasi data', exact: true }).click();
  await page.getByRole('button', { name: 'Konfirmasi keputusan' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByLabel('Status pengajuan').selectOption('approved');
  await expect(page.locator('.review-summary')).toContainText('Terverifikasi');
  await expect(page.locator('.decision-panel')).toContainText('QA: data sudah sesuai.');
  await page.reload();
  await page.getByLabel('Status pengajuan').selectOption('approved');
  await expect(page.locator('.review-summary')).toContainText('Universitas Contoh');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'test-results/review-mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.getByRole('button', { name: 'Buka navigasi' }).click();
  await expect(page.locator('.mobile-drawer').getByRole('link', { name: /Review Kampus/ })).toBeVisible();
  expect(errors).toEqual([]);
});
