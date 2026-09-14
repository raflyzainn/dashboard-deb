import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { previewEndpoint } from '$lib/server/deb/http';
import { workflow } from '$lib/server/deb/workflows';
import { readReplies } from '$lib/server/deb/replies';

export const GET: RequestHandler = event => previewEndpoint(event, async context => {
  const pb = await context.account(event.request.headers.get('x-deb-preview-account'));
  return json(await readReplies(pb, event.params.id, event.url.searchParams));
});
export const POST: RequestHandler = event => workflow(event, 'reply', ['body', 'replyTo']);
