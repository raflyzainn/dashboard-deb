// Reload records after fields were added: records loaded under the old collection
// schema cannot persist newly introduced fields in PocketBase's JSVM.
migrate(app => {
  const definitions = app.findAllRecords('indicator_definitions');
  for (const d of definitions) {
    if (d.getString('status')) continue;
    const rows = app.findRecordsByFilter('campus_indicators', 'definition = {:id}', 'id', 0, 0, { id: d.id });
    const pairs = [...new Set(rows.map(r => JSON.stringify([r.getFloat('baseline'), r.getFloat('target')])))];
    if (pairs.length !== 1) throw new Error('Shared baseline/target conflict: ' + d.id);
    const pair = JSON.parse(pairs[0]);
    if (pair[0] < 0 || pair[1] <= 0) throw new Error('Invalid shared values: ' + d.id);
    d.set('baseline', pair[0]); d.set('target', pair[1]); d.set('status', 'active'); d.set('revision', 1);
    app.save(d);
  }
}, () => { throw new Error('Forward-only: restore a verified backup with compatible code.'); });
