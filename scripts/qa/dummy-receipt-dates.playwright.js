// Jalankan lewat tool Playwright pada build dummy lokal, setelah login Admin PF.
async page => {
  if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+\//.test(page.url())) throw Error('Gunakan browser lokal dummy.');
  const errors = [];
  const onError = error => errors.push(error.message);
  page.on('pageerror', onError);
  try {
    await page.goto(new URL('/admin/pencairan', page.url()).href);
    await page.getByRole('link', { name: 'Institut Teknologi Bandung', exact: true }).click();
    await page.getByText('Tanggal belum tercatat', { exact: true }).first().waitFor({ timeout: 15000 });
    if (await page.getByText('Asli diterima', { exact: true }).count() < 4) throw Error('Status penerimaan surat harus tetap tampil.');
    await page.reload();
    await page.getByText('Tanggal belum tercatat', { exact: true }).first().waitFor({ timeout: 15000 });
    if (errors.length) throw Error(errors.join('\n'));
    return { receiptDates: 'pass', reload: 'pass', pageErrors: errors };
  } finally {
    page.off('pageerror', onError);
  }
}
