// Jalankan lewat tool browser pada 127.0.0.1:5176, setelah login kampus.
// Semua mutasi pengajuan dicegat; perubahan hanya berlaku dalam respons browser.
async page => {
  if (new URL(page.url()).origin !== 'http://127.0.0.1:5176') throw Error('Gunakan aplikasi lokal 5176.');
  const originalUrl = page.url(), pattern = '**/api/pencairan/**';
  let fixture, saves = 0, fail = false;
  const intercept = async route => {
    const request = route.request();
    if (!new URL(request.url()).pathname.endsWith('/pengajuan')) return request.method() === 'GET' ? route.continue() : route.fulfill({status:400,json:{message:'Mutasi dicegat.'}});
    if (!fixture) {
      fixture = await (await route.fetch()).json();
      fixture.paid = false; fixture.journey.status = 'draf'; fixture.journey.lastSection = 'program';
    }
    if (request.method() === 'PATCH' && request.postDataJSON().fields) {
      saves++;
      if (fail) return route.fulfill({status:400,json:{message:'Penyimpanan gagal untuk pemeriksaan snackbar.'}});
      Object.assign(fixture.journey.fields, request.postDataJSON().fields);
    }
    return route.fulfill({json:fixture});
  };
  await page.route(pattern, intercept);
  try {
    await page.goto('http://127.0.0.1:5176/campus/pencairan?bagian=program&butir=program');
    const field = page.getByRole('textbox', {name:'Nama kegiatan / program',exact:false});
    const notice = page.getByRole('button', {name:'Tutup pemberitahuan',exact:true});
    await field.fill('QA snackbar pertama');
    await notice.waitFor();
    await notice.click();
    await field.fill('QA snackbar kedua');
    await page.getByText('Draf tersimpan otomatis. Belum dikirim ke PF.', {exact:true}).waitFor();
    if (saves !== 2 || await notice.count()) throw Error('Simpan kedua harus berhasil tanpa mengulang snackbar.');
    await page.evaluate(() => { const now = Date.now.bind(Date); Date.now = () => now() + 21000; });
    await field.fill('QA snackbar setelah jeda');
    await notice.waitFor();
    await notice.click();
    fail = true;
    await field.fill('QA snackbar gagal');
    await page.getByText('Penyimpanan gagal untuk pemeriksaan snackbar.', {exact:true}).first().waitFor();
    await field.fill('QA snackbar setelah jeda');
    await page.getByText('Draf tersimpan otomatis. Belum dikirim ke PF.', {exact:true}).waitFor();
    return {firstNotice:true,repeatedNoticeSuppressed:true,noticeAfterCooldown:true,errorImmediate:true};
  } finally {
    await page.unroute(pattern, intercept);
    await page.goto(originalUrl);
  }
}
