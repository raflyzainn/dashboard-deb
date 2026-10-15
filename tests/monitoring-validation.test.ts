import test from 'node:test';
import assert from 'node:assert/strict';
import { RestStore, StoreRecord } from '../src/lib/server/deb/rest-store';
import { monitoringRevision, openMonitoringPeriod, validateMonitoringProgram } from '../src/lib/server/deb/monitoring';
import { emptyProgram } from '../src/lib/monitoring';

test('revisi stale atau revision bertipe string ditolak tanpa menimpa data', () => {
  const saved = new StoreRecord('monitoring_months', { id: 'month', revision: 3, payload: { incomeSen: 100 } });
  assert.throws(() => monitoringRevision(saved, 2), /tab lain/);
  assert.throws(() => monitoringRevision(saved, '3'), /tab lain/);
  assert.doesNotThrow(() => monitoringRevision(saved, 3));
  assert.equal(saved.data.payload.incomeSen, 100);
});
test('periode arsip dan periode yang tidak dikenal tidak menerima perubahan', () => {
  const store = new RestStore({ indicator_definitions: [{ id: 'a', period: 'lama', periodState: 'archived' }, { id: 'b', period: 'aktif', periodState: 'active' }] as any });
  assert.throws(() => openMonitoringPeriod(store, 'lama'), /tidak aktif/);
  assert.throws(() => openMonitoringPeriod(store, 'hilang'), /tidak aktif/);
  assert.doesNotThrow(() => openMonitoringPeriod(store, 'aktif'));
});
test('bukti dari luar daftar kampus dan bukti dengan jenis salah ditolak', () => {
  const store = new RestStore({ monitoring_files: [{ id: 'own-photo', kind: 'solar' }] as any });
  const program = emptyProgram(); program.evidence.solar.fileId = 'other-campus-photo';
  assert.throws(() => validateMonitoringProgram(program, [], store), /bukan milik/);
  program.evidence.solar.fileId = ''; program.evidence.reactor.fileId = 'own-photo';
  assert.throws(() => validateMonitoringProgram(program, [], store), /jenis/);
  program.evidence.reactor.fileId = ''; program.evidence.solar.fileId = 'own-photo';
  assert.equal(validateMonitoringProgram(program, [], store).program.evidence.solar.fileId, 'own-photo');
});
