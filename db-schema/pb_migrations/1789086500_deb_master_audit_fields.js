// Explicit FieldsList mutation is required by the PocketBase JSVM constructor.
// Repair the locally applied P4 audit schema without dropping existing records.
migrate(app => {
  const audit = app.findCollectionByNameOrId('master_audit');
  for (const field of [
    new RelationField({ name: 'actor', collectionId: app.findCollectionByNameOrId('users').id, required: true, maxSelect: 1, cascadeDelete: false }),
    new TextField({ name: 'entity', required: true }), new TextField({ name: 'entityId', required: true }), new TextField({ name: 'operation', required: true }),
    new JSONField({ name: 'before', maxSize: 100000 }), new JSONField({ name: 'after', maxSize: 100000 }),
    new AutodateField({ name: 'created', onCreate: true })
  ]) audit.fields.add(field);
  audit.listRule = audit.viewRule = '@request.auth.id != "" && @request.auth.active = true && @request.auth.role = "admin"';
  audit.createRule = audit.updateRule = audit.deleteRule = null;
  audit.indexes = ['CREATE INDEX idx_master_audit_created ON master_audit (created)'];
  app.save(audit);
}, () => { throw new Error('Forward-only: restore a verified backup with compatible code.'); });
