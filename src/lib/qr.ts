import QRCode from 'qrcode';

/**
 * QR codes without a canvas or a native library, so the same code runs in the browser, in Node and on the edge.
 * qrMatrix gives the modules (for drawing squares into a PDF); qrPng encodes them as an uncompressed PNG (for a Word footer).
 */
export interface QrMatrix { size: number; dark: (row: number, col: number) => boolean }

// Siluet 32 x 32 dari simbol PF pada static/favicon-96x96.png (batas piksel 21..74).
const PF_MASK='0004000000070000001f8000000f80807e0784801fc78f8007e38f8001f08f800ff80c0003fe0000003c00c0000003f8000001f800fe007c07fe001f1ffc27073ffc63c07ff873e070e0f1e0c0c1f1f00001f1f80003f0e00003f0f00003f0700003f038000790180007800c0003000000030000000300000002000000000000'.match(/.{8}/g)!.map(row=>parseInt(row,16));
type QrOptions={scale?:number;margin?:number;level?:'L'|'M'|'Q'|'H';pfLogo?:boolean};

export function qrMatrix(text: string, level: 'L' | 'M' | 'Q' | 'H' = 'M'): QrMatrix {
  const code = QRCode.create(text, { errorCorrectionLevel: level });
  const modules = code.modules;
  return { size: modules.size, dark: (row, col) => Boolean(modules.get(row, col)) };
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();
function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function adler32(bytes: Uint8Array) {
  let a = 1, b = 0;
  for (let i = 0; i < bytes.length; i++) { a = (a + bytes[i]) % 65521; b = (b + a) % 65521; }
  return ((b << 16) | a) >>> 0;
}
const u32 = (value: number) => new Uint8Array([(value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255]);
function chunk(type: string, data: Uint8Array) {
  const typeBytes = new TextEncoder().encode(type);
  const body = new Uint8Array(typeBytes.length + data.length);
  body.set(typeBytes); body.set(data, typeBytes.length);
  const out = new Uint8Array(4 + body.length + 4);
  out.set(u32(data.length)); out.set(body, 4); out.set(u32(crc32(body)), 4 + body.length);
  return out;
}
/** zlib stream made of stored (uncompressed) deflate blocks: valid everywhere, no compressor needed. */
function zlibStored(raw: Uint8Array) {
  const blocks = Math.max(1, Math.ceil(raw.length / 65535));
  const out = new Uint8Array(2 + raw.length + blocks * 5 + 4);
  let o = 0;
  out[o++] = 0x78; out[o++] = 0x01;
  for (let i = 0; i < blocks; i++) {
    const start = i * 65535, end = Math.min(raw.length, start + 65535), len = end - start;
    out[o++] = i === blocks - 1 ? 1 : 0;
    out[o++] = len & 255; out[o++] = (len >>> 8) & 255; out[o++] = ~len & 255; out[o++] = (~len >>> 8) & 255;
    out.set(raw.subarray(start, end), o); o += len;
  }
  out.set(u32(adler32(raw)), o);
  return out;
}

/** 8 bit grayscale PNG of the QR: black modules on white, `scale` pixels per module, `margin` modules of quiet zone. */
export function qrPng(text: string, options: QrOptions = {}): Uint8Array {
  const { scale = 4, margin = 2, level = 'M' } = options;
  const matrix = qrMatrix(text, options.pfLogo?'H':level);
  const side = (matrix.size + margin * 2) * scale;
  // Logo covers at most 18% of the module width; H correction and a white border preserve readability.
  const logoSide=Math.floor(matrix.size*0.18)*scale,logoStart=Math.floor((side-logoSide)/2);
  const raw = new Uint8Array(side * (side + 1));
  for (let y = 0; y < side; y++) {
    const rowStart = y * (side + 1);
    raw[rowStart] = 0;
    const row = Math.floor(y / scale) - margin;
    for (let x = 0; x < side; x++) {
      const col = Math.floor(x / scale) - margin;
      let dark = row >= 0 && col >= 0 && row < matrix.size && col < matrix.size && matrix.dark(row, col);
      if(options.pfLogo&&x>=logoStart-scale&&x<logoStart+logoSide+scale&&y>=logoStart-scale&&y<logoStart+logoSide+scale){
        const lx=Math.floor((x-logoStart)*32/logoSide),ly=Math.floor((y-logoStart)*32/logoSide);
        dark=lx>=0&&lx<32&&ly>=0&&ly<32&&!!((PF_MASK[ly]>>>(31-lx))&1);
      }
      raw[rowStart + 1 + x] = dark ? 0 : 255;
    }
  }
  const ihdr = new Uint8Array(13);
  ihdr.set(u32(side), 0); ihdr.set(u32(side), 4); ihdr[8] = 8; ihdr[9] = 0; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const parts = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlibStored(raw)), chunk('IEND', new Uint8Array(0))];
  const total = parts.reduce((n, p) => n + p.length, 0);
  const png = new Uint8Array(total);
  let o = 0;
  for (const p of parts) { png.set(p, o); o += p.length; }
  return png;
}
/** Pixel side of the PNG qrPng produces for the same options, for sizing the image in a document. */
export function qrPngSide(text: string, options: QrOptions = {}) {
  const { scale = 4, margin = 2, level = 'M' } = options;
  return (qrMatrix(text, options.pfLogo?'H':level).size + margin * 2) * scale;
}
