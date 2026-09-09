import { installBinary, provisionInstance, loadInstance, migrate, start, preview, adminClient, readJson, privateJson, credentialsPath, password, type Credentials } from './runtime';
import { seedLocal } from './seed';

async function main() {
  const [command, ...options] = process.argv.slice(2);
  if (command === 'preview') return preview();
  if (command === 'setup') {
    await installBinary();
    const instance = await provisionInstance();
    await migrate(instance);
    console.log('Local DEB ready. Start: npm run pb:serve. Then seed manually: npm run pb:seed');
    return;
  }
  const instance = await loadInstance();
  if (command === 'migrate') return migrate(instance);
  if (command === 'serve') {
    const child = await start(instance);
    console.log(`DEB PocketBase: ${instance.url}/_/ (private credentials: .local/pocketbase/credentials.json)`);
    process.on('SIGINT', () => child.kill());
    process.on('SIGTERM', () => child.kill());
    child.on('exit', code => { process.exitCode = code || 0; });
    return;
  }
  if (command === 'seed') return console.log(await seedLocal(instance));
  if (command === 'account') {
    const [action, email] = options;
    if (!['disable', 'enable', 'reset-password'].includes(action) || !email) throw new Error('Usage: pb:account -- disable|enable|reset-password EMAIL');
    const pb = await adminClient(instance);
    const user = await pb.collection('users').getFirstListItem(pb.filter('email = {:email}', { email }));
    if (action === 'reset-password') {
      const credentials = await readJson<Credentials>(credentialsPath(instance));
      const key = Object.keys(credentials.users).find(key => credentials.users[key].email === email);
      if (!key) throw new Error('Only locally provisioned QA accounts can be reset by this tool');
      const next = password();
      // Keep the new secret recoverable before performing the remote mutation.
      await privateJson(instance.directory + '/pending-password-reset.json', { email, password: next });
      await pb.collection('users').update(user.id, { password: next, passwordConfirm: next });
      credentials.users[key] = { email, password: next };
      await privateJson(credentialsPath(instance), credentials);
    } else await pb.collection('users').update(user.id, { active: action === 'enable' });
    console.log(`Local account ${action} completed; credentials are never printed.`);
    return;
  }
  throw new Error('Unknown PocketBase command');
}

main().catch(error => {
  // SDK errors can contain request/password data. Never dump the raw object.
  console.error(error instanceof Error ? error.message : 'PocketBase command failed');
  process.exitCode = 1;
});
