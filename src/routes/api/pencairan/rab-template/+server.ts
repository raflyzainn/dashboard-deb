import type { RequestHandler } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';

/** The RAB template (three sheets) is a static file built by scripts/templat/rab-template.ts; this address stays for older links. */
export const GET: RequestHandler = () => redirect(302, '/templat/RAB_DEB.xlsx');
