// Local-only maintenance/start entrypoint. Never reads .env production credentials.
import { readFile, writeFile, mkdir, open } from 'node:fs/promises';
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
if(process.argv.includes('--seed')){
 const { KINDS }=await import('../../src/lib/pencairan.ts');
 const id=s=>createHash('sha256').update('journey-local:'+s).digest('hex').slice(0,15);
 const create=async(collection,key,data)=>{try{return await pb.collection(collection).getOne(id(key));}catch(e){if(e.status!==404)throw e;return pb.collection(collection).create({id:id(key),...data});}};
 for(const n of [1,2]){
  const c=await create('campuses','campus'+n,{name:'Kampus QA Lokal '+n,initials:'QA'+n,code:'QA'+n,source:'admin',simulated:true,legacyId:'journey-qa-'+n,city:'Jakarta',fundedWave:1,fillMode:'campus',programYear:'kedua',program:{programTitle:'Program Energi QA '+n,address:'Alamat Kampus QA',replicationVillage:'Desa QA',mentor:'Mentor QA',coordinator:'Koordinator QA'}});
  await create('sk_awards','award'+n,{campus:c.id,skNumber:'SK-QA-LOKAL/2026/'+n,skDate:'2026-06-01 00:00:00.000Z',wave:1,amountSen:2000000000,programYear:'kedua',programTitle:'Program Energi QA '+n});
  const d=await create('disbursements','payment'+n,{campus:c.id,term:1,stage:1,revision:1,submissionStatus:'draf',applicationData:{},properties:{},templateMode:'standard'});
  for(const kind of KINDS)await create('documents','doc'+n+kind,{disbursement:d.id,kind,status:kind==='sk'?'sesuai':'belum_ada',revision:1});
  for(const slot of n===1?[901,902]:[903]){
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
if(!process.argv.some(a=>['--migrate','--seed','--audit-unopened','--open-unopened'].includes(a))){
 const env={...process.env,...vars,PB_SUPER_TOKEN:'',PB_SUPERUSER_EMAIL:'',PB_SUPERUSER_PASSWORD:'',R2_ENDPOINT:'',R2_BUCKET:'',R2_ACCESS_KEY_ID:'',R2_SECRET_ACCESS_KEY:''};
 const child=spawn(process.execPath,[path.join(root,'node_modules/vite/bin/vite.js'),'--mode','pocketbase-local','--host','127.0.0.1','--port','5176','--strictPort'],{cwd:root,env,windowsHide:true,stdio:'inherit'});
 child.on('exit',code=>process.exit(code||0));
}else console.log('Local maintenance complete; no remote database accessed.');
