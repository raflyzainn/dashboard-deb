import PocketBase from 'pocketbase';
import { createHmac } from 'node:crypto';
import { atomic } from './rest-store';
import { accountApi, executeAccount } from './backend';
import { PreviewError } from './preview-error';

const collections = ['account_invitations', 'campus_contacts', 'email_challenges'];
const invalid = () => new PreviewError(400, 'Tautan tidak dapat digunakan.');

/** PocketBase owns SMTP and delivery; only a dedicated proof record's password is changed. */
export async function drainEmails(pb: PocketBase, _settings: Record<string, string>, email?: string) {
  const pending = await pb.collection('account_invitations').getFullList({ filter: pb.filter('delivery = "queued" && revoked = false && used = false && expires > {:now}' + (email ? ' && email = {:email}' : ''), { now: Date.now(), email: email || '' }) });
  for (const candidate of pending) {
    const claimed = await atomic(pb, store => {
      const r=store.findRecordById('account_invitations',candidate.id);
      if(r.getBool('revoked') || r.getBool('used') || r.getString('delivery') !== 'queued') return null;
      const challenge=store.findRecordsByFilter('email_challenges','invitation = {:id}','id',1,0,{id:r.id})[0];
      if(!challenge || challenge.email() !== r.getString('email')) return null;
      r.set('delivery','sending'); r.set('attempts',r.getInt('attempts')+1); store.save(r);
      return {id:r.id,email:r.getString('email')};
    },collections);
    if(!claimed) continue;
    let accepted=false;
    try { await pb.collection('email_challenges').requestPasswordReset(claimed.email); accepted=true; } catch { /* No provider details in public responses. */ }
    await atomic(pb,store=>{
      const r=store.findRecordById('account_invitations',claimed.id);
      if(r.getBool('revoked') || r.getBool('used') || r.getString('delivery')!=='sending') return;
      r.set('delivery',accepted?'sent':'failed');
      r.set('error',accepted?'':'Permintaan email belum diterima. Silakan minta tautan baru.');
      if(accepted)r.set('sentAt',new Date().toISOString()); store.save(r);
    },collections);
  }
}

/** The token claims identify a candidate only; native confirmation/password auth verifies its signature. */
export async function inspectEmailToken(pb: PocketBase, settings: Record<string,string>, token: string, ip: string) {
  let claims: { id: string; collectionId: string; exp: number };
  try {
    if(typeof token!=='string'||token.length>16384) throw invalid();
    claims=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString());
    if(!/^[a-z0-9]{15}$/.test(claims.id)||!Number.isFinite(claims.exp)||claims.exp<=Date.now()/1000)throw invalid();
  }catch{throw invalid();}
  const collection=await pb.collections.getOne('email_challenges');
  if(claims.collectionId!==collection.id)throw invalid();
  let challenge;
  try { challenge=await pb.collection('email_challenges').getOne(claims.id); }catch{throw invalid();}
  const invitation=await pb.collection('account_invitations').getOne(challenge.invitation);
  if(invitation.used||invitation.revoked||invitation.expires<=Date.now()||challenge.email!==invitation.email)throw invalid();
  // Deterministic, server-only password permits recovery if the native confirmation response was lost.
  // A forged token derives a different password and cannot authenticate the proof record.
  const password=createHmac('sha256',settings.DEB_INVITATION_KEY).update('email-proof:'+token).digest('base64url');
  const proof=new PocketBase(pb.baseURL);proof.autoCancellation(false);
  proof.beforeSend=(url,options)=>({url,options:{...options,redirect:'error'}});
  try { await proof.collection('email_challenges').confirmPasswordReset(token,password,password); }catch{ /* Authentication below safely handles consumed or invalid tokens. */ }
  try { const authenticated=await proof.collection('email_challenges').authWithPassword(claims.id,password); if(authenticated.record.id!==challenge.id||authenticated.record.invitation!==invitation.id)throw invalid(); }catch{throw invalid();}
  const wrapper=accountApi(settings).token({id:invitation.id,getString:(k:string)=>String(invitation[k]||''),getInt:(k:string)=>Number(invitation[k]),getFloat:(k:string)=>Number(invitation[k])});
  const details=await executeAccount(pb,settings,null,'inspect',{token:wrapper},ip);
  return {...details,token:wrapper};
}
