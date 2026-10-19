import { test } from 'node:test';
import assert from 'node:assert/strict';
import PizZip from 'pizzip';
import { materializeNumbering } from '../src/lib/pengajuan/document-numbering';

test('numbered paragraphs retain order and indentation without browser CSS counters', () => {
 const ns='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
 const zip=new PizZip();
 zip.file('word/numbering.xml',`<w:numbering xmlns:w="${ns}"><w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:pPr><w:ind w:left="426" w:hanging="426"/></w:pPr></w:lvl></w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num></w:numbering>`);
 zip.file('word/document.xml',`<w:document xmlns:w="${ns}"><w:body>${['Satu','Dua'].map(t=>`<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>${t}</w:t></w:r></w:p>`).join('')}</w:body></w:document>`);
 materializeNumbering(zip);
 const xml=zip.file('word/document.xml')!.asText();
 assert.match(xml,/1\. /);assert.match(xml,/2\. /);
 assert.doesNotMatch(xml,/<w:numPr/);
 assert.match(xml,/w:hanging="426"/);
 const once=xml;materializeNumbering(zip);assert.equal(zip.file('word/document.xml')!.asText(),once);
});
