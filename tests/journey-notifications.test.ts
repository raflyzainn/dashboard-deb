import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'vite';
import { RestStore, StoreRecord } from '../src/lib/server/deb/rest-store';

test('notification targets allow super-admin routing but reject cross-role and cross-campus delivery',()=>{
 const tx=new RestStore({users:[{id:'root',role:'super_admin'},{id:'campus',role:'campus',campus:'c1'}] as any,notifications:[]});
 const save=(recipientUser:string,campus:string,target:string)=>{const row=new StoreRecord('notifications');Object.assign(row.data,{recipientUser,campus,target});tx.save(row);};
 assert.doesNotThrow(()=>save('root','c1','/admin/pencairan/c1'));
 assert.throws(()=>save('campus','c1','/admin/pencairan/c1'),/role mismatch/);
 assert.throws(()=>save('campus','c2','/campus/pencairan'),/campus mismatch/);
});

test('journey notification and business changes share commit, rollback and retry',async t=>{
 const mocks:Record<string,string>={
  './access':`export const ANY=[];export const recordId=x=>x;export const secured=(event,roles,action)=>action(event.locals.context);`,
  './r2':`export const storage=()=>({put(){throw Error('Unexpected storage write');}});export const ALLOWED_EXTENSIONS=[];export const extensionOf=()=>'';export const mimeFor=()=>'';export const MIME={};`,
  './journey-verification':`export const verifyJourneyDownload=()=>{throw Error('Unexpected download');};`
 };
 const server=await createServer({configFile:false,plugins:[{name:'test-journey-boundaries',enforce:'pre',resolveId(id,importer){if(importer?.replaceAll('\\','/').endsWith('/server/deb/journey.ts')&&mocks[id])return '\0journey-test:'+id;},load(id){if(id.startsWith('\0journey-test:'))return mocks[id.slice('\0journey-test:'.length)];}}],server:{middlewareMode:true,ws:false,watch:null},appType:'custom'});
 t.after(()=>server.close());
 const {journeyRequest}=await server.ssrLoadModule('/src/lib/server/deb/journey.ts');
 const {KINDS}=await server.ssrLoadModule('/src/lib/pencairan.ts');
 function fixture(fault:'none'|'failure'|'conflict'='none'){
  let rows:Record<string,any[]>={
   campuses:[{id:'campus1',name:'Campus',programYear:2026,program:{}}],sk_awards:[{id:'award1',campus:'campus1',wave:1,amountSen:1000}],
   disbursements:[{id:'payment1',campus:'campus1',term:1,revision:1,submissionStatus:'draf',applicationData:{fields:{jenisRekening:'kampus'},files:{},revision:1,pf:{nomorPksPf:''},lastSection:'sk'}}],
   documents:KINDS.map((kind:string)=>({id:kind,kind,disbursement:'payment1',status:'belum_ada'})),
   program_settings:[{id:'settings1',programYear:2026,pfSignatoryName:'PF',pfSignatoryTitle:'PF'}],rab_versions:[],rab_lines:[],document_versions:[],reviews:[],notes:[],bank_checks:[],attachments:[],audit:[],notifications:[],app_revisions:[],
   users:[{id:'admin1',role:'admin',active:true},{id:'root1',role:'super_admin',active:true},{id:'campusUser1',role:'campus',campus:'campus1',active:true},{id:'outsider1',role:'campus',campus:'other',active:true},{id:'inactive1',role:'admin',active:false}]
  };let sends=0;
  const pb:any={filter:(source:string,params:unknown)=>JSON.stringify({source,params}),collection:(name:string)=>({
   getList:async(_page:number,_limit:number,options:any)=>({items:structuredClone(name==='app_revisions'?rows[name].filter(r=>r.scope===JSON.parse(options.filter).params.scope).sort((a,b)=>b.sequence-a.sequence):rows[name])}),
   getFullList:async()=>structuredClone(rows[name]),create:async()=>{throw Error('Unexpected nontransactional write');}
  }),createBatch:()=>{const ops:any[]=[];return{collection:(name:string)=>({create:(data:any)=>ops.push({name,data}),update:(id:string,data:any)=>ops.push({name,id,data})}),send:async()=>{
   sends++;if(fault==='conflict'){fault='none';throw {status:400,response:{data:{requests:{0:{response:{data:{sequence:{code:'validation_not_unique'}}}}}}}};}
   const next=structuredClone(rows);for(const op of ops){if(op.id)Object.assign(next[op.name].find(r=>r.id===op.id),op.data);else next[op.name].push(structuredClone(op.data));if(fault==='failure'&&op.name==='notifications'){fault='none';throw {status:500};}}
   rows=next;
  }}}};
  const request=async(route:string,body:any,admin=false,method='PATCH')=>{
   const url=new URL('http://localhost/api/pencairan/campus1/'+route);
   return journeyRequest({url,request:new Request(url,{method,headers:{'content-type':'application/json'},body:JSON.stringify(body)}),locals:{context:{pb,settings:{},actor:{admin,role:admin?'admin':'campus',campusId:'campus1',record:{id:admin?'admin1':'campusUser1',name:'User'}}}},fetch:async(path:string)=>new Response(await readFile('static'+path))});
  };
  return{request,get rows(){return rows;},get sends(){return sends;}};
 }
 await t.test('PF request includes active admin and super-admin, retry cannot duplicate',async()=>{
  const db=fixture('conflict');await db.request('pengajuan',{requestPf:true,expectedRevision:1});
  assert.equal(db.sends,2);assert.ok(db.rows.disbursements[0].applicationData.pfRequestedAt);
  assert.deepEqual(db.rows.notifications.map(r=>r.recipientUser).sort(),['admin1','root1']);
  await assert.rejects(db.request('pengajuan',{requestPf:true,expectedRevision:1}),/Data berubah/);
  await db.request('pengajuan',{requestPf:true,expectedRevision:2});assert.equal(db.rows.notifications.length,2);
 });
 await t.test('notification failure rolls back business data; same request can recover',async()=>{
  const db=fixture('failure'),before=structuredClone(db.rows);
  await assert.rejects(db.request('pengajuan',{requestPf:true,expectedRevision:1}),/belum dapat dipastikan/);
  assert.deepEqual(db.rows,before);await db.request('pengajuan',{requestPf:true,expectedRevision:1});assert.equal(db.rows.notifications.length,2);
 });
 await t.test('PF number update notifies only active campus members',async()=>{
  const db=fixture();await db.request('pengajuan/pf',{nomorPksPf:'PF/2026/01',expectedRevision:1},true);
  assert.equal(db.rows.disbursements[0].applicationData.pf.nomorPksPf,'PF/2026/01');assert.deepEqual(db.rows.notifications.map(r=>r.recipientUser),['campusUser1']);
  await db.request('pengajuan/pf',{nomorPksPf:'PF/2026/01',expectedRevision:2},true);assert.equal(db.rows.notifications.length,1);
 });
 await t.test('edit access request and admin notifications commit together',async()=>{
  const db=fixture();db.rows.disbursements[0].submissionStatus='menunggu';
  await db.request('pengajuan/edit-requests',{section:'program',reason:'Koreksi lokasi',expectedRevision:1},false,'POST');
  assert.equal(db.rows.disbursements[0].applicationData.editRequests.length,1);assert.equal(db.rows.notifications.length,2);
  assert.ok(db.rows.notifications.every(r=>r.eventType==='pencairan_edit_access'&&r.body.includes('Koreksi lokasi')));
 });
});
