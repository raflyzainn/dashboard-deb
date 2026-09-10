// @ts-nocheck -- executed in PocketBase JSVM, not the TypeScript/Node runtime.
// Executed by an offline, temporary native migration against the backed-up local DB.
// The outer migration MUST throw QA_P4_ROLLBACK_OK; never register this in db-schema.
exports.verify = (app, masters) => {
  const list = (name, filter = '', params = {}) => app.findRecordsByFilter(name, filter, 'id', 0, 0, params);
  const admin = list('users', 'role = "admin" && active = true')[0];
  const campus = list('users', 'role = "campus" && active = true')[0];
  const check = (condition, message) => { if (!condition) throw new Error('QA assertion: ' + message); };
  check(list('indicator_definitions').every(d => ['active','draft'].includes(d.getString('status')) && d.getFloat('target') > 0 && d.getInt('revision') >= 1), 'all existing definitions have complete master values');
  const denies = (fn, message) => { let failed = false; try { fn(); } catch (_) { failed = true; } check(failed, message); };
  let eventCount = 0;
  const event = () => { eventCount++; };
  const run = (op, payload, actor = admin) => masters.run({ app, actor, op, payload, event });
  const input = {code:'QA-P4-ROLLBACK-ONLY',name:'QA rollback master',category:'QA category',unit:'unit',description:'Rollback only',baseline:2,target:10};
  denies(() => run('masterSaveDefinition', input, campus), 'Campus cannot write master');
  denies(() => run('masterSaveDefinition', {...input,target:0}), 'target must be positive');
  const id = run('masterSaveDefinition', input).id;
  let record = app.findRecordById('indicator_definitions', id);
  check(record.getString('status') === 'draft', 'new definition is draft');
  check(list('campus_indicators', 'definition = {:id}', {id}).length === 0, 'draft creates no business rows');
  denies(() => run('masterSaveDefinition', input), 'duplicate code');
  denies(() => run('masterSaveDefinition', {...input,id,revision:0}), 'stale edit');
  const pending = list('deb_submissions', 'status = "pending"');
  if (pending.length) denies(() => run('masterActivateDefinition', {id,revision:1}), 'pending blocks activation');
  // Only inside the outer rollback transaction; no pending decision is persisted.
  for (const submission of pending) app.delete(submission);
  run('masterActivateDefinition', {id,revision:1});
  const rows = list('campus_indicators', 'definition = {:id}', {id});
  check(rows.length === list('campuses').length, 'activation initializes all campuses');
  check(rows.every(r => r.getFloat('baseline') === 2 && r.getFloat('target') === 10 && r.getFloat('current') === 0), 'shared defaults');
  check(eventCount === rows.length, 'activation events for every campus');
  const first = rows[0]; first.set('current', 3); first.set('note', 'preserve'); app.save(first);
  run('masterSaveDefinition', {...input,id,revision:2,baseline:4,target:20});
  const changed = app.findRecordById('campus_indicators', first.id);
  check(changed.getFloat('current') === 3 && changed.getString('note') === 'preserve' && changed.getFloat('target') === 20, 'master edit preserves actual/note');
  denies(() => run('masterDeleteDefinition', {id,revision:3}), 'used definition cannot be deleted');
  const draft = run('masterSaveDefinition', {...input,code:'QA-P4-DELETE-DRAFT'}).id;
  run('masterDeleteDefinition', {id:draft,revision:1});
  check(list('indicator_definitions', 'id = {:id}', {id:draft}).length === 0, 'unused draft can be deleted');
  const c = run('masterSaveCampus', {name:'QA rollback campus',initials:'QA',acronym:'QA',region:'QA',city:'',province:'',island:'',latitude:null,longitude:null,approximate:true}).id;
  const campusRows = list('campus_indicators', 'campus = {:c}', {c});
  check(campusRows.length === list('indicator_definitions', 'status = "active"').length, 'new campus receives all active indicators');
  check(!app.findRecordById('campuses',c).getBool('hasLocation'), 'missing coordinates stay missing');
  denies(() => run('masterDeleteCampus', {id:c,revision:1}), 'used campus cannot be deleted');
  // Cause failure after writes, proving the outer rollback also removes audit/business rows.
  let eventFailed = false;
  const last = run('masterSaveDefinition', {...input,code:'QA-P4-EVENT-ROLLBACK'}).id;
  try { masters.run({app,actor:admin,op:'masterActivateDefinition',payload:{id:last,revision:1},event:()=>{throw new Error('QA event failure');}}); } catch (_) { eventFailed = true; }
  check(eventFailed, 'event failure propagates');
  const audits = list('master_audit', 'entityId = {:id}', {id});
  check(audits.length === 3 && audits.every(a => a.getString('actor') === admin.id && a.getString('created')), 'audit stores actor and timestamps');
  check(audits.some(a => JSON.parse(a.get('after')).target === 20), 'audit stores changed values');
  return { assertions: 20, pendingTemporarilyRemoved: pending.length };
};
