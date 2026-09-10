// Forward-only P4. Derive shared values from existing data, never guess a target.
migrate(app => {
  const defs = app.findAllRecords('indicator_definitions');
  const values = {};
  for (const d of defs) {
    const rows = app.findRecordsByFilter('campus_indicators', 'definition = {:id}', 'id', 0, 0, { id: d.id });
    const pairs = [...new Set(rows.map(r => JSON.stringify([r.getFloat('baseline'), r.getFloat('target')])))];
    if (pairs.length !== 1) throw new Error('Shared baseline/target conflict: ' + d.id);
    values[d.id] = JSON.parse(pairs[0]);
  }
  const definitions = app.findCollectionByNameOrId('indicator_definitions');
  definitions.fields.add(new NumberField({ name: 'baseline', min: 0 }));
  definitions.fields.add(new NumberField({ name: 'target', min: 0 }));
  definitions.fields.add(new SelectField({ name: 'status', values: ['draft', 'active'], maxSelect: 1 }));
  definitions.fields.add(new NumberField({ name: 'revision', min: 1, onlyInt: true }));
  const authenticated = '@request.auth.id != "" && @request.auth.active = true';
  definitions.listRule = definitions.viewRule = authenticated + ' && (@request.auth.role = "admin" || (@request.auth.role = "campus" && status = "active"))';
  app.save(definitions);
  for (const d of defs) {
    d.set('baseline', values[d.id][0]); d.set('target', values[d.id][1]);
    d.set('status', 'active'); d.set('revision', 1); app.save(d);
  }
  const campuses = app.findCollectionByNameOrId('campuses');
  campuses.fields.add(new NumberField({ name: 'revision', min: 1, onlyInt: true }));
  campuses.fields.add(new BoolField({ name: 'hasLocation' }));
  campuses.fields.getByName('source').values = ['user', 'document', 'admin'];
  app.save(campuses);
  for (const c of app.findAllRecords('campuses')) {
    c.set('revision', 1);
    c.set('hasLocation', c.getFloat('latitude') >= -11.5 && c.getFloat('latitude') <= 6.5 && c.getFloat('longitude') >= 94.5 && c.getFloat('longitude') <= 141.5);
    app.save(c);
  }
  const audit = new Collection({ name: 'master_audit', type: 'base',
    listRule: authenticated + ' && @request.auth.role = "admin"', viewRule: authenticated + ' && @request.auth.role = "admin"',
    createRule: null, updateRule: null, deleteRule: null,
    fields: [new RelationField({ name: 'actor', collectionId: app.findCollectionByNameOrId('users').id, required: true, maxSelect: 1, cascadeDelete: false }),
      new TextField({ name: 'entity', required: true }), new TextField({ name: 'entityId', required: true }), new TextField({ name: 'operation', required: true }),
      new JSONField({ name: 'before', maxSize: 100000 }), new JSONField({ name: 'after', maxSize: 100000 }),
      new AutodateField({ name: 'created', onCreate: true })] });
  app.save(audit);
}, () => { throw new Error('P4 is forward-only. Restore a verified database/file backup with compatible code.'); });
