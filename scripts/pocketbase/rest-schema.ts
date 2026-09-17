import type PocketBase from 'pocketbase';
import type { CollectionModel } from 'pocketbase';
import schema from '../../db-schema/collections.json' with { type: 'json' };
import { randomBytes } from 'node:crypto';

/** Standard superuser APIs only; never drops collections or replaces business records. */
export async function configureRestSchema(pb: PocketBase, options: { publicURL?: string; local?: boolean } = {}) {
  const origin = options.publicURL || process.env.DEB_PUBLIC_URL;
  if (!origin || (!/^https:\/\/[^/?#]+$/.test(origin) && !(options.local && /^http:\/\/127\.0\.0\.1:517[67]$/.test(origin)))) throw new Error('Set a valid DEB_PUBLIC_URL before provisioning.');
  const existing=await pb.collections.getFullList();
  const definitions=structuredClone(schema) as unknown as CollectionModel[];
  const ids=new Map(definitions.filter(c=>c.id).map(c=>[c.id,existing.find(e=>e.name===c.name)?.id||c.id]));
  for(const definition of definitions) {
    const prior=existing.find(c=>c.name===definition.name);
    if(prior)definition.id=prior.id;
    definition.fields=definition.fields.map(field=>{
      const saved=prior?.fields.find(f=>f.name===field.name);
      return {...field,...(saved?{id:saved.id}:{}),...(field.type==='relation'?{collectionId:ids.get(String(field.collectionId))||field.collectionId}:{})};
    });
    // Preserve operator-added fields instead of silently deleting their stored values.
    if(prior)definition.fields.push(...prior.fields.filter(f=>!definition.fields.some(d=>d.name===f.name)));
  }
  await pb.collections.import(definitions, false);
  await pb.settings.update({ meta: { appURL: origin } });
  await pb.collections.update('users', { authRule: 'active = true && verified = true' + (options.local ? '' : ' && simulated = false') });
  if(!options.local) await pb.collections.update('users',{authToken:{secret:randomBytes(48).toString('base64url')}});
  if(!options.local) {
    const current=await pb.settings.getAll();
    if(!current.rateLimits?.enabled) await pb.settings.update({rateLimits:{enabled:true,rules:[
      {label:'*:auth',audience:'',duration:60,maxRequests:60},
      {label:'/api/',audience:'',duration:10,maxRequests:600}
    ]}});
  }
  // Invalidate previously issued native lifecycle links. Application links are managed by SvelteKit.
  await pb.collections.update('users', Object.fromEntries(['passwordResetToken', 'emailChangeToken', 'verificationToken'].map(name => [name, { secret: randomBytes(48).toString('base64url') }])));
  await pb.settings.update({ batch: { enabled: true, maxRequests: 2000, timeout: 30, maxBodySize: 16777216 } });
}
