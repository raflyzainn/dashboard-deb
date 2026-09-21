import { redirect, type RequestHandler } from '@sveltejs/kit';
import { startMicrosoft } from '$lib/server/deb/oauth';
import { PreviewError } from '$lib/server/deb/preview-error';

export const GET: RequestHandler = async event => {
  let target = '';
  try {
    target = await startMicrosoft(event);
  } catch (error) {
    const message = error instanceof PreviewError ? error.message : 'Masuk dengan Microsoft belum tersedia.';
    if (!(error instanceof PreviewError)) console.warn('OAuth start failed', error);
    redirect(303, '/login?error=' + encodeURIComponent(message));
  }
  redirect(303, target);
};
