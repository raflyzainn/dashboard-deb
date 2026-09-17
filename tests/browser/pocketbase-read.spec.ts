import { test, expect, type Page } from '@playwright/test';
import { adminClient, readJson, privateJson, password, credentialsPath, LOCAL, type LocalInstance, type Credentials } from '../../scripts/pocketbase/runtime';
import path from 'node:path';

const headers = (key = 'admin-1') => ({ 'X-DEB-Preview': '1', 'X-DEB-Preview-Account': key });
async function qa() { return adminClient(await readJson<LocalInstance>(path.join(LOCAL, 'e2e-instance.json'))); }
async function login(page: Page, key = 'admin-1') {
  await page.goto('/login');
  if (key.startsWith('admin')) await page.getByRole('button', { name: /Administrator/ }).click();
  await page.locator(`input[name="preview-account"][value="${key}"]`).check();
  await page.getByRole('button', { name: 'Buka ruang kerja' }).click();
  await expect(page).toHaveURL(new RegExp(`/${key.startsWith('admin') ? 'admin' : 'campus'}/dashboard$`));
  await expect(page.getByRole('region', { name: 'Status sumber data' })).toBeVisible();
}
async function boot(page: Page, key = 'admin-1') {
  const response = await page.request.get('/api/bootstrap', { headers: headers(key) });
  expect(response.status()).toBe(200);
  return response.json();
}

test('account picker searches campuses, handles empty results and works on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/login');
  await expect(page.locator('input[name="preview-account"]')).toHaveCount(40);
  await page.getByLabel('Cari kampus', { exact: true }).fill('hasanuddin');
  await expect(page.getByRole('radio')).toHaveCount(1);
  await page.getByRole('radio').check();
  await expect(page.locator('.selection-summary')).toContainText('Hasanuddin');
  await page.getByLabel('Cari kampus', { exact: true }).fill('tidak-ada-kampus-qa');
  await expect(page.getByText(/Tidak ditemukan\. Coba nama/)).toBeVisible();
  await page.getByLabel('Cari kampus', { exact: true }).fill('');
  await expect(page.getByRole('radio')).toHaveCount(40);
  await page.screenshot({ path: 'test-results/picker-mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: 'test-results/picker-desktop.png', fullPage: true });
  for (const viewport of [{ width: 1366, height: 768 }, { width: 1280, height: 720 }, { width: 1536, height: 864 }]) {
    await page.setViewportSize(viewport);
    await page.evaluate(() => scrollTo(0, 0));
    const panel = await page.locator('.login-form').boundingBox();
    expect(panel!.y).toBeGreaterThanOrEqual(0);
    expect(panel!.y + panel!.height).toBeLessThanOrEqual(viewport.height);
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true);
  }
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.screenshot({ path: 'test-results/picker-laptop.png', fullPage: true });
  await page.getByRole('button', { name: 'Buka ruang kerja' }).click();
  await expect(page).toHaveURL(/\/campus\/dashboard$/);
});

test('all admin read pages work with PocketBase and without IndexedDB', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    indexedDB.open = () => { throw new Error('IndexedDB must not be used'); };
    indexedDB.deleteDatabase = () => { throw new Error('Do not delete old browser data'); };
    sessionStorage.setItem('deb-demo-session', JSON.stringify({ role: 'campus', campusId: 'fake-campus' }));
  });
  await login(page);
  const snapshot = await boot(page);
  expect(snapshot.data.campuses).toHaveLength(40);
  expect(snapshot.data.indicators).toHaveLength(1200);
  expect(snapshot.data.proposals).toHaveLength(52);
  expect(snapshot.locations).toHaveLength(40);
  expect(JSON.stringify(snapshot)).not.toMatch(/password|tokenKey|@deb\.local\.test|superuser/i);
  expect(snapshot.capabilities.readOnly).toBe(false);
  const campus = snapshot.data.campuses[0].id;
  const question = snapshot.data.questions[0].id;
  for (const route of ['campuses', `campuses/${campus}`, 'verifikasi', 'proposal', 'questions', `questions/${question}`, 'faq', 'notifications', 'sebaran']) {
    await page.goto('/admin/' + route);
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.getByRole('region', { name: 'Status sumber data' })).toBeVisible();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Buka navigasi' }).click();
  await expect(page.locator('.mobile-drawer')).toBeVisible();
  await page.getByRole('button', { name: 'Tutup navigasi' }).click();
  expect(errors).toEqual([]);
});

test('campus scope, two admins, forged identity and direct files remain isolated', async ({ page, browser }) => {
  await login(page, 'campus-001');
  const a = await boot(page, 'campus-001');
  const contextB = await browser.newContext();
  const bPage = await contextB.newPage();
  try {
    await login(bPage, 'campus-002');
    const b = await boot(bPage, 'campus-002');
    expect(a.session.campusId).not.toBe(b.session.campusId);
    expect(a.data.indicators).toHaveLength(30);
    expect(b.data.indicators).toHaveLength(30);
    expect(a.data.questions).toHaveLength(6);
    expect(a.data.indicators.every((i: { campusId: string }) => i.campusId === a.session.campusId)).toBe(true);
    const forged = await page.request.get('/api/bootstrap?role=admin&campusId=' + b.session.campusId, { headers: { ...headers('campus-001'), 'X-Role': 'admin' } });
    expect((await forged.json()).session.campusId).toBe(a.session.campusId);
    expect((await page.request.get('/api/bootstrap', { headers: { 'X-DEB-Preview': '1' } })).status()).toBe(403);
    expect((await page.request.get('/api/bootstrap', { headers: headers('anything') })).status()).toBe(403);
    expect((await page.request.get('/api/bootstrap', { headers: { ...headers(), Origin: 'https://evil.example' } })).status()).toBe(403);
    expect((await page.request.post('/api/bootstrap', { headers: headers() })).status()).toBe(405);
    const instance = await readJson<LocalInstance>(path.join(LOCAL, 'e2e-instance.json'));
    const privateFile = credentialsPath(instance).replaceAll('\\', '/');
    expect([403, 404]).toContain((await page.request.get('/@fs/' + privateFile)).status());
    expect([403, 404]).toContain((await page.request.get('/.local/pocketbase/credentials.json')).status());
    const file = '/api/proposals/' + a.data.proposals[0].id + '/file';
    expect((await page.request.get(file, { headers: headers('campus-002') })).status()).toBe(404);
    const allowed = await page.request.get(file, { headers: headers('campus-001') });
    expect(allowed.status()).toBe(200);
    expect(allowed.headers()['cache-control']).toContain('no-store');
    expect((await allowed.body()).subarray(0, 5).toString()).toBe('%PDF-');
    const admin1 = await boot(page);
    const admin2 = await boot(page, 'admin-2');
    expect(admin1.data.notifications).toHaveLength(8);
    expect(admin2.data.notifications).toHaveLength(8);
    expect(admin1.data.notifications.some((n: { id: string }) => admin2.data.notifications.some((m: { id: string }) => m.id === n.id))).toBe(false);
    for (const route of ['indicators', 'proposal', 'questions', 'faq', 'notifications']) {
      await page.goto('/campus/' + route);
      await expect(page.locator('h1')).toBeVisible();
    }
    await page.goto('/admin/sebaran');
    await expect(page).toHaveURL(/\/campus\/dashboard$/);
  } finally { await contextB.close(); }
});

test('P3 controls are enabled with no backend reset action', async ({ page }) => {
  await login(page, 'campus-001');
  await page.goto('/campus/indicators');
  await expect(page.getByRole('button', { name: 'Kirim untuk verifikasi', exact: true })).toBeEnabled();
  await page.goto('/campus/proposal');
  await expect(page.getByRole('button', { name: 'Unggah versi baru' })).toBeEnabled();
  await page.goto('/campus/questions');
  await expect(page.getByRole('button', { name: 'Ajukan pertanyaan' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Reset data demo' })).toHaveCount(0);
});

test('database edits appear on refresh, failed refresh preserves same-account data, retry recovers', async ({ page }) => {
  const pb = await qa();
  const campus = await pb.collection('campuses').getFirstListItem('legacyId="campus-001"');
  await login(page, 'campus-001');
  try {
    await pb.collection('campuses').update(campus.id, { name: 'QA Perubahan PocketBase' });
    await expect(page.locator('.workspace').first()).not.toContainText('QA Perubahan PocketBase');
    await page.getByRole('button', { name: 'Muat ulang data' }).click();
    await expect(page.locator('.workspace').first()).toContainText('QA Perubahan PocketBase');
    await page.route('**/api/bootstrap', route => route.abort());
    await page.getByRole('button', { name: 'Muat ulang data' }).click();
    await expect(page.getByRole('region', { name: 'Status sumber data' })).toContainText('Pembaruan gagal');
    await expect(page.locator('.workspace').first()).toContainText('QA Perubahan PocketBase');
    await page.unroute('**/api/bootstrap');
    await page.getByRole('button', { name: 'Muat ulang data' }).click();
    await expect(page.getByRole('region', { name: 'Status sumber data' })).not.toContainText('Pembaruan gagal');
  } finally { await pb.collection('campuses').update(campus.id, { name: campus.name }); }
});

test('PDF preview, download and actual text comparison use protected PocketBase files', async ({ page }) => {
  await login(page, 'campus-001');
  await page.goto('/campus/proposal');
  await expect(page.getByRole('region', { name: 'Perbandingan proposal' })).toBeVisible();
  await expect(page.locator('.comparison')).toContainText('Versi 3');
  await expect(page.locator('.comparison')).not.toContainText('Membaca teks PDF', { timeout: 30000 });
  await expect(page.locator('.comparison')).toContainText('Versi 2');
  await page.getByRole('button', { name: 'Tukar versi perbandingan' }).click();
  await expect(page.locator('.comparison')).toContainText('Dasar: versi 3');
  await page.getByRole('button', { name: 'Lihat proposal', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('iframe')).toHaveAttribute('src', /^blob:/);
  const download = page.waitForEvent('download');
  await page.getByRole('link', { name: /Unduh/ }).click();
  expect((await download).suggestedFilename()).toMatch(/\.pdf$/);
});

test('real IDs, invalid coordinates and dynamic campus totals are handled', async ({ page }) => {
  const pb = await qa();
  const campus = await pb.collection('campuses').getFirstListItem('legacyId="campus-001"');
  let added = '';
  try {
    await pb.collection('campuses').update(campus.id, { latitude: 0, longitude: 0 });
    added = (await pb.collection('campuses').create({ name: 'QA Kampus Baru', source: 'user', initials: 'QA', region: 'QA', simulated: true })).id;
    await login(page);
    await page.goto('/admin/sebaran');
    await expect(page.locator('.map-dot')).toHaveCount(39);
    await expect(page.locator('.map-missing')).toContainText('2 kampus');
    await expect(page.locator('.map-stats')).toContainText('dari 41');
    await page.goto('/admin/campuses/' + campus.id);
    await expect(page.getByRole('heading', { name: campus.name, exact: true })).toBeVisible();
    await page.goto('/admin/campuses/nonexistent');
    await expect(page.getByText('Kampus tidak ditemukan', { exact: true })).toBeVisible();
  } finally {
    await pb.collection('campuses').update(campus.id, { latitude: campus.latitude, longitude: campus.longitude });
    if (added) await pb.collection('campuses').delete(added);
  }
});

test('inactive accounts and empty business data never fall back to browser mock', async ({ page }) => {
  const pb = await qa();
  const user = await pb.collection('users').getFirstListItem('legacyId="campus-040"');
  try {
    await pb.collection('users').update(user.id, { active: false });
    await page.goto('/login');
    await page.locator('input[value="campus-040"]').check();
    await page.getByRole('button', { name: 'Buka ruang kerja' }).click();
    await expect(page.locator('.login-form')).toContainText('Akun preview tidak aktif');
    await expect(page).toHaveURL(/\/login$/);
  } finally { await pb.collection('users').update(user.id, { active: true }); }
  // Campus 040 has no proposal in the real seed fixture, not a fabricated fallback.
  await login(page, 'campus-040');
  await page.goto('/campus/proposal');
  await expect(page.getByText('Proposal belum diunggah', { exact: true })).toBeVisible();
});

test('an empty campus workspace remains empty and a mismatched password is rejected', async ({ page }) => {
  const instance = await readJson<LocalInstance>(path.join(LOCAL, 'e2e-instance.json'));
  const pb = await adminClient(instance);
  const original = await readJson<Credentials>(credentialsPath(instance));
  const secret = password();
  let campusId = '', userId = '';
  try {
    campusId = (await pb.collection('campuses').create({ name: 'QA Kosong', initials: 'QA', source: 'user', region: 'QA', legacyId: 'campus-041', simulated: true })).id;
    userId = (await pb.collection('users').create({ name: 'QA Kosong', role: 'campus', campus: campusId, active: true, simulated: true, legacyId: 'campus-041', email: 'empty-qa@deb.local.test', password: secret, passwordConfirm: secret })).id;
    await privateJson(credentialsPath(instance), { ...original, users: { ...original.users, 'campus-041': { email: 'empty-qa@deb.local.test', password: secret } } });
    await login(page, 'campus-041');
    const data = (await boot(page, 'campus-041')).data;
    for (const name of ['indicators', 'proposals', 'feedback', 'submissions', 'activities', 'notifications']) expect(data[name]).toHaveLength(0);
    for (const route of ['dashboard', 'indicators', 'proposal', 'notifications']) {
      await page.goto('/campus/' + route);
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.getByRole('region', { name: 'Status sumber data' })).toBeVisible();
    }
    const changed = password();
    await pb.collection('users').update(userId, { password: changed, passwordConfirm: changed });
    expect((await page.request.get('/api/bootstrap', { headers: headers('campus-041') })).status()).toBe(403);
  } finally {
    if (userId) await pb.collection('users').delete(userId);
    if (campusId) await pb.collection('campuses').delete(campusId);
    await privateJson(credentialsPath(instance), original);
  }
});
