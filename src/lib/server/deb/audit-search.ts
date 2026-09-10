import type PocketBase from 'pocketbase';
import { auditOperations } from '../../master-audit';

export function auditSearchFilter(pb: Pick<PocketBase,'filter'>, query:string):string {
  const term=query.trim();
  if(!term)return '';
  const clauses=[pb.filter('before ~ {:term} || after ~ {:term}',{term})];
  for(const [operation,label] of Object.entries(auditOperations)){
    if(label.toLocaleLowerCase('id-ID').includes(term.toLocaleLowerCase('id-ID'))){
      clauses.push(pb.filter('operation = {:operation}',{operation}));
    }
  }
  return clauses.map(clause=>'('+clause+')').join(' || ');
}
