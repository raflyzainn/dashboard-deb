import { test, expect } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';

// Requires the dedicated local fixtures from pelaporan-local.mjs --seed.
const baseURL = 'http://localhost:5177';
const paid = 'ca2b3094682c19e', unpaid = '2e3e698913043a8';
test.use({ baseURL, extraHTTPHeaders: { 'X-DEB-Preview': '1', 'X-DEB-Preview-Account': 'campus-952', Origin: baseURL } });

test('belum dibayar tidak bisa mengirim dan tidak bisa membaca kampus lain', async ({ page, request }) => {
  await page.goto('/campus/pelaporan');
  await expect(page.getByText('Pelaporan tersedia setelah pembayaran Tahap 1 tercatat.', { exact: false })).toBeVisible();
  expect((await request.get(`/api/pencairan/${paid}/pelaporan`)).status()).toBe(403);
  const save = await request.post(`/api/pencairan/${unpaid}/pelaporan`, { multipart: { kind: 'artikel', format: 'text', title: 'QA', body: 'QA', operationId: crypto.randomUUID(), expectedVersion: '0' } });
  expect(save.status()).toBe(409);
});

test('admin tidak bisa menyelesaikan LPJ kosong atau belum dibayar', async ({ playwright }) => {
  const request = await playwright.request.newContext({ baseURL, extraHTTPHeaders: { 'X-DEB-Preview': '1', 'X-DEB-Preview-Account': 'admin-1', Origin: baseURL } });
  expect((await request.patch(`/api/pencairan/${unpaid}/lpj`, { data: { action: 'complete' } })).status()).toBe(409);
  await request.dispose();
});

test('kampus tidak dapat memberi keputusan review admin', async ({ playwright }) => {
  const request = await playwright.request.newContext({ baseURL, extraHTTPHeaders: { 'X-DEB-Preview': '1', 'X-DEB-Preview-Account': 'campus-951', Origin: baseURL } });
  const result = await request.patch(`/api/pencairan/${paid}/pelaporan/abcdefghijklmno`, { data: { action: 'sesuai' } });
  expect(result.status()).toBe(403);
  await request.dispose();
});

test('Keluaran dan LPJ tampil bersama tanpa tab dan mempertahankan draf', async ({ browser }) => {
  const context = await browser.newContext({ baseURL, extraHTTPHeaders: { 'X-DEB-Preview': '1', 'X-DEB-Preview-Account': 'campus-951' } });
  const page = await context.newPage();
  await page.goto('/campus/pelaporan');
  const article = page.getByRole('region', { name: 'Artikel', exact: true });
  await expect(article).toBeVisible();
  test.skip(await article.getByRole('combobox').count() === 0, 'Fixture artikel sedang diperiksa.');
  await article.getByRole('combobox').selectOption('text');
  await article.locator('textarea').fill('Draf tidak hilang ketika berpindah bagian.');
  await expect(page.getByRole('tablist')).toHaveCount(0);
  await page.locator('#lpj').scrollIntoViewIfNeeded();
  await expect(page.locator('#lpj')).toBeVisible();
  await expect(article).toBeVisible();
  await article.scrollIntoViewIfNeeded();
  await expect(article.locator('textarea')).toHaveValue('Draf tidak hilang ketika berpindah bagian.');
  await expect(page.locator('#lpj')).toBeVisible();
  await context.close();
});

test('versi bersamaan hanya satu tersimpan dan retry tidak menggandakan', async ({ playwright }) => {
  const request = await playwright.request.newContext({ baseURL, extraHTTPHeaders: { 'X-DEB-Preview': '1', 'X-DEB-Preview-Account': 'campus-951', Origin: baseURL } });
  const url = `/api/pencairan/${paid}/pelaporan`, before = await (await request.get(url)).json();
  test.skip(before.latest.artikel?.status === 'menunggu_review', 'Fixture artikel sedang diperiksa; gunakan fixture terbuka.');
  const expectedVersion = before.latest.artikel?.version || 0;
  const input = { kind: 'artikel', format: 'text', title: 'QA transaksi', body: 'Satu versi aktif.', expectedVersion: String(expectedVersion) };
  const ids = [crypto.randomUUID(), crypto.randomUUID()];
  const results = await Promise.all(ids.map(operationId => request.post(url, { multipart: { ...input, operationId } })));
  expect(results.map(r => r.status()).sort()).toEqual([201, 409]);
  expect((await request.post(url, { multipart: { ...input, operationId: ids[results.findIndex(r => r.status() === 201)] } })).status()).toBe(201);
  expect((await (await request.get(url)).json()).latest.artikel.version).toBe(expectedVersion + 1);
  await request.dispose();
});

test('retry bukti tidak menggandakan; completion bersamaan tidak menerima bukti pending', async ({ playwright }) => {
  const headers = { 'X-DEB-Preview': '1', 'X-DEB-Preview-Account': 'admin-1', Origin: baseURL };
  const request = await playwright.request.newContext({ baseURL, extraHTTPHeaders: headers });
  const url = `/api/pencairan/${paid}/lpj`;
  await request.patch(url, { data: { action: 'reopen', reason: 'Fixture QA konkurensi' } });
  const before = await (await request.get(url)).json();
  for (const e of before.entries) if (e.status !== 'sesuai') expect((await request.patch(`${url}/${e.id}`, { data: { status: 'sesuai', expectedRevision: e.revision } })).status()).toBe(200);
  const pdf = await PDFDocument.create(); pdf.addPage();
  const operationId = crypto.randomUUID(), reference = `QA-${operationId.slice(0, 8)}`;
  const input = { operationId, reference, date: '2026-10-14', payee: 'QA Lokal', amount: '100', file: { name: 'bukti.pdf', mimeType: 'application/pdf', buffer: Buffer.from(await pdf.save()) } };
  const raced = await Promise.all([request.post(url, { multipart: input }), request.patch(url, { data: { action: 'complete' } })]);
  expect(raced.some(r => r.status() === 409)).toBe(true);
  const state = await (await request.get(url)).json();
  expect(Boolean(state.completion) && state.entries.some((e: { status: string }) => e.status !== 'sesuai')).toBe(false);
  if (raced[0].status() === 201) {
    expect((await request.post(url, { multipart: input })).status()).toBe(201);
    const final = await (await request.get(url)).json();
    expect(final.entries.filter((e: { reference: string }) => e.reference === reference)).toHaveLength(1);
  }
  await request.dispose();
});

test('LPJ lengkap perlu aksi admin dan reopen wajib alasan', async ({ playwright }) => {
  const request = await playwright.request.newContext({ baseURL, extraHTTPHeaders: { 'X-DEB-Preview': '1', 'X-DEB-Preview-Account': 'admin-1', Origin: baseURL } });
  const url = `/api/pencairan/${paid}/lpj`;
  expect((await request.patch(url, { data: { action: 'reopen', reason: '' } })).status()).toBe(400);
  await request.patch(url, { data: { action: 'reopen', reason: 'QA penyelesaian LPJ' } });
  const state = await (await request.get(url)).json();
  test.skip(!state.entries.length, 'Jalankan fixture alur bukti terlebih dahulu.');
  const first = state.entries[0];
  await request.patch(`${url}/${first.id}`, { data: { status: 'perlu_revisi', note: 'QA gate', expectedRevision: first.revision } });
  expect((await request.patch(url, { data: { action: 'complete' } })).status()).toBe(409);
  const revision = await (await request.get(url)).json();
  for (const e of revision.entries) if (e.status !== 'sesuai') await request.patch(`${url}/${e.id}`, { data: { status: 'sesuai', expectedRevision: e.revision } });
  const ready = await (await request.get(url)).json();
  expect(ready.canComplete).toBe(true);
  expect(ready.t2Ready).toBe(false);
  expect((await request.patch(url, { data: { action: 'complete' } })).status()).toBe(200);
  const complete = await (await request.get(url)).json();
  expect(complete.t2Ready).toBe(true);
  expect((await request.patch(`${url}/${complete.entries[0].id}`, { data: { status: 'perlu_revisi', note: 'QA lock', expectedRevision: complete.entries[0].revision } })).status()).toBe(409);
  await request.patch(url, { data: { action: 'reopen', reason: 'QA buka kembali' } });
  expect((await (await request.get(url)).json()).t2Ready).toBe(false);
  await request.dispose();
});
