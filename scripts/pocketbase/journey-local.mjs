// Local-only maintenance/start entrypoint. Never reads .env production credentials.
import { readFile, writeFile, mkdir, open, unlink, readdir } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import PocketBase from 'pocketbase';

const root=process.cwd(), vars={};
for(const line of (await readFile('.env.local','utf8')).split(/\r?\n/)){
 const match=line.match(/^([A-Z_]+)=(.*)$/);if(match)vars[match[1]]=match[2].trim().replace(/^['"]|['"]$/g,'');
}
const directory=path.resolve(vars.DEB_LOCAL_INSTANCE_DIR||''),base=path.resolve('.local/pocketbase/tests');
if(!directory.startsWith(base+path.sep)||vars.PB_URL!=='http://127.0.0.1:8097')throw Error('Only the marked local 8097 instance is allowed.');
const marker=JSON.parse(await readFile(path.join(directory,'instance.json'),'utf8'));
if(marker.project!=='dashboard-deb'||marker.url!==vars.PB_URL||path.resolve(marker.directory)!==directory)throw Error('Local marker mismatch.');
const healthy=async()=>{try{return (await fetch(vars.PB_URL+'/api/health',{redirect:'error',signal:AbortSignal.timeout(1000)})).ok;}catch{return false;}};
if(!await healthy()){
 const log=await open(path.join(directory,'journey-pocketbase.log'),'a');
 spawn(path.join(root,'.local/pocketbase/bin/0.40.3/pocketbase.exe'),['serve','--http=127.0.0.1:8097','--dir='+path.join(directory,'pb_data'),'--automigrate=false'],{cwd:root,detached:true,windowsHide:true,stdio:['ignore',log.fd,log.fd]}).unref();
 await log.close();
 for(let i=0;i<30&&!await healthy();i++)await new Promise(resolve=>setTimeout(resolve,200));
 if(!await healthy())throw Error('Local PocketBase could not start.');
}
const creds=JSON.parse(await readFile(path.join(directory,'credentials.json'),'utf8'));
const pb=new PocketBase(vars.PB_URL);pb.autoCancellation(false);pb.beforeSend=(url,options)=>({url,options:{...options,redirect:'error'}});
await pb.collection('_superusers').authWithPassword(creds.superuser.email,creds.superuser.password);
if(process.argv.includes('--migrate')){
 const { debCollections }=await import('./deb-schema.ts');
 const names={disbursements:['submissionStatus','applicationData'],rab_versions:['campusStep','revision']};
 const fields=Object.fromEntries(debCollections('local-campus-id').filter(c=>names[c.name]).map(c=>[c.name,c.fields.filter(f=>names[c.name].includes(f.name))]));
 for(const [name,extra] of Object.entries(fields)){
  const collection=await pb.collections.getOne(name),missing=extra.filter(f=>!collection.fields.some(e=>e.name===f.name));
  if(missing.length)await pb.collections.update(collection.id,{fields:[...collection.fields,...missing]});
  console.log(name+': '+missing.length+' fields added');
 }
 const settings=await pb.settings.getAll();
 await pb.settings.update({batch:{...settings.batch,enabled:true,maxRequests:2000}});
}
if(process.argv.includes('--seed')||process.argv.includes('--seed-qa3')){
 const { KINDS }=await import('../../src/lib/pencairan.ts');
 const id=s=>createHash('sha256').update('journey-local:'+s).digest('hex').slice(0,15);
 const create=async(collection,key,data)=>{try{return await pb.collection(collection).getOne(id(key));}catch(e){if(e.status!==404)throw e;return pb.collection(collection).create({id:id(key),...data});}};
 for(const n of process.argv.includes('--seed-qa3')?[3]:[1,2]){
  const c=await create('campuses','campus'+n,{name:'Kampus QA Lokal '+n,initials:'QA'+n,code:'QA'+n,source:'admin',simulated:true,legacyId:'journey-qa-'+n,city:'Jakarta',fundedWave:1,fillMode:'campus',programYear:'kedua',program:{programTitle:'Program Energi QA '+n,address:'Alamat Kampus QA',replicationVillage:'Desa QA',mentor:'Mentor QA',coordinator:'Koordinator QA'}});
  await create('sk_awards','award'+n,{campus:c.id,skNumber:'SK-QA-LOKAL/2026/'+n,skDate:'2026-06-01 00:00:00.000Z',wave:1,amountSen:2000000000,programYear:'kedua',programTitle:'Program Energi QA '+n});
  const d=await create('disbursements','payment'+n,{campus:c.id,term:1,stage:1,revision:1,submissionStatus:'draf',applicationData:{},properties:{},templateMode:'standard'});
  for(const kind of KINDS)await create('documents','doc'+n+kind,{disbursement:d.id,kind,status:kind==='sk'?'sesuai':'belum_ada',revision:1});
  for(const slot of n===1?[901,902]:n===2?[903]:[904]){
   const key='campus-'+slot;let credential=creds.users[key];
   if(!credential){credential={email:key+'@qa-local.example.test',password:randomBytes(24).toString('base64url')};creds.users[key]=credential;await writeFile(path.join(directory,'credentials.json'),JSON.stringify(creds,null,2));}
   await create('users',key,{...credential,passwordConfirm:credential.password,name:'Akun QA '+slot,role:'campus',campus:c.id,active:true,verified:true,simulated:true,legacyId:key});
  }
  console.log('QA campus '+n+': '+c.id);
 }
}
if(process.argv.includes('--audit-unopened')){
 const [campuses,awards,payments]=await Promise.all(['campuses','sk_awards','disbursements'].map(n=>pb.collection(n).getFullList()));
 console.log(JSON.stringify(campuses.filter(c=>!payments.some(d=>d.campus===c.id&&d.term===1)).map(c=>({id:c.id,name:c.name,fundedWave:c.fundedWave,programYear:c.programYear,programFields:Object.keys(c.program||{}).filter(k=>c.program[k]!=null&&c.program[k]!==''),awards:awards.filter(a=>a.campus===c.id).map(a=>({id:a.id,wave:a.wave,amountSen:a.amountSen,skNumber:a.skNumber}))})),null,2));
}
if(process.argv.includes('--open-unopened')){
 const { KINDS }=await import('../../src/lib/pencairan.ts');
 const { ensureJourney }=await import('../../src/lib/pengajuan/journey.ts');
 const [campuses,awards,payments]=await Promise.all(['campuses','sk_awards','disbursements'].map(n=>pb.collection(n).getFullList()));
 const targets=campuses.filter(c=>!payments.some(d=>d.campus===c.id&&d.term===1));
 // Never reinterpret an existing award as a dummy allocation.
 if(targets.some(c=>awards.some(a=>a.campus===c.id)))throw Error('An unopened campus has an existing award; review it before provisioning.');
 if(targets.length){
  const folder=path.join(root,'.local/pocketbase/maintenance','open-unopened-'+new Date().toISOString().replaceAll(':','-'));
  await mkdir(folder,{recursive:true});
  const id=key=>createHash('sha256').update('journey-open:'+key).digest('hex').slice(0,15);
  const manifest={instance:directory,createdAt:new Date().toISOString(),campuses:targets,created:[]};
  const batch=pb.createBatch();
  for(const c of targets){
   const year=c.programYear||'kedua',award={id:id(c.id+':sk'),campus:c.id,skNumber:'SK-DUMMY-LOKAL/2026/'+c.id,skDate:'2026-06-01 00:00:00.000Z',wave:1,amountSen:7500000000,programYear:year,note:'Simulasi lokal Rp75 juta; bukan SK resmi.'};
   const journey=ensureJourney({...c,award},{});
   // A long program description is not a document title. Preserve the source profile unchanged.
   journey.fields.judulProgram=c.program?.programTitle||'';
   journey.fields.tempatTandaTangan='';
   const payment={id:id(c.id+':payment'),campus:c.id,term:1,stage:1,revision:1,submissionStatus:'draf',applicationData:journey,properties:{},templateMode:'standard'};
   batch.collection('campuses').update(c.id,{fundedWave:1,fillMode:'campus',programYear:year,revision:(c.revision||0)+1});
   for(const [collection,data] of [['sk_awards',award],['disbursements',payment],...KINDS.map(kind=>['documents',{id:id(c.id+':'+kind),disbursement:payment.id,kind,status:kind==='sk'?'perlu_konfirmasi':'belum_ada',revision:1}])]){
    batch.collection(collection).create(data);manifest.created.push({collection,id:data.id});
   }
  }
  await writeFile(path.join(folder,'before-and-created.json'),JSON.stringify(manifest,null,2));
  await batch.send();
  await writeFile(path.join(folder,'applied.json'),JSON.stringify({appliedAt:new Date().toISOString(),count:targets.length}));
  console.log('Opened '+targets.length+' campuses with local dummy SK Rp75,000,000; empty RAB/documents. Recovery manifest: '+folder);
 }else console.log('No unopened campuses; nothing changed.');
}
if(process.argv.includes('--delete-qa')){
 const campuses=await pb.collection('campuses').getFullList({filter:'simulated = true'});
 const targets=campuses.filter(c=>/^journey-qa-[123]$/.test(c.legacyId)&&/^Kampus QA Lokal [123]$/.test(c.name));
 const campusIds=new Set(targets.map(c=>c.id)),selected=new Map(),keys=new Set();
 const collections=(await pb.collections.getFullList()).filter(c=>!c.system);
 const records=new Map(await Promise.all(collections.map(async c=>[c.name,await pb.collection(c.name).getFullList()])));
 const take=(name,predicate)=>{const rows=(records.get(name)||[]).filter(predicate);selected.set(name,rows);return new Set(rows.map(r=>r.id));};
 const users=take('users',r=>campusIds.has(r.campus)&&r.simulated&&/^campus-90[1-4]$/.test(r.legacyId));
 const payments=take('disbursements',r=>campusIds.has(r.campus));
 const docs=take('documents',r=>payments.has(r.disbursement));
 const versions=take('document_versions',r=>docs.has(r.document));
 const rab=take('rab_versions',r=>campusIds.has(r.campus));
 take('rab_lines',r=>rab.has(r.version));
 take('reviews',r=>docs.has(r.document)||versions.has(r.version));
 for(const name of ['bank_checks','attachments','lpj_entries'])take(name,r=>payments.has(r.disbursement));
 for(const name of ['sk_awards','notes','verifications','pks_templates'])take(name,r=>campusIds.has(r.campus));
 take('audit',r=>campusIds.has(r.campus)||users.has(r.actor));
 take('notifications',r=>campusIds.has(r.campus)||users.has(r.recipientUser)||users.has(r.recipient)||users.has(r.user)||[...campusIds].some(id=>String(r.target||r.href||'').includes(id)));
 selected.set('campuses',targets);
 for(const rows of selected.values())for(const r of rows){for(const field of ['r2Key','fileKey','sourceFile','evidenceKey'])if(r[field])keys.add(r[field]);for(const file of [...Object.values(r.applicationData?.files||{}),...Object.values(r.generation?.verifiedFiles||{})])if(file.key)keys.add(file.key);}
 // Resume object cleanup if a prior deletion stopped on a required relation.
 const maintenance=path.join(root,'.local/pocketbase/maintenance');
 for(const entry of await readdir(maintenance).catch(()=>[]))if(entry.startsWith('delete-qa-')){
  const previous=JSON.parse(await readFile(path.join(maintenance,entry,'before.json'),'utf8'));
  if(!(previous.campuses||[]).every(c=>c.simulated&&/^journey-qa-[123]$/.test(c.legacyId)))throw Error('Invalid QA cleanup manifest');
  for(const rows of Object.values(previous))for(const r of rows){for(const field of ['r2Key','fileKey','sourceFile','evidenceKey'])if(r[field])keys.add(r[field]);for(const file of [...Object.values(r.applicationData?.files||{}),...Object.values(r.generation?.verifiedFiles||{})])if(file.key)keys.add(file.key);}
 }
 const folder=path.join(root,'.local/pocketbase/maintenance','delete-qa-'+new Date().toISOString().replaceAll(':','-'));await mkdir(folder,{recursive:true});
 await writeFile(path.join(folder,'before.json'),JSON.stringify(Object.fromEntries(selected),null,2));
 // Remove dependent records first; no original campus is selected.
 for(const name of ['notifications','audit','verifications','notes','reviews','bank_checks','attachments','lpj_entries','document_versions','documents','rab_lines','rab_versions','pks_templates','disbursements','sk_awards','users','campuses'])for(const r of selected.get(name)||[])await pb.collection(name).delete(r.id);
 for(const key of Object.keys(creds.users))if((selected.get('users')||[]).some(u=>u.legacyId===key))delete creds.users[key];
 await writeFile(path.join(directory,'credentials.json'),JSON.stringify(creds,null,2));
 const remaining=[...records].flatMap(([name,rows])=>rows.filter(r=>!(selected.get(name)||[]).some(s=>s.id===r.id)));
 let removedFiles=0;
 for(const key of keys){if(remaining.some(r=>JSON.stringify(r).includes(key)))continue;const file=path.resolve(directory,'objects',createHash('sha256').update(key).digest('hex'));if(!file.startsWith(path.resolve(directory,'objects')+path.sep))throw Error('Invalid object path');try{await unlink(file);removedFiles++;}catch(e){if(e.code!=='ENOENT')throw e;}}
 const result={campuses:targets.length,users:users.size,records:[...selected.values()].reduce((n,rows)=>n+rows.length,0),files:removedFiles};await writeFile(path.join(folder,'applied.json'),JSON.stringify(result));console.log(JSON.stringify(result));
}
if(!process.argv.some(a=>['--migrate','--seed','--seed-qa3','--delete-qa','--audit-unopened','--open-unopened'].includes(a))){
 const env={...process.env,...vars,PB_SUPER_TOKEN:'',PB_SUPERUSER_EMAIL:'',PB_SUPERUSER_PASSWORD:'',R2_ENDPOINT:'',R2_BUCKET:'',R2_ACCESS_KEY_ID:'',R2_SECRET_ACCESS_KEY:''};
 const child=spawn(process.execPath,[path.join(root,'node_modules/vite/bin/vite.js'),'--mode','pocketbase-local','--host','127.0.0.1','--port','5176','--strictPort'],{cwd:root,env,windowsHide:true,stdio:'inherit'});
 child.on('exit',code=>process.exit(code||0));
}else console.log('Local maintenance complete; no remote database accessed.');
