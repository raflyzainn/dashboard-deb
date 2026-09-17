import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHttpService,DataReadError} from '../src/lib/data/service';
import {createSeed} from '../scripts/fixtures/seed';
import {campusStats} from '../src/lib/domain';
import {changedSinceSubmission} from '../src/lib/verification';
import {mapCampuses,regionSummary} from '../src/lib/map';

test('master edits preserve revision and retry key; conflicts are surfaced without retrying as a new edit',async()=>{
  const calls:{url:string;init:RequestInit}[]=[];
  const service=createHttpService(async(url,init)=>{calls.push({url:String(url),init:init!});return Response.json({message:'Master sudah berubah'},{status:409});});
  service.selectAccount('admin-1');
  await assert.rejects(service.saveDefinition({id:'opaque-id',revision:3,code:'CODE',name:'Shared',category:'New category',unit:'unit',description:'',baseline:0,target:10}),e=>e instanceof DataReadError&&e.status===409);
  assert.equal(calls[0].url,'/api/admin/definitions/opaque-id');
  assert.equal(calls[0].init.method,'PATCH');
  const body=JSON.parse(calls[0].init.body as string);
  assert.equal(body.revision,3);assert.equal(body.baseline,0);assert.equal(body.target,10);
  assert.equal('campusId' in body,false);
});

test('dashboard and map counts follow added campus and missing location, without phantom provinces',()=>{
  const {data}=createSeed();
  data.campuses.push({id:'qa-new',name:'QA campus',initials:'QA',region:'QA'});
  assert.equal(campusStats(data,'qa-new').total,0);
  assert.equal(campusStats(data,'qa-new').progress,0);
  assert.equal(mapCampuses(data).length,40);
  const regions=regionSummary(data);
  assert.equal(regions.reduce((n,r)=>n+r.campuses,0),41);
  assert.equal(regions.find(r=>r.island==='Wilayah belum diisi')?.provinces,0);
});

test('master metadata and target changes invalidate current comparison without mutating historical snapshots',()=>{
  const {data}=createSeed();const submission=data.submissions![0];
  const original=JSON.stringify(submission);
  assert.equal(changedSinceSubmission(data,submission),false);
  data.definitions.find(d=>d.id===submission.indicators[0].definitionId)!.name='Changed shared name';
  assert.equal(changedSinceSubmission(data,submission),true);
  assert.equal(JSON.stringify(submission),original);
});
