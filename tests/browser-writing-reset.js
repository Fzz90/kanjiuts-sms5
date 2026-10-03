return (async () => {
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const tick = () => new Promise(resolve => requestAnimationFrame(resolve));
  const draw = async (svg, complete = true) => {
    svg.setPointerCapture = () => {};
    svg.hasPointerCapture = () => false;
    const rect = svg.getBoundingClientRect();
    const send = (type, ratio) => svg.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 91, pointerType: 'touch', button: 0, buttons: type === 'pointerup' ? 0 : 1, clientX: rect.left + rect.width * ratio, clientY: rect.top + rect.height * ratio }));
    send('pointerdown', .2); await tick();
    send('pointermove', .7); await tick();
    if (complete) { send('pointerup', .8); await tick(); }
  };
  for (let i = 0; !document.querySelector('.writing-box') && i < 100; i++) await tick();
  const boxes = [...document.querySelectorAll('.writing-box')];
  assert(boxes.length > 0, 'Writing boxes must load');
  for (const box of boxes) {
    const rect = box.getBoundingClientRect();
    assert(rect.width >= 230 && Math.abs(rect.width - rect.height) < 1, 'Writing area must be large and square');
    assert(rect.left >= 0 && rect.right <= innerWidth, 'Writing box must fit the viewport');
    await draw(box);
  }
  assert(document.querySelectorAll('.user-ink path').length === boxes.length, 'Committed strokes must be visible before reveal');
  document.querySelector('.practice-actions .primary-button').click(); await tick();
  assert(document.querySelector('.writing-cell.invalid'), 'Bad drawing must show error state');
  assert(!document.querySelector('.writing-correct-answer'), 'Incorrect writing must not show correct-answer rows');
  await draw(document.querySelector('.writing-box'), false);
  assert(document.querySelectorAll('.user-ink path').length > boxes.length, 'Test includes an in-progress stroke');
  document.querySelector('.practice-actions .secondary-button').click(); await tick();
  assert(!document.querySelector('.user-ink path'), 'Show answer must clear committed and live strokes');
  assert(!document.querySelector('.writing-cell.invalid') && !document.querySelector('.feedback').textContent, 'Reveal must clear old errors');
  assert(!document.querySelector('.writing-correct-answer'), 'Show answer must not mark writing as correct');
  assert([...document.querySelectorAll('.cell-meta')].every(node => node.textContent.includes('0 stroke')), 'All stroke counts must reset');
  assert(document.querySelector('.practice-actions .primary-button').disabled, 'Empty answer cannot be submitted');
  const animation = [...document.querySelectorAll('.answer-animation path')];
  const delays = animation.map(path => parseFloat(getComputedStyle(path).animationDelay));
  assert(animation.length === document.querySelectorAll('.answer-shadow path').length && animation.length > 0, 'Shadow and animation must remain after clearing');
  assert(delays[0] === .5 && delays.every((delay, i) => !i || delay > delays[i - 1]), 'Stroke order must remain sequential');
  await draw(document.querySelector('.writing-box'));
  assert(!document.querySelector('.user-ink path'), 'Writing must be blocked during the answer animation');
  animation.forEach(path => path.getAnimations().forEach(animation => { animation.playbackRate = 20; }));
  for (let i = 0; document.querySelector('.writing-word').getAttribute('aria-busy') === 'true' && i < 180; i++) await tick();
  assert(document.querySelector('.writing-word').getAttribute('aria-busy') === 'false', 'Animation must finish');
  assert(document.querySelector('.writing-box').getAttribute('aria-disabled') === 'true', 'Revealed writing must stay read-only after animation');
  await draw(document.querySelector('.writing-box'));
  assert(!document.querySelector('.user-ink path'), 'Drawing remains blocked after animation');
  document.querySelector('.practice-actions .secondary-button').click(); await tick();
  assert(!document.querySelector('.user-ink path'), 'Replay must keep revealed answer free of user ink');
  assert([...document.querySelectorAll('.writing-box')].every(box => box.getAttribute('aria-disabled') === 'true'), 'Replay must lock every box again');
  assert(document.documentElement.scrollWidth <= innerWidth, 'Page must not overflow horizontally');
  return { resetCommittedAndLiveInk: 'passed', clearedErrorState: 'passed', shadowAndAnimation: 'passed', readOnlyAfterReveal: 'passed', replay: 'passed', boxWidth: document.querySelector('.writing-box').getBoundingClientRect().width, viewport: `${innerWidth}x${innerHeight}` };
})()
