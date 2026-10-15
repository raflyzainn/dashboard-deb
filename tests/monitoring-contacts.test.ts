import test from 'node:test';
import assert from 'node:assert/strict';
import { preserveHeroMetadata } from '../src/lib/contacts';

test('editor kontak lama tidak boleh menghapus cerita/foto karena koreksi nama atau nomor', () => {
  const hero = { id: 'stable-1', name: 'Hero QA', phone: '+6281234567890', story: 'Cerita yang sudah disimpan', photo: 'photo1' };
  assert.throws(() => preserveHeroMetadata([hero], [{ name: hero.name, phone: '+6281234567891' }]), /monitoring/);
  assert.throws(() => preserveHeroMetadata([hero], []), /monitoring/);
  assert.deepEqual(preserveHeroMetadata([hero], [{ name: hero.name, phone: hero.phone }]), [hero]);
});
test('mengurutkan ulang kontak tidak memindahkan foto ke orang lain', () => {
  const a = { id: 'a', name: 'A', phone: '', story: 'A story', photo: 'a-photo' }, b = { id: 'b', name: 'B', phone: '', story: 'B story', photo: 'b-photo' };
  assert.deepEqual(preserveHeroMetadata([a, b], [b, a]), [b, a]);
});
