import type { RequestHandler } from './$types';
import { workflow } from '$lib/server/deb/workflows';
export const PATCH: RequestHandler = event => workflow(event, 'masterSaveCampus', ['revision','name','initials','acronym','region','city','province','island','latitude','longitude','approximate']);
export const DELETE: RequestHandler = event => workflow(event, 'masterDeleteCampus', ['revision']);
