import type PocketBase from 'pocketbase';
import type { RestStore, SnapshotReads } from './rest-store';
import { PreviewError } from './preview-error';

/** Shared read scopes fence payout mutations against journey edits and closing operations. */
export function payoutReads(pb:PocketBase,campusId:string):SnapshotReads {
 const campus=pb.filter('campus = {:c}',{c:campusId}),payment=pb.filter('disbursement.campus = {:c}',{c:campusId});
 return {
  campuses:{filter:pb.filter('id = {:c}',{c:campusId})},sk_awards:{filter:campus},
  disbursements:{filter:campus},documents:{filter:payment},
  document_versions:{filter:pb.filter('document.disbursement.campus = {:c}',{c:campusId})},
  rab_versions:{filter:campus},rab_lines:{filter:pb.filter('version.campus = {:c}',{c:campusId})},
  bank_checks:{filter:payment},attachments:{filter:payment},reviews:null,audit:null,verifications:null,
  users:{filter:pb.filter('active = true && role = "campus" && campus = {:c}',{c:campusId})},notifications:null
 };
}
export function payoutRecord(store:RestStore,term=1){
 const record=store.records.get('disbursements')?.find(row=>row.data.term===term);
 if(!record)throw new PreviewError(404,'Pengajuan tidak ditemukan.');
 return record;
}
export function assertPayoutEditable(store:RestStore){
 const payment=payoutRecord(store);
 if(payment.data.paidAt)throw new PreviewError(409,'Pengajuan yang sudah dibayar terkunci.');
 return payment;
}
export function assertRevision(actual:unknown,expected:unknown){
 if(!Number.isSafeInteger(expected)||Number(actual||1)!==expected)throw new PreviewError(409,'Data berubah di akun/tab lain. Muat data terbaru sebelum mencoba lagi.');
}
