import { transaction } from '../../src/lib/data/demo/store';
import { createEngine } from '../../src/lib/pengajuan/engine';
import { BUDGET } from '../rab/model';
import type { AppSession } from '../../src/lib/types';
export { itemLines } from '../../src/lib/pengajuan/engine';
export const createApi=(actor:()=>Promise<AppSession>)=>createEngine(actor,{transaction,origin:location.origin,amountSen:BUDGET,dummy:true,id:()=>crypto.randomUUID()});
