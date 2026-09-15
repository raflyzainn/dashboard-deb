import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { emailContent } from '../src/lib/server/deb/email-content';
import schema from '../db-schema/collections.json';

test('native email restores branding and purpose-specific copy without losing placeholders', () => {
  const collection = schema.find(c => c.name === 'email_challenges')!;
  const template = collection.resetPasswordTemplate!;
  assert.equal(template.body, readFileSync('docs/email-templates/account-access.html', 'utf8'));
  assert.match(template.body, /https:\/\/cdn\.pertaminafoundation\.org\/pertamina-foundation-logo-white\.png/);
  assert.equal((template.body.match(/\{APP_URL\}\/login\?token=\{TOKEN\}/g) || []).length, 3);
  const activate = emailContent('activate', 'PIC <QA>', 'Kampus & Mitra');
  const forgot = emailContent('forgot', 'PIC <QA>', 'Kampus & Mitra');
  assert.equal(activate.mailAction, 'Aktifkan akun');
  assert.equal(forgot.mailAction, 'Atur ulang password');
  for (const content of [activate, forgot]) {
    for (const field of Object.keys(content)) assert.ok(collection.fields.some(f => f.name === field));
    for (const match of (template.body + template.subject).matchAll(/\{RECORD:(\w+)\}/g)) assert.ok(match[1] in content);
    assert.equal(content.picName, 'PIC <QA>'); // Native renderer escapes once, not double-encoded here.
  }
});
