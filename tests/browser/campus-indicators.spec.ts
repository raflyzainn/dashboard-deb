import { test, expect, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';

async function login(page: Page, key: string) {
  await page.goto('/login?qa=1');
  if (key.startsWith('admin')) await page.getByRole('button', { name: /Administrator/ }).click();
  await page.locator(`input[name="preview-account"][value="${key}"]`).check();
  await page.getByRole('button', { name: 'Buka ruang kerja', exact: true }).click();
  await expect(page).toHaveURL(/\/(campus|admin)\/dashboard$/);
}

test('indicator list opens read only; explicit save keeps failed drafts; verified submission hides editing', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await login(page, 'campus-001');
  await page.goto('/campus/indicators');
  const cards = page.getByRole('article', { name: /^Indikator:/ });
  await expect(cards).toHaveCount(30);
  const first = cards.nth(0), second = cards.nth(1);
  const editButton = page.getByRole('button', { name: 'Ubah data indikator', exact: true });
  const saveButton = page.getByRole('button', { name: 'Simpan perubahan', exact: true });
  const cancelButton = page.getByRole('button', { name: 'Batal', exact: true });
  const bar = page.getByRole('region', { name: 'Simpan perubahan indikator' });
  const submission = page.getByRole('region', { name: 'Status pengajuan DEB' });
  const submit = page.getByRole('button', { name: /^Kirim( ulang)? untuk verifikasi$/ });
  const note = 'Catatan QA indikator ' + Date.now();
  const secondNote = 'Draft kedua ' + Date.now();

  // Read only first: no inputs until the edit action is used.
  await expect(cards.locator('input, textarea')).toHaveCount(0);
  await expect(bar).toHaveCount(0);
  await editButton.click();
  const value = first.getByRole('spinbutton');
  await expect(value).toBeVisible();
  await expect(saveButton).toBeDisabled();

  // A required value blocks the save and marks the row.
  await value.fill('');
  await first.getByRole('textbox').fill(note);
  await saveButton.click();
  await expect(first.getByRole('alert')).toContainText('Isi nilai aktual dengan angka nol atau lebih.');
  await expect(value).toBeVisible();
  await value.fill('0');
  await expect(first.getByRole('alert')).toHaveCount(0);
  await second.getByRole('textbox').fill(secondNote);
  await expect(bar).toContainText('2 indikator diubah');
  await expect(submit).toBeDisabled();
  await expect(submission).toContainText('Simpan perubahan terlebih dahulu.');

  // Leaving with drafts asks through the dialog and keeps the page.
  await page.getByRole('link', { name: 'Forum Q&A', exact: true }).first().click();
  await expect(page.getByRole('dialog')).toContainText('Tinggalkan halaman?');
  await page.getByRole('button', { name: 'Lanjut mengubah', exact: true }).click();
  await expect(page).toHaveURL(/\/campus\/indicators$/);

  // Filters keep the drafts.
  const firstName = await first.getByRole('heading').innerText();
  await page.getByLabel('Cari indikator', { exact: true }).fill(firstName);
  await expect(cards).toHaveCount(1);
  await page.getByLabel('Cari indikator', { exact: true }).fill('');
  await expect(second.getByRole('textbox')).toHaveValue(secondNote);

  // "Batal" with drafts asks first.
  await cancelButton.click();
  await expect(page.getByRole('dialog')).toContainText('Buang perubahan?');
  await page.getByRole('button', { name: 'Lanjut mengubah', exact: true }).click();
  await expect(value).toHaveValue('0');

  // Failed rows stay in edit mode with their drafts and an inline message.
  await page.route('**/api/indicators/*', route => route.request().method() === 'PATCH' ? route.abort() : route.continue());
  await saveButton.click();
  await expect(first.getByRole('alert')).toBeVisible();
  await expect(second.getByRole('alert')).toBeVisible();
  await expect(bar).toContainText('2 indikator belum tersimpan');
  await expect(value).toHaveValue('0');
  await expect(first.getByRole('textbox')).toHaveValue(note);
  await expect(second.getByRole('textbox')).toHaveValue(secondNote);
  await page.unroute('**/api/indicators/*');

  // A successful save returns to read only text.
  await saveButton.click();
  await expect(editButton).toBeVisible();
  await expect(cards.locator('input, textarea')).toHaveCount(0);
  await expect(page.locator('.toast')).toContainText('2 indikator tersimpan.');
  await expect(first.getByRole('definition').first()).toContainText(/(^|\s)0(\s|$)/);
  await expect(first).toContainText(note);
  await expect(second).toContainText(secondNote);
  await expect(submit).toBeEnabled();
  await page.reload();
  await expect(cards.locator('input, textarea')).toHaveCount(0);
  await expect(first.getByRole('definition').first()).toContainText(/(^|\s)0(\s|$)/);
  await expect(first).toContainText(note);

  // "Batal" discards drafts after confirmation.
  await editButton.click();
  await first.getByRole('textbox').fill('Draf yang dibuang');
  await cancelButton.click();
  await page.getByRole('button', { name: 'Buang perubahan', exact: true }).click();
  await expect(cards.locator('input, textarea')).toHaveCount(0);
  await expect(first).toContainText(note);
  await expect(first).not.toContainText('Draf yang dibuang');

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

  // A pending verification hides the edit actions.
  await submit.click();
  await page.getByRole('button', { name: 'Kirim data DEB', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(editButton).toHaveCount(0);
  await expect(cards.locator('input, textarea')).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Data indikator' })).toContainText('Nilai indikator dikunci sampai ada keputusan.');
  await expect(submission).toContainText('Menunggu verifikasi');
  const state = await page.request.get('/api/views/indicators', { headers: { 'X-DEB-Preview': '1', 'X-DEB-Preview-Account': 'campus-001' } });
  const pendingSubmission = (await state.json()).data.submissions.find((s: { status: string }) => s.status === 'pending');
  expect(pendingSubmission).toBeTruthy();
  // Finish the review cycle through the real API so this disposable QA account remains editable on reruns.
  const decision = await page.request.post(`/api/submissions/${pendingSubmission.id}/review`, {
    headers: { Origin: new URL(page.url()).origin, 'X-DEB-Preview': '1', 'X-DEB-Preview-Account': 'admin-1', 'Idempotency-Key': randomUUID() },
    data: { decision: 'revision', note: 'QA selesai; kampus dapat melanjutkan perubahan.' }
  });
  expect(decision.status()).toBe(200);
  await page.reload();
  await expect(editButton).toBeEnabled();
  expect(errors).toEqual([]);
});

test('changes are written only by "Simpan perubahan", one indicator after another', async ({ page }) => {
  await login(page, 'campus-001');
  await page.goto('/campus/indicators');
  const cards = page.getByRole('article', { name: /^Indikator:/ });
  const first = cards.nth(0), second = cards.nth(1);
  const editButton = page.getByRole('button', { name: 'Ubah data indikator', exact: true });
  const saveButton = page.getByRole('button', { name: 'Simpan perubahan', exact: true });
  const bar = page.getByRole('region', { name: 'Simpan perubahan indikator' });
  const text = 'Simpan eksplisit QA ' + Date.now();
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
  await editButton.click();
  await first.getByRole('spinbutton').fill('1');
  await first.getByRole('textbox').fill(text);
  await second.getByRole('textbox').fill(text + ' kedua');
  // Typing alone never writes, however long the pause.
  await page.clock.fastForward(10000);
  expect(writes).toEqual([]);
  await expect(bar).toContainText('2 indikator diubah');

  await saveButton.click();
  await expect(bar).toContainText('Menyimpan perubahan');
  await expect.poll(() => writes).toEqual([text]);
  await expect(saveButton).toBeDisabled();
  await expect(first.getByRole('textbox')).toBeDisabled();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: '.qa/indicators-saving.png', fullPage: false });
  release();
  await expect(editButton).toBeVisible();
  expect(writes).toEqual([text, text + ' kedua']);
  await expect(page.locator('.toast')).toContainText('2 indikator tersimpan.');
  await page.clock.fastForward(4000);
  await expect(page.locator('.toast')).toHaveCount(0);
  await expect(first.getByRole('definition').first()).toContainText(/(^|\s)1(\s|$)/);
  await expect(first).toContainText(text);
  await expect(second).toContainText(text + ' kedua');
  await page.unroute('**/api/indicators/*');
  await page.reload();
  await expect(cards.locator('input, textarea')).toHaveCount(0);
  await expect(first).toContainText(text);
  await expect(second).toContainText(text + ' kedua');

  // The readiness block follows the same read only first flow.
  const readiness = page.locator('section', { has: page.getByRole('heading', { name: 'Indikator kesiapan rencana aksi' }) }).last();
  await expect(readiness.getByRole('textbox')).toHaveCount(0);
  await readiness.getByRole('button', { name: 'Ubah', exact: true }).click();
  await readiness.getByLabel('EBT eksisting', { exact: true }).fill(text + ' kesiapan');
  await readiness.getByRole('button', { name: 'Simpan perubahan', exact: true }).click();
  await expect(readiness.getByRole('textbox')).toHaveCount(0);
  await expect(readiness).toContainText(text + ' kesiapan');
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
