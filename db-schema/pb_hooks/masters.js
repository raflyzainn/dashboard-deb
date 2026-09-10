// Invoked only inside the authenticated workflow transaction (same txApp and receipt).
function fail(message, status = 400) { throw new ApiError(status, message); }
function text(value, required = true, max = 200) {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) fail('Teks wajib diisi dan panjangnya harus sesuai batas.');
  return value.trim();
}
function list(app, name, filter = '', params = {}) { return app.findRecordsByFilter(name, filter, 'id', 0, 0, params); }
function get(app, name, id) {
  if (typeof id !== 'string' || !/^[a-z0-9]{15}$/.test(id)) fail('Master tidak ditemukan.', 404);
  try { return app.findRecordById(name, id); } catch (_) { fail('Master tidak ditemukan.', 404); }
}
function create(app, name, fields) {
  const r = new Record(app.findCollectionByNameOrId(name));
  for (const k in fields) r.set(k, fields[k]); app.save(r); return r;
}
const definitionFields = ['code', 'name', 'category', 'unit', 'description', 'baseline', 'target', 'status', 'revision'];
const campusFields = ['name', 'initials', 'acronym', 'region', 'city', 'source', 'province', 'island', 'latitude', 'longitude', 'hasLocation', 'locationApproximate', 'revision'];
function view(r, fields) { const value = {}; fields.forEach(k => value[k] = r.get(k)); return value; }
function expected(r, payload) {
  if (!Number.isInteger(payload.revision) || payload.revision !== r.getInt('revision')) fail('Master sudah berubah. Muat ulang data sebelum menyimpan kembali.', 409);
}
function noPending(app) {
  if (list(app, 'deb_submissions', 'status = "pending"').length) fail('Masih ada pengajuan pending. Selesaikan Review Kampus sebelum mengubah indikator bersama.', 409);
}
exports.run = ({ app, actor, op, payload, event }) => {
  if (actor.getString('role') !== 'admin') fail('Hanya Admin dapat mengelola master.', 403);
  let r, before = null, entity;
  if (['masterSaveDefinition', 'masterActivateDefinition', 'masterDeleteDefinition'].includes(op)) {
    entity = 'indicator_definitions';
    if (payload.id) { r = get(app, entity, payload.id); expected(r, payload); before = view(r, definitionFields); }
    if (op !== 'masterSaveDefinition' && !r) fail('Master tidak ditemukan.', 404);
    if (op === 'masterDeleteDefinition') {
      if (list(app, 'campus_indicators', 'definition = {:id}', { id: r.id }).length || list(app, 'deb_submissions').some(s => JSON.parse(s.get('snapshot')).some(i => i.definitionId === r.id))) fail('Indikator sudah digunakan oleh isian atau riwayat kampus dan tidak dapat dihapus.', 409);
      app.delete(r);
    } else if (op === 'masterActivateDefinition') {
      if (r.getString('status') !== 'draft') fail('Indikator sudah aktif.', 409);
      noPending(app);
      r.set('status', 'active'); r.set('revision', r.getInt('revision') + 1); app.save(r);
      for (const c of list(app, 'campuses')) {
        create(app, 'campus_indicators', { campus: c.id, definition: r.id, baseline: r.getFloat('baseline'), target: r.getFloat('target'), current: 0, note: '', simulated: true });
        event(c.id, 'indicator_activated', r.id, 'Indikator bersama baru diaktifkan: ' + r.getString('name'), 'campus', '/campus/indicators');
      }
    } else {
      if (r && r.getString('status') === 'active') noPending(app);
      if (typeof payload.baseline !== 'number' || !Number.isFinite(payload.baseline) || payload.baseline < 0 || typeof payload.target !== 'number' || !Number.isFinite(payload.target) || payload.target <= 0) fail('Baseline harus nonnegatif dan target harus lebih dari nol.');
      const code = text(payload.code, true, 100);
      if (list(app, entity, 'code = {:code}', { code }).some(d => !r || d.id !== r.id)) fail('Kode indikator sudah digunakan.', 409);
      const fields = { code, name: text(payload.name), category: text(payload.category), unit: text(payload.unit), description: text(payload.description, false, 5000), baseline: payload.baseline, target: payload.target };
      if (!r) r = create(app, entity, Object.assign(fields, { status: 'draft', revision: 1, simulated: true }));
      else {
        for (const k in fields) r.set(k, fields[k]); r.set('revision', r.getInt('revision') + 1); app.save(r);
        if (r.getString('status') === 'active') {
          for (const i of list(app, 'campus_indicators', 'definition = {:id}', { id: r.id })) {
            i.set('baseline', payload.baseline); i.set('target', payload.target); app.save(i);
          }
          if (Number(before.baseline) !== payload.baseline || Number(before.target) !== payload.target) {
            for (const c of list(app, 'campuses')) event(c.id, 'indicator_target_updated', r.id, 'Baseline/target bersama diperbarui: ' + r.getString('name'), 'campus', '/campus/indicators');
          }
        }
      }
    }
  } else if (['masterSaveCampus', 'masterDeleteCampus'].includes(op)) {
    entity = 'campuses';
    if (payload.id) { r = get(app, entity, payload.id); expected(r, payload); before = view(r, campusFields); }
    if (op === 'masterDeleteCampus') {
      if (!r) fail('Kampus tidak ditemukan.', 404);
      for (const name of ['users', 'campus_indicators', 'deb_submissions', 'indicator_feedback', 'proposal_versions', 'questions', 'question_likes', 'activities', 'notifications']) {
        if (list(app, name, 'campus = {:id}', { id: r.id }).length) fail('Kampus sudah digunakan oleh ' + name + ' dan tidak dapat dihapus.', 409);
      }
      app.delete(r);
    } else {
      const hasLocation = payload.latitude !== null || payload.longitude !== null;
      if (hasLocation && (typeof payload.latitude !== 'number' || typeof payload.longitude !== 'number' || !Number.isFinite(payload.latitude) || !Number.isFinite(payload.longitude) || payload.latitude < -11.5 || payload.latitude > 6.5 || payload.longitude < 94.5 || payload.longitude > 141.5)) fail('Isi kedua koordinat dalam wilayah Indonesia, atau kosongkan keduanya.');
      if (typeof payload.approximate !== 'boolean') fail('Penanda lokasi tidak valid.');
      const fields = { name: text(payload.name), initials: text(payload.initials, true, 12), acronym: text(payload.acronym, false, 100), region: text(payload.region), city: text(payload.city, false), province: text(payload.province, false), island: text(payload.island, false), latitude: hasLocation ? payload.latitude : 0, longitude: hasLocation ? payload.longitude : 0, hasLocation, locationApproximate: payload.approximate };
      if (!r) {
        r = create(app, entity, Object.assign(fields, { source: 'admin', revision: 1, simulated: true }));
        for (const d of list(app, 'indicator_definitions', 'status = "active"')) create(app, 'campus_indicators', { campus: r.id, definition: d.id, baseline: d.getFloat('baseline'), target: d.getFloat('target'), current: 0, note: '', simulated: true });
      } else { for (const k in fields) r.set(k, fields[k]); r.set('revision', r.getInt('revision') + 1); app.save(r); }
    }
  } else fail('Operasi master tidak dikenal.', 404);
  const deleted = op === 'masterDeleteDefinition' || op === 'masterDeleteCampus';
  create(app, 'master_audit', { actor: actor.id, entity, entityId: r.id, operation: op, before, after: deleted ? null : view(r, entity === 'campuses' ? campusFields : definitionFields) });
  return { ok: true, id: r.id };
};
