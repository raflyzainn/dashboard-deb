migrate(app => {
  const questions = app.findCollectionByNameOrId('questions');
  questions.fields.add(new NumberField({ name: 'replyCount', min: 0, onlyInt: true }));
  questions.fields.add(new SelectField({ name: 'lastReplyRole', values: ['campus', 'admin'], maxSelect: 1 }));
  app.save(questions);
  const active = '@request.auth.id != "" && @request.auth.active = true && @request.auth.verified = true && (@request.auth.role = "admin" || @request.auth.role = "campus")';
  const replies = new Collection({ name: 'question_replies', type: 'base', listRule: active, viewRule: active,
    createRule: null, updateRule: null, deleteRule: null });
  for (const field of [
    new RelationField({ name: 'question', collectionId: questions.id, required: true, maxSelect: 1 }),
    new RelationField({ name: 'author', collectionId: app.findCollectionByNameOrId('users').id, required: true, maxSelect: 1 }),
    new SelectField({ name: 'authorRole', values: ['campus', 'admin'], required: true, maxSelect: 1 }),
    new TextField({ name: 'authorName', required: true, max: 250 }),
    new TextField({ name: 'body', required: true, max: 5000 }),
    new NumberField({ name: 'sequence', min: 1, onlyInt: true, required: true }),
    new BoolField({ name: 'simulated' }),
    new AutodateField({ name: 'created', onCreate: true })
  ]) replies.fields.add(field);
  replies.indexes = ['CREATE UNIQUE INDEX idx_question_replies_sequence ON question_replies (question, sequence)'];
  app.save(replies);
  replies.fields.add(new RelationField({ name: 'replyTo', collectionId: replies.id, maxSelect: 1 }));
  app.save(replies);
}, () => { throw new Error('Forward-only discussion migration; restore a verified backup.'); });
