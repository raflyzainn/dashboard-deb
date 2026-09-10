// Reconcile native field registration on local instances created during P1 development.
migrate(app => {
  const campus = app.findCollectionByNameOrId('campuses');
  const users = app.findCollectionByNameOrId('users');
  users.authRule = 'active = true && verified = true';
  users.authToken.duration = 28800;
  app.save(users);
  const text = (name, max = 1000) => new TextField({ name, max });
  const number = name => new NumberField({ name, onlyInt: true, min: 0 });
  const relation = (name, id) => new RelationField({ name, collectionId: id, maxSelect: 1, cascadeDelete: false });
  const make = (name, fields, indexes = []) => {
    let c; try { c = app.findCollectionByNameOrId(name); } catch (_) { c = new Collection({ name, type: 'base' }); }
    for (const field of [...fields, new AutodateField({ name: 'created', onCreate: true }), new AutodateField({ name: 'updated', onCreate: true, onUpdate: true })]) c.fields.add(field);
    c.indexes = indexes; app.save(c); return c;
  };
  const contacts = make('campus_contacts', [relation('campus', campus.id), relation('account', users.id), text('name', 200), text('email', 254), number('revision')],
    ['CREATE UNIQUE INDEX idx_contacts_campus ON campus_contacts (campus)', "CREATE UNIQUE INDEX idx_contacts_email ON campus_contacts (email) WHERE email != ''"]);
  make('account_invitations', [relation('contact', contacts.id), relation('account', users.id), text('purpose', 20), text('email', 254), number('revision'), number('expires'),
    new BoolField({ name: 'used' }), new BoolField({ name: 'revoked' }), text('delivery', 30), number('attempts'), number('nextAttempt'), text('sentAt', 60), text('error', 300)]);
  make('account_audit', [relation('actor', users.id), relation('campus', campus.id), text('event', 80), new JSONField({ name: 'details', maxSize: 20000 })]);
  make('auth_limits', [text('key', 100), number('count'), number('until')], ['CREATE UNIQUE INDEX idx_auth_limits_key ON auth_limits (key)']);
}, () => { throw new Error('P1 forward-only: restore the verified backup with matching code.'); });
