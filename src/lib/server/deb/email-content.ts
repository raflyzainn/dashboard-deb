/** Plain text fields: PocketBase escapes RECORD placeholders when rendering mail. */
export function emailContent(purpose: string, picName: string, campusName: string) {
  const forgot = purpose === 'forgot';
  return {
    picName, campusName,
    mailSubject: forgot ? 'Atur ulang password DEB' : 'Aktifkan akun DEB',
    mailLabel: forgot ? 'PEMULIHAN PASSWORD' : 'AKTIVASI AKUN KAMPUS',
    mailHeading: forgot ? 'Kembali ke ruang kolaborasi Anda.' : 'Selamat datang di DEB.',
    mailIntro: forgot ? 'Kami menerima permintaan untuk mengatur ulang password akun kampus Anda.' : 'Satu langkah lagi untuk mengakses ruang kolaborasi kampus mitra Pertamina Foundation.',
    mailInstruction: forgot ? 'Klik tombol berikut untuk membuat password baru.' : 'Klik tombol berikut, lalu buat password untuk mengaktifkan akun Anda.',
    mailAction: forgot ? 'Atur ulang password' : 'Aktifkan akun'
  };
}
