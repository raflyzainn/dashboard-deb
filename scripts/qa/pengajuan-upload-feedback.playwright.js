// Browser tool only, on editable local Administrasi with no pending changes.
async(page)=>{
 const input=page.getByLabel('Bukti rekening',{exact:true});
 await input.setInputFiles({name:'QA-too-large.pdf',mimeType:'application/pdf',buffer:Buffer.alloc(3*1024*1024)});
 await page.getByText('Ukuran berkas 3.0 MB. Maksimal 2 MB; kecilkan berkas lalu pilih kembali.',{exact:true}).waitFor();
 if(await input.inputValue())throw Error('Failed upload still appears selected');
 return {oversizedFileExplained:true,failedSelectionCleared:true};
}
