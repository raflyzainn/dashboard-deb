// PocketBase 0.40.3 native migration. Forward-only: never drop historical data.
migrate((app) => {
  const active = '@request.auth.id != "" && @request.auth.active = true && (@request.auth.role = "admin" || @request.auth.role = "campus")';
  const own = active + ' && (@request.auth.role = "admin" || campus = @request.auth.campus)';
  const ids = {};
  const text = (name, required = false, max = 5000) => ({ name, type: 'text', required, max });
  const num = (name, min = 0, integer = false) => ({ name, type: 'number', min, onlyInt: integer });
  const select = (name, values, maxSelect = 1) => ({ name, type: 'select', values, maxSelect, required: true });
  const rel = (name, collection, required = true) => ({ name, type: 'relation', collectionId: ids[collection], maxSelect: 1, required, cascadeDelete: false });
  const date = (name) => ({ name, type: 'date' });
  const unique = (table, label, columns, where = '') => `CREATE UNIQUE INDEX idx_${table}_${label} ON ${table} (${columns})${where ? ' WHERE ' + where : ''}`;
  const make = (name, fields, rule, indexes = [], type = 'base') => {
    let collection;
    try { collection = app.findCollectionByNameOrId(name); } catch (_) {}
    if (collection && name !== 'users') throw new Error('Refusing to overwrite existing collection: ' + name);
    if (!collection) collection = new Collection({ name, type });
    for (const field of [text('legacyId', false, 160), { name: 'simulated', type: 'bool' },
      { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true }, ...fields]) {
      const constructors = { text: TextField, number: NumberField, bool: BoolField, select: SelectField, relation: RelationField, autodate: AutodateField, date: DateField, json: JSONField, file: FileField };
      collection.fields.add(new constructors[field.type](field));
    }
    collection.listRule = rule;
    collection.viewRule = rule;
    collection.createRule = null;
    collection.updateRule = null;
    collection.deleteRule = null;
    collection.indexes = [...collection.indexes, unique(name, 'legacy', 'legacyId', "legacyId != ''"), ...indexes];
    if (type === 'auth') {
      collection.authRule = 'active = true';
      collection.manageRule = null;
      collection.passwordAuth = { enabled: true, identityFields: ['email'] };
    }
    app.save(collection);
    ids[name] = collection.id;
  };
  make('campuses', [text('name', true, 200), text('initials'), text('acronym'), text('region'), text('city'),
    select('source', ['user', 'document']), text('province'), text('island'), num('latitude', -90),
    { name: 'longitude', type: 'number', min: -180, max: 180 }, { name: 'locationApproximate', type: 'bool' }], active);
  make('users', [text('name', true, 200), select('role', ['campus', 'admin']), rel('campus', 'campuses', false),
    { name: 'active', type: 'bool' }], active + ' && id = @request.auth.id',
    [unique('users', 'campus', 'campus', "role = 'campus'")], 'auth');
  make('indicator_definitions', [text('code', true, 100), text('name', true, 200), text('category', true), text('unit', true), text('description')], active,
    [unique('indicator_definitions', 'code', 'code')]);
  make('campus_indicators', [rel('campus', 'campuses'), rel('definition', 'indicator_definitions'), num('baseline'), num('target'), num('current'), text('note')], own,
    [unique('campus_indicators', 'definition', 'campus, definition')]);
  make('deb_submissions', [rel('campus', 'campuses'), num('version', 1, true), select('status', ['pending', 'approved', 'revision']),
    { name: 'snapshot', type: 'json', required: true, maxSize: 2000000 }, rel('submittedBy', 'users'), date('submittedAt'),
    rel('reviewedBy', 'users', false), date('reviewedAt'), text('decisionNote')], own,
    [unique('deb_submissions', 'version', 'campus, version'), unique('deb_submissions', 'pending', 'campus', "status = 'pending'")]);
  make('indicator_feedback', [rel('campus', 'campuses'), rel('indicator', 'campus_indicators'), rel('author', 'users'), text('text', true),
    { name: 'requiresRevision', type: 'bool' }, select('state', ['open', 'responded', 'closed'])], own);
  make('proposal_versions', [rel('campus', 'campuses'), num('version', 1, true),
    { name: 'file', type: 'file', required: true, maxSelect: 1, maxSize: 10485760, mimeTypes: ['application/pdf'], protected: true },
    text('filename', true, 255), num('size', 1, true), text('changes'), rel('uploadedBy', 'users')], own,
    [unique('proposal_versions', 'version', 'campus, version')]);
  make('questions', [rel('campus', 'campuses'), rel('author', 'users'), text('title', true, 250), text('body', true, 20000),
    select('categoryIds', ['indikator', 'proposal', 'social-mapping', 'toc', 'ikm', 'energi', 'ekonomi', 'sosial', 'umum'], 9)], active);
  make('question_answers', [rel('question', 'questions'), rel('author', 'users'), text('body', true, 20000)], active,
    [unique('question_answers', 'question', 'question')]);
  make('question_likes', [rel('question', 'questions'), rel('campus', 'campuses')], active,
    [unique('question_likes', 'campus', 'question, campus')]);
  make('faq_entries', [rel('sourceQuestion', 'questions', false), text('question', true, 250), text('answer', true, 20000), num('order', 0, true)], active,
    [unique('faq_entries', 'source', 'sourceQuestion', "sourceQuestion != ''")]);
  make('activities', [rel('campus', 'campuses'), rel('actor', 'users'), text('eventType', true, 100), text('sourceId'), text('text', true)], own);
  make('notifications', [rel('recipientUser', 'users'), rel('campus', 'campuses'), text('eventType', true, 100), text('eventKey', true, 160),
    text('sourceId'), text('title', true, 250), text('body', true), text('target', true), date('readAt')], active + ' && recipientUser = @request.auth.id',
    [unique('notifications', 'event', 'eventKey, recipientUser'), 'CREATE INDEX idx_notifications_inbox ON notifications (recipientUser, readAt, created)']);
  for (const name of ['campus_indicators', 'deb_submissions', 'indicator_feedback', 'proposal_versions', 'activities']) {
    const collection = app.findCollectionByNameOrId(name);
    collection.indexes.push(`CREATE INDEX idx_${name}_campus_created ON ${name} (campus, created)`);
    app.save(collection);
  }
}, () => { throw new Error('DEB foundation is forward-only. Restore an explicit backup instead of dropping history.'); });
