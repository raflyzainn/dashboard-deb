import { PreviewError } from './preview-error';

async function readBytes(request: Request, limit: number) {
  if(Number(request.headers.get('content-length'))>limit)throw new PreviewError(413,'Permintaan terlalu besar.');
  const reader=request.body?.getReader();if(!reader)throw new PreviewError(400,'JSON tidak valid.');
  const chunks: Uint8Array[]=[];let total=0;
  try {
    for(;;){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>limit){await reader.cancel();throw new PreviewError(413,'Permintaan terlalu besar.');}chunks.push(value);}
  } finally {reader.releaseLock();}
  return Buffer.concat(chunks);
}

export async function readJsonBody(request: Request, limit: number): Promise<Record<string, any>> {
  const bytes=await readBytes(request,limit);
  try { const body=JSON.parse(bytes.toString('utf8'));if(!body||typeof body!=='object'||Array.isArray(body))throw new Error();return body; }
  catch {throw new PreviewError(400,'JSON tidak valid.');}
}

export async function readFormBody(request: Request, limit: number): Promise<FormData> {
  const bytes=await readBytes(request,limit);
  try{return await new Response(new Uint8Array(bytes),{headers:request.headers}).formData();}
  catch{throw new PreviewError(400,'Form unggahan tidak valid.');}
}
