import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEngine } from '../src/lib/pengajuan/engine';
import { readRabRows } from '../src/lib/pengajuan/rab-model';
import { RAB_TEMPLATE_HEADERS } from '../src/lib/rab-template';

test('matching totals do not make incomplete or invalid RAB rows ready', () => {
 const valid=['Energi','Alat','Panel',10,'unit',1,'kali',1000];
 assert.equal(readRabRows([RAB_TEMPLATE_HEADERS,valid]).length,1);
 for(const [column,value] of [[2,''],[4,'123'],[3,2.5]] as const){
  const row=[...valid];row[column]=value;
  assert.throws(()=>readRabRows([RAB_TEMPLATE_HEADERS,row]));
 }
 assert.throws(()=>readRabRows([RAB_TEMPLATE_HEADERS]));
});

test('manual item drafts allow mismatched totals but finalization requires the exact SK amount', async () => {
 for (const qty of [9,10,11]) {
  const campus={id:'campus1',program:{}};
  let state:any={data:{campuses:[campus]},files:{},workflow:{campuses:{campus1:{payment:{paidAt:''},versions:[],documents:['rab_penuh','rab','rab_tahap2'].map(kind=>({kind,status:'belum_ada'}))}}}};
  let sequence=0;
  const engine=createEngine(async()=>({role:'campus',campusId:'campus1',name:'QA'}) as any,{
   origin:'http://localhost',amountSen:1000000,id:()=>String(++sequence),
   transaction:async(action,write=false)=>{const next=structuredClone(state),result=action(next);if(write)state=next;return result;}
  });
  const body={rows:[['Energi','Alat','Panel',qty,'unit',1,'kali',1000]],lineIds:[''],sourceVersion:'',itemDraftRevision:0,draft:true};
  await engine.request('/api/pencairan/campus1/rab/items','POST',body);
  assert.equal(state.workflow.campuses.campus1.journey.rabDraft.rows[0][3],qty);
  const final={...body,draft:false,itemDraftRevision:1};
  if(qty===10){await engine.request('/api/pencairan/campus1/rab/items','POST',final);assert.equal(state.workflow.campuses.campus1.versions[0].totalSen,1000000);}
  else{await assert.rejects(engine.request('/api/pencairan/campus1/rab/items','POST',final),/Total RAB harus sama dengan nilai SK/);assert.equal(state.workflow.campuses.campus1.versions.length,0);assert.ok(state.workflow.campuses.campus1.journey.rabDraft);}
 }
});
