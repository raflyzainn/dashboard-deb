import Docxtemplater from 'docxtemplater';
import type PizZip from 'pizzip';

const ns='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const {str2xml,xml2str}=(Docxtemplater as unknown as {DocUtils:{str2xml(s:string):Document;xml2str(n:Node):string}}).DocUtils;
const children=(node:Element,tag:string)=>Array.from(node.childNodes).filter((n):n is Element=>n.nodeType===1&&(n as Element).namespaceURI===ns&&(n as Element).localName===tag);
const value=(node:Element,tag:string)=>children(node,tag)[0]?.getAttributeNS(ns,'val');
function number(value:number,format:string):string {
 if(format==='lowerLetter'||format==='upperLetter'){
  let text='';for(let n=value;n>0;n=Math.floor((n-1)/26))text=String.fromCharCode(97+(n-1)%26)+text;
  return format==='upperLetter'?text.toUpperCase():text;
 }
 if(format==='lowerRoman'||format==='upperRoman'){
  let text='',n=value;
  for(const [amount,symbol] of [[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']] as const)while(n>=amount){text+=symbol;n-=amount;}
  return format==='lowerRoman'?text.toLowerCase():text;
 }
 return String(value);
}

/** Store list labels as Word text so PDF rasterisation and pagination cannot reset CSS counters. */
export function materializeNumbering(zip:PizZip) {
 const part=zip.file('word/numbering.xml');if(!part)return;
 const numbering=str2xml(part.asText()),doc=str2xml(zip.file('word/document.xml')!.asText());
 const counts=new Map<string,number[]>();
 for(const paragraph of Array.from(doc.getElementsByTagNameNS(ns,'p'))){
  const properties=children(paragraph,'pPr')[0],num=properties&&children(properties,'numPr')[0];if(!properties||!num)continue;
  const id=value(num,'numId'),level=Number(value(num,'ilvl')||0);
  const instance=Array.from(numbering.getElementsByTagNameNS(ns,'num')).find(n=>n.getAttributeNS(ns,'numId')===id);
  const abstractId=instance&&value(instance,'abstractNumId');
  const definition=Array.from(numbering.getElementsByTagNameNS(ns,'abstractNum')).find(n=>n.getAttributeNS(ns,'abstractNumId')===abstractId);
  if(!instance||!definition)continue;
  const levels=children(definition,'lvl'),rule=levels.find(n=>Number(n.getAttributeNS(ns,'ilvl'))===level);if(!rule)continue;
  const override=children(instance,'lvlOverride').find(n=>Number(n.getAttributeNS(ns,'ilvl'))===level);
  const start=Number(override&&value(override,'startOverride')||value(rule,'start')||1);
  const sequence=counts.get(id!)||[];sequence[level]=sequence[level]===undefined?start:sequence[level]+1;
  for(let deeper=level+1;deeper<sequence.length;deeper++){
   const restart=levels.find(n=>Number(n.getAttributeNS(ns,'ilvl'))===deeper);
   if(!restart||value(restart,'lvlRestart')!=='0')delete sequence[deeper];
  }
  counts.set(id!,sequence);
  const label=(value(rule,'lvlText')||'%1.').replace(/%(\d)/g,(_,digit)=>{
   const i=Number(digit)-1,ancestor=levels.find(n=>Number(n.getAttributeNS(ns,'ilvl'))===i);
   return number(sequence[i]??Number(ancestor&&value(ancestor,'start')||1),ancestor&&value(ancestor,'numFmt')||'decimal');
  });
  const indent=children(rule,'pPr')[0]?.getElementsByTagNameNS(ns,'ind')[0];
  if(indent&&!children(properties,'ind').length)properties.appendChild(doc.importNode(indent,true));
  properties.removeChild(num);
  const run=doc.createElementNS(ns,'w:r'),first=children(paragraph,'r')[0],font=first&&children(first,'rPr')[0];
  if(font)run.appendChild(font.cloneNode(true));
  const text=doc.createElementNS(ns,'w:t');text.setAttributeNS('http://www.w3.org/XML/1998/namespace','xml:space','preserve');text.textContent=label+' ';
  run.appendChild(text);paragraph.insertBefore(run,properties.nextSibling);
 }
 zip.file('word/document.xml',xml2str(doc));
}
