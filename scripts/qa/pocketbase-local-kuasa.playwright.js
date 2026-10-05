// Tool Playwright saja; jalankan pada kampus QA Lokal 2 yang belum memiliki RAB.
async(page)=>{
 const origin='http://127.0.0.1:5176',campus='9a2b695c255c938';
 const ctx=await page.context().browser().newContext(),p=await ctx.newPage();
 await p.goto(origin+'/login');await p.getByRole('combobox').selectOption('campus-903');await p.getByRole('button',{name:'Masuk ke ruang kerja'}).click();await p.waitForURL('**/*/dashboard');
 await p.goto(origin+'/campus/pencairan?bagian=rab&butir=rab_penuh&rabStep=upload');
 await p.getByLabel('Unggah Excel RAB 100%',{exact:true}).setInputFiles('static/contoh-rab/01_RAB_10_Unit.xlsx');await p.getByText('Excel berhasil dibaca. Periksa seluruh rincian RAB 100% terlebih dahulu.',{exact:true}).waitFor();
 const rab=p.getByRole('region',{name:'Pengajuan RAB kampus',exact:true});
 if(!await rab.getByRole('button',{name:'4. Periksa Termin 2',exact:true}).isDisabled())throw Error('Langkah belum dibuka harus terkunci');
 await rab.getByRole('button',{name:'Lanjut',exact:true}).click();const inputs=p.getByRole('spinbutton');await inputs.first().waitFor();for(let i=0;i<4;i++)await inputs.nth(i).fill('6');await rab.getByRole('button',{name:'Lanjut',exact:true}).click();await p.waitForURL('**rabStep=term2');await rab.getByRole('button',{name:'Lanjut',exact:true}).click();
 for(const [label,value] of [['Nama bank','Bank QA Kuasa'],['Nomor rekening','9876543210'],['Nama pemilik rekening','Penerima QA'],['Nama penandatangan kampus','Dosen QA'],['Jabatan penandatangan','Dosen'],['Kota tempat surat dibuat','Jakarta'],['Nomor surat permohonan','QA/002'],['Nomor invoice','QA/INV/002'],['Nomor kuitansi','QA/KWT/002']])await p.getByRole('textbox',{name:label,exact:true}).fill(value);
 for(const label of ['Tanggal surat permohonan','Tanggal invoice','Tanggal kuitansi'])await p.getByLabel(label,{exact:true}).fill('2026-09-30');
 await p.getByRole('combobox',{name:/Rekening penerima/}).selectOption('kuasa');await p.getByLabel('Nama pemberi kuasa',{exact:true}).fill('Dosen QA');await p.getByLabel('Nama penerima kuasa',{exact:true}).fill('Penerima QA');await p.getByLabel('Tanggal surat kuasa',{exact:true}).fill('2026-09-30');
 await p.getByRole('button',{name:'Simpan draf',exact:true}).click();await p.getByText('Draf tersimpan. Belum dikirim ke PF.',{exact:true}).waitFor();
 await p.getByLabel('Kop surat kampus',{exact:true}).setInputFiles('static/logo-pf.png');await p.getByRole('img',{name:'Pratinjau kop surat kampus'}).waitFor();
 await p.getByLabel('Bukti rekening',{exact:true}).setInputFiles('static/sk-dummy.pdf');await p.getByRole('link',{name:'sk-dummy.pdf',exact:true}).waitFor();
 const [download]=await Promise.all([p.waitForEvent('download'),p.getByRole('button',{name:'Unduh template surat kuasa',exact:true}).click()]);if(await download.failure())throw Error('Download gagal');
 await p.locator('.docx-host').getByText('SURAT KUASA PENERIMAAN DANA',{exact:true}).waitFor();
 await p.getByLabel('Surat kuasa',{exact:true}).setInputFiles('static/sk-dummy.pdf');await p.getByText('Berkas tersimpan dalam draf.',{exact:true}).waitFor();
 await p.getByLabel('Nomor rekening',{exact:true}).fill('9876543211');await p.getByRole('button',{name:'Simpan draf',exact:true}).click();await p.getByText('Data surat kuasa berubah. Unduh template terbaru dan unggah ulang hasil tanda tangan.',{exact:true}).waitFor();
 await p.getByLabel('Tanggal invoice',{exact:true}).fill('2026-06-17');await p.getByRole('button',{name:'Simpan draf',exact:true}).click();await p.getByText('Invoice: tanggal harus setelah 17 Juni 2026.',{exact:true}).waitFor();
 return{stepGate:true,kuasaDownloaded:download.suggestedFilename(),staleKuasa:true,dateValidation:true,url:p.url()};
}
