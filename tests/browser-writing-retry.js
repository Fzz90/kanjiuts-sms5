return (async () => {
  const { entries, isKanji, loadCharacter } = await import('/src/lib/bank.js');
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  const wait = async (predicate, message) => {
    for (let i = 0; i < 160 && !predicate(); i++) await pause(25);
    assert(predicate(), message);
  };
  const click = async selector => {
    const button = document.querySelector(selector);
    assert(button && !button.disabled, `Unavailable control: ${selector}`);
    button.click(); await pause(35);
  };
  const boxes = () => [...document.querySelectorAll('.writing-box')];
  const ready = () => wait(() => boxes().length > 0 && !document.querySelector('.asset-status'), 'Writing assets load');
  const draw = async (svg, stroke) => {
    svg.setPointerCapture = () => {};
    svg.hasPointerCapture = () => false;
    const rect = svg.getBoundingClientRect();
    const send = (type, point) => svg.dispatchEvent(new PointerEvent(type, {
      bubbles: true, pointerId: 812, pointerType: 'pen', button: 0, buttons: type === 'pointerup' ? 0 : 1,
      clientX: rect.left + point.x * rect.width, clientY: rect.top + point.y * rect.height,
    }));
    send('pointerdown', stroke[0]);
    stroke.slice(1).forEach(point => send('pointermove', point));
    send('pointerup', stroke.at(-1));
    await pause(0);
  };
  await click('.mode-nav [data-mode="writing"]');
  await click('.meeting-card[data-tm="2"]');
  await click('.root-grid [aria-label="Latih kanji 窓"]');
  await ready();
  for (let i = 0; boxes().length < 2 && i < 4; i++) { await click('.skip-button'); await ready(); }
  assert(boxes().length >= 2, 'Multi-kanji retry fixture');
  const id = document.querySelector('.practice-sheet').dataset.entryId;
  const sessionPosition = document.querySelector('.session-progress').textContent;
  const record = () => JSON.parse(localStorage.getItem('kanji-uts-s5-progress-v1')).records[`writing:${id}`] ?? {};
  const helpBefore = record().helped ?? 0;
  await click('.practice-actions .secondary-button');
  assert(document.querySelector('.retry-writing').textContent === 'Ulangi menulis', 'Main action becomes Ulangi menulis');
  const rect = document.querySelector('.retry-writing').getBoundingClientRect();
  assert(rect.width >= 44 && rect.height >= 44 && rect.left >= 0 && rect.right <= innerWidth, 'Retry target fits viewport');
  await click('.retry-writing');
  assert(document.querySelector('.practice-sheet').dataset.entryId === id && document.querySelector('.session-progress').textContent === sessionPosition, 'Retry preserves question and position');
  assert(boxes().every(box => box.getAttribute('aria-disabled') === 'false'), 'Retry unlocks every box');
  assert(!document.querySelector('.answer-shadow, .answer-animation, .answer-note, .cell-replay, .user-ink path'), 'Retry removes all examples and ink');
  assert(document.querySelector('.writing-word').getAttribute('aria-busy') === 'false', 'Cancelled animation does not stay busy');
  await click('.practice-actions .secondary-button');
  await click('.writing-unit:first-child .cell-replay');
  assert(boxes().every(box => box.getAttribute('aria-disabled') === 'true'), 'Showing answer again and local replay keep boxes locked');
  await click('.retry-writing');
  assert(record().helped === helpBefore + 1, 'Repeated reveals count help only once for this question');
  const item = entries.find(entry => entry.id === id);
  const characters = [...item.word].filter(isKanji);
  for (const [index, svg] of boxes().entries()) {
    const asset = await loadCharacter(characters[index]);
    for (const stroke of asset.reference) await draw(svg, stroke);
  }
  await click('.practice-actions .primary-button');
  assert(document.querySelector('.feedback.success') && document.querySelectorAll('.writing-correct-answer').length === boxes().length, 'Retry accepts correct handwriting and shows answers');
  assert(document.querySelectorAll('.practice-actions button').length === 1 && document.querySelector('.next-button').textContent.trim() === 'Selanjutnya', 'Correct retry retains manual advance');
  await pause(1200);
  assert(document.querySelector('.practice-sheet').dataset.entryId === id, 'Correct retry does not auto-skip');
  await click('.next-button');
  for (let i = 0; document.querySelector('.skip-button') && i < 6; i++) await click('.skip-button');
  const stats = [...document.querySelectorAll('.result-stats strong')].map(node => Number(node.textContent));
  assert(stats[0] === 0 && stats[1] === 1, 'Successful assisted retry is not counted as independent and help is not duplicated');
  assert(document.documentElement.scrollWidth <= innerWidth, 'No horizontal overflow');
  return { viewport: `${innerWidth}x${innerHeight}`, retrySameQuestion: 'passed', cancelledAnimation: 'passed', repeatedRevealAndLocalReplay: 'passed', correctRetryAndManualAdvance: 'passed', assistedProgress: 'passed' };
})()
