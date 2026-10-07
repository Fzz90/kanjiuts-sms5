return (async () => {
  const { meetingEntries, entries } = await import('/src/lib/bank.js');
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  const click = async selector => {
    const button = document.querySelector(selector);
    assert(button && !button.disabled, `Unavailable ${selector}`);
    button.click(); await pause(20);
  };
  const waitForBoxes = async () => {
    for (let i = 0; i < 200 && !document.querySelector('.writing-box'); i++) await pause(25);
    assert(document.querySelector('.writing-box'), 'TM 1 stroke assets load');
  };
  const report = [];
  for (const mode of ['reading', 'writing']) {
    await click(`.mode-nav [data-mode="${mode}"]`);
    const card = document.querySelector('.meeting-card[data-tm="1"]');
    assert(card && card.textContent.includes('58 soal') && card.textContent.includes('11 kanji'), 'TM 1 card shows exact totals');
    await click('.meeting-card[data-tm="1"]');
    assert(document.querySelector('.practice-screen')?.dataset.tm === '1' && !document.querySelector('.kanji-screen'), 'TM 1 starts questions directly');
    await click('.session-nav .text-button');
    assert(document.querySelectorAll('.kanji-card').length === 11, 'All eleven TM 1 roots have their own session');
    await click('.all-kanji-card');
    const expected = new Set(meetingEntries(1, mode).map(item => item.id)), visited = new Set();
    let checkedAnimation = false, checkedEden = false;
    for (let i = 0; i < 58; i++) {
      const id = document.querySelector('.practice-sheet')?.dataset.entryId;
      const item = entries.find(entry => entry.id === id);
      assert(expected.has(id) && !visited.has(id), 'Each TM 1 question appears once and stays within scope');
      visited.add(id);
      assert(document.querySelector('.meaning-en').textContent.trim() && document.querySelector('.meaning-id').textContent.trim(), 'Both translations are visible');
      if (mode === 'writing') {
        await waitForBoxes();
        if (item.word === 'エデンの園') {
          assert(document.querySelector('.kana-prompt').textContent === 'えでんのその', 'Katakana reading becomes hiragana in the writing prompt');
          checkedEden = true;
        }
        if (!checkedAnimation) {
          await click('.practice-actions .secondary-button');
          assert(document.querySelectorAll('.answer-animation path').length > 0, 'TM 1 answer animates local stroke paths');
          assert(document.querySelector('.cell-replay') && document.querySelector('.retry-writing'), 'Replay and retry are available');
          checkedAnimation = true;
        }
      }
      assert(document.documentElement.scrollWidth <= innerWidth, `No overflow for ${item.word}`);
      await click('.skip-button');
    }
    assert(document.querySelector('.result-screen')?.dataset.tm === '1', 'TM 1 completes after 58 questions');
    assert(mode !== 'writing' || checkedEden, 'Eden reading was checked');
    await click('.repeat-session');
    assert(document.querySelector('.session-progress').textContent.includes('/ 58'), 'Repeating preserves TM 1');
    await click('.tm-pills [data-tm="7"]');
    await click('.tm-pills [data-tm="1"]');
    assert(document.querySelector('.practice-screen').dataset.tm === '1' && !document.querySelector('.kanji-screen'), 'Switching back to TM 1 opens questions directly');
    report.push({ mode, uniqueQuestions: visited.size, directSwitchAndRepeat: 'passed', overflow: false });
  }
  return { viewport: `${innerWidth}x${innerHeight}`, report, newStrokeAnimation: 'passed', hiraganaPrompt: 'passed' };
})()
