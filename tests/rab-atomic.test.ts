import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

// Execute the production atomic() and service against an isolated transactional transport.
// No PocketBase process, credentials, application database or storage is touched.
test('legacy RAB uses one transaction and fences payment, stale requests and failed commits', async t => {
  const server = await createServer({configFile:false, plugins:[{name:'test-environment', resolveId(id){if(id === '$app/environment') return '\0test-environment';},load(id){if(id === '\0test-environment') return 'export const dev = true;';}}],server:{middlewareMode:true,ws:false,watch:null},appType:'custom'});
  t.after(() => server.close());
  const rab = await server.ssrLoadModule('/src/lib/server/deb/rab.ts');
  const { KINDS } = await server.ssrLoadModule('/src/lib/pencairan.ts');
  function fixture(fault: 'none'|'paid'|'failure' = 'none') {
    let rows: Record<string, any[]> = {
      campuses:[{id:'campus1'}],sk_awards:[{id:'award1',campus:'campus1',wave:1,amountSen:1000}],
      disbursements:[{id:'payment1',campus:'campus1',term:1,revision:1,stage:3,requestedSen:0,paidAt:''}],
      documents:KINDS.map((kind:string) => ({id:kind,disbursement:'payment1',kind,status:'perlu_konfirmasi',revision:1})),
      rab_versions:[{id:'version1',campus:'campus1',disbursement:'payment1',number:1,status:'draf',totalSen:100,term1Sen:100,term2Sen:0}],
      rab_lines:[1,2,3,4].map(level => ({id:'line'+level,version:'version1',parent:level === 1 ? '' : 'line'+(level-1),level,order:1,title:'Item',volume:1,amountSen:100,term1Sen:100,term2Sen:0})),
      document_versions:[],bank_checks:[],attachments:[],reviews:[],audit:[],verifications:[],users:[],notifications:[],app_revisions:[]
    };
    let sends = 0;
    const pb: any = {
      filter:(source:string,params:unknown) => JSON.stringify({source,params}),
      collection:(name:string) => ({
        getList:async (_page:number,_limit:number,options:any) => ({items:structuredClone(name === 'app_revisions' ? rows[name].filter(r => r.scope === JSON.parse(options.filter).params.scope).sort((a,b) => b.sequence-a.sequence) : rows[name]),totalItems:rows[name].length}),
        getFullList:async () => structuredClone(rows[name]),
        create:async () => {throw Error('Unexpected nontransactional write');}
      }),
      createBatch:() => {
        const operations: any[] = [];
        return {collection:(name:string) => ({create:(data:any) => operations.push({name,method:'create',data}),update:(id:string,data:any) => operations.push({name,method:'update',id,data}),delete:(id:string) => operations.push({name,method:'delete',id})}),send:async () => {
          sends++;
          if (fault === 'paid') {
            fault = 'none'; rows.disbursements[0].paidAt = '2026-10-08'; rows.disbursements[0].revision = 2;
            const index = operations.findIndex(op => op.name === 'app_revisions' && op.data.scope === 'disbursements');
            rows.app_revisions.push({scope:'disbursements',sequence:1});
            throw {status:400,response:{data:{requests:{[index]:{response:{data:{sequence:{code:'validation_not_unique'}}}}}}}};
          }
          const next = structuredClone(rows);
          for (const op of operations) {
            if(op.method === 'create') next[op.name].push(structuredClone(op.data));
            if(op.method === 'delete') next[op.name] = next[op.name].filter(row => row.id !== op.id);
            if(op.method === 'update') Object.assign(next[op.name].find(row => row.id === op.id),structuredClone(op.data));
            if(fault === 'failure' && op.name === 'rab_versions') throw {status:500};
          }
          rows = next;
        }};
      }
    };
    return {pb,get rows(){return rows;},get sends(){return sends;}};
  }
  const actor = {id:'admin1',name:'Admin'};
  await t.test('decision commits submit, approval, amount, review and audit together',async () => {
    const db = fixture(); await rab.decideVersion(db.pb,actor,'campus1','sesuai','',1);
    assert.equal(db.sends,1); assert.equal(db.rows.rab_versions[0].status,'disetujui');
    assert.equal(db.rows.disbursements[0].requestedSen,100); assert.equal(db.rows.disbursements[0].revision,2);
    assert.equal(db.rows.documents.find(r=>r.kind==='rab').status,'sesuai'); assert.equal(db.rows.reviews.length,1); assert.equal(db.rows.audit.length,3);
    await assert.rejects(rab.revokeVersion(db.pb,actor,'campus1','version1',1),/Data berubah/);
    assert.equal(db.rows.rab_versions[0].status,'disetujui'); assert.equal(db.sends,1);
  });
  for (const [name,run] of Object.entries({
    save:(db:any)=>rab.saveLines(db.pb,actor,'campus1','version1',[],1),
    create:(db:any)=>rab.createVersion(db.pb,actor,'campus1',{expectedRevision:1}),
    submit:(db:any)=>rab.submitVersion(db.pb,actor,'campus1','version1',1),
    approve:(db:any)=>{db.rows.rab_versions[0].status='menunggu';return rab.approveVersion(db.pb,actor,'campus1','version1',1);},
    revoke:(db:any)=>{db.rows.rab_versions[0].status='disetujui';db.rows.disbursements[0].rabVersion='version1';return rab.revokeVersion(db.pb,actor,'campus1','version1',1);},
    decision:(db:any)=>rab.decideVersion(db.pb,actor,'campus1','sesuai','',1)
  })) await t.test(`${name} retries a lost fence and rejects payment that committed first`,async()=>{
    const db=fixture('paid'); await assert.rejects(run(db),/sudah dibayar/);
    assert.equal(db.sends,1);assert.equal(db.rows.rab_versions.length,1);assert.equal(db.rows.rab_versions[0].status,name === 'approve' ? 'menunggu' : name === 'revoke' ? 'disetujui' : 'draf');assert.equal(db.rows.rab_lines.length,4);assert.equal(db.rows.audit.length,0);assert.equal(db.rows.reviews.length,0);
  });
  await t.test('oversized import is rejected before any batch or partial version is saved',async()=>{
    const db=fixture(),before=structuredClone(db.rows);
    const heading=(key:string,parentKey:string)=>({key,parentKey,title:key,calculation:'',volume:0,unit:'',unitPriceSen:0,amountSen:0,term1Sen:0});
    const lines=[heading('a',''),heading('b','a'),heading('c','b'),...Array.from({length:2000},(_,i)=>({...heading('item'+i,'c'),volume:1,amountSen:1,term1Sen:1}))];
    await assert.rejects(rab.createVersion(db.pb,actor,'campus1',{lines,expectedRevision:1}),/kapasitas transaksi/);
    assert.deepEqual(db.rows,before);assert.equal(db.sends,0);
  });
  await t.test('failure after staged version writes leaves all prior rows intact',async()=>{
    const db=fixture('failure'),before=structuredClone(db.rows);
    await assert.rejects(rab.decideVersion(db.pb,actor,'campus1','sesuai','',1),/belum dapat dipastikan/);
    assert.deepEqual(db.rows,before);assert.equal(db.sends,1);
  });
});
