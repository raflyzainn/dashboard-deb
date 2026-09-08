// A small, valid PDF fixture. ASCII keeps byte offsets stable without a PDF dependency.
export function samplePdf(campus: string, version: number): Blob {
  const safe = campus.replace(/[^a-zA-Z0-9 -]/g, '').slice(0, 70);
  const stream = `BT /F1 22 Tf 60 760 Td (PROPOSAL DEB PUTIH) Tj 0 -38 Td /F1 13 Tf (${safe}) Tj 0 -25 Td (Versi ${version} - Dokumen simulasi) Tj 0 -50 Td (Tujuan: pengembangan program lingkungan bersama kampus.) Tj 0 -25 Td (Rencana: pemetaan kebutuhan, pelaksanaan, dan evaluasi.) Tj 0 -25 Td (Dokumen contoh. Tidak memuat data atau proposal nyata.) Tj ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((obj, i) => { offsets.push(pdf.length); pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`; });
  const start = pdf.length;
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(n => `${String(n).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;
  return new Blob([pdf], { type: 'application/pdf' });
}
