import type { RequestHandler } from './$types';
import { previewEndpoint } from '$lib/server/deb/http';
import { createDebRepository } from '$lib/server/deb/repository';
export const GET: RequestHandler = event => previewEndpoint(event, async context => {
  const pb = await context.account(event.request.headers.get('x-deb-preview-account'));
  const blob = await createDebRepository(pb).proposalFile(event.params.id);
  return new Response(blob, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline; filename="proposal.pdf"' } });
});
