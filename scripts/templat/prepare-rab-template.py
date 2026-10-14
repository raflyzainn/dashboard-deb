"""Salin desain Excel yang disetujui tanpa mengubah rumus, grafik, atau formatnya."""
import re
import sys
import zipfile
from pathlib import Path

source = Path(sys.argv[1])
target = Path(__file__).resolve().parents[2] / 'static/templat/Template_RAB_DEB.xlsx'
with zipfile.ZipFile(source) as original, zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as output:
    for entry in original.infolist():
        content = original.read(entry.filename)
        if entry.filename == 'xl/workbook.xml':
            content = re.sub(rb'activeTab="\d+"', b'activeTab="0"', content)
            content = re.sub(rb'<calcPr\b[^>]*/>', b'<calcPr calcMode="auto" fullCalcOnLoad="1"/>', content)
        elif re.fullmatch(r'xl/worksheets/sheet\d+\.xml', entry.filename):
            content = re.sub(rb' tabSelected="[^"]*"', b'', content)
            content = content.replace(b'type="decimal"', b'type="whole"')
            content = content.replace(b'error="Masukkan angka yang lebih besar dari 0."', b'error="Masukkan bilangan bulat lebih besar dari 0, tanpa desimal."')
            if entry.filename == 'xl/worksheets/sheet1.xml':
                content = re.sub(rb'(<row r="16"[^>]* ht=")[^"]*', rb'\g<1>80', content)
        elif entry.filename == 'xl/styles.xml':
            content = content.replace(b'#,##0.00', b'#,##0').replace(b'0.0%', b'0%')
            for old, new in [(b'2', b'1'), (b'4', b'3'), (b'10', b'9')]:
                content = content.replace(b'numFmtId="' + old + b'"', b'numFmtId="' + new + b'"')
        elif entry.filename == 'xl/sharedStrings.xml':
            content = content.replace(
                'Format baru ini belum dihubungkan ke fitur unggah aplikasi; gunakan untuk menyiapkan dan meninjau format terlebih dahulu.'.encode(),
                'Unggah untuk menambahkan item ke tabel website. Draf disimpan otomatis; lengkapi isian lalu Periksa RAB 100%. Qty, Volume, dan Harga Satuan wajib bilangan bulat tanpa desimal. Contoh tidak ikut diimpor. Jumlah dibagi dari Qty × Volume. Total RAB harus sesuai SK sebelum pengajuan.'.encode())
        output.writestr(entry, content)
print(target)
