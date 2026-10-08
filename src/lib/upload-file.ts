import PizZip from 'pizzip';

export const FILE_MIME: Record<string, string> = {
 pdf:'application/pdf', png:'image/png', jpg:'image/jpeg', jpeg:'image/jpeg', webp:'image/webp', gif:'image/gif',
 docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document', doc:'application/msword',
 xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', xls:'application/vnd.ms-excel', csv:'text/csv'
};
export const fileExtension = (name:string) => (name.split('.').pop() || '').toLowerCase();

/** Inspect ZIP metadata before decompressing Office XML. Limits also apply to hidden sheets/media. */
export function checkedOfficeZip(bytes:Uint8Array, extension:'xlsx'|'docx') {
 let zip:PizZip;
 try { zip=new PizZip(bytes); } catch { throw Error('Arsip Office rusak atau terenkripsi. Gunakan berkas tanpa password.'); }
 let total=0;
 const entries=Object.values(zip.files);
 if(entries.length>1000)throw Error('Berkas Office memiliki terlalu banyak bagian. Sederhanakan berkas sebelum mengunggah.');
 for(const entry of entries){
  if(entry.dir)continue;
  const size=(entry as unknown as {_data:{uncompressedSize:number}})._data?.uncompressedSize;
  if(!Number.isSafeInteger(size)||size<0||size>16*1024*1024||(total+=size)>32*1024*1024)throw Error('Isi berkas Office terlalu besar setelah dibuka. Sederhanakan berkas sebelum mengunggah.');
 }
 if(!zip.file('[Content_Types].xml')||!zip.file(extension==='xlsx'?'xl/workbook.xml':'word/document.xml'))throw Error('Isi berkas tidak sesuai dengan jenis Office yang dipilih.');
 if(Object.keys(zip.files).some(name=>/vbaProject\.bin$/i.test(name)))throw Error('Berkas Office dengan macro tidak didukung.');
 return zip;
}

/** MIME comes from a supported extension AND matching bytes, never from multipart Content-Type. */
export function checkedFileMime(name:string, input:ArrayBuffer|Uint8Array):string {
 const bytes=new Uint8Array(input),ext=fileExtension(name),mime=FILE_MIME[ext];
 if(!mime)throw Error('Jenis berkas tidak didukung. Gunakan PDF, gambar, Word, atau Excel.');
 if(!bytes.length)throw Error('Berkas kosong.');
 if(bytes.length>40*1024*1024)throw Error('Ukuran berkas maksimal 40 MB.');
 const starts=(signature:number[])=>signature.every((value,i)=>bytes[i]===value);
 const ascii=(start:number,length:number)=>String.fromCharCode(...bytes.subarray(start,start+length));
 let valid=false;
 switch(ext){
  case 'pdf': valid=ascii(0,5)==='%PDF-';break;
  case 'png': valid=starts([137,80,78,71,13,10,26,10]);break;
  case 'jpg':case 'jpeg':valid=starts([255,216,255]);break;
  case 'gif':valid=['GIF87a','GIF89a'].includes(ascii(0,6));break;
  case 'webp':valid=ascii(0,4)==='RIFF'&&ascii(8,4)==='WEBP';break;
  case 'doc':case 'xls':valid=starts([208,207,17,224,161,177,26,225]);break;
  case 'docx':case 'xlsx':checkedOfficeZip(bytes,ext);valid=true;break;
  case 'csv':valid=!bytes.includes(0)&&!/^\s*</.test(new TextDecoder().decode(bytes.subarray(0,1024)));break;
 }
 if(!valid)throw Error('Isi berkas tidak sesuai dengan ekstensi. Pilih berkas asli dengan format yang didukung.');
 return mime;
}

export async function checkedUpload(file:File):Promise<File>{
 const bytes=await file.arrayBuffer(),mime=checkedFileMime(file.name,bytes);
 return new File([bytes],file.name,{type:mime,lastModified:file.lastModified});
}
