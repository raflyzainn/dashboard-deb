import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, readdir } from 'node:fs/promises';
import path from 'node:path';
import type PocketBase from 'pocketbase';
import { LOCAL, installBinary, provisionInstance, migrate, start, adminClient, client, readJson, credentialsPath, type Credentials } from '../../scripts/pocketbase/runtime';
import { seedLocal, authenticateUser } from '../../scripts/pocketbase/seed';
import { samplePdf } from '../../scripts/fixtures/pdf';

test('P3 workflows on isolated PocketBase', { timeout: 180000 }, async t => {
  await installBinary(); await mkdir(path.join(LOCAL, 'tests'), { recursive: true });
  const instance = await provisionInstance(await mkdtemp(path.join(LOCAL, 'tests', 'p3-')), 'test');
  await migrate(instance); const child = await start(instance);
  try {
    const superuser = await adminClient(instance);
    await seedLocal(instance);
    const credentials = await readJson<Credentials>(credentialsPath(instance));
    const [a, b, admin, admin2] = await Promise.all(['campus-001', 'campus-002', 'admin-1', 'admin-2'].map(key => authenticateUser(client(instance.url), credentials, key)));
    const call = (pb: PocketBase, op: string, body: Record<string, unknown> | FormData = {}, key = randomUUID()) => pb.send<{ok: boolean; id?: string}>(`/api/deb/workflows/${op}`, { method: 'POST', body, headers: { 'Idempotency-Key': key } });
    const rejected = async (p: Promise<unknown>, status: number) => assert.rejects(p, (error: { status: number }) => error.status === status);
    const counts = async () => Promise.all(['questions','activities','notifications','proposal_versions','deb_submissions'].map(n => superuser.collection(n).getList(1,1).then(r => r.totalItems)));
    const indicator = (await a.collection('campus_indicators').getFullList())[0];
    let question = '', submission = '', feedback = '';
    await t.test('scope, role, invalid input and deactivation fail closed', async () => {
      await rejected(call(b,'updateIndicator',{id:indicator.id,current:1,note:''}),404);
      await rejected(call(admin,'ask',{title:'Question',body:'Body'}),403);
      await rejected(call(a,'updateIndicator',{id:indicator.id,current:-1,note:''}),400);
      await rejected(call(a,'ask',{title:'Question',body:'Body',categoryIds:['invalid']}),400);
      await rejected(call(client(instance.url),'submitDeb'),401);
      await superuser.collection('users').update(a.authStore.record!.id,{active:false});
      await rejected(call(a,'submitDeb'),403);
      await superuser.collection('users').update(a.authStore.record!.id,{active:true});
    });
    await t.test('question retry is atomic, shared and creates notifications per admin', async () => {
      const key = randomUUID(), body = { title:'QA P3 question',body:'QA P3 body',categoryIds:['proposal'] };
      const before = await counts();
      const results = await Promise.all([call(a,'ask',body,key),call(a,'ask',body,key)]);
      question = results[0].id!; assert.equal(results[1].id,question);
      const after=await counts(); assert.deepEqual(after.slice(0,3),[before[0]+1,before[1]+1,before[2]+2]);
      assert.equal((await b.collection('questions').getOne(question)).title,body.title);
      await rejected(call(a,'ask',{...body,title:'Changed'},key),409);
    });
    await t.test('answers, desired likes and FAQ preserve uniqueness and copies', async () => {
      await call(admin,'answer',{id:question,body:'Official answer'});
      await Promise.all([call(a,'setLike',{id:question,liked:true}),call(a,'setLike',{id:question,liked:true})]);
      assert.equal((await a.collection('question_likes').getFullList({filter:`question="${question}"`})).length,1);
      await call(a,'setLike',{id:question,liked:false});
      const faq=(await call(admin,'promoteFaq',{id:question})).id!;
      assert.equal((await call(admin2,'promoteFaq',{id:question})).id,faq);
      await call(admin,'answer',{id:question,body:'Updated answer'});
      assert.equal((await admin.collection('faq_entries').getOne(faq)).answer,'Official answer');
      const manual=(await call(admin,'saveFaq',{question:'Manual QA',answer:'Manual answer'})).id!;
      await call(admin,'saveFaq',{id:manual,question:'Edited QA',answer:'Edited answer'});
      await Promise.all([call(admin,'moveFaq',{id:manual,direction:-1}),call(admin2,'moveFaq',{id:faq,direction:1})]);
      const entries=await admin.collection('faq_entries').getFullList();
      assert.equal(new Set(entries.map(e=>e.order)).size,entries.length);
      await call(admin,'deleteFaq',{id:faq});
      assert.ok(await b.collection('questions').getOne(question));
    });
    await t.test('feedback, submit/revision/resubmit/approve and pending lock', async () => {
      feedback=(await call(admin,'addFeedback',{id:indicator.id,text:'Revise QA value',requiresRevision:true})).id!;
      await call(a,'updateIndicator',{id:indicator.id,current:indicator.current+1,note:'Updated QA'});
      assert.equal((await admin.collection('indicator_feedback').getOne(feedback)).state,'responded');
      const results=await Promise.allSettled([call(a,'submitDeb'),call(a,'submitDeb')]);
      assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
      submission=(results.find(r=>r.status==='fulfilled') as PromiseFulfilledResult<{id:string}>).value.id;
      await rejected(call(a,'updateIndicator',{id:indicator.id,current:3,note:''}),409);
      await rejected(call(admin,'reviewDeb',{id:submission,decision:'revision',note:''}),400);
      await rejected(call(admin,'reviewDeb',{id:submission,decision:'approved',note:''}),409);
      await call(admin,'reviewDeb',{id:submission,decision:'revision',note:'Revise before approval'});
      const old=await admin.collection('deb_submissions').getOne(submission);
      await call(a,'updateIndicator',{id:indicator.id,current:indicator.current+2,note:'Revised QA'});
      // Include seeded outstanding feedback in the same campus.
      for(const f of await admin.collection('indicator_feedback').getFullList({filter:`campus="${indicator.campus}"`})) await call(admin,'closeFeedback',{id:f.id});
      const before=await counts(); await call(admin,'closeFeedback',{id:feedback}); assert.deepEqual(await counts(),before);
      submission=(await call(a,'submitDeb')).id!;
      const reviews=await Promise.allSettled([call(admin,'reviewDeb',{id:submission,decision:'approved',note:''}),call(admin2,'reviewDeb',{id:submission,decision:'revision',note:'Concurrent'})]);
      assert.equal(reviews.filter(r=>r.status==='fulfilled').length,1);
      assert.deepEqual((await admin.collection('deb_submissions').getOne(old.id)).snapshot,old.snapshot);
      const latest=await admin.collection('deb_submissions').getOne(submission);
      if(latest.status==='approved') await rejected(call(a,'submitDeb'),409);
    });
    await t.test('stale snapshots cannot be reviewed', async () => {
      const pending=(await b.collection('deb_submissions').getFullList())[0];
      const value=(await b.collection('campus_indicators').getFullList())[0];
      await superuser.collection('campus_indicators').update(value.id,{current:value.current+1});
      await rejected(call(admin,'reviewDeb',{id:pending.id,decision:'revision',note:'Stale'}),409);
    });
    await t.test('PDF upload versions, retries, protected files and invalid content', async () => {
      const bytes=samplePdf('QA P3 PDF',1);
      const form=() => {const f=new FormData(); f.set('file',new Blob([bytes],{type:'application/pdf'}),'qa.pdf'); f.set('changes','QA upload'); return f;};
      const key=randomUUID(); const before=await counts();
      const uploaded=await call(a,'uploadProposal',form(),key);
      assert.equal((await call(a,'uploadProposal',form(),key)).id,uploaded.id);
      assert.equal((await counts())[3],before[3]+1);
      const versions=await Promise.all([call(a,'uploadProposal',form()),call(a,'uploadProposal',form())]);
      const records=await Promise.all(versions.map(r=>a.collection('proposal_versions').getOne(r.id!)));
      assert.notEqual(records[0].version,records[1].version);
      const record=await a.collection('proposal_versions').getOne(uploaded.id!);
      const url=a.files.getURL(record,record.file);
      assert.equal((await fetch(url)).status,404);
      const token=await a.files.getToken();
      assert.equal((await fetch(a.files.getURL(record,record.file,{token}))).status,200);
      const foreignToken=await b.files.getToken();
      assert.equal((await fetch(b.files.getURL(record,record.file,{token:foreignToken}))).status,404);
      const invalid=form(); invalid.set('file',new Blob(['fake'],{type:'application/pdf'}),'fake.pdf');
      await rejected(call(a,'uploadProposal',invalid),400);
      const big=form(); big.set('file',new Blob([new Uint8Array(10485761)],{type:'application/pdf'}),'big.pdf');
      await rejected(call(a,'uploadProposal',big),413);
    });
    await t.test('notification reads are private, idempotent and all-or-nothing', async () => {
      const mine=(await admin.collection('notifications').getFullList()).find(n=>!n.readAt)!;
      const other=(await admin2.collection('notifications').getFullList()).find(n=>!n.readAt)!;
      await rejected(call(admin,'readNotifications',{ids:[mine.id,other.id]}),404);
      assert.equal((await admin.collection('notifications').getOne(mine.id)).readAt,'');
      await call(admin,'readNotifications',{});
      assert.ok((await admin.collection('notifications').getFullList()).every(n=>n.readAt));
      assert.equal((await admin2.collection('notifications').getOne(other.id)).readAt,'');
    });
    await t.test('event save failure rolls back question and operation receipt', async () => {
      const collection=await superuser.collections.getOne('notifications');
      const original=structuredClone(collection.fields);
      const title=collection.fields.find((f:{name:string})=>f.name==='title')!; title.max=1;
      await superuser.collections.update(collection.id,{fields:collection.fields});
      const before=await counts(),key=randomUUID();
      await assert.rejects(call(a,'ask',{title:'Rollback',body:'Rollback'},key));
      assert.deepEqual(await counts(),before);
      const files = async (): Promise<string[]> => (await readdir(path.join(instance.directory,'pb_data','storage'),{recursive:true})).sort();
      const beforeFiles=await files();
      const pdf=new FormData(); pdf.set('file',samplePdf('QA failed transaction',1),'rollback.pdf'); pdf.set('changes','Rollback');
      await assert.rejects(call(a,'uploadProposal',pdf));
      assert.deepEqual(await counts(),before);
      assert.deepEqual(await files(),beforeFiles, 'Aborted upload must not leave orphaned files');
      await superuser.collections.update(collection.id,{fields:original});
      await call(a,'ask',{title:'Rollback',body:'Rollback'},key);
    });
  } finally { child.kill(); await new Promise(resolve=>child.once('exit',resolve)); }
});
