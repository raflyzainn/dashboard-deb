import { test, expect, type Page } from '@playwright/test';
import { samplePdf } from '../../src/lib/data/demo/fixtures/pdf';
async function login(page: Page, account: string) {
  await page.goto('/login');
  if (account.startsWith('admin'))
    await page.getByRole('button', { name: /Administrator/ }).click();
  await page.locator(`input[name="preview-account"][value="${account}"]`).check();
  await page.getByRole('button', { name: 'Buka ruang kerja', exact: true }).click();
  await expect(page).toHaveURL(/dashboard$/);
}
async function logout(page: Page) {
  await page.getByRole('button', { name: 'Keluar / ganti akun', exact: true }).click();
  await expect(page).toHaveURL(/login/);
}
test('static demo: autosave, PDF versions, admin response, persistence and reset without backend', async ({
  page
}) => {
  const forbidden: string[] = [],
    errors: string[] = [];
  page.on('request', (r) => {
    if (
      /^https?:/.test(r.url()) &&
      (new URL(r.url()).origin !== 'http://127.0.0.1:4178' ||
        new URL(r.url()).pathname.startsWith('/api/'))
    )
      forbidden.push(r.url());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  await login(page, 'campus-001');
  await page.goto('/campus/indicators');
  const input = page.getByRole('spinbutton').first();
  await expect(input).toBeEditable();
  await input.fill('123');
  await input.blur();
  await expect(
    page.getByRole('status').filter({ hasText: 'Semua perubahan indikator tersimpan.' })
  ).toBeVisible();
  await page.reload();
  await expect(page.getByRole('spinbutton').first()).toHaveValue('123');
  await page.goto('/campus/proposal');
  await expect(page.locator('iframe')).toHaveAttribute('src', /^blob:/);
  await page.getByRole('button', { name: 'Perbarui', exact: true }).click();
  await page.locator('input[type=file]').setInputFiles({
    name: 'demo-upload.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from(await samplePdf('Demo', 4).arrayBuffer())
  });
  await page.getByRole('dialog').locator('textarea').fill('Versi demo tersimpan di browser');
  await page.getByRole('button', { name: 'Ajukan versi baru', exact: true }).click();
  await expect(page.locator('iframe')).toHaveAttribute('title', 'Pratinjau demo-upload.pdf');
  await expect(page.locator('iframe')).toHaveCount(1);
  await expect(page.locator('iframe')).toHaveCSS('height', '300px');
  await expect(page.getByRole('heading', { name: 'Riwayat versi', exact: true })).toBeVisible();
  await logout(page);
  await login(page, 'admin-1');
  await page.goto('/admin/proposal');
  await page.getByLabel('Pilih kampus proposal').selectOption('campus-001');
  await expect(page.locator('iframe')).toHaveAttribute('title', 'Pratinjau demo-upload.pdf');
  await page.getByLabel('Isi tanggapan admin').fill('Tanggapan admin demo');
  await page.getByRole('button', { name: 'Simpan tanggapan', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Tanggapan admin' })).toContainText(
    'Tanggapan admin demo'
  );
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: '.qa/demo-admin-proposal.png', fullPage: false });
  await logout(page);
  await login(page, 'campus-001');
  await page.goto('/campus/proposal');
  await expect(page.getByRole('region', { name: 'Tanggapan admin' })).toContainText(
    'Tanggapan admin demo'
  );
  await page.reload();
  await expect(page.locator('iframe')).toHaveAttribute('title', 'Pratinjau demo-upload.pdf');
  await page.getByLabel('Pilih versi proposal').selectOption({ index: 1 });
  await expect(page.locator('iframe')).not.toHaveAttribute('title', 'Pratinjau demo-upload.pdf');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '.qa/demo-campus-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => localStorage.setItem('unrelated-demo-test', 'keep'));
  await page.getByRole('button', { name: 'Reset data demo', exact: true }).click();
  await page.getByRole('button', { name: 'Ya, reset demo', exact: true }).click();
  await expect(page).toHaveURL(/login/);
  await login(page, 'campus-001');
  await page.goto('/campus/proposal');
  await expect(page.locator('iframe')).toHaveAttribute('src', /^blob:/);
  await expect(page.locator('iframe')).not.toHaveAttribute('title', 'Pratinjau demo-upload.pdf');
  expect(await page.evaluate(() => localStorage.getItem('unrelated-demo-test'))).toBe('keep');
  expect(forbidden).toEqual([]);
  expect(errors).toEqual([]);
});
test('admin and campus routes render on direct navigation without API requests', async ({
  page
}) => {
  const errors: string[] = [],
    api: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (r) => {
    if (r.url().includes('/api/')) api.push(r.url());
  });
  for (const role of ['admin', 'campus']) {
    await login(page, role === 'admin' ? 'admin-1' : 'campus-001');
    const routes =
      role === 'admin'
        ? [
            'dashboard',
            'campuses',
            'campuses?tab=accounts',
            'master-indicators',
            'verifikasi',
            'sebaran',
            'proposal',
            'questions',
            'faq',
            'notifications'
          ]
        : ['dashboard', 'indicators', 'proposal', 'questions', 'faq', 'notifications', 'guide'];
    for (const route of routes) {
      await page.goto(`/${role}/${route}`);
      await expect(page.locator('main')).toBeVisible();
      await expect(page.locator('h1').first()).toBeVisible();
      await expect(page.getByText('Data demo tidak ditemukan.', { exact: true })).toHaveCount(0);
    }
    await logout(page);
  }
  expect(errors).toEqual([]);
  expect(api).toEqual([]);
});
test('period rollover keeps archived values and copies baseline/target for fresh campus input', async ({
  page
}) => {
  await login(page, 'admin-1');
  await page.goto('/admin/verifikasi');
  for (let i = 0; i < 6; i++) {
    await page.getByLabel('Catatan keputusan').fill('Revisi demo sebelum pergantian periode');
    await page.getByRole('button', { name: 'Minta Revisi', exact: true }).click();
    await page.getByRole('button', { name: 'Konfirmasi keputusan', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }
  await page.goto('/admin/master-indicators');
  await page.getByRole('button', { name: 'Periode baru', exact: true }).click();
  await page.getByLabel('Nama periode').fill('Semester I 2027 Demo');
  await page.getByRole('button', { name: 'Buat draft periode', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByLabel('Kelola periode').selectOption('Semester I 2027 Demo');
  await page.getByRole('button', { name: 'Buka periode', exact: true }).click();
  await page.getByRole('button', { name: 'Ya, buka periode', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await logout(page);
  await login(page, 'campus-001');
  await page.goto('/campus/indicators');
  await expect(page.getByRole('spinbutton').first()).toHaveValue('');
  await page.getByRole('spinbutton').first().fill('0');
  await page.getByRole('spinbutton').first().blur();
  await expect(
    page.getByRole('status').filter({ hasText: 'Semua perubahan indikator tersimpan.' })
  ).toBeVisible();
  await page.reload();
  await expect(page.getByRole('spinbutton').first()).toHaveValue('0');
  const states = await page.evaluate(
    () =>
      new Promise<any>((resolve, reject) => {
        const request = indexedDB.open('deb-standalone-demo-v1');
        request.onsuccess = () => {
          const db = request.result;
          const get = db.transaction('state').objectStore('state').get('current');
          get.onsuccess = () => {
            resolve(get.result.data);
            db.close();
          };
          get.onerror = () => reject(get.error);
        };
      })
  );
  const original = states.definitions.filter((d: any) => d.period === '');
  const next = states.definitions.filter((d: any) => d.period === 'Semester I 2027 Demo');
  expect(original.every((d: any) => d.periodState === 'archived')).toBe(true);
  expect(next.map((d: any) => [d.code, d.baseline, d.target])).toEqual(
    original.map((d: any) => [d.code, d.baseline, d.target])
  );
  expect(
    states.indicators.some(
      (i: any) => original.some((d: any) => d.id === i.definitionId) && i.current > 0
    )
  ).toBe(true);
});
test('forum conversation and account edits persist in the demo', async ({ page }) => {
  const api: string[] = [];
  page.on('request', (r) => {
    if (r.url().includes('/api/')) api.push(r.url());
  });
  await login(page, 'campus-001');
  await page.goto('/campus/questions');
  await page.getByRole('button', { name: 'Ajukan pertanyaan', exact: true }).click();
  await page.getByLabel('Judul pertanyaan', { exact: true }).fill('Pertanyaan demo mandiri');
  await page.getByLabel('Uraian pertanyaan').fill('Bagaimana mencoba periode baru?');
  await page.getByRole('button', { name: 'Bagikan pertanyaan', exact: true }).click();
  await expect(page).toHaveURL(/\/questions\/.+/);
  const question = new URL(page.url()).pathname.split('/').at(-1);
  await logout(page);
  await login(page, 'admin-1');
  await page.goto('/admin/questions/' + question);
  await page
    .getByLabel('Jawaban untuk semua kampus')
    .fill('Admin dapat membuka periode setelah review selesai.');
  await page.getByRole('button', { name: 'Simpan jawaban', exact: true }).click();
  await expect(
    page.getByText('Admin dapat membuka periode setelah review selesai.', { exact: true })
  ).toBeVisible();
  await page.goto('/admin/campuses?tab=accounts');
  await page.getByRole('button', { name: 'Ubah PIC Universitas Indonesia', exact: true }).click();
  await page.getByLabel('Nama PIC Universitas Indonesia', { exact: true }).fill('PIC Demo Diubah');
  await page.getByRole('button', { name: /Simpan perubahan/ }).click();
  await page.reload();
  await expect(page.getByText('PIC Demo Diubah', { exact: true })).toBeVisible();
  await logout(page);
  await login(page, 'campus-001');
  await page.goto('/campus/questions/' + question);
  await expect(
    page.getByText('Admin dapat membuka periode setelah review selesai.', { exact: true })
  ).toBeVisible();
  await page
    .getByPlaceholder('Tuliskan pertanyaan lanjutan atau penjelasan…')
    .fill('Baik, terima kasih admin.');
  await page.getByRole('button', { name: 'Kirim balasan', exact: true }).click();
  await expect(page.getByText('Baik, terima kasih admin.', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('Baik, terima kasih admin.', { exact: true })).toBeVisible();
  expect(api).toEqual([]);
});
