import { toHiragana } from 'wanakana';
import bank from '../data/bank.json';
import englishMeanings from '../data/english-meanings.json';
import { selectPracticeEntries } from './practice-selection.js';
import { assetUrl } from './assets.js';

export const meetings = bank.meetings;
export const entries = bank.entries.map(entry => ({
  ...entry,
  englishMeaning: englishMeanings[`${entry.word}|${entry.reading}`],
}));
export const isKanji = char => /[\p{Script=Han}々]/u.test(char);
export const normalizeReading = value => toHiragana(value.normalize('NFKC').trim(), { passRomaji: true }).replace(/[\s～~]/g, '');
export const checkReading = (value, item) => item.acceptedReadings.some(reading => normalizeReading(value) === normalizeReading(reading));

export function meetingEntries(tm, mode, root = null) {
  return selectPracticeEntries({ meetings, entries }, tm, mode, root);
}

export function shuffle(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

const cache = new Map();
export function loadCharacter(character) {
  if (!cache.has(character)) {
    const promise = fetch(assetUrl(`strokes/${character.codePointAt(0).toString(16).padStart(5, '0')}.json`))
      .then(response => {
        if (!response.ok) throw new Error('Asset stroke gagal dimuat');
        return response.json();
      })
      .then(asset => {
        const reference = asset.paths.map(d => {
          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          path.setAttribute('d', d);
          const length = path.getTotalLength();
          return Array.from({ length: 48 }, (_, i) => {
            const p = path.getPointAtLength(length * i / 47);
            return { x: p.x / 109, y: p.y / 109 };
          });
        });
        return { ...asset, reference };
      })
      .catch(error => { cache.delete(character); throw error; });
    cache.set(character, promise);
  }
  return cache.get(character);
}
