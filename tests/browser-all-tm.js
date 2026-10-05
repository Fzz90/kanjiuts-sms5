return (async () => {
  const { ALL_TM, meetings, meetingEntries, entries } = await import('/src/lib/bank.js');
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const tick = async () => { await Promise.resolve(); await Promise.resolve(); };
  const click = async selector => {
    const element = document.querySelector(selector);
    assert(element && !element.disabled, `Unavailable control: ${selector}`);
    element.click(); await tick();
  };
  const activeId = () => document.querySelector('.practice-sheet')?.dataset.entryId;
  const count = expected => assert(document.querySelector('.session-progress').textContent.includes(`/ ${expected}`), 'Session count matches selected scope');
  const exhaust = async expected => {
    const ids = new Set(expected.map(item => item.id)), visited = new Set();
    for (let i = 0; i < expected.length; i++) {
      const id = activeId();
      assert(ids.has(id) && !visited.has(id), 'Question must stay within scope without repeats');
      visited.add(id); await click('.skip-button');
      if (i % 32 === 0) await new Promise(resolve => setTimeout(resolve, 0));
    }
    assert(document.querySelector('.result-screen')?.dataset.tm === ALL_TM, 'Completed result retains all-TM scope');
    return visited;
  };
  const reports = [];
  for (const mode of ['reading', 'writing']) {
    await click(`.mode-nav [data-mode="${mode}"]`);
    assert(document.querySelectorAll('.meeting-card').length === 7, 'Selection offers all TM and six individual meetings');
    const combined = meetingEntries(ALL_TM, mode);
    const card = document.querySelector('.meeting-card[data-tm="all"]');
    assert(card.textContent.includes(`${combined.length} soal`) && card.textContent.includes('67 kanji'), 'All-TM card displays the correct totals');
    await click('.meeting-card[data-tm="all"]');
    assert(document.querySelector('.practice-screen')?.dataset.tm === ALL_TM && !document.querySelector('.kanji-screen'), 'All-TM selection starts questions directly');
    assert(document.querySelector('.session-nav').textContent.includes('Semua TM') && !document.body.textContent.includes('TM all'), 'Human-readable session labels');
    count(combined.length);
    const item = entries.find(entry => entry.id === activeId());
    assert(JSON.stringify([...document.querySelectorAll('.origin-tm')].map(node => Number(node.textContent.slice(3)))) === JSON.stringify(item.tms), 'Question shows its original meetings');
    const id = activeId(); await click('.tm-pills [data-tm="all"]');
    assert(activeId() === id, 'Active all-TM button does not restart the session');
    assert(!document.querySelector('.all-tm-roots').open, 'Long kanji list starts collapsed');
    await click('.all-tm-roots summary');
    assert(document.querySelectorAll('.root-grid button').length === 67, 'All roots remain available');
    await click('.root-grid [aria-label="Latih kanji 窓"]');
    assert(document.querySelector('.practice-screen').dataset.tm === ALL_TM && document.querySelector('.practice-screen').dataset.kanji === '窓', 'Per-kanji filtering retains all-TM scope');
    const subset = meetingEntries(ALL_TM, mode, '窓'); count(subset.length);
    await exhaust(subset);
    assert(document.querySelector('.result-screen').dataset.kanji === '窓', 'Root scope survives completion');
    await click('.result-screen .primary-button'); count(subset.length);
    await exhaust(subset);
    await click('.choose-kanji');
    assert(document.querySelectorAll('.kanji-card').length === 67, 'All-TM kanji chooser contains every root');
    await click('.all-kanji-card'); count(combined.length);
    const visited = await exhaust(combined);
    assert(new Set([...visited].flatMap(id => entries.find(entry => entry.id === id).tms)).size === meetings.length, 'Completed session covers all six meetings');
    assert(document.querySelector('.result-screen').textContent.includes('seluruh TM 2–7'), 'Result names the combined scope');
    await click('.repeat-session'); count(combined.length);
    assert(document.querySelector('.practice-screen').dataset.kanji === 'all', 'Repeat restores the entire combined session');
    await click('.tm-pills [data-tm="7"]'); count(meetingEntries(7, mode).length);
    assert(document.querySelector('.practice-screen').dataset.tm === '7' && !document.querySelector('.question-origins'), 'Individual TM selection keeps its original flow');
    await click('.tm-pills [data-tm="all"]'); count(combined.length);
    assert(document.querySelector('.practice-screen').dataset.tm === ALL_TM && !document.querySelector('.feedback.success'), 'Returning to all TM starts a fresh session');
    assert(document.documentElement.scrollWidth <= innerWidth, 'No horizontal overflow');
    reports.push({ mode, allTm: combined.length, perKanji: subset.length, completionReviewRepeat: 'passed' });
  }
  return { viewport: `${innerWidth}x${innerHeight}`, reports, sourceLabelsAndScopeSwitch: 'passed' };
})()
