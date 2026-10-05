import { redirect, type RequestHandler } from '@sveltejs/kit';
import { finishMicrosoft } from '$lib/server/deb/oauth';
import { PreviewError } from '$lib/server/deb/preview-error';

export const GET: RequestHandler = async event => {
  let target = '';
  try {
    target = await finishMicrosoft(event);
  } catch (error) {
    // Sign in errors are always shown to the person; nothing fails silently.
    const message = error instanceof PreviewError ? error.message : 'Masuk dengan Microsoft belum berhasil. Coba lagi.';
    if (!(error instanceof PreviewError)) console.warn('OAuth callback failed', error);
    redirect(303, '/login?error=' + encodeURIComponent(message));
  }
  redirect(303, target);
};
