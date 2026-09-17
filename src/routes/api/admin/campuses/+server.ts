import type { RequestHandler } from './$types';
import { workflow } from '$lib/server/deb/workflows';
export const POST: RequestHandler = event => workflow(event, 'masterSaveCampus', ['name','initials','acronym','region','city','province','island','latitude','longitude','approximate']);
