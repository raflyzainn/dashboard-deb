// Run only through the browser tool after admin login on the matching local worktree.
async (page) => {
  const origin = new URL(page.url()).origin;
  if (!['127.0.0.1', 'localhost'].includes(new URL(origin).hostname)) throw Error('Khusus QA lokal');
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(origin + '/admin/campuses');
  await page.waitForSelector('table tbody tr');
  const samples = await page.evaluate(async () => {
    const response = await fetch('/api/views/campuses');
    if (!response.ok) throw Error('Daftar gagal dimuat');
    const { data } = await response.json();
    const samples = [];
    for (const name of ['Universitas Gadjah Mada', 'Universitas Pertamina', 'Politeknik Negeri Kupang', 'Universitas Pattimura']) {
      const campus = data.campuses.find(c => c.name === name);
      const progress = data.campusPayouts[campus.id];
      const response = await fetch('/api/pencairan/' + campus.id);
      if (!response.ok) throw Error('Pencairan gagal: ' + name);
      const workspace = await response.json();
      const uploaded = workspace.documents.filter(d => d.kind !== 'sk' && d.currentVersionId && d.versions.some(v => v.id === d.currentVersionId)).length;
      if (progress.uploaded !== uploaded || progress.assessment.done !== workspace.readiness.done
        || JSON.stringify(progress.assessment.items) !== JSON.stringify(workspace.readiness.items)) throw Error('Ringkasan berbeda: ' + name);
      const { payoutTimeline } = await import('/src/lib/payout-progress.ts');
      if (progress.stage !== payoutTimeline({ ...workspace.disbursement, journey: workspace.journey, hasRab: Boolean(workspace.rab), documents: workspace.documents }).label) throw Error('Tahap berbeda: ' + name);
      samples.push({ name, stage: progress.stage, uploaded, done: progress.assessment.done, total: progress.assessment.total });
    }
    if (JSON.stringify(data.campusPayouts).match(/nomorRekening|holderNames|r2Key|authorName|originalName/)) throw Error('Detail privat masuk ringkasan');
    return samples;
  });
  await page.getByRole('textbox', { name: 'Cari kampus' }).fill('Gadjah');
  if (await page.locator('tbody tr').count() !== 1) throw Error('Pencarian gagal');
  await page.getByRole('link', { name: 'Universitas Gadjah Mada', exact: false }).first().click();
  await page.getByRole('heading', { name: 'Dokumen pencairan Tahap 1' }).waitFor();
  await page.getByRole('link', { name: 'Buka proses pencairan', exact: true }).click();
  await page.waitForURL('**/admin/pencairan/*');
  await page.waitForSelector('h1');
  await page.goto(origin + '/admin/campuses');
  await page.waitForSelector('table tbody tr');
  await page.getByRole('combobox', { name: 'Filter kampus', exact: true }).selectOption('revision');
  if (!(await page.locator('tbody tr').count())) throw Error('Filter revisi kosong');
  await page.getByRole('combobox', { name: 'Filter kampus', exact: true }).selectOption('all');
  await page.getByRole('button', { name: 'Berikutnya', exact: true }).click();
  await page.getByText('2 / 4', { exact: true }).waitFor();
  await page.getByRole('textbox', { name: 'Cari kampus' }).fill('TidakAdaKampusQA');
  await page.getByRole('heading', { name: 'Kampus tidak ditemukan' }).waitFor();
  await page.getByRole('textbox', { name: 'Cari kampus' }).fill('');
  await page.setViewportSize({ width: 390, height: 844 });
  if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw Error('Halaman meluap');
  const anon = await page.context().browser().newContext();
  try {
    const p = await anon.newPage();
    await p.goto(origin + '/login');
    if ((await p.request.get(origin + '/api/views/campuses')).status() !== 401) throw Error('Anonim dapat membaca kampus');
    await p.locator('select').selectOption('campus-006');
    await p.getByRole('button', { name: 'Masuk ke ruang kerja' }).click();
    await p.waitForURL('**/campus/dashboard');
    if ((await p.request.get(origin + '/api/views/campuses')).status() !== 403) throw Error('Kampus dapat membaca admin');
  } finally { await anon.close(); }
  if (errors.length) throw Error(errors.join('; '));
  return { samples, search: true, detail: true, payoutLink: true, revisionFilter: true, pagination: true, empty: true, mobile: true, anonymous: 401, campus: 403, errors };
}
