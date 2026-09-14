import type PocketBase from 'pocketbase';
import { executeAccount } from '../../src/lib/server/deb/backend';
import { drainEmails } from '../../src/lib/server/deb/mail';
import { readJson, type LocalInstance } from '../../scripts/pocketbase/runtime';
import path from 'node:path';

export async function restTestClient(root: PocketBase, actor: PocketBase, instance: LocalInstance) {
  const secret = await readJson<{key: string}>(path.join(instance.directory, 'p1-secret.json'));
  const settings = { DEB_INVITATION_KEY: secret.key, DEB_PUBLIC_URL: 'http://127.0.0.1:5177', DEB_LOCAL_INSTANCE_ID: instance.instanceId };
  return {
    settings,
    accounts: (operation = 'read', body: object = {}) => executeAccount(root, settings, actor.authStore.record, operation, body, 'qa-local'),
    drain: () => drainEmails(root, settings)
  };
}
