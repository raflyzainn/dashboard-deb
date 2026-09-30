// Jalankan dengan tool browser_run_code_unsafe (filename), bukan melalui terminal.
// Prasyarat: akun kampus, draf dari static/contoh-rab/01_RAB_10_Unit.xlsx,
// halaman /campus/pencairan?butir=rab_penuh. Tidak menyimpan atau mengajukan.
async (page) => {
  const input = page.getByRole('spinbutton', { name: 'Jumlah Tahap 1: Lampu tenaga surya', exact: true });
  const previous = await input.inputValue();
  const card = page.getByRole('article').filter({ has: input });
  const next = page.getByRole('button', { name: 'Simpan & periksa Tahap 1', exact: true });
  try {
    for (const value of ['11', '-1', '7.5']) {
      await input.fill(value);
      await page.waitForFunction(() => document.querySelector('input[aria-label="Jumlah Tahap 1: Lampu tenaga surya"]')?.getAttribute('aria-invalid') === 'true');
      if (!(await next.isDisabled())) throw Error('Jumlah tidak valid masih bisa dilanjutkan.');
      if ((await card.innerText()).includes('-1 unit')) throw Error('Sisa negatif tampil sebagai hasil pembagian.');
    }
    await input.fill('7');
    await page.waitForFunction(() => document.querySelector('input[aria-label="Jumlah Tahap 1: Lampu tenaga surya"]')?.getAttribute('aria-invalid') === 'false');
    const text = await card.innerText();
    if (!text.includes('3 unit') || !text.includes('Rp7.000.000') || !text.includes('Rp3.000.000')) throw Error('Pembagian 7/3 atau nominal tidak sesuai.');
    return { result: 'Jumlah -1, 11, dan 7.5 diblokir; 10 unit menjadi 7/3 dengan nominal benar.' };
  } finally {
    await input.fill(previous);
  }
}
