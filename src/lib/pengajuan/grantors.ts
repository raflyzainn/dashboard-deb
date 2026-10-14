export interface Grantor {name:string;title:string}
export function grantors(fields:Record<string,string>):Grantor[] {
 if(!fields.pemberiKuasaList)return fields.pemberiKuasa?[{name:fields.pemberiKuasa,title:fields.penandatanganJabatan||''}]:[];
 try{
  const values:unknown=JSON.parse(fields.pemberiKuasaList);
  if(!Array.isArray(values)||values.length>20)return [];
  return values.map(value=>({name:typeof value?.name==='string'?value.name:'',title:typeof value?.title==='string'?value.title:''}));
 }catch{return [];}
}
export function validGrantors(fields:Record<string,string>):boolean {
 const values=grantors(fields);return values.length>0&&values.every(v=>!!v.name.trim()&&!!v.title.trim()&&v.name.length<=200&&v.title.length<=200);
}
