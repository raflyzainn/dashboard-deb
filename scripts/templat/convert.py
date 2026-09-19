"""
Converts the official Word templates of Pencairan DEB into mail merge templates for the app.

Source (outside the repo, never copied in):
  D:\\deb\\Review Draft Dokumen Pencairan DEB 2025\\Format RAB dan Pencairan Dana\\
    DRAFT PKS DEB.docx                       -> static/templat/pks-standar.docx
    160726 - Permohonan Pencairan Dana ....docx -> static/templat/permohonan.docx
    160726 - INVOIS PENERIMAAN DANA ....docx    -> static/templat/invois.docx
    160726 - KUITANSI PENERIMAAN DANA ....docx  -> static/templat/kuitansi.docx

Run from the repo root:  python scripts/templat/convert.py [--source DIR] [--out DIR]
Needs Python 3 and lxml. Then check the result with:  node scripts/templat/check.mjs

What the conversion does:
  1. Every yellow highlighted run (the fill in fields of the official template) becomes a placeholder, and the highlight is removed.
     Highlighted runs that are only labels or fixed words keep their text without the highlight.
  2. Fixed text that must follow the data becomes a placeholder too: "Tahun Ketiga", the SK number and date, the agreement date in words,
     the agreement period, the report deadline, the Pertamina Foundation signatory (found by sentence structure, never by name).
  3. The three letters bundle a Termin 1 and a Termin 2 page. Only the Termin 1 page is kept: the "*Notes" instruction line and
     everything after it are removed from the body.
  4. Tracked insertions are accepted so the generated documents carry no revision marks.
  5. The letterhead text box "KOP UNIVERSITAS" in the invois and kuitansi headers becomes the campus name in capitals with the
     address under it, and the box is widened to 12 cm so both lines fit.

Placeholders (docxtemplater tags, the same list lives in src/lib/merge.ts):
  From the SK and the campus record
    {namaPerguruanTinggi} {namaPerguruanTinggiKapital}   campus name as written in the SK, and in capitals
    {judulProgram} {judulProgramKapital}                 program title
    {tahunProgram} {tahunProgramKapital} {tahunProgramKecil}   "Kedua" or "Ketiga", "KEDUA", "kedua"
    {nomorSk} {tanggalSk}                                SK number, SK date in words
    {nilaiBantuan} {nilaiBantuanTerbilang}               Nilai Kegiatan, e.g. Rp74.999.000, and in words
  From Profil DEB
    {alamatPerguruanTinggi}                              campus address, one line
    {lokasiProgram}                                      program village and region
    {namaPenandatangan} {jabatanPenandatangan} {namaPenandatanganKapital} {jabatanPenandatanganKapital}
    {namaMentor} {namaKoordinator}
  From the disbursement properties (typed once in Buat dokumen)
    {nomorPksPf} {nomorPksKampus}
    {hariPerjanjian} {tanggalPerjanjianHuruf} {bulanPerjanjian} {tahunPerjanjianHuruf} {tanggalPerjanjianAngka}
    {nomorSuratPermohonan} {tanggalSuratPermohonan} {tempatSurat}
    {nomorInvois} {tanggalInvois}
    {nomorKuitansi} {tanggalKuitansi}
  From the checked documents
    {termin1} {termin1Terbilang}                         Termin 1 requested, and in words
    {namaBank} {nomorRekening} {namaPemilikRekening}
  From program settings
    {pfSignatoryName} {pfSignatoryTitle} {pfSignatoryNameKapital} {pfSignatoryTitleKapital}
    {masaPerjanjianMulai} {masaPerjanjianSelesai} {batasLaporan}
"""
import argparse
import copy
import os
import re
import sys
import zipfile

from lxml import etree

sys.stdout.reconfigure(encoding='utf-8')

W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
XML_NS = 'http://www.w3.org/XML/1998/namespace'
W = '{%s}' % W_NS
SOURCE_DIR = 'D:/deb/Review Draft Dokumen Pencairan DEB 2025/Format RAB dan Pencairan Dana'
OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'static', 'templat')

TAG = re.compile(r'\{[A-Za-z0-9]+\}')
PAGE_BREAK = '\x0c'


class ConversionError(Exception):
    pass


# ----- run model: text of simple runs, rebuilt after replacement -----

SIMPLE_CHILDREN = {W + 'rPr', W + 't', W + 'tab', W + 'br', W + 'lastRenderedPageBreak', W + 'softHyphen', W + 'noBreakHyphen', W + 'cr'}


def simple_runs(p):
    """Runs of a paragraph whose content is only text, tabs and breaks. Other runs are left untouched."""
    out = []
    for r in p.iter(W + 'r'):
        if all(child.tag in SIMPLE_CHILDREN for child in r):
            out.append(r)
    return out


def run_text(r):
    parts = []
    for child in r:
        if child.tag == W + 't':
            parts.append(child.text or '')
        elif child.tag == W + 'tab':
            parts.append('\t')
        elif child.tag == W + 'br':
            parts.append(PAGE_BREAK if child.get(W + 'type') == 'page' else '\n')
        elif child.tag == W + 'cr':
            parts.append('\n')
    return ''.join(parts)


def set_run_text(r, text):
    for child in list(r):
        if child.tag != W + 'rPr':
            r.remove(child)
    for piece in re.split(r'([\t\n%s])' % PAGE_BREAK, text):
        if piece == '':
            continue
        if piece == '\t':
            etree.SubElement(r, W + 'tab')
        elif piece == '\n':
            etree.SubElement(r, W + 'br')
        elif piece == PAGE_BREAK:
            etree.SubElement(r, W + 'br').set(W + 'type', 'page')
        else:
            t = etree.SubElement(r, W + 't')
            t.text = piece
            t.set('{%s}space' % XML_NS, 'preserve')


def is_highlighted(r):
    rpr = r.find(W + 'rPr')
    if rpr is None:
        return False
    if rpr.find(W + 'highlight') is not None:
        return True
    shd = rpr.find(W + 'shd')
    return shd is not None and (shd.get(W + 'fill') or 'auto').upper() not in ('AUTO', 'FFFFFF')


def unhighlight(r):
    rpr = r.find(W + 'rPr')
    if rpr is None:
        return
    for tag in ('highlight', 'shd'):
        for el in rpr.findall(W + tag):
            rpr.remove(el)


def paragraph_text(p):
    return ''.join(run_text(r) for r in simple_runs(p))


def enclosing(el, tag):
    parent = el.getparent()
    while parent is not None:
        if parent.tag == W + tag:
            return parent
        parent = parent.getparent()
    return None


class Context:
    """Counters keyed per rule and per enclosing table row or paragraph, so "first name is the mentor, second the coordinator" works."""

    def __init__(self):
        self.counters = {}

    def count(self, key, scope):
        k = (key, scope)
        self.counters[k] = self.counters.get(k, 0) + 1
        return self.counters[k]


def row_label(p):
    """Text of the first cell of the table row that holds this paragraph, for "Nomor Rekening : ....." style tables."""
    tr = enclosing(p, 'tr')
    if tr is None:
        return ''
    cells = tr.findall(W + 'tc')
    return ' '.join(paragraph_text(x) for c in cells[:2] for x in c.iter(W + 'p')).strip()


# ----- field pass: highlighted spans -> placeholders -----

def apply_fields(root, rules, ctx, label):
    """rules: list of (regex, replacement). replacement is a string with \\1 groups, or a function(match, paragraph, ctx) -> string."""
    unmatched = []
    for p in root.iter(W + 'p'):
        runs = simple_runs(p)
        spans, current = [], []
        for r in runs:
            if is_highlighted(r):
                current.append(r)
            elif current:
                spans.append(current)
                current = []
        if current:
            spans.append(current)
        for span in spans:
            joined = ''.join(run_text(r) for r in span)
            replacement = match_rule(rules, joined, p, ctx)
            if replacement is not None:
                set_run_text(span[0], replacement)
                unhighlight(span[0])
                for r in span[1:]:
                    r.getparent().remove(r)
                continue
            for r in span:
                text = run_text(r)
                single = match_rule(rules, text, p, ctx)
                if single is None:
                    unmatched.append(repr(text) + ' in ' + repr(paragraph_text(p)[:80]))
                    continue
                set_run_text(r, single)
                unhighlight(r)
    if unmatched:
        raise ConversionError('%s: highlighted text without a rule:\n  ' % label + '\n  '.join(unmatched))


def match_rule(rules, text, p, ctx):
    """Tries the rules on the trimmed text, then on the text without its surrounding brackets. Bracket only spans disappear."""
    key = text.strip()
    keys = [key]
    bare = key.strip('[]').strip()
    if bare != key:
        keys.append(bare)
    for candidate in keys:
        for pattern, replacement in rules:
            m = re.fullmatch(pattern, candidate)
            if not m:
                continue
            return replacement(m, p, ctx) if callable(replacement) else m.expand(replacement)
    if re.fullmatch(r'[\[\]\s]*', key):
        return ''
    return None


# ----- text pass: fixed wording -> placeholders, run aware -----

def replace_text(p, pattern, replacement, ctx, where=None):
    """Replaces every match of pattern in the paragraph text, even when the match spans several runs. Returns the count."""
    if where and not where(p):
        return 0
    count = 0
    for _ in range(50):
        runs = simple_runs(p)
        texts = [run_text(r) for r in runs]
        full = ''.join(texts)
        m = re.search(pattern, full)
        if not m or m.end() == m.start():
            break
        new = replacement(m, p, ctx) if callable(replacement) else m.expand(replacement)
        start, end = m.start(), m.end()
        offsets, pos = [], 0
        for t in texts:
            offsets.append(pos)
            pos += len(t)
        first = max(i for i, o in enumerate(offsets) if o <= start and texts[i] != '' or i == 0) if runs else 0
        # the run that contains the last character of the match
        last = first
        for i, o in enumerate(offsets):
            if o < end and o + len(texts[i]) >= end and texts[i] != '':
                last = i
        if first == last:
            local = texts[first]
            set_run_text(runs[first], local[:start - offsets[first]] + new + local[end - offsets[first]:])
        else:
            set_run_text(runs[first], texts[first][:start - offsets[first]] + new)
            for i in range(first + 1, last):
                set_run_text(runs[i], '')
            set_run_text(runs[last], texts[last][end - offsets[last]:])
        count += 1
        if new and re.search(pattern, new):
            break
    return count


def apply_texts(root, rules, ctx, label):
    """rules: list of dicts with pattern, repl, optional where, optional expect (count that must be found)."""
    for rule in rules:
        total = 0
        for p in root.iter(W + 'p'):
            total += replace_text(p, rule['pattern'], rule['repl'], ctx, rule.get('where'))
        expect = rule.get('expect')
        if expect is not None and total != expect:
            raise ConversionError('%s: rule %r matched %d times, expected %d' % (label, rule['pattern'], total, expect))
        if expect is None and total == 0:
            raise ConversionError('%s: rule %r matched nothing' % (label, rule['pattern']))


BRACKET_RULES = [
    {'pattern': r'\[\s*(\{[A-Za-z0-9]+\})', 'repl': r'\1', 'expect': None},
    {'pattern': r'(\{[A-Za-z0-9]+\})\s*\]', 'repl': r'\1', 'expect': None},
]


def strip_brackets(root, ctx):
    for rule in BRACKET_RULES:
        for p in root.iter(W + 'p'):
            replace_text(p, rule['pattern'], rule['repl'], ctx)


# ----- structural passes -----

def accept_tracked_changes(root):
    for ins in list(root.iter(W + 'ins')):
        parent = ins.getparent()
        index = parent.index(ins)
        for child in list(ins):
            parent.insert(index, child)
            index += 1
        parent.remove(ins)
    for tag in ('del', 'moveFrom'):
        for el in list(root.iter(W + tag)):
            el.getparent().remove(el)
    for tag in ('rPrChange', 'pPrChange', 'sectPrChange', 'tblPrChange', 'trPrChange', 'tcPrChange', 'numberingChange'):
        for el in list(root.iter(W + tag)):
            el.getparent().remove(el)


def keep_termin_1_only(root, label):
    """Removes the "*Notes" line and everything after it in the body, except the final section properties."""
    body = root.find(W + 'body')
    children = list(body)
    start = None
    for i, el in enumerate(children):
        if el.tag == W + 'p' and paragraph_text(el).strip().startswith('*Notes'):
            start = i
            break
    if start is None:
        raise ConversionError('%s: the "*Notes" line that separates Termin 1 from Termin 2 was not found' % label)
    removed = 0
    for el in children[start:]:
        if el.tag == W + 'sectPr':
            continue
        body.remove(el)
        removed += 1
    # drop trailing empty paragraphs so the page ends after the signatures
    while True:
        last = [el for el in body if el.tag != W + 'sectPr']
        if last and last[-1].tag == W + 'p' and not paragraph_text(last[-1]).strip() and last[-1].find(W + 'pPr/' + W + 'sectPr') is None:
            body.remove(last[-1])
        else:
            break
    return removed


def pf_signature_block(root, label):
    """In the PKS signature table, the two lines under "PIHAK PERTAMA," are the PF signatory name and title."""
    done = 0
    for tc in root.iter(W + 'tc'):
        paragraphs = [p for p in tc.iter(W + 'p')]
        if not paragraphs or not re.fullmatch(r'PIHAK PERTAMA,?', paragraph_text(paragraphs[0]).strip()):
            continue
        lines = [p for p in paragraphs[1:] if paragraph_text(p).strip()]
        if len(lines) < 2:
            raise ConversionError('%s: PIHAK PERTAMA signature cell has fewer than two lines' % label)
        replace_whole(lines[0], '{pfSignatoryNameKapital}')
        replace_whole(lines[1], '{pfSignatoryTitleKapital}')
        done += 1
    if done != 1:
        raise ConversionError('%s: expected one PIHAK PERTAMA signature cell, found %d' % (label, done))


WP = '{http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing}'
A = '{http://schemas.openxmlformats.org/drawingml/2006/main}'
V = '{urn:schemas-microsoft-com:vml}'
LETTERHEAD_CX, LETTERHEAD_CY = 4320000, 540000  # 12 cm by 1.5 cm, wide enough for a campus name and its address


def letterhead(header, label):
    """Widens the small letterhead text box and puts the address on its own, lighter line under the campus name."""
    boxes = 0
    for p in header.iter(W + 'p'):
        for r in simple_runs(p):
            text = run_text(r)
            if '{alamatPerguruanTinggi}' not in text or '{namaPerguruanTinggiKapital}' not in text:
                continue
            name, address = text.split('\n', 1)
            set_run_text(r, name + '\n')
            second = copy.deepcopy(r)
            rpr = second.find(W + 'rPr')
            if rpr is not None:
                for tag in ('b', 'bCs'):
                    for el in rpr.findall(W + tag):
                        rpr.remove(el)
                for tag in ('sz', 'szCs'):
                    for el in rpr.findall(W + tag):
                        el.set(W + 'val', '18')
            set_run_text(second, address)
            r.addnext(second)
            boxes += 1
    for ext in list(header.iter(WP + 'extent')) + list(header.iter(A + 'ext')):
        ext.set('cx', str(LETTERHEAD_CX))
        ext.set('cy', str(LETTERHEAD_CY))
    for shape in header.iter(V + 'shape'):
        style = shape.get('style') or ''
        style = re.sub(r'width:[^;]+', 'width:%.1fpt' % (LETTERHEAD_CX / 12700), style)
        style = re.sub(r'height:[^;]+', 'height:%.1fpt' % (LETTERHEAD_CY / 12700), style)
        shape.set('style', style)
    if boxes != 2:
        raise ConversionError('%s: expected the letterhead text twice (shape and fallback), found %d' % (label, boxes))


def replace_whole(p, text):
    runs = simple_runs(p)
    if not runs:
        raise ConversionError('paragraph without simple runs: ' + paragraph_text(p))
    set_run_text(runs[0], text)
    unhighlight(runs[0])
    for r in runs[1:]:
        r.getparent().remove(r)


# ----- rules per template -----

def by_row(m, p, ctx):
    label = row_label(p)
    for needle, tag in (('Nomor Rekening', '{nomorRekening}'), ('Nama Pemilik Rekening', '{namaPemilikRekening}'), ('Nama Bank', '{namaBank}')):
        if needle in label:
            return tag
    raise ConversionError('dotted field in an unknown table row: ' + label)


def mentor_or_koordinator(m, p, ctx):
    tr = enclosing(p, 'tr')
    scope = tr if tr is not None else p
    n = ctx.count('nama', scope.getroottree().getpath(scope))
    if n == 1:
        return '{namaMentor}'
    if n == 2:
        return '{namaKoordinator}'
    raise ConversionError('more than two signatory names in one row')


def pks_number(m, p, ctx):
    n = ctx.count('nomorPks', 'document')
    if n == 1:
        return '{nomorPksPf}'
    if n == 2:
        return '{nomorPksKampus}'
    raise ConversionError('more than two PKS numbers found')


def kop(m, p, ctx):
    """The letterhead text box appears twice in the header (Word shape and its fallback); both get the campus name and address."""
    return '{namaPerguruanTinggiKapital}\n{alamatPerguruanTinggi}'


SIGNATURE_RULES = [
    (r'Nama Kampus|Nama Universitas|Nama Univ', '{namaPerguruanTinggi}'),
    (r'Nama Lengkap|Nama', mentor_or_koordinator),
]
BANK_RULES = [
    (r'Pertamina Foundation', '{namaPemilikRekening}'),
    (r'\d{6,}', '{nomorRekening}'),
    (r'Mandiri', '{namaBank}'),
]
AMOUNT_RULES = [
    (r'Rp\.?\s*[\d.]+,-', '{termin1}'),
    (r'.*\bRupiah\b', '{termin1Terbilang}'),
]

PKS_FIELDS = [
    (r'NAMA UNIVERSITAS/PERGURUAN TINGGI', '{namaPerguruanTinggiKapital}'),
    (r'JUDUL PROPOSAL', '{judulProgramKapital}'),
    (r'Judul Proposal', '{judulProgram}'),
    (r'Nomor:', 'Nomor:'),
    (r'\[', ''),
    (r'Nama Universitas/Perguruan Tinggi', '{namaPerguruanTinggi}'),
    (r'alamat universitas/perguruan tinggi', '{alamatPerguruanTinggi}'),
    (r'diisi dengan pejabat yang bertandatangan', '{namaPenandatangan} dalam kapasitasnya sebagai {jabatanPenandatangan}'),
    (r'Nama Universitas atau Perguruan Tinggi', '{namaPerguruanTinggi}'),
    (r'\], selanjutnya dalam', ', selanjutnya dalam '),
    (r'PERJANJIAN', 'PERJANJIAN'),
    (r'ini disebut “', ' ini disebut “'),
    (r'PIHAK KEDUA', 'PIHAK KEDUA'),
    (r'”\.', '”.'),
    (r'Rp\[ditulis dengan angka\],-\s*\[ditulis dengan huruf\]', '{nilaiBantuan} ({nilaiBantuanTerbilang})'),
    (r'[…\.]+', by_row),
    (r'Nama PROGRAM DEB', '{judulProgram}'),
    (r'Lokasi PROGRAM DEB', '{lokasiProgram}'),
    (r'NAMA PEJABAT YANG MEWAKILI', '{namaPenandatanganKapital}'),
    (r'JABATAN', '{jabatanPenandatanganKapital}'),
]
PKS_TEXTS = [
    {'pattern': r'TAHUN\s+KETIGA', 'repl': 'TAHUN {tahunProgramKapital}', 'expect': 1},
    {'pattern': r'Tahun Ketiga', 'repl': 'Tahun {tahunProgram}', 'expect': 4},
    {'pattern': r'tahun ketiga', 'repl': 'tahun {tahunProgramKecil}', 'expect': 1},
    {'pattern': r'hari \w+ tanggal [\w ]+ bulan \w+ tahun [\w ]+ \(\d{2}-\d{2}-\d{4}\)',
     'repl': 'hari {hariPerjanjian} tanggal {tanggalPerjanjianHuruf} bulan {bulanPerjanjian} tahun {tahunPerjanjianHuruf} ({tanggalPerjanjianAngka})', 'expect': 1},
    {'pattern': r'(diwakili oleh )(.+?)( dalam kapasitasnya sebagai )(.+?)(, oleh dan karenanya)', 'repl': r'\1{pfSignatoryName}\3{pfSignatoryTitle}\5',
     'where': lambda p: 'YAYASAN PERTAMINA' in paragraph_text(p), 'expect': 1},
    {'pattern': r'Nomor Kpts-\S+ Tentang', 'repl': 'Nomor {nomorSk} Tentang', 'expect': 2},
    {'pattern': r'(Tahun Keberlanjutan 2025/2026, tanggal )\d{2} \w+ \d{4}', 'repl': r'\1{tanggalSk}', 'expect': 2},
    {'pattern': r'24 Desember 2025', 'repl': '{masaPerjanjianMulai}', 'expect': 2},
    {'pattern': r'31 Desember 2026', 'repl': '{masaPerjanjianSelesai}', 'expect': 2},
    {'pattern': r'15 Desember 2026', 'repl': '{batasLaporan}', 'expect': 4},
    {'pattern': r'\[\.{5,}\]', 'repl': pks_number, 'expect': 2},
]

PERMOHONAN_FIELDS = [
    (r'Jakarta, \d{1,2} \w+ \d{4}', '{tempatSurat}, {tanggalSuratPermohonan}'),
    (r'\d{2}/PK/M/[IVX]+/\d{4}', '{nomorSuratPermohonan}'),
    (r'5 \(lima\) berkas', '5 (lima) berkas'),
    (r'Sesuai No\. PKS Universitas masing-masing', '{nomorPksPf}'),
    (r'Nama Universitas', '{namaPerguruanTinggi}'),
] + BANK_RULES + AMOUNT_RULES + SIGNATURE_RULES

INVOIS_FIELDS = [
    (r'Alamat pada komparasi perjanjian \(Pihak ke-2\)', '{alamatPerguruanTinggi}'),
    (r'\d{3}', '{nomorInvois}'),
    (r'\d{1,2} \w+ \d{4}', '{tanggalInvois}'),
    (r'Judul Program DEB', '{judulProgram}'),
] + BANK_RULES + AMOUNT_RULES + SIGNATURE_RULES

KUITANSI_FIELDS = [
    (r'\d{3}', '{nomorKuitansi}'),
    (r'\d{1,2} \w+ \d{4}', '{tanggalKuitansi}'),
    (r'Judul Program DEB', '{judulProgram}'),
] + AMOUNT_RULES + SIGNATURE_RULES
KUITANSI_TEXTS = [
    {'pattern': r'dengan judul .*$', 'repl': 'dengan judul {judulProgram}', 'where': lambda p: 'Termin-1 (70%) dengan judul' in paragraph_text(p), 'expect': 1},
]
HEADER_TEXTS = [
    {'pattern': r'KOP UNIVERSITAS', 'repl': kop, 'expect': 2},
]

TEMPLATES = [
    {'source': 'DRAFT PKS DEB.docx', 'out': 'pks-standar.docx', 'fields': PKS_FIELDS, 'texts': PKS_TEXTS, 'cut': False, 'signature': True, 'headers': []},
    {'source': '160726 - Permohonan Pencairan Dana Bantuan Implementasi Desa Energi Berdikari Sobat Bumi.docx', 'out': 'permohonan.docx', 'fields': PERMOHONAN_FIELDS, 'texts': [], 'cut': True, 'signature': False, 'headers': []},
    {'source': '160726 - INVOIS PENERIMAAN DANA BANTUAN IMPLEMENTASI DESA ENERGI BERDIKARI SOBAT BUMI.docx', 'out': 'invois.docx', 'fields': INVOIS_FIELDS, 'texts': [], 'cut': True, 'signature': False, 'headers': HEADER_TEXTS},
    {'source': '160726 - KUITANSI PENERIMAAN DANA BANTUAN IMPLEMENTASI DESA ENERGI BERDIKARI SOBAT BUMI.docx', 'out': 'kuitansi.docx', 'fields': KUITANSI_FIELDS, 'texts': KUITANSI_TEXTS, 'cut': True, 'signature': False, 'headers': HEADER_TEXTS},
]


def convert(spec, source_dir, out_dir):
    label = spec['out']
    path = os.path.join(source_dir, spec['source'])
    with zipfile.ZipFile(path) as z:
        parts = {name: z.read(name) for name in z.namelist()}
        order = z.namelist()
    root = etree.fromstring(parts['word/document.xml'])
    ctx = Context()
    accept_tracked_changes(root)
    if spec['cut']:
        removed = keep_termin_1_only(root, label)
        print('  removed %d body elements after the Termin 1 page' % removed)
    apply_texts(root, spec['texts'], ctx, label)
    if spec['signature']:
        pf_signature_block(root, label)
    apply_fields(root, spec['fields'], ctx, label)
    strip_brackets(root, ctx)
    parts['word/document.xml'] = etree.tostring(root, xml_declaration=True, encoding='UTF-8', standalone=True)
    if spec['headers']:
        for name in order:
            if re.match(r'word/header\d*\.xml$', name):
                header = etree.fromstring(parts[name])
                accept_tracked_changes(header)
                apply_texts(header, spec['headers'], ctx, label + ' ' + name)
                letterhead(header, label + ' ' + name)
                parts[name] = etree.tostring(header, xml_declaration=True, encoding='UTF-8', standalone=True)
    leftover = highlighted_left(root)
    if leftover:
        raise ConversionError('%s: highlight left in %s' % (label, leftover))
    tags = sorted(set(TAG.findall(paragraphs_text(root) + ''.join(paragraphs_text(etree.fromstring(parts[n])) for n in order if re.match(r'word/(header|footer)\d*\.xml$', n)))))
    os.makedirs(out_dir, exist_ok=True)
    target = os.path.join(out_dir, spec['out'])
    with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as out:
        for name in order:
            out.writestr(name, parts[name])
    print('  wrote %s with %d placeholders: %s' % (spec['out'], len(tags), ' '.join(tags)))
    return tags


def paragraphs_text(root):
    return '\n'.join(paragraph_text(p) for p in root.iter(W + 'p'))


def highlighted_left(root):
    return [paragraph_text(p)[:60] for p in root.iter(W + 'p') if any(is_highlighted(r) for r in simple_runs(p))]


def main():
    parser = argparse.ArgumentParser(description=__doc__.split('\n')[1])
    parser.add_argument('--source', default=SOURCE_DIR)
    parser.add_argument('--out', default=OUT_DIR)
    args = parser.parse_args()
    all_tags = set()
    for spec in TEMPLATES:
        print(spec['source'])
        all_tags |= set(convert(spec, args.source, os.path.abspath(args.out)))
    print('\nall placeholders (%d):' % len(all_tags))
    for tag in sorted(all_tags):
        print('  ' + tag)


if __name__ == '__main__':
    try:
        main()
    except ConversionError as error:
        print('Conversion stopped: %s' % error)
        sys.exit(1)
