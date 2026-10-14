import type PocketBase from 'pocketbase';
import { PreviewError } from './preview-error';

/**
 * Verification codes for documents the system issues (generated letters, PKS, the RAB print and the merged lampiran).
 * Every issued file carries a QR code on each page that opens /verifikasi/<code>, a public page without sign in.
 * The page shows only what a third party needs: campus, document, term, issue date, amount and the SHA-256 of the stored file.
 */
const opts = { requestKey: null } as const;
export type VerificationKind = 'pks' | 'permohonan' | 'invois' | 'kuitansi' | 'rab' | 'lampiran';
export const VERIFICATION_LABEL: Record<VerificationKind, string> = { pks: 'Perjanjian kerja sama (PKS)', permohonan: 'Surat permohonan pencairan dana', invois: 'Invois', kuitansi: 'Kuitansi', rab: 'RAB dan rencana realisasi', lampiran: 'Lampiran pencairan' };
const ABBR: Record<VerificationKind, string> = { pks: 'PKS', permohonan: 'PMH', invois: 'INV', kuitansi: 'KWT', rab: 'RAB', lampiran: 'LMP' };
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const CODE_PATTERN = /^DEB-[A-Z0-9]{2,12}-T\d-[A-Z]{3}-[A-Z0-9]{4}$/;
/** Code printed on previews before a document is saved; never stored. */
export const SAMPLE_CODE = 'DEB-CONTOH-T1-XXX-0000';
export const ISSUER_LINE = 'Dokumen diterbitkan sistem MonevDEB';

export function randomPart(length = 4) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, b => ALPHABET[b % ALPHABET.length]).join('');
}
export const publicHost = (settings: Record<string, string>) => (settings.DEB_PUBLIC_URL || '').replace(/^https?:\/\//, '').replace(/\/$/, '');
export const verificationUrl = (settings: Record<string, string>, code: string) => `${(settings.DEB_PUBLIC_URL || '').replace(/\/$/, '')}/verifikasi/${code}`;
/** The short line printed under the QR: host and code, no protocol. */
export const verificationLine = (settings: Record<string, string>, code: string) => `${publicHost(settings)}/verifikasi/${code}`;

export async function mintCode(pb: PocketBase, campusCode: string, term: number, kind: VerificationKind) {
  const campus = campusCode.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12) || 'KAMPUS';
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = `DEB-${campus}-T${term}-${ABBR[kind]}-${randomPart()}`;
    const found = await pb.collection('verifications').getList(1, 1, { filter: pb.filter('code = {:code}', { code }), fields: 'id', ...opts });
    if (!found.totalItems) return code;
  }
  throw new PreviewError(500, 'Kode verifikasi tidak dapat dibuat. Coba lagi.');
}

export interface NewVerification { code: string; campus: string; term: number; kind: VerificationKind; documentVersion?: string; attachment?: string; sha256: string; amountSen: number; label: string; issuedBy?: string; issuedByName: string }
export async function createVerification(pb: PocketBase, input: NewVerification) {
  return pb.collection('verifications').create({ ...input, documentVersion: input.documentVersion || '', attachment: input.attachment || '', issuedBy: input.issuedBy || '' }, opts);
}

export interface PublicVerification { code: string; kind: VerificationKind; kindLabel: string; campusName: string; term: number; issuedAt: string; amountSen: number; sha256: string; label: string; local?: boolean; status?: string }
/** Public read: no names of people, no file access. Returns null for an unknown or malformed code. */
export async function readVerification(pb: PocketBase, rawCode: string): Promise<PublicVerification | null> {
  const code = String(rawCode || '').trim().toUpperCase();
  if (!CODE_PATTERN.test(code)) return null;
  const found = await pb.collection('verifications').getList(1, 1, { filter: pb.filter('code = {:code}', { code }), expand: 'campus', ...opts });
  const record = found.items[0];
  if (!record) return null;
  const campus = (record.expand as { campus?: { name?: string } } | undefined)?.campus;
  let status='',local=false;
  if(record.documentVersion){
    const version=await pb.collection('document_versions').getOne(record.documentVersion,opts);
    const issued=(Object.values(version.generation?.verifiedFiles||{}) as {code:string;approved:boolean}[]).find(file=>file.code===code);
    if(issued){
      local=true;
      const document=await pb.collection('documents').getOne(version.document,opts);
      const payment=await pb.collection('disbursements').getOne(document.disbursement,opts);
      const latest=await pb.collection('document_versions').getList(1,1,{filter:pb.filter('document = {:d} && origin = "generated"',{d:document.id}),sort:'-number',...opts});
      const current=latest.items[0]?.id===version.id&&version.generation?.journeyRevision===payment.applicationData?.revision;
      status=!current?'Versi lama — data pengajuan telah berubah':payment.submissionStatus==='revisi'?'Perlu revisi':issued.approved&&payment.submissionStatus==='selesai'&&document.status==='sesuai'?'Disetujui PF':issued.approved?'Persetujuan perlu diperiksa kembali':'Draf — belum merupakan dokumen final';
    }
  }
  return { code: record.code, kind: record.kind, kindLabel: VERIFICATION_LABEL[record.kind as VerificationKind] || record.kind, campusName: campus?.name || '', term: Number(record.term), issuedAt: record.created, amountSen: Number(record.amountSen || 0), sha256: record.sha256 || '', label: record.label || '',...(local?{local,status}:{}) };
}
