/** PDF untuk dummy statis: halaman berasal dari DOCX tersimpan, tanpa data contoh tetap. */
import { DOCX_MIME, withVerificationFooter } from '../merge';
import { qrPng, qrPngSide } from '../qr';

const cache = new Map<string, Blob>();
const pending = new Map<string, Promise<Blob>>();
let queue: Promise<unknown> = Promise.resolve();
let cacheBytes = 0;

export async function browserDocumentPdf(source: Blob): Promise<Blob> {
 if (source.type === 'application/pdf') return source;
 if (source.type !== DOCX_MIME) throw new Error('PDF hanya tersedia untuk dokumen DOCX yang dibuat aplikasi.');
 const bytes = await source.arrayBuffer();
 const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), value => value.toString(16).padStart(2, '0')).join('');
 const cached = cache.get(digest);
 if (cached) return cached;
 const running = pending.get(digest);
 if (running) return running;
 const task = queue.then(async () => {
  const pdf = await renderPdf(bytes, digest);
  cache.set(digest, pdf); cacheBytes += pdf.size;
  while (cache.size > 8 || cacheBytes > 32 * 1024 * 1024) {
   const first = cache.keys().next().value!;
   cacheBytes -= cache.get(first)!.size; cache.delete(first);
  }
  return pdf;
 });
 queue = task.catch(() => {});
 pending.set(digest, task);
 try { return await task; } finally { pending.delete(digest); }
}

async function renderPdf(bytes: ArrayBuffer, digest: string): Promise<Blob> {
 const [{ renderAsync }, { default: html2canvas }, { PDFDocument }] = await Promise.all([
  import('docx-preview'), import('html2canvas'), import('pdf-lib')
 ]);
 // Dokumen terpisah menghindari style aplikasi (termasuk warna Tailwind) masuk ke PDF.
 const frame = document.createElement('iframe');
 frame.title = 'Pembuatan PDF'; frame.setAttribute('aria-hidden', 'true'); frame.tabIndex = -1;
 frame.style.cssText = 'position:fixed;left:-12000px;top:0;width:1000px;height:1400px;border:0;pointer-events:none;';
 document.body.append(frame);
 try {
  const doc = frame.contentDocument!;
  doc.open(); doc.write('<!doctype html><html><head></head><body style="margin:0;background:white"></body></html>'); doc.close();
  const code = 'DUMMY-' + digest.slice(0, 16).toUpperCase();
  const qrText = 'Dokumen simulasi DEB ' + code;
  const options = { scale: 6, margin: 4, level: 'H' } as const;
  const stamped = withVerificationFooter(new Uint8Array(bytes), {
   png: qrPng(qrText, options), pngSide: qrPngSide(qrText, options), code,
   line: 'Dokumen simulasi DEB', issuer: 'Salinan PDF dari data pengajuan'
  });
  await renderAsync(stamped, doc.body, doc.head, {
   className: 'deb-pdf', inWrapper: true, ignoreWidth: false, ignoreHeight: false,
   breakPages: true, useBase64URL: true, renderHeaders: true, renderFooters: true
  });
  await doc.fonts.ready;
  await Promise.all(Array.from(doc.images).map(image => image.decode()));
  const pages = Array.from(doc.querySelectorAll<HTMLElement>('section.deb-pdf'));
  if (!pages.length) throw new Error('Halaman dokumen belum dapat dibuat.');
  const pdf = await PDFDocument.create();
  for (const page of pages) {
   page.style.margin = '0'; page.style.boxShadow = 'none';
   const bounds = page.getBoundingClientRect();
   const canvas = await html2canvas(page, {
    backgroundColor: '#ffffff', scale: 2, logging: false,
    windowWidth: 1000, windowHeight: Math.ceil(bounds.height), scrollX: 0, scrollY: 0
   });
   const png = await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Halaman PDF gagal dibuat.')), 'image/png'));
   const image = await pdf.embedPng(await png.arrayBuffer());
   const width = bounds.width * 0.75, height = bounds.height * 0.75;
   pdf.addPage([width, height]).drawImage(image, { x: 0, y: 0, width, height });
   canvas.width = 0; canvas.height = 0;
  }
  return new Blob([new Uint8Array(await pdf.save()).buffer], { type: 'application/pdf' });
 } finally { frame.remove(); }
}
