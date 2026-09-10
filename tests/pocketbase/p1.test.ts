import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import PocketBase from 'pocketbase';
import { randomUUID } from 'node:crypto';
import { LOCAL, readJson, privateJson, adminClient, credentialsPath, type LocalInstance, type Credentials } from '../../scripts/pocketbase/runtime';
const origin = 'http://127.0.0.1:5177';
test('P1 real accounts on an isolated copy, Mailpit delivery and scoped authentication', async t => {
  const instance = await readJson<LocalInstance>(path.join(LOCAL, 'p1-test-instance.json'));
  assert.equal(instance.kind, 'test'); assert.equal(instance.url, 'http://127.0.0.1:8097');
  const root = await adminClient(instance), qa = new PocketBase(instance.url);
  const credentials = await readJson<Credentials>(credentialsPath(instance));
  await qa.collection('users').authWithPassword(credentials.users['admin-1'].email, credentials.users['admin-1'].password);
  const suffix = randomUUID().slice(0,8), email = `p1-${suffix}@example.com`, email2 = `p1-other-${suffix}@example.com`, password = 'TestCampus123!';
  const adminEmail = `p1-admin-${suffix}@example.com`;
  await root.collection('users').create({ name:'P1 Test Admin',email:adminEmail,password,passwordConfirm:password,role:'admin',active:true,verified:true,simulated:false });
  const roster = await qa.send('/api/deb/accounts', {method:'GET'}), first = roster.items[0], second = roster.items[1];
  const original = await root.collection('users').getFirstListItem(root.filter('campus = {:campus}',{campus:first.campusId}));
  const post = async (operation:string,body:object,cookie='') => fetch(origin+'/api/auth/'+operation,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(body)});
  let cookie='', invitationToken='';
  await t.test('persistent PIC, duplicate email and optimistic revision',async()=>{
    await qa.send('/api/deb/accounts/save',{method:'POST',body:{changes:[{...first,name:'PIC Test',email},{...second,name:'Other PIC',email:email2}]}});
    await assert.rejects(qa.send('/api/deb/accounts/save',{method:'POST',body:{changes:[{...second,revision:1,email,name:'Duplicate'}]}}), (e:unknown)=>(e as {status:number}).status===409);
    await assert.rejects(qa.send('/api/deb/accounts/save',{method:'POST',body:{changes:[{...first,name:'Stale',email}]}}), (e:unknown)=>(e as {status:number}).status===409);
    const rows=await qa.send('/api/deb/accounts',{method:'GET'});assert.equal(rows.items[0].email,email);
  });
  await t.test('only registered PIC requests queue activation; admin save never sends email',async()=>{
    const invitations = (address:string) => root.collection('account_invitations').getFullList({filter:root.filter('email = {:email}',{email:address})});
    assert.equal((await invitations(email)).length,0);
    const unknown=`unknown-${suffix}@example.com`;
    const rejected=await post('request',{email:unknown,purpose:'activate'});
    assert.equal(rejected.status,200);
    assert.equal((await invitations(unknown)).length,0);
    await root.crons.run('deb-email-queue');
    const inbox=await fetch('http://127.0.0.1:8025/api/v1/search?query='+encodeURIComponent('to:'+unknown)).then(r=>r.json());
    assert.equal(inbox.messages?.length,0);
    for(const operation of ['send','recipients']) await assert.rejects(qa.send('/api/deb/accounts/'+operation,{method:'POST',body:{}}),(e:unknown)=>(e as {status:number}).status===404);
    const accepted=await post('request',{email:'  '+email.toUpperCase()+'  ',purpose:'activate'});
    assert.equal(accepted.status,200);
    assert.deepEqual(await accepted.json(),await rejected.json());
    assert.equal((await post('request',{email,purpose:'activate'})).status,200);
    assert.equal((await root.collection('account_invitations').getFullList({filter:root.filter('email = {:email}',{email})})).length,1);
    await root.crons.run('deb-email-queue');
    let messages:any;
    for(let n=0;n<30;n++){messages=await fetch('http://127.0.0.1:8025/api/v1/search?query='+encodeURIComponent('to:'+email)).then(r=>r.json());if(messages.messages?.length)break;await new Promise(r=>setTimeout(r,200));}
    assert.equal(messages.messages?.length,1,'SMTP message should reach local inbox');
    const message=await fetch('http://127.0.0.1:8025/api/v1/message/'+messages.messages[0].ID).then(r=>r.json());
    const link=String(message.Text).match(/http:\/\/127\.0\.0\.1:5177\/login\?token=([^\s]+)/);assert.ok(link);
    invitationToken=decodeURIComponent(link[1]);
    const inspected=await post('inspect',{token:invitationToken});assert.equal(inspected.status,200);assert.equal((await inspected.json()).campus,first.campus);
  });
  await t.test('password policy, activation and one-time token preserve historical user ID',async()=>{
    assert.equal((await post('confirm',{token:invitationToken,password:'short',passwordConfirm:'short'})).status,400);
    const result=await post('confirm',{token:invitationToken,password,passwordConfirm:password});assert.equal(result.status,200,await result.text());
    assert.equal((await post('inspect',{token:invitationToken})).status,400);
    const updated=await root.collection('users').getOne(original.id);assert.equal(updated.email,email);assert.equal(updated.simulated,false);assert.equal(updated.campus,first.campusId);
  });
  await t.test('HttpOnly session, page scope, CSRF and role restrictions',async()=>{
    const login=await post('login',{email,password});assert.equal(login.status,200,await login.clone().text());
    const set=login.headers.get('set-cookie')||'';assert.match(set,/HttpOnly/i);assert.match(set,/SameSite=Lax/i);cookie=set.split(';')[0];
    const me=await fetch(origin+'/api/auth/me',{headers:{Cookie:cookie}}).then(r=>r.json());assert.equal(me.session.campusId,first.campusId);
    assert.equal((await fetch(origin+'/api/admin/accounts',{headers:{Cookie:cookie}})).status,403);
    assert.equal((await fetch(origin+'/api/views/campus-detail?campus='+second.campusId,{headers:{Cookie:cookie}})).status,403);
    assert.equal((await fetch(origin+'/api/auth/logout',{method:'POST',headers:{Origin:'https://untrusted.example',Cookie:cookie}})).status,403);
    const data=await fetch(origin+'/api/views/indicators',{headers:{Cookie:cookie}}).then(r=>r.json());assert.ok(data.data.indicators.every((i:any)=>i.campusId===first.campusId));
    const member=new PocketBase(instance.url);await member.collection('users').authWithPassword(email,password);
    await assert.rejects(member.collection('campus_contacts').getList(), (e:unknown)=>(e as {status:number}).status===403);
    await assert.rejects(member.send('/api/deb/accounts',{method:'GET'}));
  });
  await t.test('email replacement needs confirmation and invalidates the old session',async()=>{
    const r=await qa.send('/api/deb/accounts',{method:'GET'});const current=r.items.find((a:any)=>a.campusId===first.campusId);
    const next={...current,email:`new-${email}`};
    await assert.rejects(qa.send('/api/deb/accounts/save',{method:'POST',body:{changes:[next]}}));
    await qa.send('/api/deb/accounts/save',{method:'POST',body:{changes:[next],confirmReset:true}});
    assert.equal((await fetch(origin+'/api/auth/me',{headers:{Cookie:cookie}}).then(r=>r.json())).session,null);
    assert.equal((await post('login',{email,password})).status,401);
  });
  // Browser test uses a second unactivated campus and a real application admin on the disposable copy.
  await privateJson(path.join(LOCAL,'p1-browser.json'),{adminEmail,password,campus:roster.items[2].campus,campusId:roster.items[2].campusId,email:`browser-${suffix}@example.com`,firstCampusId:first.campusId});
});
