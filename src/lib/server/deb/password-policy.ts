import { security } from './security';

// Existing sessionVersion is opaque to clients (max 80). Keep 200 random bits;
// the prefix persists password onboarding without adding a production field.
const PREFIX = 'pwreset:';
export const requiresPasswordChange = (record: Record<string, unknown>) =>
  typeof record.sessionVersion === 'string' && record.sessionVersion.startsWith(PREFIX);
export const newSessionVersion = (required = false) => (required ? PREFIX : '') + security.randomString(50);
