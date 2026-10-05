// Filter by the book's kanji group, not by characters appearing in the word.
// A repeated word may belong to several groups and meetings.
export const ALL_TM = 'all';

export function selectPracticeEntries(bank, tm, mode, root = null) {
  const meetings = tm === ALL_TM ? bank.meetings : bank.meetings.filter(value => value.id === tm);
  if (!meetings.length || (root !== null && !meetings.some(meeting => meeting.kanji.includes(root)))) return [];
  const ids = new Set(meetings.map(meeting => meeting.id));
  const selected = bank.entries.filter(entry => entry.tms.some(id => ids.has(id)) && (root === null || entry.roots.includes(root)));
  return mode === 'reading' ? [...new Map(selected.map(entry => [entry.word, entry])).values()] : selected;
}
