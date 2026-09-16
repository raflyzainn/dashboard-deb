import { test, expect, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';

async function login(page: Page, key: string) {
  await page.goto('/login?qa=1');
  if (key.startsWith('admin')) await page.getByRole('button', { name: /Administrator/ }).click();
  await page.locator(`input[name="preview-account"][value="${key}"]`).check();
  await page.getByRole('button', { name: 'Buka ruang kerja', exact: true }).click();
  await expect(page).toHaveURL(/\/(campus|admin)\/dashboard$/);
}

test('inline indicator drafts survive failures and other saves; verified submission locks inputs', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await login(page, 'campus-001');
  await page.goto('/campus/indicators');
  await page.clock.install({ time: new Date('2026-09-16T03:00:00Z') });
  await page.clock.pauseAt(new Date('2026-09-16T03:00:01Z'));
  const cards = page.getByRole('article', { name: /^Indikator:/ });
  await expect(cards).toHaveCount(30);
  const first = cards.nth(0), second = cards.nth(1);
  const submit = page.getByRole('button', { name: /^Kirim( ulang)? untuk verifikasi$/ });
  const note = 'Catatan QA indikator inline ' + Date.now();
  const secondNote = 'Draft kedua ' + Date.now();
  const value = first.getByRole('spinbutton');
  await value.fill('');
  await expect(first.getByRole('button', { name: 'Simpan perubahan', exact: true })).toBeDisabled();
  await value.fill('0');
  await first.getByRole('textbox').fill(note);
  await second.getByRole('textbox').fill(secondNote);
  await expect(submit).toBeDisabled();
  page.once('dialog', dialog => dialog.dismiss());
  await page.getByRole('link', { name: 'Forum Q&A', exact: true }).first().click();
  await expect(page).toHaveURL(/\/campus\/indicators$/);
  const firstName = await first.getByRole('heading').innerText();
  await page.getByLabel('Cari indikator', { exact: true }).fill(firstName);
  await expect(cards).toHaveCount(1);
  await page.getByLabel('Cari indikator', { exact: true }).fill('');
  await expect(second.getByRole('textbox')).toHaveValue(secondNote);
  await page.route('**/api/indicators/*', route => route.request().method() === 'PATCH' ? route.abort() : route.continue());
  await first.getByRole('button', { name: 'Simpan perubahan', exact: true }).click();
  await expect(page.locator('.global-error')).toBeVisible();
  await expect(value).toHaveValue('0');
  await expect(first.getByRole('textbox')).toHaveValue(note);
  await page.unroute('**/api/indicators/*');
  await first.getByRole('button', { name: 'Simpan perubahan', exact: true }).click();
  await expect(first.getByRole('button', { name: 'Simpan perubahan', exact: true })).toBeDisabled();
  await expect(second.getByRole('textbox')).toHaveValue(secondNote);
  await expect(submit).toBeDisabled();
  await second.getByRole('button', { name: 'Simpan perubahan', exact: true }).click();
  await expect(submit).toBeEnabled();
  await page.reload();
  await expect(value).toHaveValue('0');
  await expect(first.getByRole('textbox')).toHaveValue(note);
  await page.setViewportSize({ width: 320, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '.qa/indicators-mobile.png', fullPage: false });
  await first.scrollIntoViewIfNeeded();
  await page.screenshot({ path: '.qa/indicators-mobile-card.png', fullPage: false });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: '.qa/indicators-desktop.png', fullPage: false });
  await submit.click();
  await page.getByRole('button', { name: 'Kirim data DEB', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(value).toBeDisabled();
  await expect(first.getByRole('textbox')).toBeDisabled();
  await expect(page.getByRole('region', { name: 'Status pengajuan DEB' })).toContainText('Menunggu verifikasi');
  const state = await page.request.get('/api/views/indicators', { headers: { 'X-DEB-Preview': '1', 'X-DEB-Preview-Account': 'campus-001' } });
  const submission = (await state.json()).data.submissions.find((s: { status: string }) => s.status === 'pending');
  expect(submission).toBeTruthy();
  // Finish the review cycle through the real API so this disposable QA account remains editable on reruns.
  const decision = await page.request.post(`/api/submissions/${submission.id}/review`, {
    headers: { Origin: new URL(page.url()).origin, 'X-DEB-Preview': '1', 'X-DEB-Preview-Account': 'admin-1', 'Idempotency-Key': randomUUID() },
    data: { decision: 'revision', note: 'QA selesai; kampus dapat melanjutkan perubahan.' }
  });
  expect(decision.status()).toBe(200);
  await page.reload();
  await expect(value).toBeEnabled();
  expect(errors).toEqual([]);
});

test('autosave debounces edits and preserves changes typed during a save or failed request', async ({ page }) => {
  await login(page, 'campus-001');
  await page.goto('/campus/indicators');
  const first = page.getByRole('article', { name: /^Indikator:/ }).first();
  const note = first.getByRole('textbox');
  const status = page.getByRole('status', { name: 'Status penyimpanan' });
  const text = 'Autosave QA ' + Date.now();
  await page.clock.install({ time: new Date('2026-09-16T03:00:00Z') });
  await page.clock.pauseAt(new Date('2026-09-16T03:00:01Z'));
  const writes: string[] = [];
  let release: () => void = () => {};
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/indicators/*', async route => {
    if (route.request().method() === 'PATCH') {
      writes.push(route.request().postDataJSON().note);
      await held;
    }
    await route.continue();
  });
  await first.getByRole('spinbutton').fill('1');
  await note.fill(text);
  await page.clock.fastForward(1500);
  await note.fill(text + ' kedua');
  await page.clock.fastForward(1500);
  expect(writes).toEqual([]);
  await page.clock.fastForward(500);
  await expect(status).toContainText('Menyimpan');
  await expect.poll(() => writes).toEqual([text + ' kedua']);
  const floatingBar = page.getByRole('region', { name: 'Status pengajuan DEB' });
  await expect(floatingBar.getByRole('img', { name: 'Menyimpan…', exact: true })).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: '.qa/indicators-autosave-saving.png', fullPage: false });
  await expect(note).toBeEnabled();
  await note.fill(text + ' terbaru');
  release();
  await expect(status).toContainText('Menunggu');
  await expect(note).toHaveValue(text + ' terbaru');
  await page.clock.fastForward(2000);
  await expect(status).toContainText('Semua perubahan tersimpan');
  expect(writes).toEqual([text + ' kedua', text + ' terbaru']);
  await expect(floatingBar.getByRole('img', { name: 'Semua perubahan tersimpan', exact: true })).toBeVisible();
  const second = page.getByRole('article', { name: /^Indikator:/ }).nth(1);
  await first.getByRole('spinbutton').fill('');
  await second.getByRole('textbox').fill(text + ' indikator kedua');
  await page.clock.fastForward(2000);
  await expect.poll(() => writes.length).toBe(3);
  await expect(status).toContainText('Lengkapi nilai aktual');
  await expect(first.getByRole('spinbutton')).toHaveValue('');
  await first.getByRole('spinbutton').fill('0');
  await page.clock.fastForward(2000);
  await expect(status).toContainText('Semua perubahan tersimpan');
  await expect(page.locator('.toast')).toContainText('tersimpan');
  await page.clock.fastForward(4000);
  await expect(page.locator('.toast')).toHaveCount(0);
  await expect(floatingBar.getByRole('img', { name: 'Semua perubahan tersimpan', exact: true })).toBeVisible();
  await page.reload();
  await expect(note).toHaveValue(text + ' terbaru');
  await expect(second.getByRole('textbox')).toHaveValue(text + ' indikator kedua');
  await page.unroute('**/api/indicators/*');
  await page.route('**/api/indicators/*', route => route.request().method() === 'PATCH' ? route.abort() : route.continue());
  await note.fill(text + ' gagal');
  await page.clock.fastForward(2000);
  await expect(status).toContainText('Gagal menyimpan');
  await expect(note).toHaveValue(text + ' gagal');
  await page.unroute('**/api/indicators/*');
  await first.getByRole('button', { name: 'Simpan perubahan', exact: true }).click();
  await expect(status).toContainText('Semua perubahan tersimpan');
  await page.reload();
  await expect(note).toHaveValue(text + ' gagal');
});

test('admin indicator review stays read-only after campus redesign', async ({ page }) => {
  await login(page, 'admin-1');
  const response = await page.request.get('/api/views/campuses', { headers: { 'X-DEB-Preview': '1', 'X-DEB-Preview-Account': 'admin-1' } });
  const { data } = await response.json();
  await page.goto(`/admin/campuses/${data.campuses[0].id}?tab=Indikator`);
  await page.getByRole('button', { name: /^Lihat / }).first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('spinbutton')).toHaveCount(0);
  await expect(dialog.getByRole('textbox', { name: 'Feedback baru' })).toBeVisible();
  await expect(page.locator('.global-error')).toHaveCount(0);
  await expect(page.getByRole('article', { name: /^Indikator:/ })).toHaveCount(0);
});
