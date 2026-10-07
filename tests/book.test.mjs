import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const book = new URL('../public/book/', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('manifest.json', book), 'utf8'));

test('all 30 original PDF pages are represented by readable-resolution WebP slides in order', () => {
  assert.equal(manifest.pages.length, 30);
  for (const [index, page] of manifest.pages.entries()) {
    assert.equal(page.slide, index + 1);
    assert.equal(page.pdfPage, 180 + index);
    assert.ok(page.width >= 1200 && page.height >= 1800);
    const content = readFileSync(new URL(`pages/page-${page.pdfPage}.webp`, book));
    assert.equal(content.toString('ascii', 0, 4), 'RIFF');
    assert.equal(content.toString('ascii', 8, 12), 'WEBP');
  }
});

test('bundled PDF excerpt matches the recorded hash and rendered page range', () => {
  assert.equal(manifest.originalPageStart, 180);
  assert.equal(manifest.originalPageEnd, 209);
  const content = readFileSync(new URL('kanji-look-and-learn-180-209.pdf', book));
  assert.equal(createHash('sha256').update(content).digest('hex'), manifest.sourceSha256);
  assert.equal(content.toString('ascii', 0, 5), '%PDF-');
});
