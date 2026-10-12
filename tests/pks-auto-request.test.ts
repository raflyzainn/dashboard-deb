import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createEngine } from '../src/lib/pengajuan/engine';
import { KINDS } from '../src/lib/pencairan';
import { MERGE_KINDS, TEMPLATE_FILE, type MergeKind } from '../src/lib/merge';

const templates=async()=>Object.fromEntries(await Promise.all(MERGE_KINDS.map(async kind=>[kind,new Uint8Array(await readFile(`static/templat/${TEMPLATE_FILE[kind]}`))]))) as Record<MergeKind,Uint8Array>;

test('saving a campus PKS number requests PF once, without submitting the draft', async () => {
 const campus={id:'campus1',programYear:2026,program:{}};
 let state:any={data:{campuses:[campus]},files:{},workflow:{campuses:{campus1:{payment:{paidAt:''},versions:[],documents:KINDS.map(kind=>({kind,status:'belum_ada',versions:[],notes:[],reviews:[]}))}},settings:[{programYear:2026,pfSignatoryName:'PF',pfSignatoryTitle:'PF'}]}};
 const engine=createEngine(async()=>({role:'campus',campusId:'campus1',name:'QA'}) as any,{
  origin:'http://localhost',amountSen:1000000,id:()=>crypto.randomUUID(),templates,
  transaction:async(action,write=false)=>{const next=structuredClone(state),result=action(next);if(write)state=next;return result;}
 });
 const get=()=>engine.request('/api/pencairan/campus1/pengajuan','GET') as Promise<any>;
 const save=async(number:string)=>{const data=await get();return engine.request('/api/pencairan/campus1/pengajuan','PATCH',{revision:data.journey.revision,fields:{nomorPksKampus:number}});};
 await save('   ');
 assert.ok(!state.workflow.campuses.campus1.journey.pfRequestedAt);
 await save('PKS/2026/1');
 const requested=state.workflow.campuses.campus1.journey.pfRequestedAt;
 assert.ok(requested);
 assert.equal(state.workflow.campuses.campus1.journey.status,'draf');
 await save('PKS/2026/2');
 assert.equal(state.workflow.campuses.campus1.journey.pfRequestedAt,requested);
});
