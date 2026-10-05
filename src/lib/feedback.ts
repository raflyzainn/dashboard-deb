/** Keep feedback independent of app state so API and forms can share it. */
export function reportError(message: string): string {
  if (['Failed to fetch', 'Load failed', 'NetworkError when attempting to fetch resource.'].includes(message)) {
    message = 'Tidak dapat terhubung ke server. Periksa koneksi, lalu coba lagi.';
  }
  if (message === 'Something went wrong while processing your request.') {
    message = 'Server belum dapat memproses permintaan. Coba lagi beberapa saat lagi.';
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('deb:error', { detail: message }));
  }
  return message;
}
