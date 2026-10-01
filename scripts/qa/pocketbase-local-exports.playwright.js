// Tool browser: akun QA 901, versi 1 berisi 4 item dengan jumlah T1 masing-masing 6.
async(page)=>{
 await page.goto('http://127.0.0.1:5176/campus/pencairan?bagian=rab&butir=rab_penuh');const output=[];
 for(const [label,expected] of [['Unduh RAB 100%',20000000],['Unduh RAB Termin 1',12000000],['Unduh RAB Termin 2',8000000]]){
  const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:label,exact:true}).click()]);
  const chunks=[];for await(const chunk of await download.createReadStream())chunks.push(chunk);
  const total=await page.evaluate(async bytes=>{const Excel=(await import('/node_modules/.vite/deps/exceljs.js')).default,workbook=new Excel.Workbook();await workbook.xlsx.load(new Uint8Array(bytes));return [13,14,21,22].reduce((sum,n)=>sum+workbook.worksheets[0].getCell('R'+n).value.result,0)},Array.from(Buffer.concat(chunks)));
  if(total!==expected)throw Error(label+': nominal ekspor salah');output.push({file:download.suggestedFilename(),total});
 }
 return output;
}
