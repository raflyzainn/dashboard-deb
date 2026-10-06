import { BUDGET, LIMIT, validQuantity } from '../../../mockups/rab/model';
import { buildMergeData, missingFor, templateTags, MERGE_KINDS, type MergeKind } from '../merge';
import { LOCATION_FIELDS, programLocationErrors } from './location';
import { canRevise, openRevisions, revisionPending, type RevisionRequest, type EditRequest } from './revisions';

export const sections = ['sk', 'program', 'rab', 'administrasi', 'pks', 'ringkasan'] as const;
export type Section = typeof sections[number];
export const sectionLabels = ['SK', 'Data Program', 'Pengajuan RAB', 'Administrasi', 'PKS', 'Ringkasan'];
export const PKS_DATE = '2026-06-17';
export const LETTER_MIN_DATE = '2026-06-18';
export const documentGuides: Record<string, string[]> = {
 pks:['Siapkan dua rangkap PKS dengan isi yang sama.','Gunakan satu perwakilan kampus yang berwenang; nama dan jabatan harus konsisten.','Lengkapi tanda tangan para pihak dan meterai pada tempat yang ditentukan template.','Pastikan tanggal PKS 17 Juni 2026 dan lampiran sesuai jenis rekening.'],
 permohonan:['Periksa kop, nomor surat, identitas kampus, dan nominal Termin 1.','Tanggal surat harus setelah 17 Juni 2026.','Lengkapi tanda tangan serta lampiran RAB, invoice, kuitansi, rekening, dan PKS.'],
 invois:['Periksa nomor invoice, nominal Termin 1, serta nama bank, rekening, dan pemilik.','Tanggal invoice harus setelah 17 Juni 2026.','Lengkapi tanda tangan dan meterai pada tempat yang ditentukan template.'],
 kuitansi:['Periksa nomor kuitansi, nominal dan terbilang yang mengikuti Termin 1.','Tanggal kuitansi harus setelah 17 Juni 2026.','Lengkapi tanda tangan dan meterai pada tempat yang ditentukan template.'],
 surat_kuasa:['Unduh template, periksa pemberi kuasa dan penerima yang sama dengan pemilik rekening.','Lengkapi tanggal setelah 17 Juni 2026, tanda tangan, dan meterai pada tempat yang tersedia.','Unggah seluruh halaman hasil tanda tangan yang jelas dan terbaca.']
};
export const validDate=(value:string)=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
export const kuasaSource=(fields:Record<string,string>)=>JSON.stringify(['pemberiKuasa','penerimaKuasa','penandatanganNama','penandatanganJabatan','namaBank','nomorRekening','namaPemilik','judulProgram','tempatTandaTangan','tanggalKuasa'].map(key=>fields[key]||''));
export const requiresKuasaUpdate=(j:any)=>j?.fields.jenisRekening==='kuasa'&&j.files.kuasa?.source!==kuasaSource(j.fields);
export interface Journey {
 status: 'draf' | 'menunggu' | 'revisi' | 'selesai'; lastSection: Section;
 fields: Record<string, string>; files: Record<string, { id: string; name: string; mime: string; width?: number; height?: number; source?: string }>;
 revision: number; history: any[];
 revisionRequests?: RevisionRequest[]; documentRevisions?: Record<string,number>; revisionDocuments?: string[];
 editRequests?: EditRequest[];
 pfRequestedAt?: string;
 pf?: {nomorPksPf:string}; checklist?: Record<string,boolean>;
}
export function ensureJourney(c: any, r: any): Journey {
 const journey:Journey = r.journey ??= {status:'draf', lastSection:'sk', revision:1, history:[], files:{}, fields:{
  judulProgram:c.program?.programTitle || c.program?.description || '', alamat:c.program?.address || '',
  desa:c.program?.village || c.program?.replicationVillage || '', kecamatan:c.program?.district || '', kabupaten:c.program?.regency || c.city || '',
  mentor:c.program?.mentor || '', koordinator:c.program?.coordinator || '',
  jenisRekening:'kampus', namaBank:'', nomorRekening:'', namaPemilik:'', pemberiKuasa:'', penerimaKuasa:'',
  penandatanganNama:'', penandatanganJabatan:'', tempatTandaTangan:c.city || '',
  nomorSuratPermohonan:'', tanggalSuratPermohonan:'', nomorInvois:'', tanggalInvois:'', nomorKuitansi:'', tanggalKuitansi:'',
  nomorPksKampus:'', tanggalPerjanjian:PKS_DATE, tanggalKuasa:''
 }};
 journey.fields.tanggalKuasa??='';
 // Add fields lazily without replacing an existing draft or guessing codes from old names.
 for(const field of Object.values(LOCATION_FIELDS))journey.fields[field]??='';
 journey.fields.lokasiAlamatLengkap??='';
 journey.pf??={nomorPksPf:c.award?'': 'PKS-PF/DUMMY/2026/'+c.id};
 journey.checklist??={};
 journey.documentRevisions??=Object.fromEntries(MERGE_KINDS.map(kind=>[kind,journey.revision]));
 return journey;
}
export function mergeInput(c: any, r: any, settings: any) {
 const f = ensureJourney(c,r).fields;
 return {campus:{...c, code:c.acronym || c.id, program:{...c.program, address:f.alamat,village:f.desa,district:f.kecamatan,regency:f.kabupaten,...(f.lokasiProvinsiId?{province:f.lokasiProvinsi,postalCode:f.lokasiKodePos}:{}),mentor:f.mentor,coordinator:f.koordinator}},
  award:{skNumber:'SK-DUMMY/2026/'+c.id,skDate:'2026-06-01',amountSen:BUDGET,...c.award,programTitle:f.judulProgram,programYear:c.programYear}, settings,
  disbursement:{requestedSen:r.versions.at(-1)?.term1Sen || 0,properties:{...f,nomorPksPf:r.journey.pf?.nomorPksPf||(c.award?'':'PKS-PF/DUMMY/2026/'+c.id)}},
  rekening:{namaBank:f.namaBank,nomorRekening:f.nomorRekening,namaPemilik:[f.namaPemilik]}};
}
export const settingsSource=(settings:any)=>JSON.stringify(['pfSignatoryName','pfSignatoryTitle','agreementStart','agreementEnd','reportDeadline'].map(k=>settings?.[k]||''));
export function validateJourney(c:any,r:any,settings:any,tags:Record<MergeKind,string[]>) {
 const j=ensureJourney(c,r),v=r.versions.at(-1),f=j.fields,BUDGET=c.award?.amountSen??2000000000,LIMIT=Math.floor(BUDGET*0.7);
 const missing=Object.fromEntries(MERGE_KINDS.map(k=>[k,missingFor(tags[k],buildMergeData(mergeInput(c,r,settings)))]));
 const blockers:{section:Section;text:string}[]=[];
 const warned=new Set<string>();
 const warn=(section:Section,key:string,text:string)=>{if(!warned.has(key)){warned.add(key);blockers.push({section,text});}};
 const require=(section:Section,key:string,label:string)=>{if(!f[key]?.trim())warn(section,key,label+' belum diisi.');};
 for(const [key,label] of [['judulProgram','Nama kegiatan'],['alamat','Alamat kampus'],['desa','Desa program'],['kabupaten','Kabupaten/kota program'],['mentor','Mentor'],['koordinator','Koordinator']])require('program',key,label);
 if(canRevise(j,'program')&&!r.payment?.paidAt)for(const text of programLocationErrors(f,true))warn('program',text,text);
 if(!v)blockers.push({section:'rab',text:'Unggah RAB 100% terlebih dahulu.'});
 else if(v.totalSen!==BUDGET || v.term1Sen<=0 || v.term1Sen>LIMIT || v.term1Sen+v.term2Sen!==v.totalSen || !v.lines.some((l:any)=>l.level===4) || v.lines.some((l:any)=>l.level===4&&!validQuantity(l.flags?.term1Volume,l.volume)))blockers.push({section:'rab',text:'Periksa total RAB dan pembagian jumlah: Termin 1 maksimal 70% SK.'});
 if(v&&typeof v.campusStep==='number'&&v.campusStep<3)blockers.push({section:'rab',text:'Selesaikan pemeriksaan RAB 100%, Termin 1, dan Termin 2 melalui tombol Lanjut.'});
 for(const [key,label] of [['namaBank','Nama bank'],['nomorRekening','Nomor rekening'],['namaPemilik','Pemilik rekening'],['penandatanganNama','Penandatangan'],['penandatanganJabatan','Jabatan penandatangan'],['tempatTandaTangan','Tempat surat']])require('administrasi',key,label);
 if(f.nomorRekening && !/^\d{5,40}$/.test(f.nomorRekening))blockers.push({section:'administrasi',text:'Nomor rekening harus berisi 5–40 angka.'});
 for(const [key,label] of [['rekening','Foto Buku Rekening'],['kop','Kop surat']])if(!j.files[key])blockers.push({section:'administrasi',text:label+' belum diunggah.'});
 if(f.jenisRekening==='kuasa'){
  require('administrasi','pemberiKuasa','Pemberi kuasa');require('administrasi','penerimaKuasa','Penerima kuasa');
  if(!j.files.kuasa)blockers.push({section:'administrasi',text:'Surat kuasa wajib diunggah untuk rekening pihak yang diberi kuasa.'});
  else if(!['menunggu','selesai'].includes(j.status)&&j.files.kuasa.source!==kuasaSource(f))blockers.push({section:'administrasi',text:'Data surat kuasa berubah. Unduh template terbaru dan unggah ulang hasil tanda tangan.'});
  if(f.penerimaKuasa.trim()&&f.namaPemilik.trim()&&f.penerimaKuasa.trim().toLowerCase()!==f.namaPemilik.trim().toLowerCase())blockers.push({section:'administrasi',text:'Penerima kuasa harus sama dengan pemilik rekening.'});
  if(f.pemberiKuasa.trim()&&f.penandatanganNama.trim()&&f.pemberiKuasa.trim().toLowerCase()!==f.penandatanganNama.trim().toLowerCase())blockers.push({section:'administrasi',text:'Pemberi kuasa harus sama dengan penandatangan kampus.'});
 }
 if(!['menunggu','selesai'].includes(j.status)){
  if(f.tanggalPerjanjian!==PKS_DATE)warn('pks','tanggalPerjanjian','Tanggal PKS ditetapkan 17 Juni 2026. Simpan draf untuk menggunakan tanggal ini.');
  for(const [key,label] of [['tanggalSuratPermohonan','Surat permohonan'],['tanggalInvois','Invoice'],['tanggalKuitansi','Kuitansi'],...(f.jenisRekening==='kuasa'?[['tanggalKuasa','Surat kuasa']]:[])]){
   if(!validDate(f[key]||''))warn('administrasi',key,label+': isi tanggal yang valid.');
   else if(f[key]<=PKS_DATE)warn('administrasi',key,label+': tanggal harus setelah 17 Juni 2026.');
  }
 }
 for(const [key,label] of [['nomorSuratPermohonan','Nomor permohonan'],['nomorInvois','Nomor invoice'],['nomorKuitansi','Nomor kuitansi'],['nomorPksKampus','Nomor PKS kampus']])require(key==='nomorPksKampus'?'pks':'administrasi',key,label);
 // Template aliases refer to the same form field; calculated values use their source warnings.
 const aliases:Record<string,string>={alamatPerguruanTinggi:'alamat',namaMentor:'mentor',namaKoordinator:'koordinator',namaPenandatangan:'penandatanganNama',jabatanPenandatangan:'penandatanganJabatan',namaPemilikRekening:'namaPemilik',tempatSurat:'tempatTandaTangan',hariPerjanjian:'tanggalPerjanjian',tanggalPerjanjianHuruf:'tanggalPerjanjian',bulanPerjanjian:'tanggalPerjanjian',tahunPerjanjianHuruf:'tanggalPerjanjian',tanggalPerjanjianAngka:'tanggalPerjanjian'};
 for(const kind of MERGE_KINDS)for(const m of missing[kind]){
  const base=m.key.replace(/(Kapital|Kecil|Terbilang)$/,'');
  const key=aliases[base]||base;
  if(m.key==='lokasiProgram'&&(warned.has('desa')||warned.has('kabupaten')))continue;
  if(m.source==='RAB'&&blockers.some(b=>b.section==='rab'))continue;
  const section:Section=m.source==='RAB'?'rab':m.source==='Profil DEB'?'program':['nomorPksKampus','nomorPksPf','tanggalPerjanjian'].includes(key)?'pks':'administrasi';
  warn(section,key,m.label+' belum diisi.');
 }
 return {missing,blockers};
}
export function journeyView(c:any,r:any,settings:any,templates:Record<MergeKind,Uint8Array>) {
 const j=ensureJourney(c,r),v=r.versions.at(-1),BUDGET=c.award?.amountSen??2000000000,LIMIT=Math.floor(BUDGET*0.7);
 const tags=Object.fromEntries(MERGE_KINDS.map(k=>[k,templateTags(templates[k])])) as Record<MergeKind,string[]>;
 const {missing,blockers}=validateJourney(c,r,settings,tags);
 const validation={campus:{id:c.id,name:c.name,acronym:c.acronym,programYear:c.programYear,award:c.award},settings,tags,
  version:v?{totalSen:v.totalSen,term1Sen:v.term1Sen,term2Sen:v.term2Sen,campusStep:v.campusStep,lines:v.lines.map((l:any)=>({level:l.level,volume:l.volume,flags:{term1Volume:l.flags?.term1Volume}}))}:null};
 const stale=MERGE_KINDS.filter(k=>{const d=r.documents.find((d:any)=>d.kind===k);return !d?.versions.some((v:any)=>(v.id===d.currentVersionId||d.signedReceived)&&v.origin==='generated'&&v.journeyRevision===j.documentRevisions![k]&&(j.status==='selesai'||v.generation?.settingsSource===settingsSource(settings)));});
 return {validation,journey:j,pf:{nomorPksPf:j.pf?.nomorPksPf||(c.award?'':'PKS-PF/DUMMY/2026/'+c.id),name:settings.pfSignatoryName,title:settings.pfSignatoryTitle},campus:{id:c.id,name:c.name},summary:{amountSen:BUDGET,limitSen:LIMIT,skNumber:c.award?.skNumber||'SK-DUMMY/2026/'+c.id},rab:v?{id:v.id,number:v.number,totalSen:v.totalSen,term1Sen:v.term1Sen,term2Sen:v.term2Sen,status:v.status}:null,missing,blockers,stale,
  revisionBlockers:[...new Set([...openRevisions(j).filter(request=>revisionPending(r,request).length).map(request=>request.kind),...r.documents.filter((d:any)=>d.status==='perlu_revisi'&&!(d.kind==='surat_kuasa'&&j.fields.jenisRekening==='kampus')&&!openRevisions(j).some(request=>request.kind===d.kind||request.scopes.includes('rab')&&['rab_penuh','rab','rab_tahap2'].includes(d.kind))).map((d:any)=>d.kind)])],
  documents:r.documents.map((d:any)=>({kind:d.kind,status:d.status,signedReceived:d.signedReceived,notes:d.reviews.filter((n:any)=>n.decision==='perlu_revisi'),versions:d.versions})),paid:!!r.payment.paidAt};
}
export function touchJourney(c:any,r:any,kinds:readonly string[]=MERGE_KINDS) {
 const j=ensureJourney(c,r);j.revision++;
 if(j.status==='revisi')j.revisionDocuments=[...new Set([...(j.revisionDocuments||[]),...kinds])];
 for(const kind of kinds){j.documentRevisions![kind]=j.revision;for(const key of Object.keys(j.checklist!))if(key.startsWith(kind+'-'))delete j.checklist![key];}
 if(j.status==='selesai')j.status='draf';
 for(const d of r.documents)if(kinds.includes(d.kind)){
  if(d.status!=='perlu_revisi')d.status='belum_ada';d.signedReceived=false;d.originalReceived=false;
 }
}

// Compare the values actually used by each template rather than invalidating every letter.
export function changedLetters(c:any,r:any,settings:any,templates:Record<MergeKind,Uint8Array>,before:Record<string,string>):MergeKind[] {
 const current=r.journey.fields;
 const prior=buildMergeData(mergeInput(c,{...r,journey:{...r.journey,fields:before}},settings));
 const next=buildMergeData(mergeInput(c,r,settings));
 return MERGE_KINDS.filter(kind=>templateTags(templates[kind]).some(key=>prior[key as keyof typeof prior]!==next[key as keyof typeof next])||before.jenisRekening!==current.jenisRekening&&['pks','permohonan'].includes(kind));
}
