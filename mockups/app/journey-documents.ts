import PizZip from 'pizzip';
import { buildMergeData, renderDocx, MERGE_KINDS, TEMPLATE_FILE, DOCX_MIME, numberWords, dateWords, type MergeKind } from '../../src/lib/merge';
import { mergeInput } from './journey';

let cached: Promise<Record<MergeKind,Uint8Array>> | undefined;
export function journeyTemplates() {
 return cached ??= Promise.all(MERGE_KINDS.map(async kind=>{
  const response=await fetch('/templat/'+TEMPLATE_FILE[kind]);
  if(!response.ok)throw Error('Template '+kind+' belum tersedia.');
  return [kind,new Uint8Array(await response.arrayBuffer())] as const;
 })).then(entries=>Object.fromEntries(entries) as Record<MergeKind,Uint8Array>).catch(error=>{cached=undefined;throw error;});
}
const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
export function journeyDocx(kind:MergeKind|'surat_kuasa',c:any,r:any,settings:any,templates:Record<MergeKind,Uint8Array>,kop?:{bytes:Uint8Array;width:number;height:number;mime:string},draft=true) {
 const input=mergeInput(c,r,settings),percent=Math.round(input.disbursement.requestedSen/input.award.amountSen*10000)/100;
 const zip=new PizZip(templates[kind==='surat_kuasa'?'permohonan':kind]);
 if(kind==='surat_kuasa'){
  const paragraphs=['SURAT KUASA PENERIMAAN DANA','Contoh untuk simulasi pengajuan DEB','Yang bertanda tangan di bawah ini:','Nama pemberi kuasa: {pemberiKuasa}','Jabatan: {jabatanPenandatangan}','Perguruan tinggi: {namaPerguruanTinggi}','Memberikan kuasa kepada:','Nama penerima kuasa: {penerimaKuasa}','Untuk menerima dana program {judulProgram} melalui rekening berikut:','Bank: {namaBank}','Nomor rekening: {nomorRekening}','Nama pemilik: {namaPemilikRekening}','Surat kuasa ini digunakan sebagai kelengkapan pengajuan pencairan program tersebut.','{tempatSurat}, {tanggalKuasa}','Pemberi kuasa                         Penerima kuasa','(Meterai sesuai ketentuan template)','', '', '{pemberiKuasa}                         {penerimaKuasa}'];
  const xml=zip.file('word/document.xml')!.asText();
  const section=xml.match(/<w:sectPr\b[\s\S]*?<\/w:sectPr>/)?.[0]||'';
  zip.file('word/document.xml',xml.replace(/<w:body\b[^>]*>[\s\S]*<\/w:body>/,'<w:body>'+paragraphs.map(text=>`<w:p><w:pPr><w:spacing w:after="140"/></w:pPr><w:r><w:t xml:space="preserve">${escape(text)}</w:t></w:r></w:p>`).join('')+section+'</w:body>'));
 }
 // The standard templates contain fixed 70/30 clauses. Update whole paragraphs so split Word runs remain valid.
 const parser=new DOMParser(),xml=parser.parseFromString(zip.file('word/document.xml')!.asText(),'application/xml');
 const ns='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
 for(const p of Array.from(xml.getElementsByTagNameNS(ns,'p'))){
  const nodes=Array.from(p.getElementsByTagNameNS(ns,'t')),text=nodes.map(n=>n.textContent||'').join('');
  let next=text;
  if(r.journey.fields.jenisRekening==='kampus'&&/surat\s+kuasa/i.test(text)){
   if(kind==='pks'&&/^Surat\s+Kuasa\s*\(copy\);?$/i.test(text.trim())){p.remove();continue;}
   if(kind==='permohonan')next=next.replace(/Copy\s+Surat\s+Kuasa\s+dan\s+/i,'Copy ');
  }
  next=next.replace(/\b(70|30)%(\s*\((?:tujuh puluh|tiga puluh) persen\))?/gi,(_match,original,withWords)=>{
   const value=original==='70'?percent:Math.round((100-percent)*100)/100;
   const display=String(value).replace('.',','),words=Number.isInteger(value)?numberWords(value).toLowerCase():display;
   return `${display}%${withWords?` (${words} persen)`:''}`;
  });
  next=next.replace(/2025\/2026|\b202[45]\b/g,input.award.skDate.slice(0,4));
  if(next!==text&&nodes.length){nodes[0].textContent=next;nodes.slice(1).forEach(n=>n.textContent='');}
 }
 zip.file('word/document.xml',new XMLSerializer().serializeToString(xml));
 if(!draft)for(const name of Object.keys(zip.files).filter(name=>/^word\/header\d+\.xml$/.test(name))){
  const header=parser.parseFromString(zip.file(name)!.asText(),'application/xml');
  for(const text of Array.from(header.getElementsByTagNameNS(ns,'t')))if(text.textContent?.trim()==='DRAFT')text.textContent='';
  zip.file(name,new XMLSerializer().serializeToString(header));
 }
 const output=new PizZip(renderDocx(zip.generate({type:'uint8array'}),{...buildMergeData(input),pemberiKuasa:r.journey.fields.pemberiKuasa,penerimaKuasa:r.journey.fields.penerimaKuasa,tanggalKuasa:dateWords(r.journey.fields.tanggalKuasa)}));
 let body=output.file('word/document.xml')!.asText();
 let heading=`<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="${draft?'B45309':'0066B2'}"/></w:rPr><w:t>${draft?'DRAF — ':''}SIMULASI DATA DUMMY</w:t></w:r></w:p>`;
 if(kind!=='pks'&&kop){
  const ext=kop.mime==='image/png'?'png':'jpg',width=5486400,height=Math.round(width*kop.height/kop.width);
  output.file('word/media/journey-kop.'+ext,kop.bytes);
  const relPath='word/_rels/document.xml.rels';
  let rels=output.file(relPath)?.asText()||'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
  rels=rels.replace('</Relationships>',`<Relationship Id="rIdJourneyKop" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/journey-kop.${ext}"/></Relationships>`);output.file(relPath,rels);
  let types=output.file('[Content_Types].xml')!.asText();
  if(!types.includes(`Extension="${ext}"`))types=types.replace('</Types>',`<Default Extension="${ext}" ContentType="${kop.mime}"/></Types>`);output.file('[Content_Types].xml',types);
  heading=`<w:p><w:r><w:drawing><wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><wp:extent cx="${width}" cy="${height}"/><wp:docPr id="98765" name="Kop surat ${escape(c.name)}"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="98765" name="Kop surat"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:embed="rIdJourneyKop"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${width}" cy="${height}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`+heading;
 }
 body=body.replace(/(<w:body[^>]*>)/,'$1'+heading);output.file('word/document.xml',body);
 return new Blob([output.generate({type:'uint8array'})],{type:DOCX_MIME});
}
