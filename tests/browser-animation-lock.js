return (async () => {
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  const wait = async (predicate, message) => {
    for (let i = 0; i < 160 && !predicate(); i++) await pause(25);
    assert(predicate(), message);
  };
  const click = async selector => {
    const node = document.querySelector(selector);
    assert(node, `Missing ${selector}`);
    node.click(); await pause(35);
  };
  const boxes = () => [...document.querySelectorAll('.writing-box')];
  const locked = () => boxes().length > 0 && boxes().every(box => box.getAttribute('aria-disabled') === 'true');
  const unlocked = () => boxes().length > 0 && boxes().every(box => box.getAttribute('aria-disabled') === 'false');
  const ready = () => wait(() => boxes().length > 0 && !document.querySelector('.asset-status'), 'Writing assets load');
  const draw = async (svg, pointerType = 'touch', complete = true) => {
    svg.setPointerCapture = () => {};
    svg.hasPointerCapture = () => false;
    const rect = svg.getBoundingClientRect();
    const send = (type, ratio) => svg.dispatchEvent(new PointerEvent(type, {
      bubbles: true, pointerId: 411, pointerType, button: 0, buttons: type === 'pointerup' ? 0 : 1,
      clientX: rect.left + rect.width * ratio, clientY: rect.top + rect.height * ratio,
    }));
    send('pointerdown', .2); send('pointermove', .8);
    await new Promise(resolve => requestAnimationFrame(resolve));
    if (complete) send('pointerup', .9);
    await pause(0);
  };
  const checkBlocked = async (animating = true) => {
    assert(locked(), 'All boxes stay read-only after Show answer');
    assert(document.querySelector('.writing-word').getAttribute('aria-busy') === String(animating), 'Busy state tracks animation separately from lock');
    for (const box of boxes()) for (const type of ['touch', 'pen', 'mouse']) await draw(box, type);
    assert(!document.querySelector('.user-ink path'), 'No committed or live strokes from touch, pen or mouse');
    assert(document.querySelector('.practice-actions .primary-button').disabled, 'Cannot grade a revealed answer');
    assert(!document.querySelector('.cell-actions .icon-button'), 'Undo and erase are replaced after reveal');
    assert([...document.querySelectorAll('.cell-replay')].length === boxes().length && [...document.querySelectorAll('.cell-replay')].every(button => !button.disabled), 'Each revealed kanji has an enabled replay button');
  };

  await click('.mode-nav [data-mode="writing"]');
  await click('.meeting-card[data-tm="2"]');
  await click('.root-grid [aria-label="Latih kanji 窓"]');
  await ready();
  assert(!document.querySelector('.cell-replay'), 'Per-box replay is only available after reveal');
  for (let i = 0; boxes().length < 2 && i < 4; i++) { await click('.skip-button'); await ready(); }
  assert(boxes().length >= 2, 'Fixture exercises multiple kanji');
  for (const box of boxes()) await draw(box);
  await draw(boxes()[0], 'pen', false);
  assert(document.querySelector('.user-ink path'), 'Existing committed and live ink before reveal');
  await click('.practice-actions .secondary-button');
  await checkBlocked();
  const paths = [...document.querySelectorAll('.answer-animation path')];
  assert(paths.length === document.querySelectorAll('.answer-shadow path').length, 'Shadow and animation stay visible');
  const delays = paths.map(path => parseFloat(getComputedStyle(path).animationDelay));
  assert(delays[0] === .5 && delays.every((delay, i) => !i || delay > delays[i - 1]), 'Original timing and global stroke order');
  const firstBoxEnd = boxes()[0].querySelector('.answer-animation path:last-child').getAnimations()[0];
  const wordEnd = paths.at(-1).getAnimations()[0];
  paths.forEach(path => path.getAnimations().forEach(animation => { animation.playbackRate = 12; }));
  await firstBoxEnd.finished;
  assert(locked(), 'Finishing first kanji does not unlock other boxes');
  await wordEnd.finished;
  await wait(() => document.querySelector('.writing-word').getAttribute('aria-busy') === 'false', 'Last actual CSS animationend clears busy state');
  await checkBlocked(false);
  await pause(1400);
  await checkBlocked(false);
  assert(!document.querySelector('.feedback.success'), 'Revealed answer cannot count as correct writing');

  const originalGroups = boxes().map(box => box.querySelector('.answer-animation'));
  const lastBox = boxes().length - 1;
  await click(`.writing-unit:nth-child(${lastBox + 1}) .cell-replay`);
  const localGroup = boxes()[lastBox].querySelector('.answer-animation');
  assert(localGroup !== originalGroups[lastBox] && boxes().slice(0, -1).every((box, i) => box.querySelector('.answer-animation') === originalGroups[i]), 'Local replay only restarts selected kanji');
  assert(parseFloat(getComputedStyle(localGroup.firstElementChild).animationDelay) === .5, 'Local replay starts without waiting for previous kanji');
  await checkBlocked();
  await click(`.writing-unit:nth-child(${lastBox + 1}) .cell-replay`);
  assert(boxes()[lastBox].querySelector('.answer-animation') !== localGroup, 'Repeated local clicks restart playback');
  await click('.writing-unit:first-child .cell-replay');
  boxes()[lastBox].querySelectorAll('.answer-animation path').forEach(path => path.getAnimations().forEach(animation => animation.finish()));
  await pause(60);
  assert(document.querySelector('.writing-word').getAttribute('aria-busy') === 'true', 'Finishing one local replay preserves other active kanji');
  boxes()[0].querySelectorAll('.answer-animation path').forEach(path => path.getAnimations().forEach(animation => animation.finish()));
  await wait(() => document.querySelector('.writing-word').getAttribute('aria-busy') === 'false', 'Busy clears after all overlapping local replays end');
  await checkBlocked(false);

  const oldId = document.querySelector('.practice-sheet').dataset.entryId;
  await click('.writing-unit:first-child .cell-replay');
  await click('.retry-writing');
  assert(document.querySelector('.practice-sheet').dataset.entryId === oldId && unlocked(), 'Ulangi menulis reopens the same question');
  assert(!document.querySelector('.answer-shadow, .answer-animation, .answer-note, .cell-replay, .user-ink path') && document.querySelector('.writing-word').getAttribute('aria-busy') === 'false', 'Retry cancels playback and removes all answers and ink');
  await draw(boxes()[0]);
  assert(document.querySelector('.user-ink path') && !document.querySelector('.practice-actions .primary-button').disabled, 'Retry accepts handwriting and restores grading');
  await click('.practice-actions .secondary-button');
  await checkBlocked();
  await click('.skip-button'); await ready();
  assert(document.querySelector('.practice-sheet').dataset.entryId !== oldId && unlocked(), 'Skipping playback opens an unlocked question');
  await draw(boxes()[0]);
  assert(document.querySelector('.user-ink path'), 'New question accepts writing');
  await click('.practice-actions .secondary-button');
  assert(locked() && !document.querySelector('.user-ink path'), 'New question reveal locks and clears writing');
  await click('.tm-pills [data-tm="3"]'); await ready();
  assert(unlocked() && !document.querySelector('.answer-animation'), 'Switching TM cancels playback without leaking lock');

  const reduced = document.createElement('style');
  reduced.textContent = '.answer-animation path { animation-duration: .01ms !important; animation-delay: 0s !important; }';
  document.head.append(reduced);
  try {
    await click('.practice-actions .secondary-button');
    await wait(() => document.querySelector('.writing-word').getAttribute('aria-busy') === 'false', 'Reduced-motion animation completes');
    await checkBlocked(false);
    await click('.mode-nav [data-mode="writing"]');
  } finally { reduced.remove(); }
  assert(document.documentElement.scrollWidth <= innerWidth, 'No horizontal overflow');
  return { viewport: `${innerWidth}x${innerHeight}`, blockedAllPointers: 'passed', clearedCommittedAndLiveInk: 'passed', lockedAfterAnimation: 'passed', perKanjiReplay: 'passed', overlappingLocalReplays: 'passed', retrySameQuestion: 'passed', retryCancelsPlayback: 'passed', retryAcceptsWritingAndGrading: 'passed', newQuestionAcceptsWriting: 'passed', navigationResetsLock: 'passed', reducedMotionStaysLocked: 'passed' };
})()
