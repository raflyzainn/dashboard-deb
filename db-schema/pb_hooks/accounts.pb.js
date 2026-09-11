routerAdd('GET', '/api/deb/accounts', e => require(__hooks + '/accounts.js').read(e), $apis.requireAuth('users'));
routerAdd('POST', '/api/deb/accounts/save', e => require(__hooks + '/accounts.js').save(e), $apis.requireAuth('users'), $apis.bodyLimit(65536));
routerAdd('POST', '/api/deb/activation/{operation}', e => require(__hooks + '/accounts.js').public(e), $apis.bodyLimit(16384));
routerAdd('POST', '/api/deb/account/password', e => require(__hooks + '/accounts.js').changePassword(e), $apis.requireAuth('users'), $apis.bodyLimit(4096));
cronAdd('deb-email-queue', '* * * * *', () => require(__hooks + '/accounts.js').drain($app));
onRecordAuthWithPasswordRequest(e => {
  if (e.collection.name === 'users' && !($os.getenv('DEB_LOCAL_INSTANCE_ID') && String(e.identity).endsWith('@deb.local.test'))) require(__hooks + '/accounts.js').limit(e.app, 'login:' + e.realIP() + ':' + String(e.identity).toLowerCase(), 10, 900000);
  e.next();
});

routerAdd('GET', '/api/deb/accounts/qa', e => require(__hooks + '/accounts.js').qa(e), $apis.requireAuth('users'));

// Account lifecycle is owned by the PIC workflow, including password policy and revocation.
onRecordRequestPasswordResetRequest(e => { if (e.collection.name === 'users') throw new ForbiddenError('Gunakan pemulihan akun DEB.'); e.next(); });
onRecordConfirmPasswordResetRequest(e => { if (e.collection.name === 'users') throw new ForbiddenError('Gunakan pemulihan akun DEB.'); e.next(); });
onRecordRequestEmailChangeRequest(e => { if (e.collection.name === 'users') throw new ForbiddenError('Perubahan email melalui Admin DEB.'); e.next(); });
onRecordConfirmEmailChangeRequest(e => { if (e.collection.name === 'users') throw new ForbiddenError('Perubahan email melalui Admin DEB.'); e.next(); });
onRecordRequestVerificationRequest(e => { if (e.collection.name === 'users') throw new ForbiddenError('Gunakan aktivasi akun DEB.'); e.next(); });
onRecordConfirmVerificationRequest(e => { if (e.collection.name === 'users') throw new ForbiddenError('Gunakan aktivasi akun DEB.'); e.next(); });
onRecordAuthRequest(e => {
  if (e.collection.name === 'users' && e.record && e.record.getBool('simulated') && !$os.getenv('DEB_LOCAL_INSTANCE_ID')) throw new ForbiddenError('Akun QA hanya tersedia pada lokal.');
  e.next();
});
