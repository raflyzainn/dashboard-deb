import { STAGES, type Assessment } from './pencairan';
import type { Journey } from './pengajuan/journey';

export interface CampusPayoutProgress {
  stage: string;
  uploaded: number;
  assessment: Assessment;
}

/** The campus timeline and admin directory use the same stored document state. */
export function payoutTimeline(input: {
  paidAt?: string;
  stage?: number;
  journey?: Pick<Journey, 'status' | 'revision' | 'documentRevisions' | 'files' | 'fields' | 'pf'>;
  hasRab: boolean;
  documents: {
    kind: string; generated: boolean; signedReceived: boolean; currentVersionId: string;
    versions: { id: string; origin: string; journeyRevision?: number; generation?: { journeyRevision?: number } }[];
  }[];
}) {
  const j = input.journey;
  const stages = j ? ['Isi pengajuan', 'Siapkan dokumen', 'Kirim pengajuan', 'Pemeriksaan PF', 'Tanda tangan', 'Pembayaran', 'Dana dibayar']
    : input.paidAt ? [...STAGES, 'Dana dibayar'] : [...STAGES];
  let stage = Math.max(1, Math.min(STAGES.length, input.stage || 1));
  if (input.paidAt) stage = stages.length;
  else if (j) {
    const docs = input.documents.filter(d => d.generated);
    if (j.status === 'selesai') stage = docs.length && docs.every(d => d.signedReceived) ? 6 : 5;
    else if (j.status === 'menunggu') stage = 4;
    else if (j.status === 'revisi') stage = 1;
    else {
      const generated = docs.filter(d => d.versions.some(v => v.id === d.currentVersionId && v.origin === 'generated'
        && (v.generation?.journeyRevision || v.journeyRevision) === (j.documentRevisions?.[d.kind] || j.revision)));
      if (generated.length === 4) stage = 3;
      else if (generated.length || input.hasRab && j.files?.rekening && j.files?.kop && j.fields?.nomorPksKampus && j.pf?.nomorPksPf) stage = 2;
      else stage = 1;
    }
  }
  return { stages, stage, label: stages[stage - 1] };
}
