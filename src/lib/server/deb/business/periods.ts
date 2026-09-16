import { StoreRecord, type RestStore } from '../rest-store';
import { PreviewError } from '../preview-error';
import { activePeriodFilter } from '../../../periods';

export function activeDefinitions(app: RestStore) {
  return app.findRecordsByFilter('indicator_definitions', 'status = "active" && ' + activePeriodFilter);
}
export function requireOpenDefinition(app: RestStore, id: string) {
  const d = app.findRecordById('indicator_definitions', id);
  if (d.getString('status') !== 'active' || ['draft','archived'].includes(d.getString('periodState')))
    throw new PreviewError(409, 'Periode indikator tidak aktif atau sudah menjadi arsip.');
  return d;
}
export function runPeriod(app: RestStore, actor: StoreRecord, op: string, payload: Record<string, unknown>) {
  if (actor.getString('role') !== 'admin') throw new PreviewError(403, 'Hanya Admin dapat mengelola periode.');
  const definitions = app.findRecordsByFilter('indicator_definitions');
  const active = definitions.filter(d => !d.getString('periodState') || d.getString('periodState') === 'active');
  if (op === 'masterCreatePeriod') {
    const name = typeof payload.name === 'string' ? payload.name.trim() : '';
    if (!name || name.length > 80 || name.toLowerCase() === 'periode awal') throw new PreviewError(400, 'Nama periode wajib diisi, maksimal 80 karakter.');
    if (definitions.some(d => d.getString('period').toLowerCase() === name.toLowerCase() || d.getString('periodState') === 'draft'))
      throw new PreviewError(409, 'Nama periode sudah digunakan atau masih ada draft periode.');
    const source = active.filter(d => d.getString('status') === 'active');
    if (!source.length) throw new PreviewError(409, 'Aktifkan minimal satu indikator pada periode saat ini.');
    for (const d of source) {
      const copy = new StoreRecord('indicator_definitions');
      for (const field of ['code','name','category','unit','description','baseline','target']) copy.set(field,d.data[field]);
      Object.assign(copy.data,{period:name,periodState:'draft',status:'active',revision:1,simulated:actor.getBool('simulated')});
      app.save(copy);
    }
  } else {
    const period = typeof payload.period === 'string' ? payload.period : '';
    const draft = definitions.filter(d => d.getString('period') === period);
    if (!draft.length || draft.some(d => d.getString('periodState') !== 'draft')) throw new PreviewError(409, 'Pilih draft periode yang belum dibuka.');
    if (app.findRecordsByFilter('deb_submissions','status = "pending"').length) throw new PreviewError(409, 'Selesaikan seluruh review pengajuan pending sebelum membuka periode baru.');
    const enabled = draft.filter(d => d.getString('status') === 'active');
    if (!enabled.length) throw new PreviewError(400, 'Aktifkan minimal satu indikator untuk periode baru.');
    for (const d of active) { d.set('periodState','archived'); d.set('revision',d.getInt('revision')+1); app.save(d); }
    for (const d of draft) { d.set('periodState','active'); d.set('revision',d.getInt('revision')+1); app.save(d); }
    for (const c of app.findRecordsByFilter('campuses')) for (const d of enabled) {
      const r = new StoreRecord('campus_indicators');
      Object.assign(r.data,{campus:c.id,definition:d.id,baseline:d.getFloat('baseline'),target:d.getFloat('target'),current:0,note:'',unfilled:true,simulated:actor.getBool('simulated')});
      app.save(r);
    }
  }
  const audit = new StoreRecord('master_audit');
  Object.assign(audit.data,{actor:actor.id,entity:'indicator_definitions',entityId:String(payload.name || payload.period),operation:op,before:null,after:payload});
  app.save(audit);
  return {ok:true};
}
