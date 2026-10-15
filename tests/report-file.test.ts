import test from 'node:test';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { checkedReportFile } from '../src/lib/server/deb/report-file';

test('jenis dan isi dokumen harus sesuai', () => {
  const pdf = new TextEncoder().encode('%PDF-1.7\n').buffer;
  assert.equal(checkedReportFile('infografis', 'contoh.pdf', pdf).mime, 'application/pdf');
  assert.throws(() => checkedReportFile('video', 'contoh.pdf', pdf));
  assert.throws(() => checkedReportFile('artikel', 'contoh.pdf', new ArrayBuffer(0)));
  assert.throws(() => checkedReportFile('laporan', 'contoh.pdf', new Uint8Array([1, 2]).buffer));
  assert.throws(() => checkedReportFile('artikel', 'besar.pdf', new ArrayBuffer(20 * 1024 * 1024 + 1)));
});

function box(type: string, bytes: Uint8Array) {
  const b = new Uint8Array(8 + bytes.length); new DataView(b.buffer).setUint32(0, b.length);
  b.set(new TextEncoder().encode(type), 4); b.set(bytes, 8); return b;
}
function concat(...items: Uint8Array[]) { const b = new Uint8Array(items.reduce((n, x) => n + x.length, 0)); let o = 0; for (const x of items) { b.set(x, o); o += x.length; } return b; }
function incompleteMp4(seconds: number) {
  const timing = new Uint8Array(100), view = new DataView(timing.buffer); view.setUint32(12, 1000); view.setUint32(16, seconds * 1000);
  const handler = new Uint8Array(24); handler.set(new TextEncoder().encode('vide'), 8);
  return concat(box('ftyp', new TextEncoder().encode('isom0000isom')), box('moov', concat(box('mvhd', timing), box('trak', box('mdia', concat(box('mdhd', timing), box('hdlr', handler)))))), box('mdat', new Uint8Array([1]))).buffer;
}
function mp4(seconds: number) {
  const b = readFileSync(new URL('./fixtures/pelaporan/video-qa.mp4', import.meta.url));
  for (const type of ['mvhd', 'mdhd']) {
    let start = 0;
    while ((start = b.indexOf(type, start)) >= 0) {
      const p = start + 4, version = b[p], offset = version === 1 ? 20 : 12, scale = b.readUInt32BE(p + offset);
      if (version === 1) b.writeBigUInt64BE(BigInt(Math.round(seconds * scale)), p + offset + 4);
      else b.writeUInt32BE(Math.round(seconds * scale), p + offset + 4);
      start = p;
    }
  }
  return new Uint8Array(b).buffer;
}

test('durasi video dibaca server dan dibatasi dua menit', () => {
  assert.equal(checkedReportFile('video', 'video.mp4', mp4(120)).durationSeconds, 120);
  assert.throws(() => checkedReportFile('video', 'video.mp4', mp4(120.01)));
  assert.throws(() => checkedReportFile('video', 'video.mp4', mp4(0)));
  assert.throws(() => checkedReportFile('video', 'video.mp4', new Uint8Array(16).buffer));
  assert.throws(() => checkedReportFile('video', 'video.mp4', incompleteMp4(1)));
  const truncated = new Uint8Array(mp4(1));
  assert.throws(() => checkedReportFile('video', 'video.mp4', truncated.slice(0, 800).buffer));
});
