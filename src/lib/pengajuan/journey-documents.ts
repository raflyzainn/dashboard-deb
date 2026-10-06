import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { buildMergeData, renderDocx, MERGE_KINDS, TEMPLATE_FILE, DOCX_MIME, numberWords, dateWords, type MergeKind } from '../merge';
import { mergeInput, PF_PKS_PENDING } from './journey';

// Docxtemplater's existing XML helpers work in both Node and the browser.
const { str2xml, xml2str } = (Docxtemplater as unknown as {
 DocUtils: { str2xml(text:string):Document; xml2str(node:Node):string }
}).DocUtils;

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
  const paragraph=(text:string,align='left',bold=false,after=140)=>`<w:p><w:pPr><w:jc w:val="${align}"/><w:spacing w:after="${after}" w:line="276" w:lineRule="auto"/><w:tabs><w:tab w:val="left" w:pos="2400"/><w:tab w:val="left" w:pos="5000"/></w:tabs></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/>${bold?'<w:b/>':''}<w:color w:val="000000"/></w:rPr>${text.split('\t').map((part,i)=>(i?'<w:tab/>':'')+`<w:t xml:space="preserve">${escape(part)}</w:t>`).join('')}</w:r></w:p>`;
  const table=(rows:string[][],widths:number[])=>`<w:tbl><w:tblPr><w:tblW w:w="9072" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders>${['top','left','bottom','right','insideH','insideV'].map(side=>`<w:${side} w:val="nil"/>`).join('')}</w:tblBorders></w:tblPr><w:tblGrid>${widths.map(width=>`<w:gridCol w:w="${width}"/>`).join('')}</w:tblGrid>${rows.map(row=>'<w:tr>'+row.map((text,i)=>`<w:tc><w:tcPr><w:tcW w:w="${widths[i]}" w:type="dxa"/></w:tcPr>${paragraph(text,i===0?'left':widths.length===2?'center':'left',false,120)}</w:tc>`).join('')+'</w:tr>').join('')}</w:tbl>`;
  const identity=(rows:string[][])=>table(rows.map(([label,value])=>[label,':',value]),[2100,240,6732]);
  const content=paragraph('SURAT KUASA PENERIMAAN DANA','center',true,320)
   +paragraph('Yang bertanda tangan di bawah ini:')
   +identity([['Nama','{pemberiKuasa}'],['Jabatan','{jabatanPenandatangan}'],['Perguruan tinggi','{namaPerguruanTinggi}']])
   +paragraph('Dalam hal ini mewakili perguruan tinggi tersebut, memberikan kuasa kepada:', 'both',false,200)
   +identity([['Nama','{penerimaKuasa}']])
   +paragraph('Untuk menerima dana bantuan program {judulProgram} dari Pertamina Foundation melalui rekening berikut:', 'both',false,200)
   +identity([['Nama bank','{namaBank}'],['Nomor rekening','{nomorRekening}'],['Atas nama','{namaPemilikRekening}']])
   +paragraph('Demikian surat kuasa ini dibuat untuk digunakan sebagai kelengkapan pengajuan pencairan dana program tersebut.', 'both',false,280)
   +paragraph('{tempatSurat}, {tanggalKuasa}','right',false,200)
   +table([['Penerima kuasa','Pemberi kuasa'],['','Meterai Rp10.000'],['',''],['',''],['{penerimaKuasa}','{pemberiKuasa}']],[4536,4536]);
  const xml=zip.file('word/document.xml')!.asText();
  // A4, 2.5 cm margins. Do not inherit the sample letterhead/header from permohonan.
  const section='<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1417" w:right="1417" w:bottom="1417" w:left="1417" w:header="708" w:footer="708"/></w:sectPr>';
  zip.file('word/document.xml',xml.replace(/<w:body\b[^>]*>[\s\S]*<\/w:body>/,'<w:body>'+content+section+'</w:body>'));

 }
 // The standard templates contain fixed 70/30 clauses. Update whole paragraphs so split Word runs remain valid.
 const xml=str2xml(zip.file('word/document.xml')!.asText());
 const ns='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
 for(const p of Array.from(xml.getElementsByTagNameNS(ns,'p'))){
  const nodes=Array.from(p.getElementsByTagNameNS(ns,'t')),text=nodes.map(n=>n.textContent||'').join('');
  let next=text;
  if(r.journey.fields.jenisRekening==='kampus'&&/surat\s+kuasa/i.test(text)){
   if(kind==='pks'&&/^Surat\s+Kuasa\s*\(copy\);?$/i.test(text.trim())){p.parentNode?.removeChild(p);continue;}
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
 zip.file('word/document.xml',xml2str(xml));
 if(!draft)for(const name of Object.keys(zip.files).filter(name=>/^word\/header\d+\.xml$/.test(name))){
  const header=str2xml(zip.file(name)!.asText());
  for(const text of Array.from(header.getElementsByTagNameNS(ns,'t')))if(text.textContent?.trim()==='DRAFT')text.textContent='';
  zip.file(name,xml2str(header));
 }
 const output=new PizZip(renderDocx(zip.generate({type:'arraybuffer'}),{...buildMergeData(input),pemberiKuasa:r.journey.fields.pemberiKuasa,penerimaKuasa:r.journey.fields.penerimaKuasa,tanggalKuasa:dateWords(r.journey.fields.tanggalKuasa)}));
 let body=output.file('word/document.xml')!.asText();
 let heading=draft?'<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="B45309"/></w:rPr><w:t>DRAF</w:t></w:r></w:p>':'';
 if(kind!=='pks'&&kop){
  const ext=kop.mime==='image/png'?'png':'jpg',scale=Math.min(5486400/Math.max(1,kop.width),914400/Math.max(1,kop.height)),width=Math.round(kop.width*scale),height=Math.round(kop.height*scale);
  output.file('word/media/journey-kop.'+ext,kop.bytes);
  const relPath='word/_rels/document.xml.rels';
  let rels=output.file(relPath)?.asText()||'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
  rels=rels.replace('</Relationships>',`<Relationship Id="rIdJourneyKop" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/journey-kop.${ext}"/></Relationships>`);output.file(relPath,rels);
  let types=output.file('[Content_Types].xml')!.asText();
  if(!types.includes(`Extension="${ext}"`))types=types.replace('</Types>',`<Default Extension="${ext}" ContentType="${kop.mime}"/></Types>`);output.file('[Content_Types].xml',types);
  heading=`<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="240"/></w:pPr><w:r><w:drawing><wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><wp:extent cx="${width}" cy="${height}"/><wp:docPr id="98765" name="Kop surat ${escape(c.name)}"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="98765" name="Kop surat"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:embed="rIdJourneyKop"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${width}" cy="${height}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`+heading;
 }
 body=body.replace(/(<w:body[^>]*>)/,'$1'+heading);output.file('word/document.xml',body);
 return new Blob([output.generate({type:'arraybuffer'})],{type:DOCX_MIME});
}

/** Remove draft labels from the approved stored document; never merge current settings into it. */
export function finalJourneyDocx(bytes: Uint8Array) {
 const zip=new PizZip(bytes),ns='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
 for(const name of Object.keys(zip.files).filter(n=>/^word\/(document|header\d+)\.xml$/.test(n))){
  const xml=str2xml(zip.file(name)!.asText());
  for(const text of Array.from(xml.getElementsByTagNameNS(ns,'t'))){
   if(['DRAFT','DRAF'].includes(text.textContent?.trim()||''))text.textContent='';
   else if(text.textContent?.startsWith('DRAF \u2014 '))text.textContent=text.textContent.slice(7);
  }
  zip.file(name,xml2str(xml));
 }
 return new Blob([zip.generate({type:'arraybuffer'})],{type:DOCX_MIME});
}

/** Clean only system environment headings in downloadable copies; retain draft status and user content. */
export function withoutJourneyLabels(bytes:Uint8Array) {
 const zip=new PizZip(bytes),ns='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
 for(const name of Object.keys(zip.files).filter(n=>/^word\/(document|header\d+)\.xml$/.test(n))){
  const xml=str2xml(zip.file(name)!.asText());
  for(const p of Array.from(xml.getElementsByTagNameNS(ns,'p'))){
   const nodes=Array.from(p.getElementsByTagNameNS(ns,'t')),text=nodes.map(n=>n.textContent||'').join('').trim();
   if(/^(DRAF\s*—\s*)?(PENGAJUAN LOKAL|SIMULASI DATA DUMMY)$/.test(text)){
    nodes.forEach((n,i)=>n.textContent=i===0&&text.startsWith('DRAF')?'DRAF':'');
   }
  }
  zip.file(name,xml2str(xml));
 }
 return zip.generate({type:'uint8array'});
}

/** Replace legacy simulated PF numbers in a preview/download copy, keeping the stored version intact. */
export function pendingPfJourneyDocx(bytes:Uint8Array) {
 const zip=new PizZip(bytes),ns='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
 for(const name of Object.keys(zip.files).filter(n=>/^word\/(document|header\d+)\.xml$/.test(n))){
  const xml=str2xml(zip.file(name)!.asText());
  for(const p of Array.from(xml.getElementsByTagNameNS(ns,'p'))){
   const nodes=Array.from(p.getElementsByTagNameNS(ns,'t')),text=nodes.map(n=>n.textContent||'').join('');
   const next=text.replace(/PKS-PF\/DUMMY\/2026\/[A-Za-z0-9_-]+/g,PF_PKS_PENDING);
   if(next!==text&&nodes.length){nodes[0].textContent=next;nodes.slice(1).forEach(n=>n.textContent='');}
  }
  zip.file(name,xml2str(xml));
 }
 return new Blob([zip.generate({type:'arraybuffer'})],{type:DOCX_MIME});
}
