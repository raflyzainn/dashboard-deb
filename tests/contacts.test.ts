import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseContacts, serializeContacts, formatPhone, normalizedPhone, contactError, whatsappLink } from '../src/lib/contacts';

test('saved contacts preserve names and phone numbers regardless of prefix', () => {
  const contacts = [
    { name: 'Kontak A', phone: '222222313123' },
    { name: 'Kontak B', phone: '2222222222' },
    { name: 'Kontak C', phone: '+6281234567890' },
    { name: 'Kontak D', phone: '081234567890' },
    { name: 'Kontak tanpa nomor', phone: '' }
  ];
  assert.deepEqual(parseContacts(serializeContacts(contacts)), contacts);
  assert.equal(formatPhone('2222222222'), '2222222222');
});

test('WhatsApp links use validated international numbers', () => {
  for (const phone of ['081234567890', '6281234567890', '+6281234567890']) {
    assert.equal(normalizedPhone(phone), '+6281234567890');
    assert.equal(whatsappLink(phone), 'https://wa.me/6281234567890');
  }
  assert.equal(whatsappLink('+447911123456'), 'https://wa.me/447911123456');
  for (const phone of ['2222222222', '123', '+001234567890', '0812abc34567890']) {
    assert.equal(whatsappLink(phone), '');
    assert.ok(contactError({ name: 'Kontak', phone }));
  }
  assert.equal(contactError({ name: 'Kontak tanpa nomor', phone: '' }), '');
});

test('legacy contact text and numbers in names are preserved', () => {
  assert.deepEqual(parseContacts('Budi (12)'), [{ name: 'Budi (12)', phone: '' }]);
  assert.deepEqual(parseContacts('Budi (2026) (+6281234567890)'), [{ name: 'Budi (2026)', phone: '+6281234567890' }]);
  assert.deepEqual(parseContacts('Nama PFS 12 (081234567890) dan Orang lain (2222222222)'), [
    { name: 'Nama PFS 12', phone: '081234567890' },
    { name: 'Orang lain', phone: '2222222222' }
  ]);
  assert.deepEqual(parseContacts('Nama 0812 3456 7890'), [{ name: 'Nama', phone: '081234567890' }]);
});
