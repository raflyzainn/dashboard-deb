import type { RequestHandler } from './$types';
import { workflow } from '$lib/server/deb/workflows';
export const POST: RequestHandler = event => workflow(event, 'submitDeb', [], {});
