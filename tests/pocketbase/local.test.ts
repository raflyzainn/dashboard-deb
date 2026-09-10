import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { loadInstance, assertInstance, credentialsPath, readJson, client, type Credentials } from '../../scripts/pocketbase/runtime';
import { authenticateUser } from '../../scripts/pocketbase/seed';
import { createDebRepository } from '../../src/lib/server/deb/repository';

test('local 8096 access regression without seeding or business writes', async t => {
  const instance=await loadInstance(); assert.equal(instance.url,'http://127.0.0.1:8096'); await assertInstance(instance);
  const credentials=await readJson<Credentials>(credentialsPath(instance));
  const [a,b,admin,admin2]=await Promise.all(['campus-001','campus-002','admin-1','admin-2'].map(key=>authenticateUser(client(instance.url),credentials,key)));
  const [sa,sb,sadmin,sadmin2]=await Promise.all([a,b,admin,admin2].map(pb=>createDebRepository(pb).load()));
  await t.test('scoped data and shared forum',async()=>{
    assert.ok(sa.indicators.every(i=>i.campusId===a.authStore.record!.campus));
    assert.ok(sb.indicators.every(i=>i.campusId===b.authStore.record!.campus));
    assert.equal(sa.questions.length,sadmin.questions.length);
    assert.ok(sadmin.indicators.length>=sa.indicators.length);
    assert.ok(!sadmin.notifications.some(n=>sadmin2.notifications.some(other=>other.id===n.id)));
  });
  await t.test('workflow rejects forged ownership, wrong role and missing operation key',async()=>{
    const denied=(operation:Promise<unknown>,status:number)=>assert.rejects(operation,(error:{status:number})=>error.status===status);
    const headers={'Idempotency-Key':randomUUID()};
    await denied(b.send('/api/deb/workflows/updateIndicator',{method:'POST',headers,body:{id:sa.indicators[0].id,current:1,note:'forged'}}),404);
    await denied(a.send('/api/deb/workflows/saveFaq',{method:'POST',headers,body:{question:'forged',answer:'forged'}}),403);
    await denied(a.send('/api/deb/workflows/ask',{method:'POST',body:{title:'missing key',body:'missing key'}}),400);
    await denied(a.collection('workflow_operations').getList(1,1).then(r=>{if(!r.items.length) throw {status:403};}),403);
  });
  await t.test('PDFs remain private at PocketBase and downloadable by owner/admin',async()=>{
    const record=(await a.collection('proposal_versions').getFullList())[0];assert.ok(record);
    assert.equal((await fetch(a.files.getURL(record,record.file))).status,404);
    const token=await b.files.getToken();assert.equal((await fetch(b.files.getURL(record,record.file,{token}))).status,404);
    const pdf=await createDebRepository(admin).proposalFile(record.id);assert.ok(pdf);
  });
});
