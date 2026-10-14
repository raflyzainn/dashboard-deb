import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pksApproved } from '../src/lib/pengajuan/pks-review';
import { grantors, validGrantors } from '../src/lib/pengajuan/grantors';
import { grantable } from '../src/lib/server/deb/users';
import { createEngine } from '../src/lib/pengajuan/engine';
import { journeySettings } from '../src/lib/pengajuan/journey';
import { payoutTimeline } from '../src/lib/payout-progress';

test('masa perjanjian pengajuan tidak mengikuti perubahan nilai awal global',()=>{
 const journey:any={datePolicy:'chronology'};
 journeySettings(journey,{agreementStart:'2026-06-01',agreementEnd:'2026-12-31'});
 const settings=journeySettings(journey,{agreementStart:'2027-01-01',agreementEnd:'2027-12-31',pfSignatoryName:'PF'});
 assert.equal(settings.agreementStart,'2026-06-01');
 assert.equal(settings.agreementEnd,'2026-12-31');
 assert.equal(settings.pfSignatoryName,'PF');
});

test('timeline belum siap diajukan jika PKS baru berupa sumber DOCX',()=>{
 const journey:any={status:'draf',datePolicy:'chronology',revision:1,documentRevisions:{pks:1,permohonan:1,invois:1,kuitansi:1}};
 const documents=['pks','permohonan','invois','kuitansi'].map(kind=>({kind,generated:true,signedReceived:false,currentVersionId:kind,versions:[{id:kind,origin:'generated',journeyRevision:1}]}));
 assert.equal(payoutTimeline({journey,hasRab:true,documents}).stage,2);
 journey.pksReview={complete:true,versionId:'pks'};
 const ready=payoutTimeline({journey,hasRab:true,documents});
 assert.equal(ready.stage,3);assert.equal(ready.stages.length,8);
});

test('pengaturan PF berubah membatalkan persetujuan dan final pengajuan belum dibayar',async()=>{
 const campus={id:'campus',name:'Kampus QA',programYear:'kedua',award:{amountSen:2000000000}};
 const documents=['pks','permohonan','invois','kuitansi'].map(kind=>({kind,generated:true,status:'sesuai',signedReceived:true,originalReceived:true,currentVersionId:kind,notes:[],reviews:[],versions:[{id:kind,origin:'generated',generation:{settingsSource:'nilai lama'}}]}));
 const journey:any={status:'selesai',datePolicy:'chronology',revision:1,fields:{},files:{},history:[{}],documentRevisions:{pks:1,permohonan:1,invois:1,kuitansi:1},pksReview:{complete:true,state:'approved',versionId:'pks',sourceRevision:1,pfBy:'pf',legalBy:'legal'}};
 const r={journey,documents,payment:{paidAt:''},versions:[],attachments:[],bankCheck:{}};
 const state:any={data:{campuses:[campus]},files:{},workflow:{campuses:{campus:r},settings:[{programYear:'kedua',pfSignatoryName:'PF baru'}]}};
 let sequence=0;
 const engine=createEngine(async()=>({id:'pf',name:'PF',role:'admin'} as any),{transaction:async action=>action(state),origin:'http://localhost',amountSen:2000000000,id:()=>String(++sequence)});
 const result:any=await engine.get('/api/pencairan/campus');
 assert.equal(result.journey.status,'revisi');assert.equal(result.journey.pksReview,undefined);
 assert.ok(result.documents.every((d:any)=>d.status==='perlu_revisi'&&!d.signedReceived));
 await assert.rejects(engine.post('/api/pencairan/campus/buat/pks'),/persetujuan PF dan Legal/);
});

test('Admin biasa boleh memberi Legal tetapi bukan Admin',()=>{
 const roles=grantable({superAdmin:false} as any);
 assert.ok(roles.includes('legal'));assert.ok(!roles.includes('admin'));
 assert.ok(grantable({superAdmin:true} as any).includes('legal'));
});
test('Legal menyetujui versi lengkap yang sama dengan pemeriksaan PF',()=>{
 const journey={documentRevisions:{pks:7},pksReview:{versionId:'pdf1',hash:'hash',sourceRevision:7,complete:true,state:'approved',pfBy:'pf',legalBy:'legal'}};
 assert.equal(pksApproved(journey),true);
 assert.equal(pksApproved({...journey,documentRevisions:{pks:8}}),false);
 assert.equal(pksApproved({...journey,pksReview:{...journey.pksReview,complete:false}}),false);
 assert.equal(pksApproved({...journey,pksReview:{...journey.pksReview,pfBy:''}}),false);
});
test('pemberi kuasa dapat berbeda dari penandatangan dan editor mempertahankan spasi',()=>{
 const fields={penandatanganNama:'Rektor',pemberiKuasaList:JSON.stringify([{name:'Budi ',title:'Dekan Fakultas'},{name:'Sari',title:'Wakil Dekan'}])};
 assert.equal(grantors(fields)[0].name,'Budi ');assert.equal(validGrantors(fields),true);
 assert.equal(validGrantors({...fields,pemberiKuasaList:'[{"name":" ","title":"Dekan"}]'}),false);
 assert.equal(validGrantors({...fields,pemberiKuasaList:'invalid'}),false);
 assert.deepEqual(grantors({pemberiKuasa:'Dekan',penandatanganJabatan:'Dekan Fakultas'}),[{name:'Dekan',title:'Dekan Fakultas'}]);
});
