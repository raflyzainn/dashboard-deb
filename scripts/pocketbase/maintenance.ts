import {cp,mkdir,readdir,readFile,writeFile} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';

import {DatabaseSync} from 'node:sqlite';
import path from 'node:path';
import {LOCAL,ROOT,loadInstance,portAvailable} from './runtime';

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
  if(operation!=='backup')throw new Error('Use backup. Transaction rollback is tested by npm run test:pb:master-rollback on a disposable instance.');
  const instance=await loadInstance();await portAvailable(instance);
  const dataDir=path.join(LOCAL,'pb_data');
  const before=records(dataDir);
  const folder=path.join(LOCAL,'maintenance',new Date().toISOString().replaceAll(':','-')+'-'+randomUUID().slice(0,8));
  await mkdir(folder,{recursive:true});
  if(operation==='backup'){
    await cp(dataDir,path.join(folder,'pb_data'),{recursive:true,force:false,errorOnExist:true});
    const original=await hashes(dataDir),copy=await hashes(path.join(folder,'pb_data'));
    if(JSON.stringify(original)!==JSON.stringify(copy)||JSON.stringify(before)!==JSON.stringify(records(path.join(folder,'pb_data'))))throw new Error('Backup verification failed');
    await cp(path.join(ROOT,'db-schema','collections.json'),path.join(folder,'collections.json'),{force:false,errorOnExist:true});
    await writeFile(path.join(folder,'manifest.json'),JSON.stringify({createdAt:new Date().toISOString(),business:before,files:copy},null,2));
    console.log('Database/file backup verified:',folder);return;
  }

}
main().catch(error=>{console.error(error instanceof Error?error.message:'Maintenance failed');process.exitCode=1;});
