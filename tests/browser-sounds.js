return (async () => {
  const { entries, meetingEntries, isKanji, loadCharacter } = await import('/src/lib/bank.js');
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  const tick = () => new Promise(resolve => requestAnimationFrame(resolve));
  const click = async selector => { const node = document.querySelector(selector); assert(node, `Missing ${selector}`); node.click(); await tick(); };
  const wait = async (condition, message) => { for (let i = 0; i < 120 && !condition(); i++) await pause(25); assert(condition(), message); };
  const audio = window.__qaAudio;
  assert(audio, 'Install sound observer before entering a practice mode');
  const starts = () => audio.events.filter(event => event.type === 'start');
  const expectSound = async (file, action) => {
    const before = starts().length;
    await action();
    await wait(() => starts().length > before, `Missing ${file}`);
    assert(starts().at(-1).file === file && starts().at(-1).state === 'running', `Expected running ${file}`);
  };
  const enterReading = async text => {
    const input = document.querySelector('#reading');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, text);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await tick();
    await click('.check-reading');
  };
  const draw = async (svg, strokes) => {
    svg.setPointerCapture = () => {};
    svg.hasPointerCapture = () => false;
    const rect = svg.getBoundingClientRect();
    const send = (type, point, buttons) => svg.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 95, pointerType: 'touch', button: 0, buttons, clientX: rect.left + point.x * rect.width, clientY: rect.top + point.y * rect.height }));
    for (const stroke of strokes) {
      send('pointerdown', stroke[0], 1);
      for (const point of stroke.slice(1)) send('pointermove', point, 1);
      send('pointerup', stroke.at(-1), 0);
      await tick();
    }
  };
  try {
    await wait(() => audio.decoded.length === 5, 'All five actual MP3 files must decode');
    assert(audio.decoded.every(file => file.duration > 0 && file.channels > 0), 'MP3 audio data must be usable');
    await click('.meeting-card[data-tm="2"]');
    assert(document.querySelector('.practice-screen')?.dataset.kanji === 'all' && !document.querySelector('.kanji-screen'), 'Initial TM selection directly opens all questions');
    const beforeEmpty = starts().length;
    document.querySelector('.reading-form').requestSubmit();
    await pause(70);
    assert(starts().length === beforeEmpty, 'Empty input must stay silent');
    await expectSound('wrong.mp3', () => enterReading('ああああああ'));
    assert(document.querySelector('.feedback.error'), 'Wrong reading feedback');
    const item = entries.find(entry => entry.id === document.querySelector('.practice-sheet').dataset.entryId);
    await expectSound('right.mp3', () => enterReading(item.acceptedReadings[0]));
    assert(document.querySelector('.feedback.success'), 'Correct reading feedback');
    await click('.tm-pills [data-tm="7"]');
    const newId = document.querySelector('.practice-sheet').dataset.entryId;
    await pause(1250);
    assert(document.querySelector('.practice-screen')?.dataset.tm === '7' && document.querySelector('.practice-sheet').dataset.entryId === newId, 'Old correct-answer timer must not advance the new TM');
    assert(audio.events.some(event => event.type === 'stop' && event.file === 'right.mp3'), 'TM switch stops old audio');
    await expectSound('reveal.mp3', () => click('.practice-actions .secondary-button'));
    await expectSound('skip.mp3', () => click('.skip-button'));
    await click('.tm-pills [data-tm="2"]');
    await click('.root-grid [aria-label="Latih kanji 窓"]');
    const count = meetingEntries(2, 'reading', '窓').length;
    for (let i = 0; i < count - 1; i++) await click('.skip-button');
    const last = entries.find(entry => entry.id === document.querySelector('.practice-sheet').dataset.entryId);
    await expectSound('right.mp3', () => enterReading(last.acceptedReadings[0]));
    await wait(() => document.querySelector('.result-screen') && starts().at(-1)?.file === 'finish.mp3', 'Finish sound must play after automatic advance');
    await click('.mode-nav [data-mode="writing"]');
    await click('.meeting-card[data-tm="2"]');
    await click('.root-grid [aria-label="Latih kanji 窓"]');
    await wait(() => document.querySelector('.writing-box'), 'Writing assets must load');
    await expectSound('reveal.mp3', () => click('.practice-actions .secondary-button'));
    await expectSound('reveal.mp3', () => click('.practice-actions .secondary-button'));
    await expectSound('skip.mp3', () => click('.skip-button'));
    await wait(() => document.querySelector('.writing-box'), 'Next writing question must load');
    await draw(document.querySelector('.writing-box'), [[{ x: .2, y: .2 }, { x: .8, y: .8 }]]);
    await expectSound('wrong.mp3', () => click('.practice-actions .primary-button'));
    assert(document.querySelector('.writing-cell.invalid'), 'Incorrect writing must shake and show error');
    await expectSound('reveal.mp3', () => click('.practice-actions .secondary-button'));
    assert(!document.querySelector('.user-ink path'), 'Show answer still clears wrong strokes');
    assert([...document.querySelectorAll('.writing-box')].every(svg => svg.getAttribute('aria-disabled') === 'true'), 'Revealed answer stays read-only');
    await expectSound('skip.mp3', () => click('.skip-button'));
    await wait(() => document.querySelector('.writing-box') && !document.querySelector('.asset-status'), 'Next writing assets must load before answering');
    const writtenItem = entries.find(entry => entry.id === document.querySelector('.practice-sheet').dataset.entryId);
    const characters = [...writtenItem.word].filter(isKanji);
    for (const [index, svg] of [...document.querySelectorAll('.writing-box')].entries()) {
      const asset = await loadCharacter(characters[index]);
      await draw(svg, asset.reference);
    }
    await expectSound('right.mp3', () => click('.practice-actions .primary-button'));
    assert(document.querySelector('.feedback.success'), 'Correct writing feedback');
    await click('.tm-pills [data-tm="3"]');
    assert(document.querySelector('.practice-screen')?.dataset.tm === '3' && !document.querySelector('.kanji-screen'), 'Renshuu TM switches directly');
    assert(document.documentElement.scrollWidth <= innerWidth, 'No horizontal overflow');
    return { decoded: audio.decoded, soundEvents: [...new Set(starts().map(event => event.file))], autoFinish: 'passed', staleTimerAndAudio: 'passed', writingCorrectWrongRevealRetryAndSkip: 'passed', directTmSwitch: 'passed in both modes', viewport: `${innerWidth}x${innerHeight}` };
  } finally { audio.restore(); }
})()
