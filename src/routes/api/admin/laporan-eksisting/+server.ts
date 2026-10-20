import type { RequestHandler } from '@sveltejs/kit';
import { secured, ok, ADMIN } from '$lib/server/deb/access';
import { laporanQueue } from '$lib/server/deb/laporan-eksisting';
export const GET: RequestHandler = event => secured(event, ADMIN, async ({ pb }) => ok(await laporanQueue(pb)));
