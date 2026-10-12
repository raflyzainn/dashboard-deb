import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createEngine } from '../src/lib/pengajuan/engine';
import { ensureJourney } from '../src/lib/pengajuan/journey';
import { KINDS } from '../src/lib/pencairan';

test('signed DOCX is rejected before creating a version or marking the document received',async()=>{
 const campus={id:'campus1',program:{}};
 const record:any={payment:{paidAt:''},versions:[],documents:KINDS.map(kind=>({kind,generated:['pks','permohonan','invois','kuitansi'].includes(kind),status:'sesuai',versions:[],notes:[]}))};
 ensureJourney(campus,record).status='selesai';
 const state:any={data:{campuses:[campus]},files:{},workflow:{campuses:{campus1:record}}};
 const engine=createEngine(async()=>({role:'admin',name:'QA'}) as any,{origin:'http://localhost',amountSen:1000000,id:()=>crypto.randomUUID(),transaction:async action=>action(state)});
 const body=new FormData();body.set('signed','1');body.set('file',new File([await readFile('static/templat/pks-standar.docx')],'scan.docx',{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}));
 await assert.rejects(engine.request('/api/pencairan/campus1/documents/pks/versions','POST',body),/Dokumen bertanda tangan harus PDF/);
 const doc=record.documents.find((d:any)=>d.kind==='pks');
 assert.equal(doc.versions.length,0);assert.ok(!doc.signedReceived);
});
