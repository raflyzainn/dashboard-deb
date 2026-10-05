// Jalankan melalui tool browser_run_code_unsafe, bukan terminal.
// Prasyarat: akun kampus pada RAB 100%, draf terbaru tersimpan,
// dan setidaknya satu versi sebelumnya. Tidak membuat versi atau pengajuan.
async (page) => {
  const select = page.getByRole('combobox', { name: 'Pilih versi RAB' });
  const latest = await select.locator('option').first().getAttribute('value');
  const old = await select.locator('option').nth(1).getAttribute('value');
  try {
    const input = page.getByRole('spinbutton').first();
    const previous = await input.inputValue();
    const changed = previous === '0' ? '1' : '0';
    await input.fill(changed);
    await select.selectOption(old);
    await page.getByRole('button', { name: 'Tetap di sini', exact: true }).click();
    if (await input.inputValue() !== changed || await select.inputValue() !== latest) throw Error('Batal pindah menghilangkan input atau pilihan versi.');
    await input.fill(previous);
    await select.selectOption(old);
    await page.getByText('Anda melihat versi lama', { exact: false }).waitFor();
    if (await page.getByRole('spinbutton').count()) throw Error('Arsip lama masih bisa diedit.');
    const before = await page.locator('[aria-label="Perbandingan tiga RAB"]').innerText();
    await page.reload();
    await page.getByText('Anda melihat versi lama', { exact: false }).waitFor();
    const after = await page.locator('[aria-label="Perbandingan tiga RAB"]').innerText();
    if (await select.inputValue() !== old || before !== after) throw Error('Pilihan atau pembagian arsip berubah setelah reload.');
    return 'Versi lama dapat dibuka, hanya dapat dilihat, dan bertahan setelah reload.';
  } finally {
    await select.selectOption(latest);
    await page.getByRole('spinbutton').first().waitFor();
  }
}
