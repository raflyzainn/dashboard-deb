import { createHash } from 'node:crypto';
import type PocketBase from 'pocketbase';
import PizZip from 'pizzip';
import { DOCX_MIME, MERGE_KINDS, withVerificationFooter } from '../../merge';
import { finalJourneyDocx, withoutJourneyLabels } from '../../pengajuan/journey-documents';
import { qrPng, qrPngSide } from '../../qr';
import { atomic, StoreRecord } from './rest-store';
import { storage } from './r2';
import { mintCode, verificationUrl, verificationLine, type VerificationKind } from './verifikasi';
import { PreviewError } from './preview-error';

const hash=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
// ZIP timestamps can change when draft labels are removed. Compare all package content instead.
const contentHash=(bytes:Uint8Array)=>{
 const zip=new PizZip(bytes),digest=createHash('sha256');
 for(const name of Object.keys(zip.files).sort())if(!zip.files[name].dir){
  const entry=zip.file(name)!.asUint8Array();digest.update(JSON.stringify([name,entry.length]));digest.update(entry);
 }
 return digest.digest('hex');
};

/** Immutable downloadable representation. Original templates and stored source files stay intact. */
export async function verifyJourneyDownload(pb:PocketBase,settings:Record<string,string>,campusId:string,route:string,origin:string,blob:Blob,actor:{id:string;name:string}) {
 const match=route.match(/^documents\/([^/]+)\/versions\/([^/]+)(?:\/file)?$/);
 const kind=match?.[1]||route.match(/^(?:pengajuan\/dokumen|buat)\/([^/]+)$/)?.[1];
 if(blob.type!==DOCX_MIME||!MERGE_KINDS.includes(kind as any))return blob;
 const bytes=new Uint8Array(await blob.arrayBuffer()),sourceHash=contentHash(bytes),files=storage(settings);
 // Local QR must point to the frontend that served this document, including its active port.
 const publicSettings={...settings,DEB_PUBLIC_URL:origin};
 return atomic(pb,async store=>{
  const payment=store.records.get('disbursements')![0]?.data;
  const document=store.records.get('documents')!.find(d=>d.data.kind===kind)?.data;
  const versions=store.records.get('document_versions')!.filter(v=>v.data.document===document?.id&&v.data.origin==='generated').sort((a,b)=>a.data.number-b.data.number);
  const version=match?versions.find(v=>v.id===match[2]):versions.at(-1);
  // Uploaded scans keep their original bytes and are never labelled as system-generated.
  if(!version)return blob;
  const approved=!!version.data.generation?.final||(!match&&payment.submissionStatus==='selesai');
  const source=new Uint8Array(await(await files.get(version.data.r2Key)).arrayBuffer());
  const expected=approved?new Uint8Array(await finalJourneyDocx(source).arrayBuffer()):source;
  if(contentHash(expected)!==sourceHash)throw new PreviewError(409,'Dokumen berubah. Muat ulang pratinjau sebelum mengunduh.');
  const cacheId=hash(new TextEncoder().encode('pf-logo-2|'+version.id+'|'+approved+'|'+origin+'|'+sourceHash));
  const cached=version.data.generation?.verifiedFiles?.[cacheId];
  if(cached)return new Blob([await(await files.get(cached.key)).arrayBuffer()],{type:DOCX_MIME});
  const campus=store.records.get('campuses')![0].data;
  const code=await mintCode(pb,campus.acronym||campus.initials||campusId,1,kind as VerificationKind);
  const qr={scale:6,margin:4,pfLogo:true},url=verificationUrl(publicSettings,code);
  const stamped=withVerificationFooter(withoutJourneyLabels(bytes),{png:qrPng(url,qr),pngSide:qrPngSide(url,qr),code,line:verificationLine(publicSettings,code),issuer:'Diterbitkan website DEB'});
  const key=`journey/${campusId}/verification/${code}.docx`;
  await files.put(key,stamped,DOCX_MIME);
  const verification=new StoreRecord('verifications');
  Object.assign(verification.data,{code,campus:campusId,term:1,kind,documentVersion:version.id,sha256:hash(stamped),amountSen:Number(version.data.fields?.nominalSen||payment.requestedSen||0),label:'Pengajuan pencairan · '+(approved?'Disetujui':'Draf'),issuedBy:actor.id,issuedByName:actor.name});
  store.save(verification);
  version.set('generation',{...version.data.generation,verifiedFiles:{...version.data.generation?.verifiedFiles,[cacheId]:{code,key,approved}}});
  store.save(version);
  return new Blob([new Uint8Array(stamped).buffer],{type:DOCX_MIME});
 },{campuses:{filter:pb.filter('id = {:c}',{c:campusId})},disbursements:{filter:pb.filter('campus = {:c} && term = 1',{c:campusId})},documents:{filter:pb.filter('disbursement.campus = {:c} && disbursement.term = 1',{c:campusId})},document_versions:{filter:pb.filter('document.disbursement.campus = {:c} && document.disbursement.term = 1',{c:campusId})},verifications:null});
}
