import { test, expect, type Page } from '@playwright/test';
import { samplePdf } from '../../src/lib/data/demo/fixtures/pdf';
import { DEMO_DATABASE } from '../../src/lib/data/demo/store';
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
  await expect(page.locator('iframe')).toHaveCSS('height', '620px');
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
    (database) =>
      new Promise<any>((resolve, reject) => {
        const request = indexedDB.open(database);
        request.onsuccess = () => {
          const db = request.result;
          const get = db.transaction('state').objectStore('state').get('current');
          get.onsuccess = () => {
            resolve(get.result.data);
            db.close();
          };
          get.onerror = () => reject(get.error);
        };
      }),
    DEMO_DATABASE
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
  await page.getByLabel('Cari kampus, PIC, atau email').fill('Universitas Sebelas Maret');
  await page.getByRole('button', { name: 'Ubah PIC 1 Universitas Sebelas Maret', exact: true }).click();
  await page
    .getByLabel('Nama PIC 1 Universitas Sebelas Maret', { exact: true })
    .fill('PIC Demo Diubah');
  await page.getByRole('button', { name: /Simpan perubahan/ }).click();
  await page.reload();
  await page.getByLabel('Cari kampus, PIC, atau email').fill('Universitas Sebelas Maret');
  await expect(page.getByText('PIC Demo Diubah', { exact: true })).toBeVisible();
  await logout(page);
  await login(page, 'campus-001');
  await page.goto('/campus/questions/' + question);
  await expect(
    page.getByText('Admin dapat membuka periode setelah review selesai.', { exact: true })
  ).toBeVisible();
  await page
    .getByPlaceholder(/Tuliskan pertanyaan lanjutan/)
    .fill('Baik, terima kasih admin.');
  await page.getByRole('button', { name: 'Kirim balasan', exact: true }).click();
  await expect(page.getByText('Baik, terima kasih admin.', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('Baik, terima kasih admin.', { exact: true })).toBeVisible();
  expect(api).toEqual([]);
});
test('admin manages two PIC emails per campus while demo login still lists 40 campuses', async ({
  page
}) => {
  const api: string[] = [];
  page.on('request', (r) => {
    if (r.url().includes('/api/')) api.push(r.url());
  });
  await page.goto('/login');
  await expect(page.locator('input[name="preview-account"]')).toHaveCount(40);
  await login(page, 'admin-1');
  await page.goto('/admin/campuses?tab=accounts');
  await page.getByLabel('Cari kampus, PIC, atau email').fill('Universitas Sebelas Maret');
  const group = page.getByRole('region', { name: 'PIC Universitas Sebelas Maret', exact: true });
  await expect(group.getByRole('article')).toHaveCount(2);
  for (const slot of [1, 2]) {
    await group
      .getByRole('button', { name: `Ubah PIC ${slot} Universitas Sebelas Maret`, exact: true })
      .click();
    await group
      .getByLabel(`Nama PIC ${slot} Universitas Sebelas Maret`, { exact: true })
      .fill(`Nama PIC ${slot} Test`);
    await group
      .getByLabel(`Email PIC ${slot} Universitas Sebelas Maret`, { exact: true })
      .fill(`pic${slot}@kampus.example.test`);
  }
  await page.getByRole('button', { name: /Simpan perubahan/ }).click();
  await page.getByRole('button', { name: 'Simpan email demo', exact: true }).click();
  await expect(page.getByText('Data PIC dan email tersimpan.', { exact: true })).toBeVisible();
  await page.reload();
  await page.getByLabel('Cari kampus, PIC, atau email').fill('Universitas Sebelas Maret');
  for (const slot of [1, 2]) {
    await expect(group.getByText(`Nama PIC ${slot} Test`, { exact: true })).toBeVisible();
    await expect(group.getByText(`pic${slot}@kampus.example.test`, { exact: true })).toBeVisible();
  }
  await group
    .getByRole('button', { name: 'Ubah PIC 2 Universitas Sebelas Maret', exact: true })
    .click();
  await group
    .getByLabel('Email PIC 2 Universitas Sebelas Maret', { exact: true })
    .fill('pic1@kampus.example.test');
  await expect(
    group.getByText('Email sudah digunakan akun PIC lain.', { exact: true })
  ).toBeVisible();
  await expect(page.getByRole('button', { name: /Simpan perubahan/ })).toBeDisabled();
  await group
    .getByRole('button', { name: 'Batal ubah PIC 2 Universitas Sebelas Maret', exact: true })
    .click();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '.qa/two-pic-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: '.qa/two-pic-desktop.png', fullPage: false });
  expect(api).toEqual([]);
});

test('spreadsheet action plan appears for the matching campus in the admin view', async ({ page }) => {
  await login(page, 'admin-1');
  await page.goto('/admin/campuses/campus-001');
  await expect(page.getByText('Program UNS', { exact: true })).toBeVisible();
  await expect(page.getByText(/Desa Sobokerto/).first()).toBeVisible();
  await expect(page.getByText(/PLTS \(3,5 KwP\)/)).toBeVisible();
  await expect(page.getByText('Pemetaan sosial', { exact: true })).toBeVisible();
  await expect(page.getByText('Kebutuhan intervensi', { exact: true })).toBeVisible();
});

test('admin review shows readiness indicators for the selected campus', async ({ page }) => {
  await login(page, 'admin-1');
  await page.goto('/admin/verifikasi');
  await expect(page.getByRole('region', { name: 'Indikator kesiapan rencana aksi' })).toBeVisible();
  await expect(page.getByText('Kebutuhan intervensi', { exact: true })).toBeVisible();
});

test('admin sets a target for one campus', async ({ page }) => {
  await login(page, 'admin-1');
  await page.goto('/admin/campuses/campus-001');
  await page.getByRole('button', { name: 'Indikator', exact: true }).click();
  await page.getByRole('button', { name: 'Lihat Pendapatan total', exact: true }).click();
  await page.getByLabel('Target kampus', { exact: true }).fill('777');
  await page.getByRole('button', { name: 'Simpan target kampus', exact: true }).click();
  await expect(page.getByText('Target kampus tersimpan.', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('777', { exact: true })).toBeVisible();
});

test('campus can edit readiness indicators and admin sees the saved value', async ({ page }) => {
  await login(page, 'campus-001');
  await page.goto('/campus/indicators');
  await page.getByLabel('Kelembagaan', { exact: true }).fill('BUMDes dan kelompok usaha aktif');
  await expect(
    page.getByRole('status').filter({ hasText: 'Indikator kesiapan tersimpan.' })
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Kelembagaan', { exact: true })).toHaveValue(
    'BUMDes dan kelompok usaha aktif'
  );
  await logout(page);
  await login(page, 'admin-1');
  await page.goto('/admin/campuses/campus-001');
  await expect(page.getByText('BUMDes dan kelompok usaha aktif', { exact: true })).toBeVisible();
});

test('campus dashboard shows its spreadsheet action plan', async ({ page }) => {
  await login(page, 'campus-001');
  await expect(page.getByText('RENCANA AKSI DEB', { exact: true })).toBeVisible();
  await expect(page.getByText(/Desa Sobokerto/).first()).toBeVisible();
  await page.goto('/campus/indicators');
  await expect(page.getByText('Indikator kesiapan rencana aksi', { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('campus indicator fields visibly mark required input', async ({ page }) => {
  await login(page, 'campus-001');
  await page.goto('/campus/indicators');
  await expect(page.getByText('Nilai aktual *', { exact: true })).toHaveCount(3);
  await expect(page.getByText('Catatan perkembangan *', { exact: true })).toHaveCount(3);
  const readiness = await page
    .getByRole('region', { name: 'Indikator kesiapan rencana aksi' })
    .locator('article')
    .allTextContents();
  expect(readiness).toHaveLength(9);
  expect(readiness.every((value) => value.includes('*'))).toBe(true);
});

test('submission status counts empty readiness fields', async ({ page }) => {
  await login(page, 'campus-001');
  await page.goto('/campus/indicators');
  await page.getByLabel('Perizinan lahan', { exact: true }).fill('');
  await page.getByLabel('Site survey', { exact: true }).fill('');
  await expect(page.getByRole('region', { name: 'Status pengajuan DEB' })).toContainText(
    'Lengkapi 2 indikator yang belum diisi.'
  );
});

test('campus and admin can edit source profile fields and save profile changes', async ({ page }) => {
  await login(page, 'campus-001');
  await page.goto('/campus/indicators');
  await expect(page.getByRole('region', { name: 'Pendamping dan kontak program' })).toHaveCount(0);
  await page.getByRole('link', { name: 'Profil Program', exact: true }).click();
  await expect(page).toHaveURL(/campus\/profile$/);
  await page.reload();
  const contacts = page.getByRole('region', { name: 'Pendamping dan kontak program' });
  for (const label of ['Mentor', 'Koordinator PFS 12', 'Local hero']) await expect(contacts.getByLabel(label, { exact: true })).toBeEditable();
  await contacts.getByLabel('Mentor', { exact: true }).fill('Mentor diubah oleh kampus');
  await expect(contacts.getByLabel('Subholding', { exact: true })).toBeVisible();
  for (const label of ['Subholding', 'Unit operasi Pertamina terdekat', 'Target kategori kelas', 'Template rencana aksi', 'Desa replikasi', 'Status pada sumber']) {
    await expect(contacts.getByLabel(label, { exact: true })).toBeEditable();
    await expect(contacts.getByLabel(label, { exact: true })).not.toHaveValue('');
  }
  await contacts.getByLabel('Subholding', { exact: true }).fill('Subholding isian kampus');
  await contacts.getByRole('button', { name: 'Simpan data program', exact: true }).click();
  await expect(contacts.getByRole('status')).toHaveText('Perubahan tersimpan.');
  await page.reload();
  await expect(contacts.getByLabel('Mentor', { exact: true })).toHaveValue('Mentor diubah oleh kampus');
  await expect(contacts.getByLabel('Subholding', { exact: true })).toBeVisible();
  await expect(contacts.getByLabel('Subholding', { exact: true })).toHaveValue('Subholding isian kampus');
  await contacts.getByLabel('Subholding', { exact: true }).fill('');
  await contacts.getByRole('button', { name: 'Simpan data program', exact: true }).click();
  await expect(contacts.getByRole('status')).toHaveText('Perubahan tersimpan.');
  await page.screenshot({ path: '.qa/excel-editable-campus.png', fullPage: true });
  await logout(page);
  await login(page, 'admin-1');
  await page.goto('/admin/campuses/campus-001');
  await expect(contacts.getByLabel('Mentor', { exact: true })).toHaveValue('Mentor diubah oleh kampus');
  await contacts.getByLabel('Local hero', { exact: true }).fill('Local hero diperbarui admin');
  await contacts.getByRole('button', { name: 'Simpan data program', exact: true }).click();
  await expect(contacts.getByRole('status')).toHaveText('Perubahan tersimpan.');
  await page.reload();
  await expect(contacts.getByLabel('Local hero', { exact: true })).toHaveValue('Local hero diperbarui admin');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await contacts.scrollIntoViewIfNeeded();
  await page.screenshot({ path: '.qa/excel-editable-mobile.png', fullPage: false });
});

test('one static demo PIC can activate from a simulated email and sign in with its password', async ({ page }) => {
  await page.goto('/login');
  await page.screenshot({ path: '.qa/demo-login-actions.png', fullPage: false });
  await page.getByRole('button', { name: 'Aktivasi akun demo', exact: true }).click();
  await page.getByLabel('Email PIC demo', { exact: true }).fill('pic.demo@deb.test');
  await page.getByRole('button', { name: 'Kirim tautan aktivasi', exact: true }).click();
  await expect(page.getByText('Email simulasi terkirim', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Buka tautan aktivasi demo', exact: true }).click();
  await expect(page.getByRole('list')).toContainText('Minimal 8 karakter');
  await expect(page.getByRole('list')).toContainText('Memuat huruf kapital');
  await expect(page.getByRole('list')).toContainText('Memuat angka');
  await page.screenshot({ path: '.qa/demo-activation-password.png', fullPage: false });
  await page.getByLabel('Password baru', { exact: true }).fill('Rahasia12');
  await page.getByLabel('Konfirmasi password', { exact: true }).fill('Rahasia12');
  for (const [field, label] of [['Password baru', 'password baru'], ['Konfirmasi password', 'konfirmasi password']]) {
    await page.getByRole('button', { name: `Tampilkan ${label}`, exact: true }).click();
    await expect(page.getByLabel(field, { exact: true })).toHaveAttribute('type', 'text');
    await page.getByRole('button', { name: `Sembunyikan ${label}`, exact: true }).click();
    await expect(page.getByLabel(field, { exact: true })).toHaveAttribute('type', 'password');
  }
  await page.getByRole('button', { name: 'Simpan password', exact: true }).click();
  await page.getByLabel('Password', { exact: true }).fill('Rahasia12');
  await page.getByRole('button', { name: 'Masuk dengan password', exact: true }).click();
  await expect(page).toHaveURL(/\/campus\/dashboard$/);
});
