// PocketBase VM: callbacks must not close over top-level variables.
routerAdd('GET', '/api/deb/local-instance', (e) => {
  const id = $os.getenv('DEB_LOCAL_INSTANCE_ID');
  if (!id) throw new NotFoundError();
  return e.json(200, { project: 'dashboard-deb', instanceId: id, version: '0.40.3' });
});

onRecordValidate((e) => {
  const r = e.record;
  const name = r.collection().name;
  const fail = (message) => { throw new BadRequestError(message); };
  const user = (field, role, campus) => {
    const account = e.app.findRecordById('users', r.getString(field));
    if (account.getString('role') !== role || (campus && account.getString('campus') !== campus)) fail('Invalid author role/campus');
  };
  if (name === 'users') {
    if ((r.getString('role') === 'campus') !== Boolean(r.getString('campus'))) fail('Campus accounts require a campus; admins must not have one');
  }
  if (name === 'campuses' && r.getFloat('latitude') > 90) fail('Latitude outside valid range');
  if (name === 'campus_indicators' && r.getFloat('target') <= 0) fail('Target must be positive');
  if (name === 'indicator_feedback') {
    const indicator = e.app.findRecordById('campus_indicators', r.getString('indicator'));
    if (indicator.getString('campus') !== r.getString('campus')) fail('Indicator belongs to another campus');
    user('author', 'admin');
    if (!r.getBool('requiresRevision') && r.getString('state') !== 'closed') fail('Informational feedback must be closed');
  }
  if (name === 'questions') user('author', 'campus', r.getString('campus'));
  if (name === 'question_answers') user('author', 'admin');
  if (name === 'proposal_versions') user('uploadedBy', 'campus', r.getString('campus'));
  if (name === 'deb_submissions') {
    user('submittedBy', 'campus', r.getString('campus'));
    if (!r.getString('submittedAt')) fail('Submission timestamp required');
    const snapshot = JSON.parse(r.get('snapshot'));
    if (!Array.isArray(snapshot) || !snapshot.length) fail('Nonempty snapshot required');
    const seen = {};
    for (const item of snapshot) {
      if (item.campusId !== r.getString('campus') || !item.definitionId || seen[item.definitionId] ||
          !item.name || !item.unit || !item.category || !(item.target > 0) || !(item.current >= 0) || !(item.baseline >= 0)) fail('Invalid submission snapshot');
      const indicator = e.app.findRecordById('campus_indicators', item.id);
      if (indicator.getString('campus') !== item.campusId || indicator.getString('definition') !== item.definitionId) fail('Invalid snapshot relation');
      seen[item.definitionId] = true;
    }
    if (r.getString('status') !== 'pending') {
      user('reviewedBy', 'admin');
      if (!r.getString('reviewedAt')) fail('Review timestamp required');
      if (r.getString('status') === 'revision' && !r.getString('decisionNote').trim()) fail('Revision note required');
    } else if (r.getString('reviewedBy') || r.getString('reviewedAt') || r.getString('decisionNote')) fail('Pending submission cannot have a decision');
    if (!r.isNew() && String(r.original().get('snapshot')) !== String(r.get('snapshot'))) fail('Submission snapshot is immutable');
  }
  if (name === 'notifications') {
    const recipient = e.app.findRecordById('users', r.getString('recipientUser'));
    if (recipient.getString('role') === 'campus' && recipient.getString('campus') !== r.getString('campus')) fail('Notification campus mismatch');
    if (!/^\/(campus|admin)(\/|$)/.test(r.getString('target')) || r.getString('target').indexOf('\\') !== -1) fail('Invalid internal notification target');
    if (!r.getString('target').startsWith('/' + recipient.getString('role') + '/')) fail('Notification target role mismatch');
  }
  if (name === 'activities') {
    const actor = e.app.findRecordById('users', r.getString('actor'));
    if (actor.getString('role') === 'campus' && actor.getString('campus') !== r.getString('campus')) fail('Activity campus mismatch');
  }
  if (!r.isNew() && ['proposal_versions', 'deb_submissions'].includes(name)) {
    for (const field of name === 'proposal_versions' ? ['campus', 'version', 'file', 'filename', 'size', 'changes', 'uploadedBy'] : ['campus', 'version', 'submittedBy', 'submittedAt']) {
      if (String(r.original().get(field)) !== String(r.get(field))) fail('Historical field is immutable: ' + field);
    }
  }
  e.next();
}, 'users', 'campuses', 'campus_indicators', 'indicator_feedback', 'questions', 'question_answers', 'proposal_versions', 'deb_submissions', 'notifications', 'activities');
