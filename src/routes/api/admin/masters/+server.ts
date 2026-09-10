import { json, type RequestHandler } from '@sveltejs/kit';
import { previewEndpoint } from '$lib/server/deb/http';
import { PreviewError } from '$lib/server/deb/preview-error';
export const GET: RequestHandler = event => previewEndpoint(event, async context => {
  const pb = await context.account(event.request.headers.get('x-deb-preview-account'));
  if (pb.authStore.record?.role !== 'admin') throw new PreviewError(403, 'Hanya Admin dapat mengelola master.');
  const definitions = await pb.collection('indicator_definitions').getFullList({ sort: 'status,code' });
  const audit = await pb.collection('master_audit').getList(1, 50, { sort: '-created,-id' });
  return json({ audit: audit.items.map(r => ({ id:r.id, actor:r.actor, entity:r.entity, entityId:r.entityId, operation:r.operation, before:r.before, after:r.after, created:r.created })), definitions: definitions.map(r => ({ id:r.id, code:r.code, name:r.name, category:r.category, unit:r.unit, description:r.description, baseline:r.baseline, target:r.target, status:r.status, revision:r.revision })) });
});
