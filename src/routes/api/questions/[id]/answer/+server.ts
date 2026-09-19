import type { RequestHandler } from './$types';
import { workflow } from '$lib/server/deb/workflows';
export const PUT: RequestHandler = event => workflow(event, 'answer', ["body"], {});
