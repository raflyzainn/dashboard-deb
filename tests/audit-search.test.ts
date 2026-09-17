import {test} from 'node:test';
import assert from 'node:assert/strict';
import PocketBase from 'pocketbase';
import {auditSearchFilter} from '../src/lib/server/deb/audit-search';
import {createHttpService} from '../src/lib/data/service';
test('audit search understands Indonesian operation labels and safely escapes literal queries',()=>{
  const pb=new PocketBase('http://127.0.0.1:8096');
  assert.equal(auditSearchFilter(pb,'   '),'');
  assert.match(auditSearchFilter(pb,'HAPUS INDIKATOR'),/operation = "masterDeleteDefinition"/);
  const malicious='" || actor != "';
  const filter=auditSearchFilter(pb,malicious);
  assert.ok(filter.includes(pb.filter('{:value}',{value:malicious})));
});
test('audit adapter encodes text and requests older result pages separately from the catalog',async()=>{
  let requested='';
  const service=createHttpService(async url=>{requested=String(url);return Response.json({items:[],page:4,totalItems:70,totalPages:4});});
  const result=await service.masterAudit('kode & perubahan',4);
  const url=new URL(requested,'http://localhost');
  assert.equal(url.pathname,'/api/admin/master-audit');assert.equal(url.searchParams.get('q'),'kode & perubahan');assert.equal(url.searchParams.get('page'),'4');assert.equal(result.page,4);
});
