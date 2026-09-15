import { test, expect } from '@playwright/test';

for (const purpose of ['activate', 'forgot']) {
  test(`resend preserves ${purpose}, cooldown and admin-only email changes`, async ({ page }) => {
    const requests: unknown[] = [];
    let fail = false;
    await page.route('**/api/auth/request', route => {
      requests.push(route.request().postDataJSON());
      return route.fulfill({ status: fail ? 429 : 200, json: { message: fail ? 'Coba lagi nanti.' : 'OK' } });
    });
    await page.goto('/login');
    await page.clock.install();
    await page.getByRole('button', { name: purpose === 'activate' ? 'Aktivasi akun' : 'Lupa password?', exact: true }).click();
    await page.getByLabel('Email PIC', { exact: true }).fill('resend@example.test');
    await page.getByRole('button', { name: purpose === 'activate' ? 'Kirim tautan aktivasi' : 'Kirim tautan pemulihan', exact: true }).click();
    const resend = page.getByRole('button', { name: /^Kirim ulang email/ });
    await expect(resend).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Ubah email', exact: true })).toHaveCount(0);
    await page.clock.fastForward(61000);
    await expect(resend).toBeEnabled();
    await resend.click();
    await expect(page.getByRole('status')).toContainText('Permintaan kirim ulang diterima');
    await expect(resend).toBeDisabled();
    expect(requests).toEqual(Array(2).fill({ email: 'resend@example.test', purpose }));
    await page.clock.fastForward(61000);
    fail = true;
    await resend.click();
    await expect(page.getByRole('alert')).toHaveText('Coba lagi nanti.');
    await expect(resend).toBeEnabled();
  });
}
