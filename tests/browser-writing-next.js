return (async () => {
  const { entries, meetingEntries, isKanji, loadCharacter } = await import('/src/lib/bank.js');
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  const wait = async (predicate, message) => {
    for (let index = 0; index < 120 && !predicate(); index++) await pause(25);
    assert(predicate(), message);
  };
  const click = async selector => {
    const node = document.querySelector(selector);
    assert(node, `Missing control: ${selector}`);
    node.click(); await pause(30);
  };
  const entryId = () => document.querySelector('.practice-sheet')?.dataset.entryId;
  const waitForBoxes = () => wait(() => !!document.querySelector('.writing-box') && !document.querySelector('.asset-status'), 'Writing assets must load');
  const normalActions = () => {
    const buttons = [...document.querySelectorAll('.practice-actions button')];
    assert(buttons.length === 3 && buttons.some(button => /Show answer|Ulangi menulis/.test(button.textContent))
      && buttons.some(button => button.textContent.includes('Periksa tulisan')) && buttons.some(button => button.textContent.includes('Lewati')), 'Unanswered/wrong writing must retain three actions');
  };
  const sendStroke = async (svg, stroke) => {
    svg.setPointerCapture = () => {};
    svg.hasPointerCapture = () => false;
    const rect = svg.getBoundingClientRect();
    const send = (type, point) => svg.dispatchEvent(new PointerEvent(type, {
      bubbles: true, pointerId: 801, pointerType: 'touch', button: 0, buttons: type === 'pointerup' ? 0 : 1,
      clientX: rect.left + point.x * rect.width, clientY: rect.top + point.y * rect.height,
    }));
    send('pointerdown', stroke[0]);
    stroke.slice(1).forEach(point => send('pointermove', point));
    send('pointerup', stroke.at(-1));
    await pause(0);
  };
  const answerCorrectly = async () => {
    const item = entries.find(entry => entry.id === entryId());
    const characters = [...item.word].filter(isKanji);
    const boxes = [...document.querySelectorAll('.writing-box')];
    for (let index = 0; index < boxes.length; index++) {
      const asset = await loadCharacter(characters[index]);
      for (const stroke of asset.reference) await sendStroke(boxes[index], stroke);
    }
    await click('.practice-actions .primary-button');
    await wait(() => !!document.querySelector('.feedback.success'), 'Correct geometry must be accepted');
    return characters;
  };
  const checkHeldAnswer = async characters => {
    const id = entryId();
    const ink = [...document.querySelectorAll('.user-ink path')].map(path => path.getAttribute('d'));
    const buttons = [...document.querySelectorAll('.practice-actions button')];
    assert(buttons.length === 1 && buttons[0].textContent.trim() === 'Selanjutnya' && !buttons[0].disabled, 'Success must show only enabled Selanjutnya');
    assert(document.activeElement === buttons[0], 'Keyboard focus must move to Selanjutnya');
    const rect = buttons[0].getBoundingClientRect();
    assert(rect.width >= 44 && rect.height >= 44 && rect.left >= 0 && rect.right <= innerWidth, 'Next control must fit viewport with usable target size');
    await pause(1600); // Longer than the former 1100ms auto-advance.
    assert(entryId() === id && !document.querySelector('.result-screen'), 'Correct writing must wait for manual advance, including the last question');
    assert(JSON.stringify([...document.querySelectorAll('.user-ink path')].map(path => path.getAttribute('d'))) === JSON.stringify(ink), 'Accepted handwriting must remain visible');
    assert(JSON.stringify([...document.querySelectorAll('.writing-correct-answer strong')].map(node => node.textContent)) === JSON.stringify(characters), 'Canonical answers must remain below writing boxes');
    return id;
  };

  await click('.mode-nav [data-mode="writing"]');
  await click('.meeting-card[data-tm="2"]');
  await click('.root-grid [aria-label="Latih kanji 窓"]');
  await waitForBoxes();
  normalActions();
  await sendStroke(document.querySelector('.writing-box'), [{ x: .1, y: .1 }, { x: .9, y: .9 }]);
  await click('.practice-actions .primary-button');
  await wait(() => !!document.querySelector('.feedback.error'), 'Incorrect drawing must be rejected');
  normalActions();
  await click('.writing-tools button');
  const firstId = await checkHeldAnswer(await answerCorrectly());
  await click('.practice-actions .next-button');
  await wait(() => entryId() && entryId() !== firstId, 'Selanjutnya must open the next question');
  await waitForBoxes();
  normalActions();
  assert(!document.querySelector('.feedback.success') && !document.querySelector('.user-ink path') && !document.querySelector('.writing-correct-answer'), 'New question must restore empty state');

  const count = meetingEntries(2, 'writing', '窓').length;
  for (let index = 2; index < count; index++) await click('.skip-button');
  await waitForBoxes();
  await checkHeldAnswer(await answerCorrectly());
  await click('.practice-actions .next-button');
  await wait(() => !!document.querySelector('.result-screen'), 'Last Selanjutnya must open session results');
  assert(document.querySelector('.result-screen').dataset.kanji === '窓', 'Result must retain session scope');

  await click('.mode-nav [data-mode="reading"]');
  await click('.meeting-card[data-tm="2"]');
  const readingId = entryId(), item = entries.find(entry => entry.id === readingId);
  const input = document.querySelector('#reading');
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, item.acceptedReadings[0]);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await pause(30);
  await click('.check-reading');
  await wait(() => !!document.querySelector('.feedback.success'), 'Reading answer must be accepted');
  await wait(() => entryId() !== readingId, 'Yomikata must retain its automatic advance');
  assert(document.documentElement.scrollWidth <= innerWidth, 'Page must not overflow');
  return { viewport: `${innerWidth}x${innerHeight}`, writingManualAdvance: 'passed', successOnlyNextButton: 'passed', keptHandwritingAndAnswers: 'passed', wrongAndNextQuestionActions: 'passed', lastQuestionResults: 'passed', readingAutoAdvance: 'passed' };
})()
