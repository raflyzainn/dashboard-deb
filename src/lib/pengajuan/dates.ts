/** Calendar dates are compared without local timezone or today's date. */
export function validDate(value:string):boolean {
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||value.startsWith('0000'))return false;
 const date=new Date(value+'T00:00:00Z');
 return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;
}
export function nextDate(value:string):string|undefined {
 if(!validDate(value))return undefined;
 const date=new Date(value+'T00:00:00Z');date.setUTCDate(date.getUTCDate()+1);
 const next=date.toISOString().slice(0,10);return validDate(next)?next:undefined;
}
export function minimumDate(key:string,fields:Record<string,string>):string|undefined {
 const source=key==='tanggalInvois'?fields.tanggalSuratPermohonan:key==='tanggalKuitansi'?fields.tanggalInvois:fields.tanggalPerjanjian;
 return key==='tanggalInvois'?(validDate(source||'')?source:undefined):nextDate(source||'');
}
export function chronologyErrors(fields:Record<string,string>,skDate:string,period:{agreementStart?:string;agreementEnd?:string}) {
 const errors:{key:string;text:string}[]=[];
 const dates:Record<string,string>={skDate,tanggalPerjanjian:fields.tanggalPerjanjian,tanggalSuratPermohonan:fields.tanggalSuratPermohonan,tanggalInvois:fields.tanggalInvois,tanggalKuitansi:fields.tanggalKuitansi,agreementStart:period.agreementStart||'',agreementEnd:period.agreementEnd||''};
 if(fields.jenisRekening==='kuasa')dates.tanggalKuasa=fields.tanggalKuasa;
 const labels:Record<string,string>={skDate:'SK',tanggalPerjanjian:'PKS',tanggalSuratPermohonan:'Surat permohonan',tanggalInvois:'Invoice',tanggalKuitansi:'Kuitansi',tanggalKuasa:'Surat kuasa',agreementStart:'Awal masa perjanjian',agreementEnd:'Akhir masa perjanjian'};
 for(const [key,value] of Object.entries(dates))if(!validDate(value||''))errors.push({key,text:labels[key]+': isi tanggal yang valid.'});
 for(const [before,after,strict] of [['skDate','tanggalPerjanjian',false],['tanggalPerjanjian','tanggalSuratPermohonan',true],['tanggalSuratPermohonan','tanggalInvois',false],['tanggalInvois','tanggalKuitansi',true],['tanggalPerjanjian','tanggalKuasa',true],['agreementStart','agreementEnd',false]] as const){
  if(validDate(dates[before]||'')&&validDate(dates[after]||'')&&(strict?dates[after]<=dates[before]:dates[after]<dates[before]))errors.push({key:after,text:`${labels[after]} harus ${strict?'setelah':'pada atau setelah'} tanggal ${labels[before]}.`});
 }
 return errors;
}
