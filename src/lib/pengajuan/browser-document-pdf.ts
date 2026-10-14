/** PDF dari DOCX tersimpan, dibuat di browser tanpa layanan konversi server. */
import { DOCX_MIME } from '../merge';
import html2canvasSource from 'html2canvas/dist/html2canvas.min.js?url';

const cache = new Map<string, Blob>();
const pending = new Map<string, Promise<Blob>>();
let queue: Promise<unknown> = Promise.resolve();
let cacheBytes = 0;
async function pdfWait<T>(work:PromiseLike<T>,ms=30000):Promise<T>{
 let timer:ReturnType<typeof setTimeout>;
 try{return await Promise.race([work,new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(Error('Pembuatan PDF terlalu lama. Coba lagi atau unduh DOCX.')),ms);})]);}
 finally{clearTimeout(timer!);}
}

export async function browserDocumentPdf(source: Blob): Promise<Blob> {
 if (source.type === 'application/pdf') return source;
 if (source.type !== DOCX_MIME) throw new Error('PDF hanya tersedia untuk dokumen DOCX yang dibuat aplikasi.');
 if(source.size>4*1024*1024)throw Error('Dokumen terlalu besar untuk pratinjau PDF. Unduh DOCX untuk melanjutkan.');
 const bytes = await source.arrayBuffer();
 const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), value => value.toString(16).padStart(2, '0')).join('');
 const key = digest;
 const cached = cache.get(key);
 if (cached) return cached;
 const running = pending.get(key);
 if (running) return running;
 if(pending.size>=8)throw Error('Antrean PDF penuh. Tunggu dokumen lain selesai lalu coba lagi.');
 const task = queue.then(async () => {
  const pdf = await renderPdf(bytes);
  cache.set(key, pdf); cacheBytes += pdf.size;
  while (cache.size > 8 || cacheBytes > 32 * 1024 * 1024) {
   const first = cache.keys().next().value!;
   cacheBytes -= cache.get(first)!.size; cache.delete(first);
  }
  return pdf;
 });
 queue = task.catch(() => {});
 pending.set(key, task);
 try { return await task; } finally { pending.delete(key); }
}

async function renderPdf(bytes: ArrayBuffer): Promise<Blob> {
 const [{ renderAsync }, { PDFDocument }] = await pdfWait(Promise.all([
  import('docx-preview'), import('pdf-lib')
 ]));
 // Dokumen terpisah menghindari style aplikasi (termasuk warna Tailwind) masuk ke PDF.
 const frame = document.createElement('iframe');
 frame.title = 'Pembuatan PDF'; frame.setAttribute('aria-hidden', 'true'); frame.tabIndex = -1;
 frame.style.cssText = 'position:fixed;left:-12000px;top:0;width:1000px;height:1400px;border:0;pointer-events:none;';
 document.body.append(frame);
 try {
  const doc = frame.contentDocument!;
  doc.open(); doc.write('<!doctype html><html><head></head><body style="margin:0;background:white"></body></html>'); doc.close();
  // html2canvas memakai document global saat mengukur font; jalankan dalam iframe yang bebas CSS aplikasi.
  const html2canvas = await pdfWait(new Promise<typeof import('html2canvas').default>((resolve, reject) => {
   const script = doc.createElement('script');
   script.src = html2canvasSource;
   script.onload = () => resolve((frame.contentWindow as Window & { html2canvas: typeof import('html2canvas').default }).html2canvas);
   script.onerror = () => reject(new Error('Pembuat PDF belum dapat dimuat.'));
   doc.head.append(script);
  }));
  await pdfWait(renderAsync(new Uint8Array(bytes), doc.body, doc.head, {
   className: 'deb-pdf', inWrapper: true, ignoreWidth: false, ignoreHeight: false,
   breakPages: true, ignoreLastRenderedPageBreak: true, useBase64URL: true, renderHeaders: true, renderFooters: true
  }));
  // Watermark Word mengandalkan posisi shape yang tidak didukung renderer; status DRAF dalam isi tetap ada.
  for (const header of doc.querySelectorAll('header')) {
   const walker = doc.createTreeWalker(header, NodeFilter.SHOW_TEXT);
   while (walker.nextNode()) {
    if (walker.currentNode.textContent?.trim() === 'DRAFT') walker.currentNode.textContent = '';
   }
   // Anchor Word berukuran nol membuat logo keluar dari tepi halaman di renderer browser.
   for(const anchor of header.querySelectorAll<HTMLElement>('[style]')){
    if(anchor.style.width==='0px'&&anchor.style.height==='0px'&&anchor.querySelector('img')){
     Object.assign(anchor.style,{display:'inline-block',width:'auto',height:'auto',left:'0',top:'0'});
    }
   }
  }
  await pdfWait(doc.fonts.ready,10000);
  await pdfWait(Promise.all(Array.from(doc.images).map(image => image.decode())),10000);
  // ponytail: pindahkan paragraf/tabel utuh; blok tunggal lebih tinggi dari halaman memakai unduhan DOCX.
  const pages:HTMLElement[]=[];
  for(const source of Array.from(doc.querySelectorAll<HTMLElement>('section.deb-pdf'))){
   const articles=Array.from(source.querySelectorAll<HTMLElement>(':scope > article'));
   if(!articles.some(article=>article.textContent?.trim()||article.querySelector('img,svg'))){source.remove();continue;}
   const height=parseFloat(frame.contentWindow!.getComputedStyle(source).minHeight);
   if(!Number.isFinite(height)||height<=0)throw new Error('Ukuran halaman PDF tidak tersedia. Unduh DOCX untuk melanjutkan.');
   const newPage=()=>{
    if(pages.length>=40)throw Error('Dokumen melebihi 40 halaman pratinjau. Unduh DOCX untuk melanjutkan.');
    const page=source.cloneNode(true) as HTMLElement;
    page.style.margin='0';page.style.boxShadow='none';
    for(const article of page.querySelectorAll(':scope > article'))article.remove();
    for(const child of Array.from(page.children)) (child as HTMLElement).style.flexShrink='0';
    source.before(page);pages.push(page);return page;
   };
   let page=newPage();
   for(const original of articles){
    let article=original.cloneNode(false) as HTMLElement;
    article.style.flexShrink='0';page.insertBefore(article,page.querySelector(':scope > footer'));
    for(const child of Array.from(original.childNodes)){
     const node=child.cloneNode(true);article.append(node);
     if(page.getBoundingClientRect().height<=height+1)continue;
     article.removeChild(node);
     if(!article.textContent?.trim()&&!article.querySelector('img,svg'))throw new Error('Satu bagian dokumen melebihi ukuran halaman. Unduh DOCX untuk melanjutkan.');
     page=newPage();article=original.cloneNode(false) as HTMLElement;
     article.style.flexShrink='0';page.insertBefore(article,page.querySelector(':scope > footer'));article.append(node);
     if(page.getBoundingClientRect().height>height+1)throw new Error('Satu bagian dokumen melebihi ukuran halaman. Unduh DOCX untuk melanjutkan.');
    }
   }
   if(!Array.from(page.querySelectorAll(':scope > article')).some(article=>article.textContent?.trim()||article.querySelector('img,svg'))){page.remove();pages.pop();}
   source.remove();
  }
  if (!pages.length) throw new Error('Halaman dokumen belum dapat dibuat.');
  const pdf = await PDFDocument.create();
  for (const page of pages) {
   page.style.margin = '0'; page.style.boxShadow = 'none';
   const bounds = page.getBoundingClientRect();
   const canvas = await pdfWait(html2canvas(page, {
    backgroundColor: '#ffffff', scale: 2, logging: false,
    windowWidth: 1000, windowHeight: Math.ceil(bounds.height), scrollX: 0, scrollY: 0
   }));
   const png = await new Promise<Blob>((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Halaman PDF gagal dibuat.')), 'image/png'));
   const image = await pdf.embedPng(await png.arrayBuffer());
   const width = bounds.width * 0.75, height = bounds.height * 0.75;
   pdf.addPage([width, height]).drawImage(image, { x: 0, y: 0, width, height });
   canvas.width = 0; canvas.height = 0;
  }
  return new Blob([new Uint8Array(await pdf.save()).buffer], { type: 'application/pdf' });
 } finally { frame.remove(); }
}

export async function downloadDocumentPdf(url: string, name: string): Promise<void> {
 const response = await fetch(url, { cache: 'no-store', signal:AbortSignal.timeout(30000) });
 if (!response.ok) {
  const detail = await response.json().catch(() => null);
  throw new Error(detail?.message || 'Dokumen belum dapat diunduh.');
 }
 const blob = await browserDocumentPdf(await response.blob());
 const href = URL.createObjectURL(blob), link = document.createElement('a');
 link.href = href; link.download = name.replace(/\.docx$/i, '') + (name.endsWith('.pdf') ? '' : '.pdf');
 link.click(); setTimeout(() => URL.revokeObjectURL(href), 60000);
}
