import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { compileModule } from 'svelte/compiler';
import ts from 'typescript';
import { ensureJourney, journeyView } from '../src/lib/pengajuan/journey';
import { revisionValue, REVISION_SCOPES, type RevisionScope } from '../src/lib/pengajuan/revisions';
import { MERGE_KINDS, TEMPLATE_FILE } from '../src/lib/merge';

test('revision view distinguishes unchanged user input from documents awaiting regeneration',async()=>{
 const templates=Object.fromEntries(await Promise.all(MERGE_KINDS.map(async kind=>[kind,new Uint8Array(await readFile('static/templat/'+TEMPLATE_FILE[kind]))]))) as any;
 const campus={id:'campus1',programYear:2026,award:{amountSen:1000,skNumber:'SK1'}},settings={};
 const r:any={payment:{paidAt:''},versions:[],documents:MERGE_KINDS.map(kind=>({kind,status:'perlu_revisi',versions:[],reviews:[],currentVersionId:'old-'+kind}))};
 const j=ensureJourney(campus,r);j.status='revisi';
 const request=(scopes:RevisionScope[])=>({id:'request1',kind:'pks',scopes,status:'open',baseline:Object.fromEntries(scopes.map(scope=>[scope,revisionValue(r,scope,'pks')]))});
 j.revisionRequests=[request(['program','dokumen'])] as any;
 assert.deepEqual(journeyView(campus,r,settings,templates).pendingRevisionScopes,['program']);
 j.fields.judulProgram='Updated';
 assert.deepEqual(journeyView(campus,r,settings,templates).pendingRevisionScopes,[]);
 assert.deepEqual(journeyView(campus,r,settings,templates).revisionBlockers,[...MERGE_KINDS]);
 j.revisionRequests=[request(['dokumen'])] as any;
 assert.deepEqual(journeyView(campus,r,settings,templates).pendingRevisionScopes,[]);
 j.revisionRequests=[request(['program','surat'])] as any;j.fields.judulProgram='Updated again';
 assert.deepEqual(journeyView(campus,r,settings,templates).pendingRevisionScopes,['surat']);
});

test('compiled submit rechecks saved scopes before generating, while document-only revision proceeds',async t=>{
 const source=await readFile('src/lib/components/campus/pencairan/CampusJourney.svelte','utf8');
 const submit=source.slice(source.indexOf(' async function submit(){'),source.indexOf(' function latest('));
 const pending=source.split('\n').find(line=>line.includes('const pendingRevisionLabels='));assert.ok(pending);
 const harness=`const REVISION_SCOPES=${JSON.stringify(REVISION_SCOPES)};
 let data=$state(null),busy=$state(false),error=$state(''),message=$state('');${pending}
 let afterSave;const calls=[];const base='/test',reportError=x=>x,sync=next=>data=next;
 const save=async()=>{if(afterSave)data=afterSave;return true;};
 const dataService={api:{post:async(url)=>{calls.push(url);return {...data,stale:[]};}}};
 ${submit}
 export const api={submit,setup(initial,next){data=initial;afterSave=next;calls.length=0;error='';},get calls(){return calls;},get error(){return error;}};`;
 const javascript=ts.transpileModule(harness,{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext}}).outputText;
 const compiled=compileModule(javascript,{filename:'Submit.svelte.js',generate:'client'}).js.code.replace(/from ['"](svelte[^'"]*)['"]/g,(_match,id)=>`from ${JSON.stringify(import.meta.resolve(id))}`);
 const dir=await mkdtemp(join(tmpdir(),'deb-revision-submit-'));t.after(()=>rm(dir,{recursive:true,force:true}));await writeFile(join(dir,'submit.mjs'),compiled);
 const {api}=await import(pathToFileURL(join(dir,'submit.mjs')).href);
 const response=(pendingRevisionScopes:string[])=>({journey:{status:'revisi'},pendingRevisionScopes,stale:['pks'],serverRevision:2});
 api.setup(response(['program']));await api.submit();assert.deepEqual(api.calls,[]);assert.match(api.error,/Data Program/);
 api.setup(response(['program']),response([]));await api.submit();assert.deepEqual(api.calls,['/test/dokumen/pks','/test/submit']);
 api.setup(response([]));await api.submit();assert.deepEqual(api.calls,['/test/dokumen/pks','/test/submit']);
 api.setup(response(['program']),response(['surat']));await api.submit();assert.deepEqual(api.calls,[]);assert.match(api.error,/Identitas Surat dan Kop/);
});
