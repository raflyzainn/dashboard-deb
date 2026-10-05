// Tool browser_run_code_unsafe; admin pada RAB_CONTOH.xlsx (data contoh).
async (page) => {
  const region = page.getByRole('region', { name: 'Tabel perbandingan tiga RAB' });
  await region.waitFor();
  const rows = await region.locator('tbody tr').evaluateAll(rows => rows.map(row => [...row.querySelectorAll('td')].map(cell => ({
    money: Number(cell.querySelector('b').textContent.replace(/\D/g, '')),
    quantity: Number(cell.querySelector('p').textContent.split(' ')[0])
  }))));
  for (const row of rows) {
    if (row.some(cell => !Number.isInteger(cell.quantity)) || row[0].quantity !== row[1].quantity + row[2].quantity || row[0].money !== row[1].money + row[2].money) throw Error('Jumlah atau nominal dummy tidak konsisten.');
  }
  if ((await region.innerText()).includes('Jumlah belum tercatat')) throw Error('Jumlah contoh belum lengkap.');
  return 'Jumlah contoh lengkap, bulat, dan kedua tahap sesuai sumber.';
}
