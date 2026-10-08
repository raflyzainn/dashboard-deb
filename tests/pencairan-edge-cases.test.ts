import { test } from 'node:test';
import assert from 'node:assert/strict';
import PizZip from 'pizzip';
import { checkedFileMime, checkedOfficeZip } from '../src/lib/upload-file';
import { parseGridSheet } from '../src/lib/rab-grid';
import { mergeRabRows, rabSubcategory } from '../src/lib/rab-template';
import { validDate } from '../src/lib/pengajuan/journey';
import { assertPayoutEditable, assertRevision } from '../src/lib/server/deb/pencairan-store';
import { RestStore } from '../src/lib/server/deb/rest-store';

test('upload content must match the extension; MIME is canonical',()=>{
 assert.throws(()=>checkedFileMime('scan.pdf',new TextEncoder().encode('<html>not a PDF</html>')),/Isi berkas/);
 assert.throws(()=>checkedFileMime('scan.png',new TextEncoder().encode('%PDF-1.7')),/Isi berkas/);
 assert.equal(checkedFileMime('scan.PDF',new TextEncoder().encode('%PDF-1.7\n')), 'application/pdf');
 const archive=new PizZip();archive.file('[Content_Types].xml','<Types/>');archive.file('xl/workbook.xml','<workbook/>');
 assert.equal(checkedFileMime('rab.xlsx',archive.generate({type:'uint8array'})), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
 archive.file('xl/sharedStrings.xml','x'.repeat(16*1024*1024+1));
 assert.throws(()=>checkedOfficeZip(archive.generate({type:'uint8array',compression:'DEFLATE'}),'xlsx'),/terlalu besar/);
});

test('legacy RAB item names do not truncate the import and subkegiatan stay distinct',()=>{
 const rows=[['No','URAIAN','PERHITUNGAN','VOLUME','Satuan','HARGA SATUAN','JUMLAH'],
  [1,'Panel','',1,'unit',100,100],[2,'Total station','',1,'unit',200,200],[3,'Jumlah material','',1,'unit',300,300],
  ['', 'Sub total Kegiatan A','','','','',600],
  ['', 'TOTAL','','','','',600],[4,'signature copy','',1,'unit',10,10]];
 const parsed=parseGridSheet(rows);
 assert.equal(parsed.items,3);assert.equal(parsed.problems.length,0);
 assert.deepEqual(parsed.lines.filter(row=>row.key.startsWith('i')).map(row=>row.title),['Panel','Total station','Jumlah material']);
 const incoming=['Pelatihan','Evaluasi'].map(section=>({id:'',cells:['Program',rabSubcategory('Kegiatan',section),'Konsumsi',1,'paket',1,'kali',100]}));
 assert.equal(mergeRabRows([],incoming).rows.length,2);
 assert.equal(mergeRabRows(incoming,incoming).added,0);
});

test('payout guards reject paid records, stale revisions and invalid calendar dates',()=>{
 const tx=new RestStore({disbursements:[{id:'payment00000001',term:1,paidAt:'2026-10-07'} as any]});
 assert.throws(()=>assertPayoutEditable(tx),/sudah dibayar/);
 assert.throws(()=>assertRevision(4,3),/Data berubah/);
 assert.throws(()=>assertRevision(4,undefined),/Data berubah/);
 assert.doesNotThrow(()=>assertRevision(4,4));
 assert.equal(validDate('2026-02-31'),false);assert.equal(validDate('2026-99-99'),false);
 assert.equal(validDate('2028-02-29'),true);
});
