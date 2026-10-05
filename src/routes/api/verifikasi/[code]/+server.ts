import { json, type RequestHandler } from '@sveltejs/kit';
import { serverClient } from '$lib/server/deb/server-client';
import { readVerification } from '$lib/server/deb/verifikasi';

/**
 * Public check of a verification code printed on a document. No session: anyone who scans the QR can call it.
 * An unknown or malformed code answers { valid: false } with status 200; only a backend outage is an error.
 */
export const GET: RequestHandler = async ({ params }) => {
  const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' };
  try {
    const { pb } = await serverClient();
    const found = await readVerification(pb, String(params.code || ''));
    return json(found ? { valid: true, ...found } : { valid: false }, { headers });
  } catch {
    return json({ valid: false, unavailable: true, message: 'Layanan verifikasi belum tersedia. Coba lagi beberapa saat.' }, { status: 503, headers });
  }
};
