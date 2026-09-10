// CommonJS module: each PocketBase callback loads its own VM-local helpers.
const categories = ['indikator', 'proposal', 'social-mapping', 'toc', 'ikm', 'energi', 'ekonomi', 'sosial', 'umum'];
function fail(message, status = 400) { throw new ApiError(status, message); }
function text(value, max = 5000, required = true) {
  if (typeof value !== 'string' || value.length > max || (required && !value.trim())) fail('Teks wajib diisi dan tidak boleh melewati batas karakter.');
  return value.trim();
}
function list(app, name, filter = '', params = {}, sort = 'id') { return app.findRecordsByFilter(name, filter, sort, 0, 0, params); }
function get(app, name, id) {
  if (typeof id !== 'string' || !/^[a-z0-9]{15}$/.test(id)) fail('Data tidak ditemukan.', 404);
  try { return app.findRecordById(name, id); } catch (_) { fail('Data tidak ditemukan.', 404); }
}
function create(app, name, fields) {
  const record = new Record(app.findCollectionByNameOrId(name));
  for (const key in fields) record.set(key, fields[key]);
  app.save(record); return record;
}
function snapshot(app, campus) {
  return list(app, 'campus_indicators', 'campus = {:c} && definition.status = "active"', { c: campus }).map(r => {
    const d = get(app, 'indicator_definitions', r.getString('definition'));
    return { id: r.id, campusId: campus, definitionId: d.id, name: d.getString('name'), category: d.getString('category'), unit: d.getString('unit'), description: d.getString('description'), baseline: d.getFloat('baseline'), target: d.getFloat('target'), current: r.getFloat('current'), note: r.getString('note'), updatedAt: r.getString('updated') };
  });
}
function sameSnapshot(a, b) {
  const clean = rows => rows.map(r => { const item = Object.assign({}, r); delete item.updatedAt; return item; }).sort((x, y) => x.id.localeCompare(y.id));
  // Explicit fields make old seed snapshots (without description) compatible.
  const fields = ['id', 'campusId', 'definitionId', 'name', 'category', 'unit', 'baseline', 'target', 'current', 'note'];
  return JSON.stringify(clean(a).map(r => fields.map(k => r[k]))) === JSON.stringify(clean(b).map(r => fields.map(k => r[k])));
}
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    const sorted = {};
    Object.keys(value).sort().forEach(key => { sorted[key] = canonical(value[key]); });
    return sorted;
  }
  return value;
}
exports.run = (e) => {
  if (!$os.getenv('DEB_LOCAL_INSTANCE_ID')) fail('Workflow lokal tidak tersedia.', 404);
  const actorId = e.auth && e.auth.id;
  const op = e.request.pathValue('operation');
  const key = e.request.header.get('Idempotency-Key');
  if (!/^[a-zA-Z0-9_-]{16,80}$/.test(key)) fail('Kunci operasi tidak valid.');
  const input = e.requestInfo().body || {};
  let payload = input, file;
  let fileHash = '';
  if (op === 'uploadProposal') {
    const files = e.findUploadedFiles('file');
    if (files.length !== 1) fail('Pilih satu file PDF.');
    file = files[0];
    if (!file.size || file.size > 10485760) fail('PDF maksimal 10 MiB.', 413);
    if (!/\.pdf$/i.test(file.originalName)) fail('File harus berekstensi PDF.');
    const reader = file.reader.open();
    let bytes;
    try { bytes = toBytes(reader, 10485761); } finally { reader.close(); }
    if (bytes.length !== file.size || [37,80,68,70,45].some((v, i) => bytes[i] !== v)) fail('Isi file bukan PDF.');
    fileHash = $security.sha256(JSON.stringify(bytes));
    payload = { changes: input.changes || '', filename: file.originalName };
  }
  const hash = $security.sha256(JSON.stringify(canonical(JSON.parse(JSON.stringify({ op, payload, fileHash })))));
  let result;
  e.app.runInTransaction(app => {
    const actor = get(app, 'users', actorId);
    if (!actor.getBool('active') || !actor.getBool('simulated')) fail('Akun tidak aktif atau bukan akun QA lokal.', 403);
    const role = actor.getString('role'), campus = actor.getString('campus');
    if (!['admin', 'campus'].includes(role) || (role === 'campus' && !campus)) fail('Identitas akun tidak valid.', 403);
    const roleIs = expected => { if (role !== expected) fail('Peran tidak diizinkan.', 403); };
    const own = r => { if (role === 'campus' && r.getString('campus') !== campus) fail('Data tidak ditemukan.', 404); return r; };
    const prior = list(app, 'workflow_operations', 'actor = {:a} && key = {:k}', { a: actor.id, k: key });
    if (prior.length) {
      if (prior[0].getString('hash') !== hash) fail('Kunci operasi telah digunakan untuk data berbeda.', 409);
      result = JSON.parse(prior[0].get('result')); return;
    }
    const eventKey = actor.id + ':' + key;
    const notify = (c, kind, source, message, recipientRole, target) => {
      const users = list(app, 'users', recipientRole === 'admin' ? 'active = true && role = "admin"' : 'active = true && role = "campus" && campus = {:c}', { c });
      users.forEach(user => create(app, 'notifications', { recipientUser: user.id, campus: c, eventType: kind, eventKey, sourceId: source, title: message, body: message, target, simulated: true }));
    };
    const activity = (c, kind, source, message) => create(app, 'activities', { campus: c, actor: actor.id, eventType: kind, sourceId: source, text: message, simulated: true });
    const event = (c, kind, source, message, recipientRole, target) => { activity(c, kind, source, message); notify(c, kind, source, message, recipientRole, target); };
    const pending = c => list(app, 'deb_submissions', 'campus = {:c} && status = "pending"', { c });
    const revisions = c => list(app, 'indicator_feedback', 'campus = {:c} && requiresRevision = true && state != "closed"', { c });
    const now = new Date().toISOString();
    result = { ok: true };
    if (op.startsWith('master')) {
      result = require(__hooks + '/masters.js').run({ app, actor, op, payload, event });
    } else if (op === 'updateIndicator') {
      roleIs('campus'); const r = own(get(app, 'campus_indicators', payload.id));
      if (get(app, 'indicator_definitions', r.getString('definition')).getString('status') !== 'active') fail('Indikator belum aktif.', 404);
      if (pending(campus).length) fail('Indikator dikunci selama menunggu review.', 409);
      if (typeof payload.current !== 'number' || !Number.isFinite(payload.current) || payload.current < 0) fail('Nilai aktual harus angka nonnegatif.');
      const note = text(payload.note, 5000, false);
      if (r.getFloat('current') !== payload.current || r.getString('note') !== note) {
        r.set('current', payload.current); r.set('note', note); app.save(r);
        list(app, 'indicator_feedback', 'indicator = {:i} && requiresRevision = true && state = "open"', { i: r.id }).forEach(f => { f.set('state', 'responded'); app.save(f); });
        event(campus, 'indicator_updated', r.id, 'Kampus memperbarui indikator.', 'admin', '/admin/campuses/' + campus);
      }
    } else if (op === 'submitDeb') {
      roleIs('campus');
      if (pending(campus).length) fail('Pengajuan masih menunggu review.', 409);
      const rows = snapshot(app, campus);
      if (!rows.length || rows.length !== list(app, 'indicator_definitions', 'status = "active"').length || rows.some(r => !Number.isFinite(r.current) || r.current < 0 || r.target <= 0 || r.note.length > 5000)) fail('Lengkapi seluruh indikator sebelum mengirim.');
      const previous = list(app, 'deb_submissions', 'campus = {:c}', { c: campus }, '-version')[0];
      if (previous && previous.getString('status') === 'approved' && sameSnapshot(rows, JSON.parse(previous.get('snapshot')))) fail('Data terverifikasi belum berubah.', 409);
      const r = create(app, 'deb_submissions', { campus, version: previous ? previous.getInt('version') + 1 : 1, status: 'pending', snapshot: rows, submittedBy: actor.id, submittedAt: now, simulated: true });
      result.id = r.id;
      event(campus, 'deb_submitted', r.id, 'Pengajuan DEB menunggu verifikasi.', 'admin', '/admin/verifikasi?submission=' + r.id);
    } else if (op === 'reviewDeb') {
      roleIs('admin'); const r = get(app, 'deb_submissions', payload.id), c = r.getString('campus');
      if (r.getString('status') !== 'pending') fail('Pengajuan sudah diputuskan.', 409);
      if (!['approved', 'revision'].includes(payload.decision)) fail('Keputusan tidak valid.');
      const note = text(payload.note, 5000, payload.decision === 'revision');
      if (!sameSnapshot(snapshot(app, c), JSON.parse(r.get('snapshot')))) fail('Snapshot pengajuan tidak sesuai data terbaru.', 409);
      if (payload.decision === 'approved' && revisions(c).length) fail('Tutup seluruh feedback revisi sebelum konfirmasi.', 409);
      r.set('status', payload.decision); r.set('reviewedBy', actor.id); r.set('reviewedAt', now); r.set('decisionNote', note); app.save(r);
      event(c, 'deb_' + payload.decision, r.id, payload.decision === 'approved' ? 'Data DEB telah dikonfirmasi.' : 'Pengajuan DEB perlu revisi.', 'campus', '/campus/indicators');
    } else if (op === 'addFeedback') {
      roleIs('admin'); const indicator = get(app, 'campus_indicators', payload.id), c = indicator.getString('campus');
      if (typeof payload.requiresRevision !== 'boolean') fail('Jenis feedback tidak valid.');
      const r = create(app, 'indicator_feedback', { campus: c, indicator: indicator.id, author: actor.id, text: text(payload.text), requiresRevision: payload.requiresRevision, state: payload.requiresRevision ? 'open' : 'closed', simulated: true });
      result.id = r.id;
      event(c, 'feedback_created', r.id, payload.requiresRevision ? 'Admin meminta revisi indikator.' : 'Admin memberikan catatan indikator.', 'campus', '/campus/indicators');
    } else if (op === 'closeFeedback') {
      roleIs('admin'); const r = get(app, 'indicator_feedback', payload.id);
      if (r.getString('state') !== 'closed') { r.set('state', 'closed'); app.save(r); event(r.getString('campus'), 'feedback_closed', r.id, 'Feedback indikator ditandai selesai.', 'campus', '/campus/indicators'); }
    } else if (op === 'uploadProposal') {
      roleIs('campus');
      const previous = list(app, 'proposal_versions', 'campus = {:c}', { c: campus }, '-version')[0];
      const r = create(app, 'proposal_versions', { campus, version: previous ? previous.getInt('version') + 1 : 1, file, filename: file.originalName, size: file.size, changes: text(payload.changes, 5000, false), uploadedBy: actor.id, simulated: true });
      result.id = r.id;
      event(campus, 'proposal_uploaded', r.id, 'Kampus mengunggah versi proposal baru.', 'admin', '/admin/campuses/' + campus);
    } else if (op === 'ask') {
      roleIs('campus'); const selected = payload.categoryIds === undefined ? ['umum'] : payload.categoryIds;
      if (!Array.isArray(selected) || !selected.length || selected.some(c => !categories.includes(c))) fail('Kategori pertanyaan tidak valid.');
      const r = create(app, 'questions', { campus, author: actor.id, title: text(payload.title, 180), body: text(payload.body), categoryIds: [...new Set(selected)], simulated: true });
      result.id = r.id; event(campus, 'question_created', r.id, 'Pertanyaan baru dari kampus.', 'admin', '/admin/questions/' + r.id);
    } else if (op === 'answer') {
      roleIs('admin'); const q = get(app, 'questions', payload.id), body = text(payload.body);
      const old = list(app, 'question_answers', 'question = {:q}', { q: q.id })[0];
      if (!old || old.getString('body') !== body) {
        if (old) { old.set('body', body); old.set('author', actor.id); app.save(old); }
        else create(app, 'question_answers', { question: q.id, author: actor.id, body, simulated: true });
        event(q.getString('campus'), 'question_answered', q.id, 'Admin menjawab pertanyaan Anda.', 'campus', '/campus/questions/' + q.id);
      }
    } else if (op === 'setLike') {
      roleIs('campus'); const q = get(app, 'questions', payload.id);
      if (typeof payload.liked !== 'boolean') fail('Status like tidak valid.');
      const old = list(app, 'question_likes', 'question = {:q} && campus = {:c}', { q: q.id, c: campus })[0];
      if (payload.liked && !old) create(app, 'question_likes', { question: q.id, campus, simulated: true });
      if (!payload.liked && old) app.delete(old);
    } else if (op === 'promoteFaq' || op === 'saveFaq' || op === 'moveFaq' || op === 'deleteFaq') {
      roleIs('admin'); const entries = list(app, 'faq_entries', '', {}, 'order,id');
      if (op === 'promoteFaq') {
        const q = get(app, 'questions', payload.id), answer = list(app, 'question_answers', 'question = {:q}', { q: q.id })[0];
        if (!answer) fail('Pertanyaan belum dijawab.');
        const old = entries.find(r => r.getString('sourceQuestion') === q.id);
        result.id = old ? old.id : create(app, 'faq_entries', { sourceQuestion: q.id, question: q.getString('title'), answer: answer.getString('body'), order: entries.length ? entries[entries.length - 1].getInt('order') + 1 : 0, simulated: true }).id;
      } else if (op === 'saveFaq') {
        const fields = { question: text(payload.question, 180), answer: text(payload.answer) };
        if (payload.id) { const r = get(app, 'faq_entries', payload.id); r.set('question', fields.question); r.set('answer', fields.answer); app.save(r); result.id = r.id; }
        else result.id = create(app, 'faq_entries', Object.assign(fields, { order: entries.length ? entries[entries.length - 1].getInt('order') + 1 : 0, simulated: true })).id;
      } else if (op === 'deleteFaq') app.delete(get(app, 'faq_entries', payload.id));
      else {
        if (![1, -1].includes(payload.direction)) fail('Arah urutan tidak valid.');
        const index = entries.findIndex(r => r.id === payload.id);
        if (index < 0) fail('FAQ tidak ditemukan.', 404);
        const next = index + payload.direction;
        if (next >= 0 && next < entries.length) {
          // Copy primitive IDs: PocketBase's Go-backed record slice is not a JS array.
          const ids = Array.from(entries, r => r.id);
          const temp = ids[index]; ids[index] = ids[next]; ids[next] = temp;
          ids.forEach((id, i) => { const r = get(app, 'faq_entries', id); r.set('order', i); app.save(r); });
        }
      }
    } else if (op === 'readNotifications') {
      let notices;
      if (payload.ids !== undefined) {
        if (!Array.isArray(payload.ids) || payload.ids.length > 1000) fail('Daftar notifikasi tidak valid.');
        notices = [...new Set(payload.ids)].map(id => get(app, 'notifications', id));
        if (notices.some(n => n.getString('recipientUser') !== actor.id)) fail('Notifikasi tidak ditemukan.', 404);
      } else notices = list(app, 'notifications', 'recipientUser = {:u} && readAt = ""', { u: actor.id });
      notices.forEach(n => { if (!n.getString('readAt')) { n.set('readAt', now); app.save(n); } });
    } else fail('Workflow tidak ditemukan.', 404);
    create(app, 'workflow_operations', { actor: actor.id, key, operation: op, hash, result });
  });
  return e.json(200, result);
};
