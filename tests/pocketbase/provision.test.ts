import {test} from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import PocketBase from 'pocketbase';
import {LOCAL,readJson,adminClient,credentialsPath,type LocalInstance,type Credentials} from '../../scripts/pocketbase/runtime';
import {configureRestSchema} from '../../scripts/pocketbase/rest-schema';

test('production REST provisioning preserves records/SMTP and blocks native QA authentication',async()=>{
  const instance=await readJson<LocalInstance>(path.join(LOCAL,'p1-test-instance.json'));
  assert.equal(instance.kind,'test');assert.equal(instance.url,'http://127.0.0.1:8097');
  const root=await adminClient(instance),creds=await readJson<Credentials>(credentialsPath(instance));
  const qa=new PocketBase(instance.url);await qa.collection('users').authWithPassword(creds.users['admin-1'].email,creds.users['admin-1'].password);
  const before=await root.collection('campuses').getFullList({sort:'id'}),smtp=(await root.settings.getAll()).smtp;
  const collection=await root.collections.getOne('campuses');
  if(!collection.fields.some(f=>f.name==='operatorNote'))await root.collections.update(collection.id,{fields:[...collection.fields,{name:'operatorNote',type:'text'}]});
  await root.collection('campuses').update(before[0].id,{operatorNote:'Preserve this operator field'});
  try {
    await configureRestSchema(root,{publicURL:'https://deb.example.test'});
    const after=await root.collection('campuses').getFullList({sort:'id'});
    assert.deepEqual(after.map(c=>[c.id,c.name]),before.map(c=>[c.id,c.name]));
    assert.equal(after[0].operatorNote,'Preserve this operator field');
    assert.deepEqual((await root.settings.getAll()).smtp,smtp);
    assert.equal((await root.settings.getAll()).rateLimits.enabled,true);
    assert.equal((await qa.collection('campuses').getList()).totalItems,0,'Old QA token must lose read access');
    await assert.rejects(qa.collection('users').authWithPassword(creds.users['admin-1'].email,creds.users['admin-1'].password));
    assert.equal((await fetch(instance.url+'/api/deb/local-instance')).status,404);
  } finally {
    await configureRestSchema(root,{local:true,publicURL:'http://127.0.0.1:5177'});
    await root.settings.update({rateLimits:{enabled:false}});
  }
});
