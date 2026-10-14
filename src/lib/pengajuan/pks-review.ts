export interface PksReview {
 versionId:string;hash:string;sourceRevision:number;complete:boolean;
 state:'draft'|'pf'|'legal'|'revision'|'approved';
 pfBy?:string;pfAt?:string;legalBy?:string;legalAt?:string;note?:string;
}
export function pksApproved(j:any):boolean {
 const review:PksReview|undefined=j?.pksReview;
 return !!review&&review.complete&&review.state==='approved'&&review.sourceRevision===j.documentRevisions?.pks&&!!review.pfBy&&!!review.legalBy;
}
