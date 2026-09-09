routerAdd('POST', '/api/deb/workflows/{operation}', e => {
  return require(__hooks + '/workflows.js').run(e);
}, $apis.requireAuth('users'), $apis.bodyLimit(11534336));
