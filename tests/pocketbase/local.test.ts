import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { loadInstance, assertInstance, credentialsPath, readJson, client, type Credentials } from '../../scripts/pocketbase/runtime';
import { authenticateUser } from '../../scripts/pocketbase/seed';
import { createDebRepository } from '../../src/lib/server/deb/repository';
import { readPage, readNavigation } from '../../src/lib/server/deb/page-reads';
import { mapSession } from '../../src/lib/server/deb/mappers';

test('local 8096 access regression without seeding or business writes', async t => {
  const instance=await loadInstance(); assert.equal(instance.url,'http://127.0.0.1:8096'); await assertInstance(instance);
  const credentials=await readJson<Credentials>(credentialsPath(instance));
  const [a,b,admin,admin2]=await Promise.all(['campus-001','campus-002','admin-1','admin-2'].map(key=>authenticateUser(client(instance.url),credentials,key)));
  const [sa,sb,sadmin,sadmin2]=await Promise.all([a,b,admin,admin2].map(pb=>createDebRepository(pb).load()));
  await t.test('page reads preserve user scope and navigation counts without full business payloads', async () => {
    const aSession=mapSession(a.authStore.record!), adminSession=mapSession(admin.authStore.record!);
    const faq=await readPage(admin,adminSession,{view:'faq'});
    assert.deepEqual(Object.keys(faq),['faq']);
    const proposals=await readPage(a,aSession,{view:'proposals'});
    assert.ok(proposals.proposals!.every(p=>p.campusId===aSession.campusId));
    assert.equal(proposals.indicators,undefined);
    const detail=await readPage(admin,adminSession,{view:'campus-detail',campus:aSession.campusId,tab:'Proposal'});
    assert.ok(detail.proposals!.every(p=>p.campusId===aSession.campusId));
    assert.equal(detail.campuses!.length,1);
    assert.equal(detail.indicators,undefined);
    const nav=await readNavigation(admin,adminSession);
    assert.equal(nav.pendingCount,sadmin.submissions!.filter(s=>s.status==='pending').length);
    assert.equal(nav.unreadCount,sadmin.notifications.filter(n=>!n.readAt).length);
    await assert.rejects(readPage(a,aSession,{view:'review'}),/Admin/);
  });
  await t.test('scoped data and shared forum',async()=>{
    assert.ok(sa.indicators.every(i=>i.campusId===a.authStore.record!.campus));
    assert.ok(sb.indicators.every(i=>i.campusId===b.authStore.record!.campus));
    assert.equal(sa.questions.length,sadmin.questions.length);
    assert.ok(sadmin.indicators.length>=sa.indicators.length);
    assert.ok(!sadmin.notifications.some(n=>sadmin2.notifications.some(other=>other.id===n.id)));
  });
  await t.test('P4 shared masters and audit permissions',async()=>{
    const definitions=await admin.collection('indicator_definitions').getFullList();
    const active=definitions.filter(d=>d.status==='active');
    assert.equal(sa.definitions.length,active.length);
    assert.ok(sa.definitions.every(d=>active.some(m=>m.id===d.id)));
    for(const snapshot of [sa,sb,sadmin])for(const row of snapshot.indicators){
      const master=active.find(d=>d.id===row.definitionId)!;
      assert.equal(row.baseline,master.baseline);assert.equal(row.target,master.target);
    }
    const collection=await admin.collection('master_audit').getList(1,50);
    assert.ok(collection.items.every(r=>r.actor&&r.entity&&r.created));
    assert.equal((await a.collection('master_audit').getList(1,50)).totalItems,0);
    const rejected=(operation:Promise<unknown>,status:number)=>assert.rejects(operation,(error:{status:number})=>error.status===status);
    await rejected(a.send('/api/deb/workflows/masterSaveDefinition',{method:'POST',headers:{'Idempotency-Key':randomUUID()},body:{code:'forged'}}),403);
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
