import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib';
import { DEMO_KPIS, DOCUMENT_LABELS, STAGES, type PaymentCase } from './payments';
import type { ProposalVersion } from './types';

export function wrapPdfText(value: string, font: PDFFont, size: number, width = 500) {
  const rows: string[] = [];
  let row = '';
  const fits = (text: string) => font.widthOfTextAtSize(text, size) <= width;
  for (const word of value
    .replace(/[^\x20-\x7E\n]/g, '?')
    .split(/\s+/)
    .filter(Boolean)) {
    if (row && fits(`${row} ${word}`)) {
      row += ` ${word}`;
      continue;
    }
    if (row) {
      rows.push(row);
      row = '';
    }
    for (const char of word) {
      if (!fits(row + char) && row) {
        rows.push(row);
        row = '';
      }
      row += char;
    }
  }
  if (row) rows.push(row);
  return rows;
}

export async function validatePdf(file: Blob) {
  try {
    if (new TextDecoder().decode(await file.slice(0, 5).arrayBuffer()) !== '%PDF-') throw Error();
    const doc = await PDFDocument.load(await file.arrayBuffer());
    if (!doc.getPageCount()) throw Error();
    return doc;
  } catch {
    throw Error('PDF rusak, terenkripsi, atau tidak dapat dibaca. Gunakan PDF tanpa password.');
  }
}
export async function buildPaymentPdf(input: {
  payment: PaymentCase;
  campus: string;
  proposal: ProposalVersion;
  files: Blob[];
  name: string;
}) {
  if (input.files.length !== 5 || input.files.some((f) => !f))
    throw Error('Paket memerlukan proposal dan empat dokumen pembayaran.');
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage(),
    y = 790;
  // ponytail: standard PDF fonts cover Indonesian text; embed a Unicode font when multilingual archival output is required.
  function line(value: string, heading = false) {
    for (const row of wrapPdfText(value, heading ? bold : font, heading ? 13 : 10)) {
      if (y < 55) {
        page = pdf.addPage();
        y = 790;
      }
      page.drawText(row, {
        x: 45,
        y,
        size: heading ? 13 : 10,
        font: heading ? bold : font,
        color: rgb(0.08, 0.17, 0.29)
      });
      y -= heading ? 23 : 16;
    }
  }
  const p = input.payment;
  line('PAKET PENCAIRAN DEB - SIMULASI', true);
  line('Data dummy. Bukan instruksi pembayaran atau penilaian resmi KPI Holding.');
  line(input.campus, true);
  line(`Pengajuan: ${p.id}`);
  line(`Nominal: Rp ${p.amount.toLocaleString('id-ID')}`);
  line(`Proposal versi ${input.proposal.version}: ${input.proposal.filename}`);
  line(`Dibuat oleh ${input.name} pada ${new Date().toISOString()}`);
  line('Penilaian KPI contoh', true);
  for (const k of p.kpis) {
    const spec = DEMO_KPIS.find((s) => s.id === k.id)!;
    line(`${spec.label}: ${k.target} ${spec.unit}; minimum ${spec.minimum}; halaman ${k.page}.`);
    line(k.evidence);
  }
  line(`Diperiksa: ${p.assessedBy} / ${p.assessedAt}. ${p.assessmentNote || ''}`);
  line('Kelengkapan dokumen', true);
  for (const d of p.documents)
    line(`${DOCUMENT_LABELS[d.kind]}: ${d.filename}; ${d.status}; ${d.reviewedBy}. ${d.note}`);
  line('Persetujuan', true);
  for (const a of p.approvals)
    line(`${a.role}: ${a.actorName} (${a.actorId}) / ${a.at}. ${a.note}`);
  line('Feedback Admin PF dan Keuangan', true);
  for (const f of p.feedback || [])
    line(`${f.createdAt} - ${f.actorName} [${STAGES[f.stage]}]: ${f.body}`);
  line('Riwayat proses', true);
  for (const h of p.history) line(`${h.at} - ${h.actor}: ${h.action}. ${h.note}`);
  line(
    'Lampiran: proposal, kuitansi, invoice, berita acara, nota. Seluruh halaman disertakan.',
    true
  );
  for (const file of input.files) {
    const source = await validatePdf(file);
    for (const copied of await pdf.copyPages(source, source.getPageIndices())) pdf.addPage(copied);
  }
  pdf.setTitle(`Paket pencairan simulasi - ${input.campus}`);
  const bytes = await pdf.save();
  return new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
}
