import { LOCATION_FIELDS } from './location';

export const REVISION_SCOPES = {
 program: { label: 'Data Program', section: 'program', fields: ['judulProgram','alamat','mentor','koordinator',...Object.values(LOCATION_FIELDS),'lokasiAlamatLengkap'], files: [] },
 rab: { label: 'RAB', section: 'rab', fields: [], files: [] },
 administrasi: { label: 'Administrasi', section: 'administrasi', fields: ['jenisRekening','namaBank','nomorRekening','namaPemilik','pemberiKuasa','penerimaKuasa','tanggalKuasa','penandatanganNama','penandatanganJabatan','tempatTandaTangan','nomorSuratPermohonan','tanggalSuratPermohonan','nomorInvois','tanggalInvois','nomorKuitansi','tanggalKuitansi'], files: ['rekening','kuasa','kop'] },
 pks: { label: 'PKS', section: 'pks', fields: ['nomorPksKampus'], files: [] },
 dokumen: { label: 'PKS', section: 'pks', fields: [], files: [] }
} satisfies Record<string,{label:string;section:string;fields:string[];files:string[]}>;
export type RevisionScope = keyof typeof REVISION_SCOPES;
export type EditableSection = 'program'|'rab'|'administrasi'|'pks';
export interface EditRequest {
 id:string; section:EditableSection; reason:string; actorName:string; created:string;
 status:'pending'|'approved'|'rejected'; decidedByName?:string; decidedAt?:string; decisionNote?:string;
}
export const editableSections:EditableSection[] = ['program','rab','administrasi','pks'];
export function editRequestStatus(j:any,row:string):string|null {
 const section=revisionSection(row) as EditableSection;
 const request=[...(j?.editRequests||[])].reverse().find((item:EditRequest)=>item.section===section);
 if(!request)return null;
 if(request.status==='pending')return 'Menunggu admin';
 if(j?.status==='revisi'&&canRevise(j,section))return 'Revisi dibuka';
 if(j?.status==='menunggu'&&j.revisionRequests?.some((item:RevisionRequest)=>item.status==='submitted'&&item.scopes.some((scope:RevisionScope)=>REVISION_SCOPES[scope]?.section===section)))return 'Menunggu PF';
 if(request.status==='rejected')return 'Ditolak · ajukan lagi';
 if(j?.status==='selesai'&&request.status==='approved')return 'Revisi selesai';
 return null;
}
export interface RevisionRequest {
 id: string; kind: string; scopes: RevisionScope[]; note: string; actorName: string; created: string;
 status: 'open'|'submitted'|'resolved'; baseline: Record<string,string>;
}
export const openRevisions = (j:any):RevisionRequest[] => (j?.revisionRequests || []).filter((r:RevisionRequest)=>r.status==='open');
export const revisionSection = (row:string) => ['rab_penuh','rab','rab_tahap2'].includes(row)?'rab':['rekening','surat_kuasa','permohonan','invois','kuitansi','administrasi','penandatangan','surat'].includes(row)?'administrasi':row;
export const canRevise = (j:any,scope:RevisionScope) => Boolean(REVISION_SCOPES[scope]) && (j?.status==='draf' || j?.status==='revisi' && openRevisions(j).some(r=>r.scopes.some(key=>REVISION_SCOPES[key]?.section===REVISION_SCOPES[scope].section)));
export const canEditField = (j:any,key:string) => j?.status==='draf' || Object.entries(REVISION_SCOPES).some(([scope,value])=>(value.fields as string[]).includes(key)&&canRevise(j,scope as RevisionScope));
export const canUploadFile = (j:any,key:string) => j?.status==='draf' || Object.entries(REVISION_SCOPES).some(([scope,value])=>(value.files as string[]).includes(key)&&canRevise(j,scope as RevisionScope));
export function revisionScopes(input:unknown):RevisionScope[] {
 if(!Array.isArray(input)||!input.length||input.some(key=>typeof key!=='string'||!Object.hasOwn(REVISION_SCOPES,key)))throw Error('Bagian revisi tidak valid.');
 return [...new Set<RevisionScope>(input)];
}
export function revisionValue(r:any,scope:RevisionScope,kind:string):string {
 const group=REVISION_SCOPES[scope],j=r.journey;
 if(scope==='dokumen')return r.documents.find((d:any)=>d.kind===kind)?.currentVersionId||'';
 if(scope==='rab')return JSON.stringify(r.versions.at(-1)?.lines.map((l:any)=>[l.title,l.volume,l.unitPriceSen,l.term1Sen,l.flags?.term1Volume]))||'';
 return JSON.stringify([(group.fields as string[]).map(key=>j.fields[key]||''),(group.files as string[]).map(key=>j.files[key]?.id||'')]);
}
export function revisionPending(r:any,request:RevisionRequest) {
 return request.scopes.filter(scope=>revisionValue(r,scope,request.kind)===request.baseline[scope]);
}
