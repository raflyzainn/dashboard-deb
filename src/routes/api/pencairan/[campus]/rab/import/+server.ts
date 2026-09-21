import type { RequestHandler } from '@sveltejs/kit';
import { secured, ok, fail, ADMIN, actorInfo, recordId } from '$lib/server/deb/access';
import { campusWithAward } from '$lib/server/deb/pencairan';
import { parseWorkbook, createVersion, overview } from '$lib/server/deb/rab';

/**
 * Imports the three RAB sheets of a template workbook (or the one sheet of an older file) into a new draft. Multipart: file, and mode=preview to only read and report
 * (rows, totals, problems) without saving anything. Without preview the draft is created and returned selected.
 */
export const POST: RequestHandler = event => secured(event, ADMIN, async ({ actor, pb }) => {
  const campusId = recordId(event.params.campus, 'Kampus');
  const form = await event.request.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) fail(400, 'Pilih berkas Excel yang akan diimpor.');
  if (!/\.(xlsx|xlsm|xls)$/i.test(file.name)) fail(400, 'Gunakan berkas Excel (.xlsx) dari templat.');
  if (file.size > 20 * 1024 * 1024) fail(413, 'Ukuran berkas maksimal 20 MB.');
  const { campus } = await campusWithAward(pb, campusId);
  const result = parseWorkbook(await file.arrayBuffer(), campus.code, file.name);
  const summary = { rows: result.rows, kind: result.kind, totalSen: result.totalSen, term1Sen: result.term1Sen, term2Sen: result.term2Sen || 0, problems: result.problems.slice(0, 200), problemCount: result.problems.length, fileName: file.name };
  if (String(form?.get('mode') || '') === 'preview') return ok({ preview: summary });
  const created = await createVersion(pb, actorInfo(actor), campusId, { lines: result.lines, source: 'import', share: result.share, sourceFile: file.name, note: result.problems.length ? `${result.problems.length} catatan saat impor.` : '' });
  return ok({ ...(await overview(pb, campusId, created.id)), imported: summary }, 201);
});
