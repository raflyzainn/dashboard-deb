const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
// Bundle the logo with PocketBase hooks: email clients cannot fetch localhost assets.
exports.send = (app, message, data) => {
  const logo = $filesystem.fileFromPath(__hooks + '/assets/logo-pf-white.png').reader.open();
  try {
    app.newMailClient().send(new MailerMessage({
      ...message, ...exports.render(data),
      inlineAttachments: { 'logo-pf-white.png': logo }
    }));
  } finally { logo.close(); }
};
exports.render = ({ name, campus, url, purpose }) => {
  const recovery = purpose === 'forgot';
  const action = recovery ? 'Atur ulang password' : 'Aktifkan akun';
  const title = recovery ? 'Kembali ke ruang kolaborasi Anda.' : 'Selamat datang di DEB.';
  const description = recovery ? 'Kami menerima permintaan untuk mengatur ulang password akun kampus Anda.' : 'Satu langkah lagi untuk mengakses ruang kolaborasi kampus mitra Pertamina Foundation.';
  const instruction = recovery ? 'Klik tombol berikut untuk membuat password baru.' : 'Klik tombol berikut, lalu buat password untuk mengaktifkan akun Anda.';
  const safeURL = escape(url);
  return {
    html: `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${action} DEB</title></head>
<body style="margin:0;padding:0;background:#f1f6fc;font-family:Arial,Helvetica,sans-serif;color:#17365b">
<div style="display:none;font-size:1px;color:#f1f6fc;max-height:0;overflow:hidden">${action} untuk ${escape(campus)}. Tautan berlaku 30 menit.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f6fc"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #dce7f5;border-radius:16px;overflow:hidden">
<tr><td bgcolor="#185bd6" style="padding:30px 28px;color:#ffffff;border-radius:16px 16px 0 0"><img src="cid:logo-pf-white.png" alt="Pertamina Foundation" width="205" height="55" style="display:block;width:205px;max-width:100%;height:auto;border:0;color:#ffffff;font-size:16px"><div style="margin-top:22px;font-size:25px;font-weight:700;letter-spacing:2px">DIGITALISASI DEB</div><div style="margin-top:10px;font-size:10px;letter-spacing:2px;color:#d7e8ff">RUANG TUMBUH BERSAMA</div></td></tr>
<tr><td style="padding:30px 28px"><p style="margin:0 0 10px;font-size:11px;letter-spacing:1.5px;color:#3975bc">${recovery?'PEMULIHAN PASSWORD':'AKTIVASI AKUN KAMPUS'}</p><h1 style="margin:0 0 20px;font-size:27px;line-height:1.3;color:#102e56">${title}</h1><p style="margin:0 0 10px;font-size:15px;line-height:1.7">Halo, <strong>${escape(name)}</strong>.</p><p style="margin:0 0 22px;font-size:14px;line-height:1.8;color:#607894">${description}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td bgcolor="#eef5ff" style="padding:18px;border:1px solid #dce9fb;border-radius:10px"><p style="margin:0 0 7px;font-size:10px;letter-spacing:1px;color:#607da2">AKUN KAMPUS ANDA</p><p style="margin:0;font-size:16px;line-height:1.6;font-weight:700;color:#1855a2">${escape(campus)}</p><p style="margin:6px 0 0;font-size:13px;color:#607894">PIC: ${escape(name)}</p></td></tr></table>
<p style="margin:22px 0 18px;font-size:14px;line-height:1.8;color:#607894">${instruction}</p>
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td bgcolor="#1768d4" style="border-radius:8px;text-align:center;mso-padding-alt:16px 30px"><a href="${safeURL}" style="display:inline-block;padding:16px 30px;border:1px solid #1768d4;border-radius:8px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700">${action} &nbsp; &#8594;</a></td></tr></table>
<p style="margin:18px 0 0;font-size:12px;line-height:1.8;color:#7185a0">Tautan berlaku <strong>30 menit</strong> dan hanya dapat digunakan <strong>satu kali</strong>. Jangan bagikan tautan ini kepada orang lain.</p>
<hr style="border:0;border-top:1px solid #e4edf7;margin:24px 0"><p style="margin:0 0 8px;font-size:12px;line-height:1.8;color:#7185a0">Tombol tidak terbuka? Salin dan tempel tautan berikut ke browser:</p><p style="margin:0;font-size:11px;line-height:1.7;word-break:break-all;overflow-wrap:anywhere"><a href="${safeURL}" style="color:#2368b5;word-break:break-all">${safeURL}</a></p>
<p style="margin:20px 0 0;font-size:12px;line-height:1.8;color:#7185a0">Jika Anda tidak meminta email ini atau data kampus tidak sesuai, abaikan email ini dan hubungi admin DEB.</p></td></tr>
<tr><td bgcolor="#f8fbff" style="padding:20px 28px;border-top:1px solid #e4edf7;border-radius:0 0 16px 16px"><p style="margin:0;font-size:12px;font-weight:700;color:#365779">Pertamina Foundation</p><p style="margin:6px 0 0;font-size:11px;line-height:1.7;color:#7b8fa7">Dari kolaborasi, tumbuh perubahan.<br>Email otomatis dari Digitalisasi DEB.</p></td></tr>
</table></td></tr></table></body></html>`,
    text: `Halo, ${name}.\n\n${description}\n\nAkun kampus: ${campus}\nPIC: ${name}\n\n${instruction}\n${action}: ${url}\n\nTautan berlaku 30 menit dan hanya dapat digunakan satu kali. Jangan bagikan tautan ini.\nJika Anda tidak meminta email ini atau data kampus tidak sesuai, abaikan dan hubungi admin DEB.\n\nPertamina Foundation - Digitalisasi DEB`
  };
};
