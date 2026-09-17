import { test, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

for (const role of ['admin', 'campus'] as const) test(`${role} pages render with scoped API payloads on desktop and mobile`, async ({ page }, info) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/login?qa=1');
  if (role === 'admin') await page.getByRole('button', { name: /Administrator/ }).click();
  await page.locator(`input[name="preview-account"][value="${role === 'admin' ? 'admin-1' : 'campus-010'}"]`).check();
  const dashboardResponse = page.waitForResponse(response => new URL(response.url()).pathname === '/api/views/dashboard');
  await page.getByRole('button', { name: 'Buka ruang kerja', exact: true }).click();
  const initial = (await (await dashboardResponse).json()).data;
  await expect(page).toHaveURL(new RegExp(`/${role}/dashboard$`));
  const campus = role === 'admin' ? initial.campuses[0].id : initial.indicators[0].campusId;
  const question = initial.questions.find((q: any) => role === 'admin' || q.campusId === campus)?.id || initial.questions[0].id;
  const stats = ['campuses', 'definitions', 'indicators', 'feedback', 'proposals'];
  const summary = ['campuses', 'proposals', 'campusMetrics'];
  const review = ['campuses', 'definitions', 'indicators', 'feedback', 'submissions'];
  const forum = ['campuses', 'questions', 'answers', 'likes'];
  const cases: { route: string; endpoint?: string; keys?: string[] }[] = [
    { route: `/${role}/dashboard`, endpoint: 'dashboard', keys: [...(role === 'admin' ? summary : stats), 'activities', 'questions', 'likes'] },
    { route: `/${role}/proposal`, endpoint: 'proposals', keys: ['campuses', 'proposals'] },
    { route: `/${role}/questions`, endpoint: 'questions', keys: forum },
    { route: `/${role}/questions/${question}`, endpoint: 'question-detail', keys: [...forum, 'faq'] },
    { route: `/${role}/faq`, endpoint: 'faq', keys: ['faq'] },
    { route: `/${role}/notifications`, endpoint: 'notifications', keys: role === 'admin' ? ['campuses', 'notifications'] : ['notifications'] },
    ...(role === 'admin' ? [
      { route: '/admin/verifikasi', endpoint: 'review', keys: review },
      { route: '/admin/indicators', endpoint: 'review', keys: review },
      { route: '/admin/campuses', endpoint: 'campuses', keys: [...summary, 'locations'] },
      { route: '/admin/campuses?tab=accounts', endpoint: 'accounts', keys: ['campuses'] },
      { route: '/admin/accounts', endpoint: 'accounts', keys: ['campuses'] },
      { route: '/admin/sebaran', endpoint: 'map', keys: [...summary, 'locations'] },
      { route: '/admin/master-indicators' },
      ...['Ringkasan', 'Indikator', 'Proposal', 'Feedback'].map(tab => ({ route: `/admin/campuses/${campus}?tab=${tab}`, endpoint: 'campus-detail', keys: [...(tab === 'Proposal' ? ['campuses', 'proposals', 'feedback'] : tab === 'Feedback' ? ['campuses', 'definitions', 'indicators', 'feedback'] : tab === 'Indikator' ? review : stats), 'locations'] }))
    ] : [
      { route: '/campus/indicators', endpoint: 'indicators', keys: review },
      { route: '/campus/guide' }
    ])
  ];
  const report: object[] = [];
  for (const entry of cases) {
    const responses: { endpoint: string; status: number; bytes: number }[] = [];
    const measurements: Promise<void>[] = [];
    const observe = (response: any) => {
      const url = new URL(response.url());
      if (url.pathname.startsWith('/api/')) measurements.push(response.body().then((body: Buffer) => {
        responses.push({ endpoint: url.pathname, status: response.status(), bytes: body.length });
      }));
    };
    page.on('response', observe);
    const pending = entry.endpoint ? page.waitForResponse(response => new URL(response.url()).pathname === '/api/views/' + entry.endpoint) : null;
    await page.goto(entry.route);
    await expect(page.locator('main.content')).toBeVisible();
    await expect(page.locator('main.content .loading-screen')).toHaveCount(0);
    if (entry.route === '/admin/master-indicators') {
      await expect(page.locator('.master-table').first()).toBeVisible();
      const audit = page.getByRole('region', { name: 'Riwayat perubahan master', exact: true });
      await expect(audit.locator('[aria-busy]')).toHaveAttribute('aria-busy', 'false');
      await expect(audit.getByRole('alert')).toHaveCount(0);
    }
    if (entry.endpoint === 'accounts') await expect(page.locator('.account-row').first()).toBeVisible();
    await expect(page.locator('.global-error')).toHaveCount(0);
    await expect(page.locator('main.content')).not.toContainText('NaN');
    let payload = {};
    if (pending) {
      const response = await pending;
      expect(response.status(), entry.route).toBe(200);
      const text = await response.text(), body = JSON.parse(text);
      const expectedKeys = entry.keys!.slice();
      if (expectedKeys.some(key => ['definitions','indicators','campusMetrics'].includes(key))) expectedKeys.push('period','periods');
      expect(Object.keys(body.data).sort(), entry.route).toEqual(expectedKeys.sort());
      if (entry.endpoint === 'question-detail') expect(body.data.questions).toHaveLength(1);
      if (entry.endpoint === 'campus-detail') {
        expect(body.data.campuses).toHaveLength(1);
        for (const key of ['indicators', 'submissions', 'feedback', 'proposals']) if (body.data[key]) expect(body.data[key].every((row: any) => row.campusId === campus)).toBe(true);
      }
      payload = { bytes: Buffer.byteLength(text), counts: Object.fromEntries(Object.entries(body.data).map(([key, value]) => [key, Array.isArray(value) ? value.length : Object.keys(value as object).length])) };
    }
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), entry.route + ' mobile overflow').toBe(true);
    await page.setViewportSize({ width: 1280, height: 900 });
    page.off('response', observe);
    await Promise.all(measurements);
    expect(responses.filter(response => response.status >= 400), entry.route).toEqual([]);
    expect(responses.filter(response => response.endpoint.startsWith('/api/views/') && response.endpoint !== '/api/views/' + entry.endpoint), entry.route).toEqual([]);
    report.push({ route: entry.route, ...payload, responses });
  }
  expect(errors).toEqual([]);
  const directory = path.resolve('.qa/production-readiness');
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, `${role}-page-payload.json`), JSON.stringify(report, null, 2));
  await info.attach(`${role}-page-payload`, { body: JSON.stringify(report, null, 2), contentType: 'application/json' });
});
