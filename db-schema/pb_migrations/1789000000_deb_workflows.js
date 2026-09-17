migrate((app) => {
  const users = app.findCollectionByNameOrId('users');
  const collection = new Collection({ name: 'workflow_operations', type: 'base',
    listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
  });
  for (const field of [
      new RelationField({ name: 'actor', collectionId: users.id, required: true, maxSelect: 1, cascadeDelete: false }),
      new TextField({ name: 'key', required: true, max: 80 }),
      new TextField({ name: 'operation', required: true, max: 80 }),
      new TextField({ name: 'hash', required: true, max: 64 }),
      new JSONField({ name: 'result', required: true, maxSize: 10000 }),
      new AutodateField({ name: 'created', onCreate: true })
    ]) collection.fields.add(field);
  collection.indexes = ['CREATE UNIQUE INDEX idx_workflow_actor_key ON workflow_operations (actor, key)'];
  app.save(collection);
}, () => { throw new Error('Forward-only workflow migration; restore a verified backup.'); });
