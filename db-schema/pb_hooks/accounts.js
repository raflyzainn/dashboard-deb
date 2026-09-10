// All writes go through scoped native transactions. Never log passwords or invitation tokens.
const list = (app, c, f = '', p = {}) => app.findRecordsByFilter(c, f, 'id', 0, 0, p);
const get = (app, c, id) => app.findRecordById(c, id);
const put = (app, c, data) => { const r = new Record(app.findCollectionByNameOrId(c)); Object.keys(data).forEach(k => r.set(k, data[k])); app.save(r); return r; };
const norm = v => String(v || '').trim().toLowerCase();
const valid = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 254;
const fail = (message, status = 400) => { throw new ApiError(status, message); };
const now = () => Date.now();
function key() { const value = $os.getenv('DEB_INVITATION_KEY'); if (value.length < 32) fail('Konfigurasi aktivasi belum tersedia.', 503); return value; }
function baseURL() {
  const url = $os.getenv('DEB_PUBLIC_URL');
  const local = /^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(url);
  if (!(local && $os.getenv('DEB_LOCAL_INSTANCE_ID')) && !/^https:\/\/[^/?#]+$/.test(url)) fail('URL website belum dikonfigurasi.', 503);
  return url;
}
function mailReady(app) {
  key(); baseURL(); const s = app.settings();
  // TODO(P1-SMTP): configure official host/port/TLS/credentials and sender before external delivery.
  // No sendmail fallback; local development explicitly uses the loopback Mailpit inbox.
  if (!s.smtp.enabled || !s.smtp.host || !s.meta.senderAddress) fail('SMTP belum dikonfigurasi.', 503);
  if ($os.getenv('DEB_MAIL_MODE') !== 'external' && !['127.0.0.1', 'localhost'].includes(s.smtp.host)) fail('Pengiriman eksternal belum diaktifkan.', 503);
}
function token(r) { return $security.createJWT({ id: r.id, purpose: r.getString('purpose'), revision: r.getInt('revision'), expires: r.getFloat('expires') }, key(), Math.max(1, Math.floor((r.getFloat('expires') - now()) / 1000))); }
function check(app, value) {
  let claims, r; try { claims = $security.parseJWT(value, key()); r = get(app, 'account_invitations', claims.id); } catch (_) { fail('Tautan tidak dapat digunakan.', 400); }
  if (r.getBool('used') || r.getBool('revoked') || r.getFloat('expires') <= now() || claims.purpose !== r.getString('purpose') || claims.revision !== r.getInt('revision')) fail('Tautan tidak dapat digunakan.');
  const c = get(app, 'campus_contacts', r.getString('contact'));
  if (c.getInt('revision') !== r.getInt('revision') || c.getString('email') !== r.getString('email')) fail('Tautan tidak dapat digunakan.');
  return { r, c };
}
function revoke(app, contact) { list(app, 'account_invitations', 'contact = {:id} && revoked = false', { id: contact }).forEach(r => { r.set('revoked', true); app.save(r); }); }
function audit(app, actor, campus, event, details = {}) { put(app, 'account_audit', { actor, campus, event, details }); }
function limit(app, label, maximum, duration) {
  const hash = $security.sha256(label); let retryAfter = 0;
  app.runInTransaction(tx => { let r = list(tx, 'auth_limits', 'key = {:key}', { key: hash })[0];
    if (!r) r = put(tx, 'auth_limits', { key: hash, count: 0, until: now() + duration });
    if (r.getFloat('until') < now()) { r.set('count', 0); r.set('until', now() + duration); }
    if (r.getInt('count') >= maximum) { retryAfter = Math.max(1, Math.ceil((r.getFloat('until') - now()) / 1000)); return; }
    r.set('count', r.getInt('count') + 1); tx.save(r);
  }); if (retryAfter) fail('Terlalu banyak percobaan. Coba lagi dalam ' + Math.ceil(retryAfter / 60) + ' menit.', 429);
}
function actor(e) {
  if (!e.auth) fail('Silakan login.', 401);
  const a = get(e.app, 'users', e.auth.id);
  if (!a.getBool('active') || !a.getBool('verified') || a.getString('role') !== 'admin') fail('Hanya Admin.', 403);
  if (a.getBool('simulated') && !$os.getenv('DEB_LOCAL_INSTANCE_ID')) fail('Akun QA hanya untuk lokal.', 403);
  return a;
}
function status(app, c) {
  if (!c || !c.getString('email')) return 'Email belum diisi';
  const a = c.getString('account') ? get(app, 'users', c.getString('account')) : null;
  if (a && !a.getBool('simulated') && a.getBool('active') && a.getBool('verified') && a.email() === c.getString('email')) return 'Aktif';
  const invites = app.findRecordsByFilter('account_invitations', 'contact = {:c} && purpose = "activate" && revoked = false', '-created,-id', 1, 0, { c: c.id });
  if (!invites.length) return 'Belum aktivasi';
  return ({ queued: 'Dalam antrean', sending: 'Dalam antrean', sent: 'Menunggu aktivasi', failed: 'Gagal dikirim' })[invites[0].getString('delivery')] || 'Belum aktivasi';
}
function rows(app) {
  const contacts = list(app, 'campus_contacts');
  return list(app, 'campuses', 'source = "user" || source = "document"').map(c => {
    const p = contacts.find(x => x.getString('campus') === c.id);
    return { campusId: c.id, campus: c.getString('name'), name: p ? p.getString('name') : '', email: p ? p.getString('email') : '', revision: p ? p.getInt('revision') : 0, status: status(app, p) };
  }).sort((a, b) => a.campus.localeCompare(b.campus));
}
exports.read = e => {
  actor(e); let all = rows(e.app); const info = e.requestInfo().query;
  const stats = { total: all.length, email: all.filter(a => a.email).length, active: all.filter(a => a.status === 'Aktif').length, waiting: all.filter(a => a.status === 'Menunggu aktivasi').length };
  const q = norm(info.q), f = info.status || '';
  all = all.filter(a => (!q || (a.campus + ' ' + a.name + ' ' + a.email).toLowerCase().includes(q)) && (!f || a.status === f));
  const page = Math.min(Math.max(1, parseInt(info.page) || 1), Math.max(1, Math.ceil(all.length / 10)));
  return e.json(200, { items: all.slice((page - 1) * 10, page * 10), total: all.length, page, stats });
};
exports.save = e => {
  const a = actor(e), input = e.requestInfo().body, changes = input.changes;
  if (!Array.isArray(changes) || !changes.length || changes.length > 40 || new Set(changes.map(x => x.campusId)).size !== changes.length) fail('Perubahan tidak valid.');
  e.app.runInTransaction(app => {
    const existing = rows(app);
    changes.forEach(v => {
      const original = existing.find(x => x.campusId === v.campusId); if (!original) fail('Kampus tidak ditemukan.', 404);
      if (original.revision !== v.revision) fail('Data telah berubah. Muat ulang sebelum menyimpan.', 409);
      const email = norm(v.email), name = String(v.name || '').trim();
      if ((email && !valid(email)) || name.length > 200) fail('Nama atau email tidak valid.');
      if (original.status === 'Aktif' && email !== original.email && input.confirmReset !== true) fail('Konfirmasi penggantian email akun aktif diperlukan.', 409);
      const conflict = list(app, 'users', 'email = {:email} && campus != {:campus}', { email, campus: v.campusId }); if (email && conflict.length) fail('Email sudah digunakan akun lain.', 409);
    });
    const final = existing.map(r => { const v = changes.find(x => x.campusId === r.campusId); return v ? { ...r, email: norm(v.email) } : r; });
    const emails = final.filter(r => r.email).map(r => r.email); if (new Set(emails).size !== emails.length) fail('Email tidak boleh digunakan dua kampus.', 409);
    // Clear changed email values first to allow an atomic email swap under the unique index.
    changes.forEach(v => { const c = list(app, 'campus_contacts', 'campus = {:id}', { id: v.campusId })[0]; if (c && c.getString('email') !== norm(v.email)) { c.set('email', ''); app.save(c); } });
    changes.forEach(v => {
      const before = existing.find(x => x.campusId === v.campusId);
      let c = list(app, 'campus_contacts', 'campus = {:id}', { id: v.campusId })[0];
      const u = list(app, 'users', 'campus = {:id} && role = "campus"', { id: v.campusId })[0];
      if (!c) c = put(app, 'campus_contacts', { campus: v.campusId, account: u ? u.id : '', revision: 0 });
      const emailChanged = before.email !== norm(v.email);
      if (emailChanged) { revoke(app, c.id); if (u && !u.getBool('simulated')) { u.set('active', false); u.set('verified', false); u.set('tokenKey', $security.randomString(50)); app.save(u); } }
      c.set('name', String(v.name || '').trim()); c.set('email', norm(v.email)); c.set('revision', c.getInt('revision') + 1); app.save(c);
      // Revision is bound to invitation contents: name edits invalidate queued invitations too.
      if (!emailChanged) revoke(app, c.id);
      if (u && !u.getBool('simulated') && c.getString('name')) { u.set('name', c.getString('name')); app.save(u); }
      audit(app, a.id, v.campusId, 'pic.updated', { before, name: c.getString('name'), email: c.getString('email') });
    });
  }); return e.json(200, { ok: true });
};
function invite(app, c, purpose) {
  revoke(app, c.id);
  return put(app, 'account_invitations', { contact: c.id, account: c.getString('account'), purpose, email: c.getString('email'), revision: c.getInt('revision'), expires: now() + 1800000, delivery: 'queued', attempts: 0, nextAttempt: now() });
}
exports.public = e => {
  const op = e.request.pathValue('operation'), b = e.requestInfo().body;
  if (op === 'request') {
    const email = norm(b.email); limit(e.app, 'email-ip:' + e.realIP(), 60, 3600000); limit(e.app, 'email:' + email, 20, 3600000); mailReady(e.app);
    e.app.runInTransaction(app => {
      const c = list(app, 'campus_contacts', 'email = {:email}', { email })[0]; if (!valid(email) || !c || !c.getString('name')) return;
      const active = status(app, c) === 'Aktif'; const purpose = b.purpose === 'forgot' ? 'forgot' : 'activate';
      if ((purpose === 'forgot') !== active) return;
      const recent = list(app, 'account_invitations', 'contact = {:c} && revoked = false && expires > {:t}', { c: c.id, t: now() + 1740000 }); if (recent.length) return;
      invite(app, c, purpose);
    }); return e.json(200, { message: 'Jika email terdaftar dan memenuhi syarat, tautan akan dikirim. Periksa email Anda.' });
  }
  if (op === 'inspect' || op === 'confirm') {
    limit(e.app, 'token:' + e.realIP(), 60, 900000);
    if (op === 'inspect') { const { r, c } = check(e.app, String(b.token || '')); return e.json(200, { purpose: r.getString('purpose'), campus: get(e.app, 'campuses', c.getString('campus')).getString('name'), name: c.getString('name'), email: c.getString('email') }); }
    const password = String(b.password || ''); if (password.length < 8 || password.length > 128 || !/[A-Z]/.test(password) || !/[0-9]/.test(password) || password !== b.passwordConfirm) fail('Password minimal 8 karakter, mengandung angka dan huruf kapital; konfirmasi harus sama.');
    e.app.runInTransaction(app => {
      const { r, c } = check(app, String(b.token || ''));
      let u = c.getString('account') ? get(app, 'users', c.getString('account')) : new Record(app.findCollectionByNameOrId('users'));
      u.set('name', c.getString('name')); u.set('role', 'campus'); u.set('campus', c.getString('campus')); u.setEmail(c.getString('email')); u.setPassword(password); u.set('active', true); u.set('verified', true); u.set('simulated', false); u.set('tokenKey', $security.randomString(50)); app.save(u);
      c.set('account', u.id); app.save(c); r.set('used', true); app.save(r); revoke(app, c.id);
      audit(app, u.id, c.getString('campus'), r.getString('purpose') === 'forgot' ? 'password.reset' : 'account.activated');
    }); return e.json(200, { ok: true });
  }
  fail('Tidak ditemukan.', 404);
};
exports.drain = app => {
  try { mailReady(app); } catch (_) { return; }
  const pending = list(app, 'account_invitations', '(delivery = "queued" || delivery = "sending") && nextAttempt <= {:t} && revoked = false && used = false', { t: now() });
  pending.slice(0, 40).forEach(candidate => {
    let claimed = false;
    app.runInTransaction(tx => { const r = get(tx, 'account_invitations', candidate.id); if (r.getBool('revoked') || r.getFloat('nextAttempt') > now() || !['queued', 'sending'].includes(r.getString('delivery'))) return;
      if (r.getFloat('expires') <= now() || r.getInt('attempts') >= 3) { r.set('delivery', 'failed'); r.set('error', 'Pengiriman tidak selesai; kirim ulang.'); tx.save(r); return; }
      r.set('delivery', 'sending'); r.set('attempts', r.getInt('attempts') + 1); r.set('nextAttempt', now() + 300000); tx.save(r); claimed = true;
    }); if (!claimed) return;
    const r = get(app, 'account_invitations', candidate.id), c = get(app, 'campus_contacts', r.getString('contact'));
    try {
      if (r.getBool('revoked') || c.getInt('revision') !== r.getInt('revision')) return;
      const url = baseURL() + '/login?token=' + encodeURIComponent(token(r));
      const action = r.getString('purpose') === 'forgot' ? 'Atur ulang password' : 'Aktifkan akun';
      const campus = get(app, 'campuses', c.getString('campus')).getString('name');
      require(__hooks + '/account-email.js').send(app,
        { from: { address: app.settings().meta.senderAddress, name: app.settings().meta.senderName }, to: [{ address: r.getString('email') }], subject: action + ' DEB - ' + campus },
        { name: c.getString('name'), campus, url, purpose: r.getString('purpose') });
      app.runInTransaction(tx => { const latest = get(tx, 'account_invitations', r.id); latest.set('delivery', 'sent'); latest.set('sentAt', new Date().toISOString()); latest.set('error', ''); tx.save(latest); });
    } catch (_) { app.runInTransaction(tx => { const latest = get(tx, 'account_invitations', r.id); latest.set('delivery', latest.getInt('attempts') >= 3 ? 'failed' : 'queued'); latest.set('nextAttempt', now() + latest.getInt('attempts') * 60000); latest.set('error', 'Layanan email belum menerima pesan.'); tx.save(latest); }); }
  });
};
exports.limit = limit;

exports.qa = e => { actor(e); return e.json(200, { keys: list(e.app, 'users', 'simulated = true && active = true').map(r => r.getString('legacyId')) }); };
