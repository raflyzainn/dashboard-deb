// Run with the Playwright browser tool. All attempted writes are intercepted.
async (page) => {
  const browser = page.context().browser();
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  let p = await context.newPage();
  let campusContext;
  const errors = [];
  const passed = [];
  const check = (condition, name) => { if (!condition) throw new Error(name); passed.push(name); };
  p.on('pageerror', e => errors.push(e.message));
  const snack = p.locator('.global-error:visible');
  const login = async account => {
    await p.goto('http://127.0.0.1:5176/login');
    await p.locator('option[value="admin-1"]').waitFor({ state: 'attached' });
    await p.getByRole('combobox').selectOption(account);
    await p.getByRole('button', { name: 'Masuk ke ruang kerja' }).click();
    await p.waitForURL('**/dashboard');
  };
  try {
    await login('admin-1');
    let writes = 0, mode = '400';
    await p.route('**/api/pencairan/**', async route => {
      if (route.request().method() === 'GET') return route.continue();
      writes++;
      if (mode === 'offline') return route.abort('failed');
      if (mode === 'invalid-json') return route.fulfill({ status: 200, contentType: 'application/json', body: '{' });
      return route.fulfill({ status: Number(mode), contentType: 'application/json', body: JSON.stringify({ message: mode === '400' ? 'Nama pada bukti rekening belum sesuai. Periksa kembali nama pemilik.' : 'Something went wrong while processing your request.' }) });
    });
    await p.goto('http://127.0.0.1:5176/admin/pencairan/pvejbzdevqcmyhp?butir=rekening');
    const approve = p.getByRole('button', { name: 'Nama sesuai di bank', exact: true });
    const name = p.getByLabel('Nama di bank', { exact: true });
    await approve.waitFor();
    for (const value of ['', '   ']) {
      await name.fill(value);
      await approve.click();
      await snack.waitFor();
      check((await snack.innerText()).includes('Nama di bank wajib diisi'), 'Empty bank name: ' + JSON.stringify(value));
      check(await name.evaluate(el => document.activeElement === el), 'Focus bank input');
      await snack.getByRole('button').click();
    }
    check(writes === 0, 'Empty name never sends a request');
    check(await name.evaluate(el => el.required && getComputedStyle(el.closest('label'), '::after').content === '"*"'), 'Required bank marker');
    check(await p.getByLabel('Cabang', { exact: true }).evaluate(el => !el.required && getComputedStyle(el.closest('label'), '::after').content === 'none'), 'Branch is optional');
    await name.fill('Nama dari bukti');
    await p.getByRole('button', { name: 'Nama berbeda di bank', exact: true }).click();
    check((await snack.innerText()).includes('Tulis catatan'), 'Revision requires a note');
    check(writes === 0, 'Missing revision note never sends a request');
    for (const scenario of ['400', '401', '403', '409', '500', 'offline', 'invalid-json']) {
      mode = scenario;
      await approve.click();
      const expected = { '400': 'Nama pada bukti', '401': 'Sesi berakhir', '403': 'tidak memiliki izin', '409': 'Data sudah berubah', '500': 'Server belum dapat', offline: 'Tidak dapat terhubung', 'invalid-json': 'Respons server tidak dapat dibaca' }[scenario];
      await p.waitForFunction(text => [...document.querySelectorAll('.global-error')].some(el => el.textContent.includes(text)), expected);
      check((await snack.innerText()).includes(expected), 'Snackbar for ' + scenario);
      check(await name.inputValue() === 'Nama dari bukti' && await approve.isEnabled(), 'Preserve input and retry after ' + scenario);
    }
    await p.setViewportSize({ width: 390, height: 844 });
    const box = await snack.boundingBox();
    check(box && box.x >= 0 && box.x + box.width <= 390 && box.y + box.height <= 844, 'Mobile snackbar inside viewport');
    await p.screenshot({ path: '.playwright-mcp/snackbar-required-mobile.png' });
    await p.setViewportSize({ width: 1280, height: 900 });
    await p.goto('http://127.0.0.1:5176/admin/users');
    await p.getByRole('button', { name: 'Tambah akun', exact: true }).click();
    await p.getByRole('button', { name: 'Buat akun', exact: true }).click();
    await snack.waitFor();
    check((await snack.innerText()).includes('Nama wajib diisi.'), 'First invalid field named, not the last');
    check(await snack.evaluate(el => !!el.closest('dialog[open]')), 'Snackbar inside modal top layer');
    await snack.getByRole('button').click();
    check(await snack.count() === 0, 'Modal snackbar dismissible');
    await p.getByRole('dialog').getByLabel('Nama', { exact: true }).fill('Pemeriksaan tampilan');
    await p.getByRole('dialog').getByLabel('Email', { exact: true }).fill('bukan-email');
    await p.getByRole('button', { name: 'Buat akun', exact: true }).click();
    check((await snack.innerText()).includes('alamat email yang valid'), 'Invalid email explained in Indonesian');
    await p.getByRole('button', { name: 'Batal', exact: true }).click();
    campusContext = await browser.newContext();
    p = await campusContext.newPage();
    p.on('pageerror', e => errors.push(e.message));
    await p.goto('http://127.0.0.1:5176/login');
    await p.locator('option[value="admin-1"]').waitFor({ state: 'attached' });
    const campusAccount = await p.locator('option').evaluateAll(options => options.find(o => o.textContent.includes('Politeknik Negeri Fakfak'))?.value);
    check(!!campusAccount, 'Campus account available');
    await p.getByRole('combobox').selectOption(campusAccount);
    await p.getByRole('button', { name: 'Masuk ke ruang kerja' }).click();
    await p.waitForURL('**/dashboard');
    await p.route('**/api/pencairan/**', route => route.request().method() === 'GET'
      ? route.continue()
      : route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }));
    await p.goto('http://127.0.0.1:5176/campus/pencairan?bagian=program&butir=program');
    await p.getByLabel('Nama kegiatan / program', { exact: true }).waitFor();
    check(await p.getByLabel('Nama kegiatan / program', { exact: true }).evaluate(el => el.required), 'Program title marked required');
    check(await p.getByLabel('Kecamatan', { exact: true }).evaluate(el => !el.required), 'District remains optional');
    await p.goto('http://127.0.0.1:5176/campus/pencairan?bagian=administrasi&butir=administrasi');
    await p.getByLabel('Nama bank', { exact: true }).waitFor();
    check(await p.getByLabel('Nama bank', { exact: true }).evaluate(el => el.required), 'Bank identity marked required');
    check(await p.getByLabel('Nomor invoice', { exact: true }).evaluate(el => el.required), 'Document identity marked required');
    // Test each homepage state by replacing GET responses, never stored records.
    let status = 'draf';
    await p.route('**/api/pencairan/pvejbzdevqcmyhp', async route => {
      const response = await route.fetch();
      const body = await response.json();
      body.journey.status = status === 'dibayar' ? 'selesai' : status;
      body.disbursement.paidAt = status === 'dibayar' ? '2026-10-01' : '';
      await route.fulfill({ response, json: body });
    });
    for (const [state, action] of [['draf', 'Lanjutkan pengajuan'], ['menunggu', 'Pantau pemeriksaan PF'], ['revisi', 'Perbaiki pengajuan'], ['selesai', 'Lengkapi dokumen bertanda tangan'], ['dibayar', 'Lihat pembayaran']]) {
      status = state;
      await p.goto('http://127.0.0.1:5176/campus/dashboard');
      await p.getByRole('link', { name: action, exact: true }).waitFor();
      check(await p.getByRole('heading', { name: 'Yang perlu dilakukan', exact: true }).count() === 0, 'Correct homepage action without old upload list: ' + state);
    }
    await p.getByRole('link', { name: 'Baru pertama kali? Baca panduan pengajuan' }).click();
    await p.getByRole('heading', { name: 'Urutan pengajuan baru' }).waitFor();
    check(await p.locator('ol > li').count() === 7, 'Guide has seven workflow steps');
    check(!(await p.locator('main').innerText()).includes('SK dan RAB hanya dapat dilihat'), 'Guide no longer describes obsolete RAB restriction');
    check(errors.length === 0, 'No uncaught page errors: ' + errors.join('; '));
    return { passed, interceptedWrites: writes, dataMutated: false };
  } finally { await context.close(); await campusContext?.close(); }
}
