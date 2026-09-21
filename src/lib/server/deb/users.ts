import type { Actor } from './access';
import { fail } from './access';
import { requiresPasswordChange } from './password-policy';

export function validatePassword(password: string) {
  if (password.length < 8 || password.length > 128 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) fail(400, 'Kata sandi 8 sampai 128 karakter, mengandung angka dan huruf kapital.');
}

export function mapUser(r: Record<string, unknown>) {
  return { id: r.id, name: r.name || '', email: r.email || '', role: r.role, active: Boolean(r.active), campusId: r.campus || '', created: r.created, lastLoginAt: r.lastLoginAt || '', passwordChangeRequired: requiresPasswordChange(r) };
}

/** Which roles an actor may hand out. Only the super admin grants admin; nobody grants super admin from the app. */
export function grantable(actor: Actor): string[] {
  return actor.superAdmin ? ['baru', 'campus', 'admin'] : ['baru', 'campus'];
}
