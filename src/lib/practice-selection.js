// Filter by the book's kanji group, not by characters appearing in the word.
// A repeated word may belong to several groups and meetings.
export function selectPracticeEntries(bank, tm, mode, root = null) {
  const meeting = bank.meetings.find(value => value.id === tm);
  if (!meeting || (root !== null && !meeting.kanji.includes(root))) return [];
  const selected = bank.entries.filter(entry => entry.tms.includes(tm) && (root === null || entry.roots.includes(root)));
  return mode === 'reading' ? [...new Map(selected.map(entry => [entry.word, entry])).values()] : selected;
}
