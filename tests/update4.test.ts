import { test } from 'node:test';
import assert from 'node:assert/strict';
import { zipSync, strToU8 } from 'fflate';
import { capAmount } from '../lib/tokens-core';
import { parseVideo, slugify, progressPercent, parseBlocks, parseInline, formatDuration } from '../lib/courses-core';
import { officeText, notebookText, kindOf } from '../lib/attachment-text';
import { summarize, bands, agreement, csvCell } from '../lib/grading-report-core';
import { visibleNav } from '../lib/nav';

test('token rewards respect the daily cap', () => {
  assert.equal(capAmount(10, 0, 200), 10);
  assert.equal(capAmount(10, 195, 200), 5);
  assert.equal(capAmount(10, 200, 200), 0);
  assert.equal(capAmount(-5, 0, 200), 0);
});

test('video links: only YouTube, Vimeo or https video files', () => {
  assert.deepEqual(parseVideo('https://youtu.be/dQw4w9WgXcQ'), { kind: 'youtube', id: 'dQw4w9WgXcQ' });
  assert.deepEqual(parseVideo('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=3'), { kind: 'youtube', id: 'dQw4w9WgXcQ' });
  assert.deepEqual(parseVideo('https://vimeo.com/123456789'), { kind: 'vimeo', id: '123456789' });
  assert.equal(parseVideo('https://res.cloudinary.com/demo/video/upload/v1/a.mp4').kind, 'file');
  assert.equal(parseVideo('http://youtu.be/dQw4w9WgXcQ').kind, 'none'); // not https
  assert.equal(parseVideo('javascript:alert(1)').kind, 'none');
  assert.equal(parseVideo('https://evil.example/page').kind, 'none');
  assert.equal(parseVideo('https://youtu.be/<script>').kind, 'none');
});

test('course helpers', () => {
  assert.equal(slugify('  Python: From Zero → Hero! '), 'python-from-zero-hero');
  assert.equal(slugify('!!!'), 'course');
  assert.equal(progressPercent(3, 4), 75);
  assert.equal(progressPercent(5, 0), 0);
  assert.equal(formatDuration(3725), '1h 2m');
  assert.equal(formatDuration(0), '');
});

test('lesson text is parsed into safe blocks (no HTML)', () => {
  const b = parseBlocks('## Intro\nHello **world** <img src=x onerror=alert(1)>\n\n- one\n- two\n\n```\ncode <b>\n```');
  assert.equal(b[0].k, 'h');
  assert.equal(b[1].k, 'p');
  // the HTML stays plain text — it is rendered as text, never as markup
  assert.ok(JSON.stringify(b[1]).includes('<img src=x onerror=alert(1)>'));
  assert.equal(b[2].k, 'ul');
  assert.equal(b[3].k, 'code');
  const links = parseInline('see javascript:alert(1) and https://example.com/a.').filter((x) => x.t === 'link');
  assert.equal(links.length, 1);
  assert.equal(links[0].href, 'https://example.com/a');
});

test('reads Word, PowerPoint, Excel and notebooks', () => {
  const docx = zipSync({ 'word/document.xml': strToU8('<w:document><w:body><w:p><w:r><w:t>Hello &amp; welcome</w:t></w:r></w:p><w:p><w:r><w:t>Second</w:t></w:r></w:p></w:body></w:document>') });
  assert.equal(officeText('docx', docx), 'Hello & welcome\nSecond');
  const pptx = zipSync({
    'ppt/slides/slide2.xml': strToU8('<p:sld><a:p><a:r><a:t>Two</a:t></a:r></a:p></p:sld>'),
    'ppt/slides/slide1.xml': strToU8('<p:sld><a:p><a:r><a:t>One</a:t></a:r></a:p></p:sld>'),
  });
  assert.equal(officeText('pptx', pptx), '[Slide 1]\nOne\n\n[Slide 2]\nTwo');
  const xlsx = zipSync({
    'xl/sharedStrings.xml': strToU8('<sst><si><t>Name</t></si></sst>'),
    'xl/worksheets/sheet1.xml': strToU8('<worksheet><sheetData><row><c t="s"><v>0</v></c><c><v>42</v></c></row></sheetData></worksheet>'),
  });
  assert.equal(officeText('xlsx', xlsx), '[Sheet 1]\nName\t42');
  assert.equal(notebookText(JSON.stringify({ cells: [{ cell_type: 'markdown', source: ['# Hi'] }, { cell_type: 'code', source: 'print(1)' }] })), '# Hi\n\n[code]\nprint(1)');
  assert.equal(kindOf('PDF'), 'pdf');
  assert.equal(kindOf('exe'), 'other');
});

test('zip bombs are refused', () => {
  const big = new Uint8Array(20 * 1024 * 1024); // compresses to almost nothing
  const bomb = zipSync({ 'word/document.xml': big });
  assert.throws(() => officeText('docx', bomb), /too large/);
});

test('grading report statistics', () => {
  const s = summarize([40, 60, 80, 100]);
  assert.equal(s.average, 70);
  assert.equal(s.median, 70);
  assert.equal(s.passRate, 75);
  assert.equal(summarize([]).average, null);
  const b = bands([95, 85, 72, 10]);
  assert.equal(b.find((x) => x.label === '90–100%')!.value, 1);
  assert.equal(b.find((x) => x.label === 'Below 50%')!.value, 1);
  const a = agreement([
    { ai: 18, final: 18, max: 20, edited: false },
    { ai: 10, final: 16, max: 20, edited: true },
  ]);
  assert.equal(a.pairs, 2);
  assert.equal(a.within10, 50);
  assert.equal(a.edited, 50);
  assert.equal(a.aiLower, 1);
});

test('CSV cells cannot inject spreadsheet formulas', () => {
  assert.equal(csvCell('=HYPERLINK("x")'), `"'=HYPERLINK(""x"")"`);
  assert.equal(csvCell('plain'), 'plain');
  assert.equal(csvCell(null), '');
});

test('tokens menu is opt-in, courses are on by default', () => {
  const student = { role: 'student' as const };
  const hrefs = (f: Record<string, boolean>) => visibleNav(student, f).map((n) => n.href);
  assert.ok(!hrefs({}).includes('/wallet'));
  assert.ok(hrefs({ tokens: true }).includes('/wallet'));
  assert.ok(hrefs({}).includes('/courses'));
  assert.ok(!hrefs({ courses: false }).includes('/courses'));
  assert.ok(!hrefs({}).includes('/admin/courses'));
});
