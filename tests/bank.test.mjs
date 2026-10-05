import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { ALL_TM, selectPracticeEntries } from '../src/lib/practice-selection.js';
const root = new URL('../', import.meta.url);
const read = path => JSON.parse(readFileSync(new URL(path, root), 'utf8'));
const source = read('src/data/source-vocabulary.json');
const bank = read('src/data/bank.json');
const englishMeanings = read('src/data/english-meanings.json');
const manifest = read('public/strokes/manifest.json');
const expected = ['込連窓側葉景記形吉結婚', '共供両若老息娘奥将祖育', '性招取最初番歳枚冊億点', '階段号倍次々他勝負賛成', '絶対続辞投選約束守過夢', '的飛機失鉄速遅駐泊船座席'];

test('every source occurrence appears in its exact TM and no foreign vocabulary was added', () => {
  assert.equal(source.length, 67);
  assert.equal(source.reduce((sum, group) => sum + group.w.length, 0), 431);
  assert.equal(bank.entries.length, 416);
  assert.equal(Object.keys(englishMeanings).length, bank.entries.length);
  for (const item of bank.entries) {
    const meaning = englishMeanings[`${item.word}|${item.reading}`];
    assert.ok(typeof meaning === 'string' && meaning.trim(), `${item.word}: missing English meaning`);
  }
  const sourcePairs = new Set(source.flatMap(group => group.w.map(([word, reading]) => `${word}\0${reading}`)));
  for (const item of bank.entries) assert.ok(sourcePairs.has(`${item.word}\0${item.reading}`), item.word);
  source.forEach((group, index) => {
    const tm = Math.min(7, 2 + Math.floor(index / 11));
    group.w.forEach(([word, reading]) => assert.ok(bank.entries.some(item => item.word === word && item.reading === reading && item.tms.includes(tm)), `${tm}: ${word}`));
  });
  assert.deepEqual(bank.meetings.map(tm => tm.kanji.join('')), expected);
  assert.deepEqual(bank.meetings.map(tm => tm.sourceCount), [79, 66, 69, 69, 71, 77]);
});

test('stable IDs are unique and repeated vocabulary preserves TM membership', () => {
  assert.equal(new Set(bank.entries.map(item => item.id)).size, bank.entries.length);
  assert.deepEqual(bank.entries.find(item => item.word === '飛び込む').tms, [2, 7]);
  assert.ok(bank.entries.find(item => item.word === '二十歳').acceptedReadings.includes('はたち'));
  assert.ok(bank.entries.find(item => item.word === '二十歳').acceptedReadings.includes('にじゅっさい'));
});

test('each kanji session contains exactly its source group, while all-kanji sessions keep the complete TM', () => {
  for (const mode of ['reading', 'writing']) {
    source.forEach((group, index) => {
      const tm = Math.min(7, 2 + Math.floor(index / 11));
      const selected = selectPracticeEntries(bank, tm, mode, group.k);
      const key = mode === 'reading' ? item => item.word : item => `${item.word}|${item.reading}`;
      const expectedKeys = new Set(group.w.map(([word, reading]) => key({ word, reading })));
      assert.deepEqual(new Set(selected.map(key)), expectedKeys, `${mode}: TM ${tm}, ${group.k}`);
      assert.equal(selected.length, expectedKeys.size, 'No duplicate questions');
    });
    for (const meeting of bank.meetings) {
      const all = selectPracticeEntries(bank, meeting.id, mode);
      const parts = meeting.kanji.flatMap(root => selectPracticeEntries(bank, meeting.id, mode, root));
      const key = mode === 'reading' ? item => item.word : item => item.id;
      assert.deepEqual(new Set(all.map(key)), new Set(parts.map(key)), `${mode}: all-kanji coverage for TM ${meeting.id}`);
    }
  }
  assert.deepEqual(selectPracticeEntries(bank, 2, 'writing', '鉄'), [], 'Reject a root from another TM');
  assert.deepEqual(selectPracticeEntries(bank, 99, 'reading'), [], 'Reject unknown TM');
  assert.ok(!selectPracticeEntries(bank, 2, 'writing', '側').some(item => item.word === '窓側の席'), 'Do not infer group membership from word characters');
});

test('all-TM sessions cover the union of meetings without repeating shared vocabulary', () => {
  for (const mode of ['reading', 'writing']) {
    const key = mode === 'reading' ? item => item.word : item => item.id;
    const combined = selectPracticeEntries(bank, ALL_TM, mode);
    const separate = bank.meetings.flatMap(meeting => selectPracticeEntries(bank, meeting.id, mode));
    assert.deepEqual(new Set(combined.map(key)), new Set(separate.map(key)));
    assert.equal(combined.length, new Set(combined.map(key)).size);
    assert.equal(combined.length, mode === 'reading' ? 415 : 416);
    assert.equal(combined.filter(item => item.word === '飛び込む').length, 1, 'Shared TM 2/7 vocabulary appears once');
    assert.deepEqual(new Set(combined.flatMap(item => item.tms)), new Set([2, 3, 4, 5, 6, 7]));
  }
  assert.deepEqual(selectPracticeEntries(bank, ALL_TM, 'writing', '漢'), [], 'Reject a root outside the syllabus');
});

test('all-TM per-kanji sessions keep source group membership and accepted readings', () => {
  for (const mode of ['reading', 'writing']) {
    const key = mode === 'reading' ? item => item.word : item => item.id;
    for (const group of source) {
      const across = selectPracticeEntries(bank, ALL_TM, mode, group.k);
      const separate = bank.meetings.flatMap(meeting => selectPracticeEntries(bank, meeting.id, mode, group.k));
      assert.deepEqual(new Set(across.map(key)), new Set(separate.map(key)), `${mode}: ${group.k}`);
    }
  }
  const maple = selectPracticeEntries(bank, ALL_TM, 'reading').find(item => item.word === '紅葉');
  assert.deepEqual(new Set(maple.acceptedReadings), new Set(['こうよう', 'もみじ']));
  assert.ok(!selectPracticeEntries(bank, ALL_TM, 'writing', '側').some(item => item.word === '窓側の席'));
});

test('all writing characters, including iteration mark, have local ordered stroke assets', () => {
  const chars = new Set(bank.entries.flatMap(item => [...item.word].filter(c => /[\p{Script=Han}々]/u.test(c))));
  assert.equal(chars.size, 314);
  for (const character of chars) {
    const filename = `public/strokes/${character.codePointAt(0).toString(16).padStart(5, '0')}.json`;
    assert.ok(existsSync(new URL(filename, root)), character);
    const asset = read(filename);
    assert.equal(asset.character, character);
    assert.equal(asset.paths.length, manifest.characters[character]);
    assert.ok(asset.paths.every(path => typeof path === 'string' && path.startsWith('M')));
  }
});
