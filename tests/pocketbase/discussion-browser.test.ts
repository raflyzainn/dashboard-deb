import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { chromium, expect, type Page } from '@playwright/test';
import { LOCAL, ROOT, provisionInstance, migrate, start } from '../../scripts/pocketbase/runtime';
import { seedLocal } from '../../scripts/pocketbase/seed';

// Explicit opt-in test: disposable QA database on 8097, frontend on 5177.
test('QA local browser discussion across campus and admin sessions', { timeout: 240000 }, async () => {
  await mkdir(path.join(LOCAL, 'tests'), { recursive: true });
  await mkdir(path.join(ROOT, '.qa'), { recursive: true });
  const instance = await provisionInstance(await mkdtemp(path.join(LOCAL, 'tests', 'discussion-ui-')), 'test');
  await migrate(instance);
  const pb = await start(instance);
  const origin = 'http://127.0.0.1:5177';
  let vite: ReturnType<typeof spawn> | undefined;
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  try {
    await seedLocal(instance);
    vite = spawn(process.execPath, [path.join(ROOT, 'node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', '5177', '--strictPort'], {
      cwd: ROOT, windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'], env: { ...process.env, PB_URL: instance.url, DEB_LOCAL_INSTANCE_DIR: instance.directory, DEB_LOCAL_PREVIEW_ENABLED: 'true' }
    });
    for (let i = 0; i < 100; i++) {
      if (vite.exitCode !== null) throw new Error('Isolated Vite failed to start');
      try { if ((await fetch(origin + '/login')).ok) break; } catch { /* Starting */ }
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    browser = await chromium.launch({ headless: true, channel: 'chrome' });
    const contexts = await Promise.all([0, 1, 2, 3].map(() => browser!.newContext({ viewport: { width: 1366, height: 1000 } })));
    const [campus, admin, other, list] = await Promise.all(contexts.map(c => c.newPage()));
    const errors: string[] = [];
    for (const p of [campus, admin, other, list]) p.on('pageerror', e => errors.push(e.message));
    const login = async (page: Page, key: string) => {
      await page.goto(origin + '/login?qa=1');
      if (key.startsWith('admin')) await page.getByRole('button', { name: /Administrator/ }).click();
      await page.locator(`input[name="preview-account"][value="${key}"]`).check();
      await page.getByRole('button', { name: 'Buka ruang kerja' }).click();
      await expect(page).toHaveURL(/\/(campus|admin)\/dashboard$/, { timeout: 20000 });
    };
    await login(campus, 'campus-039'); await login(admin, 'admin-1');
    await login(other, 'campus-040'); await login(list, 'admin-2');
    await campus.goto(origin + '/campus/questions');
    await campus.getByRole('button', { name: 'Ajukan pertanyaan', exact: true }).click();
    const title = 'QA diskusi proposal ' + randomUUID().slice(0, 8);
    await campus.getByLabel('Judul pertanyaan').fill(title);
    await campus.getByLabel('Uraian pertanyaan').fill('Bagaimana mengetahui perkembangan review proposal kami?');
    await campus.getByRole('button', { name: 'Bagikan pertanyaan' }).click();
    await expect(campus).toHaveURL(/\/campus\/questions\/[a-z0-9]{15}$/, { timeout: 15000 });
    const id = campus.url().split('/').at(-1)!;
    await expect(campus.getByLabel('Balasan Anda')).toHaveCount(0);
    await admin.goto(origin + '/admin/questions/' + id);
    await admin.getByLabel('Jawaban untuk semua kampus').fill('Proposal diperiksa berkala. Perkembangan review tersedia di halaman Proposal.');
    await admin.getByRole('button', { name: 'Simpan jawaban', exact: true }).click();
    await expect(campus.getByLabel('Balasan Anda')).toBeVisible({ timeout: 15000 });
    await other.goto(origin + '/campus/questions/' + id);
    await expect(other.getByText('Diskusi dilanjutkan oleh kampus penanya dan Admin PF.')).toBeVisible();
    await expect(other.getByLabel('Balasan Anda')).toHaveCount(0);
    await list.goto(origin + '/admin/questions');
    await list.getByRole('button', { name: 'Menunggu tanggapan admin', exact: true }).click();
    await expect(list.getByRole('heading', { name: title })).toHaveCount(0);
    await admin.getByLabel('Balasan Anda').fill('Draf penjelasan yang sedang disiapkan admin');
    const notificationLabel = await admin.getByRole('link', { name: /^Notifikasi, / }).getAttribute('aria-label');
    await campus.getByLabel('Balasan Anda').fill('Apakah ada perkiraan waktu review untuk proposal kami?');
    await campus.getByRole('button', { name: 'Kirim balasan' }).click();
    await expect(admin.locator('.content').getByText('Apakah ada perkiraan waktu review untuk proposal kami?', { exact: true })).toBeVisible({ timeout: 15000 });
    await expect(admin.getByLabel('Balasan Anda')).toHaveValue('Draf penjelasan yang sedang disiapkan admin');
    await expect(admin.getByRole('link', { name: /^Notifikasi, / })).not.toHaveAttribute('aria-label', notificationLabel!, { timeout: 20000 });
    await expect(list.getByRole('heading', { name: title })).toBeVisible({ timeout: 15000 });
    await admin.getByRole('button', { name: 'Balas pesan 1', exact: true }).click();
    await admin.getByLabel('Balasan Anda').fill('Review ditargetkan selesai dalam tujuh hari kerja. Kami akan memberi kabar jika ada dokumen tambahan.');
    await admin.getByRole('button', { name: 'Kirim balasan' }).click();
    await expect(campus.locator('.message > .reply-body').getByText('Review ditargetkan selesai dalam tujuh hari kerja. Kami akan memberi kabar jika ada dokumen tambahan.', { exact: true })).toBeVisible({ timeout: 15000 });
    await expect(list.getByRole('heading', { name: title })).toHaveCount(0, { timeout: 15000 });
    await expect(campus.locator('.reply blockquote').filter({ hasText: 'Apakah ada perkiraan waktu' })).toHaveCount(1);
    // The first request reaches PocketBase but its response is lost. Retrying must use the same operation key.
    const endpoint = '**/api/questions/' + id + '/replies';
    let dropped = false;
    await campus.route(endpoint, async route => {
      if (route.request().method() === 'POST' && !dropped) {
        dropped = true; await route.fetch(); await route.abort();
      } else await route.continue();
    });
    const correction = 'Terima kasih, kami akan menunggu kabar selanjutnya.';
    await campus.getByLabel('Balasan Anda').fill(correction);
    await campus.getByRole('button', { name: 'Kirim balasan' }).click();
    await expect(campus.getByRole('alert')).toBeVisible();
    await expect(campus.getByLabel('Balasan Anda')).toHaveValue(correction);
    await campus.getByRole('button', { name: 'Kirim balasan' }).click();
    await expect(campus.getByLabel('Balasan Anda')).toHaveValue('');
    await expect(campus.locator('.message > .reply-body').filter({ hasText: correction })).toHaveCount(1);
    await campus.unroute(endpoint);
    const headers = { 'X-DEB-Preview': '1', 'X-DEB-Preview-Account': 'campus-039' };
    const response = await campus.request.get(origin + '/api/questions/' + id + '/replies', { headers });
    assert.equal((await response.json()).items.length, 3);
    await expect(campus.getByRole('button', { name: 'Kirim balasan', exact: true })).toBeVisible();
    await campus.evaluate(() => { (document.activeElement as HTMLElement)?.blur(); window.scrollTo(0, 0); });
    await campus.screenshot({ fullPage: true, path: path.join(ROOT, '.qa/discussion-desktop.png') });
    await campus.setViewportSize({ width: 390, height: 844 });
    assert.equal(await campus.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await campus.evaluate(() => { (document.activeElement as HTMLElement)?.blur(); window.scrollTo(0, 0); });
    await campus.screenshot({ fullPage: true, path: path.join(ROOT, '.qa/discussion-mobile.png') });
    const firstReply = (await response.json()).items[0].id;
    for (let n = 0; n < 51; n++) {
      const sent = await campus.request.post(origin + '/api/questions/' + id + '/replies', {
        headers: { ...headers, Origin: origin, 'Idempotency-Key': randomUUID() }, data: { body: 'QA pagination ' + n }
      });
      assert.equal(sent.status(), 200);
    }
    await campus.reload();
    await expect(campus.locator('.reply')).toHaveCount(50);
    await campus.getByRole('button', { name: 'Muat balasan sebelumnya' }).click();
    await expect(campus.locator('.reply')).toHaveCount(54);
    assert.deepEqual(await campus.locator('.reply-number').allTextContents(), Array.from({ length: 54 }, (_, i) => 'Balasan #' + (i + 1)));
    // A navigation during polling cannot put the previous thread's data on another page.
    await campus.goto(origin + '/campus/faq');
    await expect(campus.getByLabel('Balasan Anda')).toHaveCount(0);
    await campus.goto(origin + '/campus/questions/' + id + '#reply-' + firstReply);
    await expect(campus.locator('#reply-' + firstReply)).toBeInViewport({ timeout: 15000 });
    assert.deepEqual(errors, []);
    console.log('QA local: threaded UI, automatic updates, preserved draft, filters, quote, retry deduplication and mobile overflow passed.');
  } finally {
    await browser?.close(); vite?.kill(); pb.kill();
  }
});
