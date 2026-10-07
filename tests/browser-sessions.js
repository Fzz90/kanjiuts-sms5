return (async () => {
  const { meetingEntries, meetings } = await import('/src/lib/bank.js');
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const tick = () => new Promise(resolve => requestAnimationFrame(resolve));
  const click = async selector => {
    const element = document.querySelector(selector);
    assert(element, `Missing control: ${selector}`);
    element.click();
    await tick();
  };
  const exhaust = async expected => {
    const ids = new Set(expected.map(item => item.id));
    const visited = new Set();
    for (let i = 0; i < expected.length; i++) {
      const id = document.querySelector('.practice-sheet')?.dataset.entryId;
      assert(ids.has(id) && !visited.has(id), 'Question outside the selected scope or repeated');
      visited.add(id);
      await click('.skip-button');
    }
    assert(document.querySelector('.result-screen'), 'Selected session must end at the expected question count');
  };
  const reports = [];
  for (const mode of ['reading', 'writing']) {
    await click(`.mode-nav [data-mode="${mode}"]`);
    await click('.meeting-card[data-tm="2"]');
    assert(document.querySelector('.practice-screen')?.dataset.kanji === 'all' && !document.querySelector('.kanji-screen'), 'TM selection must open all questions directly');
    await click('.session-nav .text-button');
    assert(document.querySelectorAll('.kanji-card').length === meetings.find(meeting => meeting.id === 2).kanji.length, 'Every kanji must have a card');
    assert(!document.querySelector('.practice-sheet') && document.querySelector('.all-kanji-card'), 'TM must offer both session routes');
    const subset = meetingEntries(2, mode, '窓');
    await click('.kanji-card[data-kanji="窓"]');
    assert(document.querySelector('.practice-screen').dataset.kanji === '窓', 'Per-kanji scope must activate');
    await exhaust(subset);
    assert(document.querySelector('.result-screen').dataset.kanji === '窓', 'Results must retain the kanji scope');
    await click('.result-screen .primary-button');
    await exhaust(subset); // Every skipped item is in the review queue.
    await click('.repeat-session');
    await exhaust(subset);
    await click('.choose-kanji');
    await click('.all-kanji-card');
    assert(document.querySelector('.practice-screen').dataset.kanji === 'all', 'All-kanji scope must activate');
    const full = meetingEntries(2, mode);
    await exhaust(full);
    assert(document.querySelector('.result-screen').dataset.kanji === 'all', 'All-kanji result scope');
    await click('.repeat-session');
    assert(document.querySelector('.session-progress').textContent.includes(`/ ${full.length}`), 'Repeat must retain complete TM');
    await click('.root-grid [aria-label="Latih kanji 窓"]');
    await click('.tm-pills [data-tm="7"]');
    assert(document.querySelector('.practice-screen')?.dataset.tm === '7' && document.querySelector('.practice-screen').dataset.kanji === 'all' && !document.querySelector('.kanji-screen'), 'TM switching must directly reset to the entire destination TM');
    assert(document.querySelector('.session-progress').textContent.includes(`/ ${meetingEntries(7, mode).length}`), 'Destination TM count must match');
    const activeId = document.querySelector('.practice-sheet').dataset.entryId;
    await click('.tm-pills [data-tm="7"]');
    assert(document.querySelector('.practice-sheet').dataset.entryId === activeId, 'Current TM button must not restart the session');
    reports.push({ mode, perKanji: subset.length, allKanji: full.length, reviewAndRepeat: 'passed' });
  }
  await click('.brand');
  return { routes: reports, membership: 'passed', completed: 'passed' };
})()
