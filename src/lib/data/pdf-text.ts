import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { normalizeLine, type ExtractedProposal, type TextLine } from './proposal-diff';

GlobalWorkerOptions.workerSrc = workerUrl;

export async function extractPdfText(blob: Blob, signal: AbortSignal): Promise<ExtractedProposal> {
  signal.throwIfAborted();
  const bytes = new Uint8Array(await blob.arrayBuffer());
  signal.throwIfAborted();
  const task = getDocument({ data: bytes, useSystemFonts: true });
  const abort = () => { void task.destroy().catch(() => {}); };
  signal.addEventListener('abort', abort, { once: true });
  // Avoid waiting indefinitely on password entry: the original file remains available.
  task.onPassword = () => { abort(); };
  try {
    const pdf = await task.promise;
    if (pdf.numPages > 150) throw new Error('PDF melebihi 150 halaman. Buka dokumen asli untuk meninjaunya.');
    const lines: TextLine[] = [];
    const emptyPages: number[] = [];
    let characters = 0;
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      signal.throwIfAborted();
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      let line = '', previousY: number | undefined;
      const start = lines.length;
      function flush() {
        const text = normalizeLine(line);
        if (text) { lines.push({ text, page: pageNumber }); characters += text.length; }
        line = '';
      }
      for (const item of content.items) {
        if (!('str' in item)) continue;
        const y = item.transform[5];
        if (previousY !== undefined && Math.abs(y - previousY) > 2) flush();
        line += item.str;
        if (item.hasEOL) { flush(); previousY = undefined; }
        else previousY = y;
      }
      flush();
      page.cleanup();
      if (lines.length === start) emptyPages.push(pageNumber);
      if (characters > 300000 || lines.length > 6000) throw new Error('Teks PDF terlalu panjang untuk dibandingkan. Buka dokumen asli untuk meninjaunya.');
    }
    signal.throwIfAborted();
    return { lines, pages: pdf.numPages, emptyPages };
  } catch (error) {
    signal.throwIfAborted();
    if (error instanceof Error && /melebihi|terlalu panjang/.test(error.message)) throw error;
    throw new Error('PDF tidak dapat dibaca. File mungkin rusak atau dilindungi kata sandi. Buka PDF asli atau pilih versi lain.');
  } finally {
    signal.removeEventListener('abort', abort);
    await task.destroy().catch(() => {});
  }
}
