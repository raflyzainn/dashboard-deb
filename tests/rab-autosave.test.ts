import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { compileModule } from 'svelte/compiler';
import ts from 'typescript';

test('compiled RAB flush stops when its owner is destroyed during an in-flight save',async t=>{
 const source=await readFile('src/lib/components/campus/pencairan/RabItemsEditor.svelte','utf8');
 const actions=source.slice(source.indexOf(' function save('),source.indexOf(" const input='")).replaceAll('export async function','async function');
 const lifecycle=source.split('\n').filter(line=>line.includes('let disposed=')||line.includes('onDestroy(()=>')).join('\n');
 const harness=`export function create(onDestroy,onsave){${lifecycle}
 let rows=$state([{id:'item1',cells:['Initial']}]),saved=$state(JSON.stringify(rows)),saving=$state(false),automaticSave=$state(false),failed=$state(''),error=$state('');
 let inFlight,version={},draft;const dirty=$derived(JSON.stringify(rows)!==saved);
 let dirtyCalls=0;const ondirty=()=>dirtyCalls++,reportError=x=>x,discardChanges=()=>{},readRabRows=()=>[],RAB_TEMPLATE_HEADERS=[];
 ${actions}
 return {save,flush,prepare,edit(value){rows[0].cells[0]=value;},get dirty(){return dirty;},get dirtyCalls(){return dirtyCalls;}};}`;
 const javascript=ts.transpileModule(harness,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText;
 const compiled=compileModule(javascript,{filename:'RabFlush.svelte.js',generate:'client'}).js.code.replace(/from ['"](svelte[^'"]*)['"]/g,(_match,id)=>`from ${JSON.stringify(import.meta.resolve(id))}`);
 const dir=await mkdtemp(join(tmpdir(),'deb-rab-flush-'));t.after(()=>rm(dir,{recursive:true,force:true}));await writeFile(join(dir,'flush.mjs'),compiled);
 const {create}=await import(pathToFileURL(join(dir,'flush.mjs')).href);
 const client=await import(import.meta.resolve('svelte/internal/client')) as {effect_root:(run:()=>void)=>(()=>void);render_effect:(run:()=>void|(()=>void))=>unknown};
 let editor:any,calls=0,resolve:(value:boolean)=>void=()=>{};
 const dispose=client.effect_root(()=>{editor=create((cleanup:()=>void)=>client.render_effect(()=>cleanup),async()=>{calls++;if(calls>3)return false;return calls===1?new Promise<boolean>(resume=>resolve=resume):true;});client.render_effect(()=>{void editor.dirty;});});
 editor.edit('Changed');assert.equal(editor.dirty,true);
 const flushing=editor.flush();dispose();resolve(true);await flushing;
 assert.equal(calls,1,'Destroyed editor cannot send another save');assert.equal(editor.dirtyCalls,0,'Late acknowledgement cannot notify the old parent');
 assert.equal(await editor.prepare(),false);assert.equal(await editor.save(),false);assert.equal(calls,1);
});
