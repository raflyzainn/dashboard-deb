import type { RequestHandler } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';

/** The RAB Tahap 1 template is a static file built by scripts/templat/rab-template.py; this address stays for older links. */
export const GET: RequestHandler = () => redirect(302, '/templat/RAB_DEB_Tahap_1.xlsx');
