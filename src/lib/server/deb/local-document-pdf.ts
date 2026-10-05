import { dev } from '$app/environment';
import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { PreviewError } from './preview-error';

const execute = promisify(execFile);
let queue: Promise<unknown> = Promise.resolve();
let waiting = 0;

/** Serialize issuance, including its cache transaction, when a summary opens several PDFs. */
export async function queuedPdf<T>(action: () => Promise<T>): Promise<T> {
 if (waiting >= 12) throw new PreviewError(503, 'Pembuatan PDF sedang sibuk. Coba kembali sebentar lagi.');
 waiting++;
 const task = queue.then(action);
 queue = task.catch(() => {});
 try { return await task; } finally { waiting--; }
}

/** Local conversion only; never sends a document to an external conversion service. */
export async function localDocumentPdf(bytes: Uint8Array, settings: Record<string,string>): Promise<Uint8Array> {
 if (!dev || settings.DEB_LOCAL_INSTANCE_ID !== 'local' || settings.PB_URL !== 'http://127.0.0.1:8097') {
  throw new PreviewError(503, 'Konversi PDF belum tersedia pada lingkungan ini.');
 }
 const candidates = [settings.DEB_LIBREOFFICE_PATH, '/Applications/LibreOffice.app/Contents/MacOS/soffice', '/opt/homebrew/bin/soffice', '/usr/local/bin/soffice', '/usr/bin/libreoffice'].filter(Boolean);
 let executable = '';
 for (const candidate of candidates) {
  try { await access(candidate, constants.X_OK); executable = candidate; break; } catch { /* Try next installed location. */ }
 }
 if (!executable) throw new PreviewError(503, 'Pembuat PDF belum tersedia. Pasang LibreOffice pada server lokal.');
 const directory = await mkdtemp(path.join(tmpdir(), 'deb-document-pdf-'));
 try {
  const input = path.join(directory, 'document.docx');
  await writeFile(input, bytes, { mode: 0o600 });
  await execute(executable, [
   '-env:UserInstallation=' + pathToFileURL(path.join(directory, 'profile')).href,
   '--headless', '--nologo', '--nodefault', '--norestore',
   '--convert-to', 'pdf:writer_pdf_Export', '--outdir', directory, input
  ], { timeout: 60000, maxBuffer: 1024 * 1024 });
  const output = await readFile(path.join(directory, 'document.pdf'));
  if (output.subarray(0,5).toString() !== '%PDF-') throw new Error('Invalid PDF');
  return new Uint8Array(output);
 } catch {
  throw new PreviewError(503, 'PDF belum berhasil dibuat. Coba lagi atau unduh DOCX.');
 } finally {
  await rm(directory, { recursive: true, force: true });
 }
}
