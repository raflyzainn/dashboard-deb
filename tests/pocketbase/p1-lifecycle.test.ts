import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import PocketBase from 'pocketbase';
import { LOCAL, readJson, adminClient, credentialsPath, type LocalInstance, type Credentials } from '../../scripts/pocketbase/runtime';
test('P1 SMTP retry, expiry, resend, password recovery and real-account writes on isolated copy',async()=>{
  const instance=await readJson<LocalInstance>(path.join(LOCAL,'p1-test-instance.json'));assert.equal(instance.kind,'test');
  const root=await adminClient(instance),qa=new PocketBase(instance.url),creds=await readJson<Credentials>(credentialsPath(instance));
  await qa.collection('users').authWithPassword(creds.users['admin-1'].email,creds.users['admin-1'].password);
  const row=(await qa.send('/api/deb/accounts',{method:'GET'})).items[3];
  const email=`lifecycle-${randomUUID().slice(0,8)}@example.com`,password='LifecyclePass123!';
  const origin='http://127.0.0.1:5177';
  const post=(op:string,body:object)=>fetch(origin+'/api/auth/'+op,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
  const invitations=()=>root.collection('account_invitations').getFullList({filter:root.filter('email = {:email} && revoked = false',{email})});
  const send=async()=>{assert.equal((await post('request',{email,purpose:'activate'})).status,200);return (await invitations())[0];};
  const poll=async(check:()=>Promise<boolean>)=>{for(let n=0;n<100;n++){if(await check())return;await new Promise(r=>setTimeout(r,100));}assert.fail('Expected asynchronous email state');};
  let previousCount=0;
  const mailToken=async()=>{
    await root.crons.run('deb-email-queue');let messages:any;
    await poll(async()=>{messages=await fetch('http://127.0.0.1:8025/api/v1/search?query='+encodeURIComponent('to:'+email)).then(r=>r.json());return messages.messages?.length>previousCount;});
    previousCount=messages.messages.length;
    const message=await fetch('http://127.0.0.1:8025/api/v1/message/'+messages.messages[0].ID).then(r=>r.json());
    return decodeURIComponent(String(message.Text).match(/token=([^\s]+)/)![1]);
  };
  await qa.send('/api/deb/accounts/save',{method:'POST',body:{changes:[{...row,name:'Lifecycle PIC',email}],confirmReset:true}});
  let invite=await send();
  try{
    await root.settings.update({smtp:{port:1026}});
    for(let attempt=1;attempt<=3;attempt++){
      await root.collection('account_invitations').update(invite.id,{nextAttempt:1});await root.crons.run('deb-email-queue');
      await poll(async()=>{const r=await root.collection('account_invitations').getOne(invite.id);return r.attempts===attempt&&['queued','failed'].includes(r.delivery);});
    }
    assert.equal((await root.collection('account_invitations').getOne(invite.id)).delivery,'failed');
  }finally{await root.settings.update({smtp:{port:1025}});}
  await root.collection('account_invitations').update(invite.id,{expires:Date.now()-1});
  invite=await send();const old=await mailToken();assert.equal((await post('inspect',{token:old})).status,200);
  await root.collection('account_invitations').update(invite.id,{expires:Date.now()-1});assert.equal((await post('inspect',{token:old})).status,400);
  invite=await send();const token=await mailToken();assert.equal((await post('inspect',{token:old})).status,400);
  assert.equal((await post('confirm',{token,password,passwordConfirm:password})).status,200);
  const login=await post('login',{email,password});assert.equal(login.status,200);const cookie=login.headers.get('set-cookie')!.split(';')[0];
  assert.equal((await post('request',{email,purpose:'forgot'})).status,200);const recovery=await mailToken();
  assert.equal((await post('confirm',{token:recovery,password:'NewLifecycle123!',passwordConfirm:'NewLifecycle123!'})).status,200);
  assert.equal((await post('login',{email,password})).status,401);
  assert.equal((await fetch(origin+'/api/auth/me',{headers:{Cookie:cookie}}).then(r=>r.json())).session,null);
  const member=new PocketBase(instance.url);await member.collection('users').authWithPassword(email,'NewLifecycle123!');
  await assert.rejects(member.collection('users').requestPasswordReset(email),(e:unknown)=>(e as {status:number}).status===403);
  const wrote=await member.send('/api/deb/workflows/ask',{method:'POST',headers:{'Idempotency-Key':randomUUID()},body:{title:'P1 isolated authorization test',body:'A real activated campus can write using its server identity.',categoryIds:['umum']}});
  assert.equal((await root.collection('questions').getOne(wrote.id)).campus,row.campusId);
  const unknown=`unknown-${randomUUID()}@example.com`;
  for(let n=0;n<5;n++)assert.equal((await post('request',{email:unknown,purpose:'forgot'})).status,200);
  assert.equal((await post('request',{email:unknown,purpose:'forgot'})).status,429);
});
