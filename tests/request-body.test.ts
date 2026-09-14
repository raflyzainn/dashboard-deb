import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readJsonBody,readFormBody} from '../src/lib/server/deb/request-body';
test('API body limit rejects oversized chunked requests and malformed JSON',async()=>{
  const request=(body:string)=>new Request('http://localhost/api',{method:'POST',body});
  assert.deepEqual(await readJsonBody(request('{"name":"PIC"}'),32),{name:'PIC'});
  await assert.rejects(readJsonBody(request(JSON.stringify({name:'x'.repeat(100)})),32),(e:any)=>e.status===413);
  await assert.rejects(readJsonBody(request('[]'),32),(e:any)=>e.status===400);
  await assert.rejects(readJsonBody(request('{'),32),(e:any)=>e.status===400);
});
test('multipart body is bounded before parsing upload content',async()=>{
  const form=new FormData();form.set('file',new File(['%PDF-1.7'], 'qa.pdf',{type:'application/pdf'}));
  const request=()=>new Request('http://localhost/upload',{method:'POST',body:form});
  assert.equal((await readFormBody(request(),4096)).get('file') instanceof File,true);
  await assert.rejects(readFormBody(request(),5),(e:any)=>e.status===413);
});
