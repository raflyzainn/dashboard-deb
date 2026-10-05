"""
Stages the proposal archive for loading: one PDF per campus and version, built from the files in
D:\deb\Proposal DEB Sobat Bumi Tahun 2025-2026 (PDF as is; ZIP merged into one PDF with the proposal first, then
BMC, lampiran and other PDFs, and photos as pages; DOCX left for conversion). Output goes to
D:\deb\Analisis\proposals\<CODE>_v<N>.pdf plus manifest.json (codes, versions, sizes, source file names only).
Usage: python scripts/proposals/stage-proposals.py
"""
import io, json, os, re, sys, zipfile, hashlib
from pypdf import PdfWriter, PdfReader
from PIL import Image

sys.stdout.reconfigure(encoding='utf-8')
SRC = r'D:\deb\Proposal DEB Sobat Bumi Tahun 2025-2026'
OUT = r'D:\deb\Analisis\proposals'
os.makedirs(OUT, exist_ok=True)
NAME = re.compile(r'^DEB[ _](?P<code>.+?)(?:[ _]Ver\s*(?P<ver>\d+))?\.(?P<ext>pdf|zip|docx)$', re.I)
EXTRA = re.compile(r'bmc|lampiran|narasi|mentor|foto|salinan', re.I)


def key(code: str) -> str:
    return re.sub(r'[^A-Z0-9]+', '', code.upper())


def pdf_bytes_of_image(data: bytes) -> bytes:
    img = Image.open(io.BytesIO(data)).convert('RGB')
    buf = io.BytesIO()
    img.save(buf, format='PDF', resolution=150)
    return buf.getvalue()


def merge(parts: list[tuple[str, bytes]]) -> bytes:
    writer = PdfWriter()
    for name, data in parts:
        if name.lower().endswith(('.jpg', '.jpeg', '.png')):
            data = pdf_bytes_of_image(data)
        try:
            reader = PdfReader(io.BytesIO(data))
            if reader.is_encrypted:
                reader.decrypt('')
            for page in reader.pages:
                writer.add_page(page)
        except Exception as e:  # noqa: BLE001
            print('  skip unreadable part', name[:40], e)
    buf = io.BytesIO()
    writer.write(buf)
    return buf.getvalue()


groups: dict[tuple[str, int], list[str]] = {}
for f in sorted(os.listdir(SRC)):
    m = NAME.match(f)
    if not m:
        print('unrecognised', f)
        continue
    groups.setdefault((key(m['code']), int(m['ver'] or 1)), []).append(f)

manifest = []
for (code, ver), files in sorted(groups.items()):
    parts: list[tuple[str, bytes]] = []
    docx: list[str] = []
    for f in files:
        p = os.path.join(SRC, f)
        if f.lower().endswith('.pdf'):
            parts.append((f, open(p, 'rb').read()))
        elif f.lower().endswith('.docx'):
            target = os.path.join(OUT, f'{code}_v{ver}_{len(docx) + 1}.docx')
            open(target, 'wb').write(open(p, 'rb').read())
            docx.append({'staged': os.path.basename(target), 'original': f})
        else:
            z = zipfile.ZipFile(p)
            inner = [n for n in z.namelist() if not n.endswith('/') and not os.path.basename(n).startswith('._')]
            pdfs = [n for n in inner if n.lower().endswith('.pdf') or ('.' not in os.path.basename(n) and z.open(n).read(5) == b'%PDF-')]
            main = sorted([n for n in pdfs if not EXTRA.search(os.path.basename(n))], key=lambda n: -z.getinfo(n).file_size) or sorted(pdfs, key=lambda n: -z.getinfo(n).file_size)
            order = main[:1] + [n for n in pdfs if n not in main[:1]] + [n for n in inner if n.lower().endswith(('.jpg', '.jpeg', '.png'))]
            for n in order:
                parts.append((os.path.basename(n), z.read(n)))
            for n in inner:
                if n.lower().endswith('.docx'):
                    target = os.path.join(OUT, f'{code}_v{ver}_{len(docx) + 1}.docx')
                    open(target, 'wb').write(z.read(n))
                    docx.append({'staged': os.path.basename(target), 'original': os.path.basename(n)})
    entry = {'code': code, 'version': ver, 'sources': files, 'parts': len(parts), 'docx': docx}
    if parts:
        data = parts[0][1] if len(parts) == 1 and parts[0][0].lower().endswith('.pdf') else merge(parts)
        target = os.path.join(OUT, f'{code}_v{ver}.pdf')
        open(target, 'wb').write(data)
        entry.update(file=os.path.basename(target), size=len(data), sha256=hashlib.sha256(data).hexdigest(), pages=len(PdfReader(io.BytesIO(data)).pages))
    manifest.append(entry)
    print(f"{code} v{ver}: {len(parts)} pdf parts, {entry.get('size', 0) // 1024} KB, {entry.get('pages', 0)} pages, docx {len(docx)}")

for entry in manifest:
    if entry.get('file') or not entry['docx']:
        continue
    converted = [(d['original'], os.path.join(OUT, d['staged'][:-5] + '.pdf')) for d in entry['docx']]
    converted = [c for c in converted if os.path.exists(c[1])]
    if len(converted) != len(entry['docx']):
        print(f"{entry['code']} v{entry['version']}: {len(converted)}/{len(entry['docx'])} DOCX converted, waiting for Word")
        continue
    converted.sort(key=lambda c: (0 if re.search(r'proposal', c[0], re.I) else 1, c[0]))
    data = merge([(name, open(path, 'rb').read()) for name, path in converted])
    target = os.path.join(OUT, f"{entry['code']}_v{entry['version']}.pdf")
    open(target, 'wb').write(data)
    entry.update(file=os.path.basename(target), size=len(data), sha256=hashlib.sha256(data).hexdigest(), pages=len(PdfReader(io.BytesIO(data)).pages), parts=len(converted))
    print(f"{entry['code']} v{entry['version']}: merged {len(converted)} converted DOCX, {len(data) // 1024} KB, {entry['pages']} pages")
json.dump(manifest, open(os.path.join(OUT, 'manifest.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('staged', len(manifest), 'versions for', len({m['code'] for m in manifest}), 'campuses')
