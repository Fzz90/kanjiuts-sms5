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
  const checkBlocked = async () => {
    assert(locked(), 'All boxes stay locked during whole-word animation');
    assert(document.querySelector('.writing-word').getAttribute('aria-busy') === 'true', 'Animation exposes busy state');
    for (const box of boxes()) for (const type of ['touch', 'pen', 'mouse']) await draw(box, type);
    assert(!document.querySelector('.user-ink path'), 'No committed or live strokes from touch, pen or mouse');
    assert(document.querySelector('.practice-actions .primary-button').disabled, 'Cannot grade during playback');
    assert([...document.querySelectorAll('.cell-actions button')].every(button => button.disabled), 'Undo and erase unavailable during playback');
  };

  await click('.mode-nav [data-mode="writing"]');
  await click('.meeting-card[data-tm="2"]');
  await click('.root-grid [aria-label="Latih kanji 窓"]');
  await ready();
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
  await wait(unlocked, 'Last actual CSS animationend unlocks all boxes');
  assert(document.querySelector('.writing-word').getAttribute('aria-busy') === 'false', 'Busy state clears');
  await draw(boxes()[0]);
  assert(document.querySelector('.user-ink path'), 'Can write again after last stroke');

  await click('.practice-actions .secondary-button');
  await checkBlocked();
  const oldId = document.querySelector('.practice-sheet').dataset.entryId;
  await click('.skip-button'); await ready();
  assert(document.querySelector('.practice-sheet').dataset.entryId !== oldId && unlocked(), 'Skipping playback opens an unlocked question');
  await click('.practice-actions .secondary-button');
  assert(locked(), 'New question can lock');
  await click('.tm-pills [data-tm="3"]'); await ready();
  assert(unlocked() && !document.querySelector('.answer-animation'), 'Switching TM cancels playback without leaking lock');

  const reduced = document.createElement('style');
  reduced.textContent = '.answer-animation path { animation-duration: .01ms !important; animation-delay: 0s !important; }';
  document.head.append(reduced);
  try {
    await click('.practice-actions .secondary-button');
    await wait(unlocked, 'Reduced-motion CSS animation still unlocks');
    await draw(boxes()[0]);
    assert(document.querySelector('.user-ink path'), 'Reduced-motion users can continue writing');
    await click('.mode-nav [data-mode="writing"]');
  } finally { reduced.remove(); }
  assert(document.documentElement.scrollWidth <= innerWidth, 'No horizontal overflow');
  return { viewport: `${innerWidth}x${innerHeight}`, blockedAllPointers: 'passed', clearedCommittedAndLiveInk: 'passed', unlockAfterWholeWord: 'passed', replayLocksAgain: 'passed', navigationCancelsLock: 'passed', reducedMotionUnlock: 'passed' };
})()
