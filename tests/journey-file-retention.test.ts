import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEngine } from '../src/lib/pengajuan/engine';
import { ensureJourney } from '../src/lib/pengajuan/journey';
import { KINDS } from '../src/lib/pencairan';

test('bank edits keep the old file; removal requires the current revision and file scope', async () => {
 const campus={id:'campus1',program:{}};
 const record:any={payment:{paidAt:''},versions:[],documents:KINDS.map(kind=>({kind,status:'belum_ada',versions:[],notes:[]}))};
 const journey=ensureJourney(campus,record);
 journey.files.rekening={id:'old-file',name:'rekening.png',mime:'image/png'};
 journey.files.kop={id:'kop-file',name:'kop.png',mime:'image/png'};
 let state:any={data:{campuses:[campus]},files:{},workflow:{campuses:{campus1:record}}};
 const engine=createEngine(async()=>({role:'campus',campusId:'campus1',name:'QA'}) as any,{
  origin:'http://localhost',amountSen:1000000,
  transaction:async(action,write=false)=>{const next=structuredClone(state),result=action(next);if(write)state=next;return result;}
 });
 const patch=(body:any)=>engine.request('/api/pencairan/campus1/pengajuan','PATCH',body);
 await patch({revision:journey.revision,fields:{namaBank:'Bank baru'}});
 let current=state.workflow.campuses.campus1.journey;
 assert.equal(current.files.rekening.id,'old-file');
 assert.equal(current.files.rekening.stale,true);
 await assert.rejects(patch({removeFile:'rekening',revision:current.revision-1}),/Draf berubah/);
 current.status='revisi';current.revisionRequests=[{status:'open',scopes:['administrasi']}];
 await assert.rejects(patch({removeFile:'kop',revision:current.revision}),/terkunci/);
 await patch({removeFile:'rekening',revision:current.revision});
 assert.ok(!state.workflow.campuses.campus1.journey.files.rekening);
 assert.equal(state.workflow.campuses.campus1.journey.files.kop.id,'kop-file');
});
