/**
 * Mail identity and the auth email templates of the users collection, in Indonesian and in the site's name.
 * Verification, password reset and email change links open PocketBase's own confirmation pages on the API host,
 * because the site has no pages of its own for those steps yet. The one time code and the new device alert are plain text mails.
 * Usage: npx tsx scripts/pocketbase/mail-templates.ts --apply   (without --apply it only prints the subjects)
 * Secrets come from .env and are never printed. Idempotent.
 */
import PocketBase from 'pocketbase';
import { loadEnv, requireEnv } from './env';

const APP_NAME = 'Desa Energi Berdikari · Pertamina Foundation';
const SITE = 'https://deb.pertaminafoundation.org';
const SIGNATURE = '<p style="margin-top:24px;color:#475569;font-size:13px">Tim Program Desa Energi Berdikari<br>Pertamina Foundation</p>';
const LOGO = `<p style="margin:0 0 20px"><img src="${SITE}/logo-pf.png" width="150" alt="Pertamina Foundation" style="display:block"></p>`;
const NOTE = (text: string) => `<p style="color:#475569;font-size:13px">${text}</p>`;

function mail(lead: string, action: string, href: string, note: string) {
  return `${LOGO}<p>Halo,</p><p>${lead}</p><p><a class="btn" href="${href}" target="_blank" rel="noopener">${action}</a></p>${NOTE(note)}${SIGNATURE}`;
}

async function main() {
  loadEnv();
  const apply = process.argv.includes('--apply');
  const env = requireEnv('PB_URL', 'PB_SUPERUSER_EMAIL', 'PB_SUPERUSER_PASSWORD');
  const api = new URL(env.PB_URL).origin;
  const pb = new PocketBase(api);
  pb.autoCancellation(false);
  await pb.collection('_superusers').authWithPassword(env.PB_SUPERUSER_EMAIL, env.PB_SUPERUSER_PASSWORD);

  const templates = {
    verificationTemplate: {
      subject: 'Verifikasi email akun {APP_NAME}',
      body: mail('Satu langkah lagi: tekan tombol di bawah untuk memastikan alamat email ini milik Anda.', 'Verifikasi email', `${api}/_/#/auth/confirm-verification/{TOKEN}`, 'Bila Anda tidak membuat akun, abaikan email ini.')
    },
    resetPasswordTemplate: {
      subject: 'Atur ulang kata sandi {APP_NAME}',
      body: mail('Tekan tombol di bawah untuk membuat kata sandi baru. Tautan berlaku sebentar dan hanya sekali pakai.', 'Buat kata sandi baru', `${api}/_/#/auth/confirm-password-reset/{TOKEN}`, 'Bila Anda tidak meminta kata sandi baru, abaikan email ini. Kata sandi Anda tidak berubah.')
    },
    confirmEmailChangeTemplate: {
      subject: 'Konfirmasi email baru {APP_NAME}',
      body: mail('Tekan tombol di bawah untuk memakai alamat email ini pada akun Anda.', 'Konfirmasi email baru', `${api}/_/#/auth/confirm-email-change/{TOKEN}`, 'Bila Anda tidak meminta perubahan email, abaikan email ini.')
    }
  };
  const otpTemplate = { subject: 'Kode masuk {APP_NAME}', body: `${LOGO}<p>Halo,</p><p>Kode masuk Anda:</p><p style="font-size:28px;font-weight:700;letter-spacing:4px">{OTP}</p>${NOTE('Kode berlaku sebentar. Bila Anda tidak mencoba masuk, abaikan email ini.')}${SIGNATURE}` };
  const alertTemplate = { subject: 'Masuk dari perangkat baru ke {APP_NAME}', body: `${LOGO}<p>Halo,</p><p>Akun Anda baru saja masuk dari perangkat atau lokasi baru:</p><p><em>{ALERT_INFO}</em></p>${NOTE('Bila itu Anda, tidak ada yang perlu dilakukan. Bila bukan, segera ganti kata sandi atau hubungi admin program.')}${SIGNATURE}` };

  const settings = await pb.settings.getAll() as { meta?: Record<string, unknown> };
  const users = await pb.collections.getOne('users') as unknown as { otp?: Record<string, unknown>; authAlert?: Record<string, unknown> };
  console.log(`Target ${new URL(env.PB_URL).host}. App name "${APP_NAME}", site ${SITE}.`);
  for (const [key, t] of Object.entries(templates)) console.log(`  ${key}: ${t.subject}`);
  console.log(`  otp: ${otpTemplate.subject}\n  authAlert: ${alertTemplate.subject}`);
  if (!apply) { console.log('Dry run. Add --apply to write.'); return; }
  await pb.settings.update({ meta: { ...(settings.meta || {}), appName: APP_NAME, appURL: SITE, senderName: APP_NAME } });
  await pb.collections.update('users', { ...templates, otp: { ...(users.otp || {}), emailTemplate: otpTemplate }, authAlert: { ...(users.authAlert || {}), emailTemplate: alertTemplate } });
  console.log('Mail identity and five templates written.');
}
main().catch(error => { console.error('Mail templates failed:', error?.response?.data ? JSON.stringify(error.response.data) : (error?.message || error)); process.exitCode = 1; });
