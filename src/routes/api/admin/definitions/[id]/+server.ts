import type { RequestHandler } from './$types';
import { workflow } from '$lib/server/deb/workflows';
export const PATCH: RequestHandler = event => workflow(event, 'masterSaveDefinition', ['revision','code','name','category','unit','description','baseline','target']);
export const DELETE: RequestHandler = event => workflow(event, 'masterDeleteDefinition', ['revision']);
