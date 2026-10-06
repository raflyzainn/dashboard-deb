// Jalankan melalui tool Playwright pada aplikasi lokal 5176 yang sudah login kampus.
// Respons Data Program dibuat kosong di browser; seluruh mutasi dicegat.
async (page) => {
  const origin = new URL(page.url()).origin;
  if (!['http://127.0.0.1:5176', 'http://localhost:5176'].includes(origin)) throw Error('Gunakan aplikasi lokal 5176.');
  const originalUrl = page.url();
  const pattern = '**/api/pencairan/**';
  let fixture;
  const intercept = async route => {
    const request = route.request();
    if (!new URL(request.url()).pathname.endsWith('/pengajuan')) {
      return request.method() === 'GET' ? route.continue() : route.fulfill({ status: 400, json: { message: 'Mutasi tidak termasuk pemeriksaan navigasi.' } });
    }
    if (!fixture) {
      fixture = await (await route.fetch()).json();
      fixture.paid = false;
      fixture.journey.status = 'draf';
      fixture.journey.lastSection = 'program';
      for (const key of ['judulProgram', 'alamat', 'desa', 'kabupaten', 'mentor', 'koordinator']) fixture.journey.fields[key] = '';
    }
    if (request.method() === 'PATCH') Object.assign(fixture.journey.fields, request.postDataJSON().fields || {});
    return route.fulfill({ json: fixture });
  };
  await page.route(pattern, intercept);
  try {
    await page.goto(origin + '/campus/pencairan?bagian=program&butir=program');
    const next = page.getByRole('button', { name: 'Lanjut: Pengajuan RAB', exact: true });
    await next.waitFor();
    if (!await next.isEnabled()) throw Error('Data Program kosong masih menonaktifkan Lanjut ke RAB.');
    await next.click();
    await page.waitForURL('**/campus/pencairan?bagian=rab&butir=rab_penuh');
    await page.getByRole('button', { name: /^Data Program/ }).click();
    await page.getByRole('heading', { name: 'Data Program', exact: true }).waitFor();
    await page.getByRole('button', { name: /^RAB 100%/ }).click();
    await page.waitForURL('**/campus/pencairan?butir=rab_penuh');
    await page.getByRole('button', { name: 'Administrasi Draf', exact: true }).click();
    for (const [name, section] of [['Rekening Penerima', 'administrasi'], ['Penandatangan Kampus', 'penandatangan'], ['Identitas Surat dan Kop', 'surat'], ['PKS', 'pks'], ['Dokumen', 'ringkasan']]) {
      await page.getByRole('button', { name: new RegExp('^' + name) }).click();
      await page.waitForURL('**/campus/pencairan?butir=' + section);
      if (await page.getByRole('alert').count()) throw Error('Navigasi ' + name + ' masih menampilkan error.');
    }
    if (!await page.getByRole('button', { name: 'Ajukan untuk diperiksa', exact: true }).isDisabled()) throw Error('Pengajuan kosong masih bisa dikirim.');
    return { incompleteProgramNext: true, incompleteProgramSidebar: true, administrationSidebar: true, incompleteSubmitBlocked: true };
  } finally {
    await page.unroute(pattern, intercept);
    await page.goto(originalUrl);
  }
}
