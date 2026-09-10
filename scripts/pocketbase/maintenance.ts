import {cp,mkdir,readdir,readFile,writeFile} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import path from 'node:path';
import {LOCAL,BINARY,HOOKS,MIGRATIONS,ROOT,args,loadInstance,portAvailable} from './runtime';

const business=['users','campuses','indicator_definitions','campus_indicators','deb_submissions','indicator_feedback','proposal_versions','questions','question_answers','question_likes','faq_entries','activities','notifications','workflow_operations','master_audit'];
function records(directory:string){
  const db=new DatabaseSync(path.join(directory,'data.db'),{readOnly:true});
  try {
    const integrity=db.prepare('PRAGMA quick_check').get();
    if(!integrity||Object.values(integrity)[0]!=='ok')throw new Error('SQLite integrity check failed');
    return Object.fromEntries(business.map(name=>{
      if(!db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(name))return [name,null];
      const rows=db.prepare(`SELECT * FROM "${name}" ORDER BY id`).all();
      return [name,{count:rows.length,sha256:createHash('sha256').update(JSON.stringify(rows)).digest('hex')}];
    }));
  }finally{db.close();}
}
async function hashes(directory:string){
  const entries=await readdir(directory,{withFileTypes:true,recursive:true});
  const result:Record<string,string>={};
  for(const entry of entries.filter(e=>e.isFile()).sort((a,b)=>(a.parentPath+a.name).localeCompare(b.parentPath+b.name))){
    const file=path.join(entry.parentPath,entry.name);result[path.relative(directory,file)]=createHash('sha256').update(await readFile(file)).digest('hex');
  }return result;
}
async function main(){
  const operation=process.argv[2];
  if(!['backup','verify-master-rollback'].includes(operation))throw new Error('Use backup or verify-master-rollback');
  const instance=await loadInstance();await portAvailable(instance);
  const dataDir=path.join(LOCAL,'pb_data');
  const before=records(dataDir);
  const folder=path.join(LOCAL,'maintenance',new Date().toISOString().replaceAll(':','-')+'-'+randomUUID().slice(0,8));
  await mkdir(folder,{recursive:true});
  if(operation==='backup'){
    await cp(dataDir,path.join(folder,'pb_data'),{recursive:true,force:false,errorOnExist:true});
    const original=await hashes(dataDir),copy=await hashes(path.join(folder,'pb_data'));
    if(JSON.stringify(original)!==JSON.stringify(copy)||JSON.stringify(before)!==JSON.stringify(records(path.join(folder,'pb_data'))))throw new Error('Backup verification failed');
    await cp(HOOKS,path.join(folder,'pb_hooks'),{recursive:true,force:false,errorOnExist:true});
    await cp(MIGRATIONS,path.join(folder,'pb_migrations'),{recursive:true,force:false,errorOnExist:true});
    await writeFile(path.join(folder,'manifest.json'),JSON.stringify({createdAt:new Date().toISOString(),business:before,files:copy},null,2));
    console.log('Database/file backup verified:',folder);return;
  }
  const modulePath=path.join(ROOT,'tests/pocketbase/masters-rollback.js').replaceAll('\\','/');
  const masterPath=path.join(HOOKS,'masters.js').replaceAll('\\','/');
  await writeFile(path.join(folder,'1999999900_p4_rollback.js'),`migrate(app=>{const result=require(${JSON.stringify(modulePath)}).verify(app,require(${JSON.stringify(masterPath)}));throw new Error('QA_P4_ROLLBACK_OK '+JSON.stringify(result));},()=>{});`);
  const result=spawnSync(BINARY,['migrate','up',...args(instance).filter(a=>!a.startsWith('--migrationsDir=')),`--migrationsDir=${folder}`],{encoding:'utf8',windowsHide:true});
  const output=result.stdout+result.stderr;
  const after=records(dataDir);
  const verified=JSON.stringify(before)===JSON.stringify(after);
  await writeFile(path.join(folder,'result.json'),JSON.stringify({before,after,verified,output},null,2));
  if(!verified)throw new Error('Rollback changed business records');
  if(result.status===0||!output.includes('QA_P4_ROLLBACK_OK'))throw new Error('Native rollback assertions failed: '+output);
  console.log('P4 native rollback verified; business records unchanged. Evidence:',folder);
}
main().catch(error=>{console.error(error instanceof Error?error.message:'Maintenance failed');process.exitCode=1;});
