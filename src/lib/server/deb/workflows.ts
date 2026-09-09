import { json, type RequestEvent } from '@sveltejs/kit';
import { previewEndpoint } from './http';
import { PreviewError } from './preview-error';

export function workflow(event: RequestEvent, operation: string, fields: string[], extra: Record<string, unknown> = {}) {
  return previewEndpoint(event, async context => {
    const pb = await context.account(event.request.headers.get('x-deb-preview-account'));
    const key = event.request.headers.get('idempotency-key') || '';
    if (!/^[a-zA-Z0-9_-]{16,80}$/.test(key)) throw new PreviewError(400, 'Kunci operasi tidak valid.');
    let body: FormData | Record<string, unknown>;
    if (operation === 'uploadProposal') {
      if (Number(event.request.headers.get('content-length')) > 11534336) throw new PreviewError(413, 'PDF maksimal 10 MiB.');
      const form = await event.request.formData();
      const file = form.get('file');
      if (!(file instanceof File) || form.getAll('file').length !== 1 || !file.size || file.size > 10485760) throw new PreviewError(400, 'Pilih satu PDF maksimal 10 MiB.');
      if (!/\.pdf$/i.test(file.name) || (file.type && file.type !== 'application/pdf') || new TextDecoder().decode(await file.slice(0, 5).arrayBuffer()) !== '%PDF-') throw new PreviewError(400, 'File harus berupa PDF yang valid.');
      body = new FormData(); body.set('file', file); body.set('changes', String(form.get('changes') || ''));
    } else {
      const input = await event.request.json().catch(() => { throw new PreviewError(400, 'JSON tidak valid.'); });
      if (!input || typeof input !== 'object' || Array.isArray(input)) throw new PreviewError(400, 'Data permintaan tidak valid.');
      body = Object.fromEntries(fields.filter(field => input[field] !== undefined).map(field => [field, input[field]]));
      Object.assign(body, extra, event.params.id ? { id: event.params.id } : {});
    }
    try {
      const result = await pb.send(`/api/deb/workflows/${operation}`, { method: 'POST', body, headers: { 'Idempotency-Key': key } });
      return json(result);
    } catch (error) {
      const failure = error as { status?: number; response?: { message?: string } };
      if (failure.status && [400, 401, 403, 404, 409, 413].includes(failure.status)) throw new PreviewError(failure.status, failure.response?.message || 'Operasi ditolak.');
      throw new PreviewError(503, 'Penyimpanan PocketBase belum dapat dipastikan. Coba ulang operasi yang sama.');
    }
  });
}
