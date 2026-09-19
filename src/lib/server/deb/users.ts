import type { Actor } from './access';

export function mapUser(r: Record<string, unknown>) {
  return { id: r.id, name: r.name || '', email: r.email || '', role: r.role, active: Boolean(r.active), campusId: r.campus || '', created: r.created, lastLoginAt: r.lastLoginAt || '' };
}

/** Which roles an actor may hand out. Only the super admin grants admin; nobody grants super admin from the app. */
export function grantable(actor: Actor): string[] {
  return actor.superAdmin ? ['baru', 'campus', 'admin'] : ['baru', 'campus'];
}
