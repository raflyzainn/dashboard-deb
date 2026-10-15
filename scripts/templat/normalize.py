"""Rapikan template resmi tanpa mengubah isi, placeholder, atau identitas penandatangan."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from lxml import etree as E
import re

W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
NS = {'w': W[1:-1]}


def child(parent, tag, **attrs):
    node = parent.find(W + tag)
    if node is None:
        node = E.SubElement(parent, W + tag)
    for key, value in attrs.items():
        node.set(W + key, str(value))
    return node


def font(properties, family, size):
    fonts = child(properties, 'rFonts')
    fonts.attrib.clear()
    for name in ('ascii', 'hAnsi', 'eastAsia', 'cs'):
        fonts.set(W + name, family)
    child(properties, 'sz', val=size)
    child(properties, 'szCs', val=size)


def pks_footer():
    root = E.Element(W + 'ftr', nsmap={'w': W[1:-1]})
    table = E.SubElement(root, W + 'tbl')
    props = child(table, 'tblPr')
    child(props, 'tblW', w=9026, type='dxa')
    child(props, 'tblLayout', type='fixed')
    grid = E.SubElement(table, W + 'tblGrid')
    for width in (2300, 4426, 2300):
        E.SubElement(grid, W + 'gridCol').set(W + 'w', str(width))
    for index in range(2):
        row = E.SubElement(table, W + 'tr')
        child(child(row, 'trPr'), 'trHeight', val=220 if index == 0 else 440, hRule='atLeast')
        for column, width in enumerate((2300, 4426, 2300)):
            cell = E.SubElement(row, W + 'tc')
            cp = child(cell, 'tcPr')
            child(cp, 'tcW', w=width, type='dxa')
            borders = child(cp, 'tcBorders')
            for side in ('top', 'left', 'bottom', 'right'):
                child(borders, side, val='single' if column != 1 else 'nil', sz=4, color='000000')
            p = E.SubElement(cell, W + 'p')
            pp = child(p, 'pPr')
            child(pp, 'jc', val='center')
            child(pp, 'spacing', before=0, after=0)
            if index == 0 and column != 1:
                run = E.SubElement(p, W + 'r')
                font(child(run, 'rPr'), 'Arial', 16)
                E.SubElement(run, W + 't').text = 'Paraf PIHAK ' + ('PERTAMA' if column == 0 else 'KEDUA')
    p = E.SubElement(root, W + 'p')
    pp = child(p, 'pPr')
    child(pp, 'pStyle', val='FooterPageNumber')
    child(pp, 'jc', val='center')
    font(child(pp, 'rPr'), 'Arial', 16)
    run = E.SubElement(p, W + 'r')
    font(child(run, 'rPr'), 'Arial', 16)
    E.SubElement(run, W + 'fldChar').set(W + 'fldCharType', 'begin')
    E.SubElement(E.SubElement(p, W + 'r'), W + 'instrText').text = ' PAGE '
    E.SubElement(E.SubElement(p, W + 'r'), W + 'fldChar').set(W + 'fldCharType', 'separate')
    E.SubElement(E.SubElement(p, W + 'r'), W + 't').text = '1'
    E.SubElement(E.SubElement(p, W + 'r'), W + 'fldChar').set(W + 'fldCharType', 'end')
    return root


def normalize(path):
    with ZipFile(path) as archive:
        parts = {name: archive.read(name) for name in archive.namelist()}
    pks = path.name == 'pks-standar.docx'
    family = 'Arial' if pks else 'Times New Roman'
    for name, data in list(parts.items()):
        if not re.match(r'word/(document|styles|header\d*|footer\d*)\.xml$', name):
            continue
        root = E.fromstring(data)
        if pks and re.match(r'word/footer\d*\.xml$', name):
            root = pks_footer()
        else:
            for node in list(root.iter(W + 'tblpPr')):
                node.getparent().remove(node)
            if pks and name.startswith('word/header'):
                for node in list(root.iter(W + 'pict')):
                    node.getparent().remove(node)
                wp = '{http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing}'
                for anchor in root.iter(wp + 'anchor'):
                    anchor.tag = wp + 'inline'
                    anchor.attrib.clear()
                    for item in list(anchor):
                        if E.QName(item).localname not in ('extent', 'effectExtent', 'docPr', 'cNvGraphicFramePr', 'graphic'):
                            anchor.remove(item)
                for p in root.iter(W + 'p'):
                    child(child(p, 'pPr'), 'jc', val='left')
            elif name.startswith('word/header'):
                # The campus letterhead is inserted in the body; old floating text boxes overlap it.
                for tag in ('drawing', 'pict'):
                    for node in list(root.iter(W + tag)):
                        node.getparent().remove(node)
            for alternate in list(root.iter('{http://schemas.openxmlformats.org/markup-compatibility/2006}AlternateContent')):
                parent = alternate.getparent()
                drawings = list(alternate.iter(W + 'drawing'))
                if drawings:
                    parent.insert(parent.index(alternate), drawings[0])
                parent.remove(alternate)
            for props in list(root.iter(W + 'rPr')):
                font(props, family, 22)
            for p in root.iter(W + 'p'):
                pp = p.find(W + 'pPr')
                if pp is None:
                    pp = E.Element(W + 'pPr'); p.insert(0, pp)
                font(child(pp, 'rPr'), family, 22)
                if not pks:
                    child(pp, 'spacing', before=0, after=100, line=240, lineRule='auto')
            for section in root.iter(W + 'sectPr'):
                margins = child(section, 'pgMar')
                if pks:
                    margins.set(W + 'footer', '480')
                    margins.set(W + 'bottom', '1500')
            for tag in ('highlight', 'commentRangeStart', 'commentRangeEnd', 'commentReference'):
                for node in list(root.iter(W + tag)):
                    node.getparent().remove(node)
            if name == 'word/styles.xml':
                defaults = child(child(root, 'docDefaults'), 'rPrDefault')
                font(child(defaults, 'rPr'), family, 22)
        parts[name] = E.tostring(root, encoding='UTF-8', xml_declaration=True, standalone=True)
    with ZipFile(path, 'w', ZIP_DEFLATED) as archive:
        for name, data in parts.items():
            archive.writestr(name, data)


if __name__ == '__main__':
    for name in ('pks-standar', 'permohonan', 'invois', 'kuitansi'):
        normalize(Path(__file__).resolve().parents[2] / 'static' / 'templat' / (name + '.docx'))
