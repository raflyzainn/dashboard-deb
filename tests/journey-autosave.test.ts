import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { compileModule } from 'svelte/compiler';
import ts from 'typescript';

test('compiled CampusJourney autosave stops after acknowledgement and preserves in-flight edits',async t=>{
 const source=await readFile('src/lib/components/campus/pencairan/CampusJourney.svelte','utf8');
 const sync=source.slice(source.indexOf(' function sync('),source.indexOf(' async function load('));
 const saves=source.slice(source.indexOf(' async function save('),source.indexOf(' async function navigate('));
 const lifecycle=source.split('\n').filter(line=>line.includes('let disposed=')||line.includes('onDestroy(()=>')).join('\n');
 assert.ok(lifecycle.includes('onDestroy'));
 const harness=`export function create(onDestroy=()=>{}){${lifecycle}let fields=$state({}),data=$state(null),saved=$state('{}'),busy=$state(false),saving=$state(false),failedDraft=$state(''),error=$state(''),message=$state(''),remoteChanged=$state(false);
 const dirty=$derived(JSON.stringify(fields)!==saved);
 let savePromise=null,lastDraftNotice=-Infinity;
 const base='/test',PKS_DATE='2026-06-17',onloaded=()=>{},reportError=x=>x;
 let patch;
 const dataService={api:{patch:(...args)=>patch(...args)}};
 ${sync}\n${saves}
 return {sync,save,setPatch(fn){patch=fn;},edit(key,value){fields[key]=value;},replace(next){fields=next;},get fields(){return $state.snapshot(fields);},get dirty(){return dirty;},get busy(){return busy;}};}`;
 const javascript=ts.transpileModule(harness,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText;
 const compiled=compileModule(javascript,{filename:'Autosave.svelte.js',generate:'client'}).js.code.replace(/from ['"](svelte[^'"]*)['"]/g,(_match,id)=>`from ${JSON.stringify(import.meta.resolve(id))}`);
 const dir=await mkdtemp(join(tmpdir(),'deb-autosave-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 await writeFile(join(dir,'autosave.mjs'),compiled);
 const {create}=await import(pathToFileURL(join(dir,'autosave.mjs')).href);
 const api=create();
 const response=(fields:Record<string,string>,serverRevision=1)=>({journey:{status:'draf',revision:3,fields},serverRevision});
 api.sync(response({judulProgram:'Initial',tanggalPerjanjian:'2026-06-17'}));
 assert.equal(api.dirty,false);
 let calls=0;
 api.setPatch(async(_url:string,body:any)=>{assert.ok(++calls<=3,'Autosave repeats without edits');return response(Object.fromEntries(Object.entries(body.fields).map(([k,v])=>[k,String(v).trim()])),calls+1);});
 api.edit('judulProgram','Changed ');await api.save();assert.equal(calls,1);assert.equal(api.dirty,false);assert.equal(api.fields.judulProgram,'Changed');
 let release:(value:any)=>void=()=>{};calls=0;
 api.setPatch(async(_url:string,body:any)=>{assert.ok(++calls<=3,'Autosave repeats after in-flight edit');if(calls===1)return new Promise(resolve=>release=()=>resolve(response(body.fields,2)));return response(body.fields,3);});
 api.edit('judulProgram','A');const pending=api.save();api.replace({...api.fields,judulProgram:'B',lokasiProvinsiId:'31'});release(null);await pending;
 assert.equal(calls,2);assert.equal(api.dirty,false);assert.equal(api.fields.judulProgram,'B');assert.equal(api.fields.lokasiProvinsiId,'31');
 await t.test('destroying the owner while PATCH is pending prevents further saves',async()=>{
  const client=await import(import.meta.resolve('svelte/internal/client')) as {
   effect_root:(run:()=>void)=>(()=>void);
   render_effect:(run:()=>void|(()=>void))=>unknown;
  };
  let old:any,cleanupRun=false;
  const dispose=client.effect_root(()=>{old=create((cleanup:()=>void)=>client.render_effect(()=>()=>{cleanupRun=true;cleanup();}));client.render_effect(()=>{void old.dirty;});});
  old.sync(response({judulProgram:'Initial',tanggalPerjanjian:'2026-06-17'}));old.edit('judulProgram','Changed');assert.equal(old.dirty,true);
  let repeats=0,resume:()=>void=()=>{};
  old.setPatch(async(_url:string,body:any)=>{if(++repeats>3)throw Error('Destroyed owner repeats PATCH');if(repeats===1)return new Promise(resolve=>resume=()=>resolve(response({...body.fields,judulProgram:'Late acknowledgement'},2)));return response(body.fields,repeats+1);});
  const saving=old.save();dispose();assert.equal(cleanupRun,true);resume();assert.equal(await saving,false);
  assert.equal(old.fields.judulProgram,'Changed');
  assert.equal(await old.save(),false);
  assert.equal(repeats,1,'No second PATCH after owner destruction');
 });

});
