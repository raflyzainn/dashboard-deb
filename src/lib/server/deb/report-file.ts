import { checkedFileMime, fileExtension } from '../../upload-file';
import type { ReportKind } from '../../pelaporan';
import { PreviewError } from './preview-error';

type Box = { type: string; start: number; end: number };
export function checkedReportFile(kind: ReportKind, name: string, bytes: ArrayBuffer): { mime: string; durationSeconds?: number } {
  const fail = (message: string): never => { throw new PreviewError(400, message); };
  const limit = (kind === 'video' ? 40 : 20) * 1024 * 1024;
  if (!bytes.byteLength || bytes.byteLength > limit) fail(`Berkas harus berisi data dan maksimal ${limit / 1024 / 1024} MB.`);
  const ext = fileExtension(name);
  if (kind !== 'video') {
    if (!(kind === 'infografis' ? ['pdf'] : ['pdf', 'docx']).includes(ext)) fail('Pilih format berkas yang sesuai: PDF atau Word DOCX (infografis hanya PDF).');
    try { return { mime: checkedFileMime(name, bytes) }; } catch (e) { return fail(e instanceof Error ? e.message : 'Berkas tidak valid.'); }
  }
  if (ext !== 'mp4') fail('Video harus berupa MP4.');
  const view = new DataView(bytes), data = new Uint8Array(bytes);
  const ascii = (offset: number, length: number) => String.fromCharCode(...data.subarray(offset, offset + length));
  let count = 0;
  function boxes(start: number, end: number): Box[] {
    const result: Box[] = [];
    while (start < end) {
      if (++count > 10000 || end - start < 8) fail('Struktur MP4 tidak valid.');
      let size = view.getUint32(start), header = 8;
      if (size === 1) {
        if (end - start < 16) fail('Struktur MP4 terpotong.');
        size = Number(view.getBigUint64(start + 8)); header = 16;
      } else if (size === 0) size = end - start;
      if (!Number.isSafeInteger(size) || size < header || size > end - start) fail('Ukuran bagian MP4 tidak valid.');
      result.push({ type: ascii(start + 4, 4), start: start + header, end: start + size }); start += size;
    }
    return result;
  }
  function one(items: Box[], type: string) {
    const found = items.filter(b => b.type === type); if (found.length !== 1) fail(`Metadata MP4 ${type} tidak lengkap.`); return found[0];
  }
  function duration(box: Box) {
    const version = data[box.start], offset = version === 1 ? 20 : 12;
    if (![0, 1].includes(version) || box.end - box.start < offset + (version === 1 ? 12 : 8)) fail('Metadata durasi MP4 tidak valid.');
    const scale = view.getUint32(box.start + offset);
    const ticks = version === 1 ? Number(view.getBigUint64(box.start + offset + 4)) : view.getUint32(box.start + offset + 4);
    const value = ticks / scale;
    if (!Number.isSafeInteger(ticks) || !Number.isFinite(value) || value <= 0 || value > 120) fail('Durasi video harus lebih dari nol dan maksimal 2 menit.');
    return value;
  }
  function uint(box: Box, offset: number) {
    if (offset < 0 || box.start + offset + 4 > box.end) fail('Tabel sample MP4 terpotong.');
    return view.getUint32(box.start + offset);
  }
  const withinMedia = (offset: number, size: number, media: Box[]) => Number.isSafeInteger(offset) && size > 0 && media.some(b => offset >= b.start && offset + size <= b.end);
  function samples(trackChildren: Box[], children: Box[], top: Box[], movie: Box[]) {
    const minf = one(children, 'minf'), stbl = one(boxes(minf.start, minf.end), 'stbl'), tables = boxes(stbl.start, stbl.end);
    const stsd = one(tables, 'stsd');
    const descriptions = boxes(stsd.start + 8, stsd.end);
    if (!uint(stsd, 4) || descriptions.length !== uint(stsd, 4) || descriptions.some(b => b.end - b.start < 78)) fail('Deskripsi sample video tidak valid.');
    const media = top.filter(b => b.type === 'mdat'), stsz = one(tables, 'stsz'), count = uint(stsz, 8), defaultSize = uint(stsz, 4);
    if (count > 200000) fail('Terlalu banyak sample video.');
    if (count) {
      const sizes = Array.from({ length: count }, (_, i) => defaultSize || uint(stsz, 12 + i * 4));
      const stsc = one(tables, 'stsc'), entries = uint(stsc, 4), offsets = tables.find(b => b.type === 'stco' || b.type === 'co64');
      if (!offsets || !entries || entries > 200000) fail('Pemetaan sample video tidak lengkap.');
      const chunks = uint(offsets, 4); if (!chunks || chunks > 200000) fail('Jumlah chunk video tidak valid.');
      const mapping = Array.from({ length: entries }, (_, i) => ({ first: uint(stsc, 8 + i * 12), size: uint(stsc, 12 + i * 12) }));
      if (mapping[0].first !== 1 || mapping.some((m, i) => !m.size || m.first > chunks || (i > 0 && m.first <= mapping[i - 1].first))) fail('Urutan chunk video tidak valid.');
      let sample = 0, group = 0;
      for (let chunk = 1; chunk <= chunks; chunk++) {
        while (group + 1 < mapping.length && mapping[group + 1].first <= chunk) group++;
        const pos = offsets.start + 8 + (chunk - 1) * (offsets.type === 'co64' ? 8 : 4);
        if (pos + (offsets.type === 'co64' ? 8 : 4) > offsets.end) fail('Offset sample terpotong.');
        let at = offsets.type === 'co64' ? Number(view.getBigUint64(pos)) : view.getUint32(pos);
        if (mapping[group].size > count - sample) fail('Jumlah sample tidak cocok.');
        for (let n = 0; n < mapping[group].size; n++) { const size = sizes[sample++]; if (!withinMedia(at, size, media)) fail('Sample video tidak memiliki data yang lengkap.'); at += size; }
      }
      if (sample !== count) fail('Sample video tidak lengkap.');
    } else {
      // shortcut: fragments require explicit trun data offsets; re-export uncommon layouts until broader MP4 support is needed.
      const tkhd = one(trackChildren, 'tkhd'), trackId = uint(tkhd, data[tkhd.start] === 1 ? 20 : 12);
      const mvex = one(movie, 'mvex'), trex = boxes(mvex.start, mvex.end).find(b => b.type === 'trex' && uint(b, 4) === trackId);
      if (!trex) fail('Metadata fragment video tidak lengkap.');
      let total = 0;
      for (const fragment of top.filter(b => b.type === 'moof')) for (const traf of boxes(fragment.start, fragment.end).filter(b => b.type === 'traf')) {
        const parts = boxes(traf.start, traf.end), tfhd = one(parts, 'tfhd');
        if (uint(tfhd, 4) !== trackId) continue;
        const flags = uint(tfhd, 0) & 0xffffff;
        let cursor = 8, base = fragment.start - 8;
        if (flags & 1) { if (tfhd.start + cursor + 8 > tfhd.end) fail('Offset fragment terpotong.'); base = Number(view.getBigUint64(tfhd.start + cursor)); cursor += 8; }
        if (flags & 2) cursor += 4;
        if (flags & 8) cursor += 4;
        const sizeDefault = flags & 16 ? uint(tfhd, cursor) : uint(trex, 16);
        for (const trun of parts.filter(b => b.type === 'trun')) {
          const f = uint(trun, 0) & 0xffffff, n = uint(trun, 4); total += n;
          if (!n || total > 200000 || !(f & 1)) fail('Sample fragment video tidak lengkap.');
          let offset = base + (uint(trun, 8) | 0), p = 12;
          if (f & 4) p += 4;
          for (let i = 0; i < n; i++) {
            if (f & 256) { uint(trun, p); p += 4; }
            const size = f & 512 ? uint(trun, p) : sizeDefault; if (f & 512) p += 4;
            if (f & 1024) { uint(trun, p); p += 4; } if (f & 2048) { uint(trun, p); p += 4; }
            if (!withinMedia(offset, size, media)) fail('Data fragment video terpotong.'); offset += size;
          }
        }
      }
      if (!total) fail('MP4 tidak memuat sample video.');
    }
  }
  const top = boxes(0, bytes.byteLength), ftyp = one(top, 'ftyp');
  if (ftyp.end - ftyp.start < 8 || !top.some(b => b.type === 'mdat' && b.end > b.start)) fail('Isi video MP4 tidak lengkap.');
  const movie = boxes(one(top, 'moov').start, one(top, 'moov').end);
  const times = [duration(one(movie, 'mvhd'))]; let video = false;
  for (const track of movie.filter(b => b.type === 'trak')) {
    const trackChildren = boxes(track.start, track.end), media = one(trackChildren, 'mdia'), children = boxes(media.start, media.end), handler = one(children, 'hdlr');
    if (handler.end - handler.start < 12) fail('Track video tidak valid.');
    if (ascii(handler.start + 8, 4) === 'vide') { samples(trackChildren, children, top, movie); video = true; }
    times.push(duration(one(children, 'mdhd')));
  }
  if (!video) fail('MP4 tidak memiliki track video.');
  return { mime: 'video/mp4', durationSeconds: Math.max(...times) };
}
