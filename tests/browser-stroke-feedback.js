return (async () => {
  const { entries, isKanji, loadCharacter } = await import('/src/lib/bank.js');
  const { gradeDrawing } = await import('/src/lib/grading.js');
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  const wait = async (predicate, message) => {
    for (let i = 0; i < 120 && !predicate(); i++) await pause(25);
    assert(predicate(), message);
  };
  const click = async selector => {
    const node = document.querySelector(selector);
    assert(node && !node.disabled, `Unavailable control: ${selector}`);
    node.click(); await pause(30);
  };
  const boxes = () => [...document.querySelectorAll('.writing-box')];
  const ready = () => wait(() => boxes().length > 0 && !document.querySelector('.asset-status'), 'Writing assets must load');
  const item = () => entries.find(entry => entry.id === document.querySelector('.practice-sheet').dataset.entryId);
  const assets = async () => Promise.all([...item().word].filter(isKanji).map(loadCharacter));
  const draw = async (svg, stroke) => {
    svg.setPointerCapture = () => {};
    svg.hasPointerCapture = () => false;
    const rect = svg.getBoundingClientRect();
    const send = (type, point) => svg.dispatchEvent(new PointerEvent(type, {
      bubbles: true, pointerId: 505, pointerType: 'touch', button: 0, buttons: type === 'pointerup' ? 0 : 1,
      clientX: rect.left + point.x * rect.width, clientY: rect.top + point.y * rect.height,
    }));
    send('pointerdown', stroke[0]);
    stroke.slice(1).forEach(point => send('pointermove', point));
    send('pointerup', stroke.at(-1)); await pause(0);
  };
  const fill = async (references, errors = []) => {
    for (let box = 0; box < references.length; box++) {
      for (let stroke = 0; stroke < references[box].reference.length; stroke++) {
        const points = references[box].reference[stroke];
        await draw(boxes()[box], errors[box] === stroke ? [...points].reverse() : points);
      }
    }
  };

  await click('.mode-nav [data-mode="writing"]');
  await click('.meeting-card[data-tm="2"]');
  await click('.root-grid [aria-label="Latih kanji 婚"]');
  let references;
  for (let i = 0; i < 12; i++) {
    await ready(); references = await assets();
    const reversed = references[0].reference.map((points, index) => index === 4 ? [...points].reverse() : points);
    if (references.length >= 2 && gradeDrawing(reversed, references[0].reference).stroke === 4) break;
    await click('.skip-button'); references = null;
  }
  assert(references, 'Fixture needs a word with an identifiable fifth stroke and multiple kanji');
  await fill(references, [4, 0]);
  await click('.practice-actions .primary-button');
  assert(document.querySelector('.feedback.error').textContent.includes('stroke 5'), 'Feedback must identify the fifth stroke');
  const errors = [...document.querySelectorAll('.user-ink .stroke-error')];
  assert(errors.length === 2 && errors[0].dataset.strokeNumber === '5' && errors[1].dataset.strokeNumber === '1', 'Each box must highlight its own failing stroke with one-based numbering');
  assert(document.querySelectorAll('.user-ink path:not(.stroke-error)').length > 0, 'Other strokes remain unmarked');
  const failed = errors[0], animation = failed.getAnimations()[0];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const css = getComputedStyle(failed);
  const colorProbe = document.createElement('span');
  colorProbe.style.color = css.getPropertyValue('--red').trim(); document.body.append(colorProbe);
  const errorRed = getComputedStyle(colorProbe).color; colorProbe.remove();
  assert(css.stroke === errorRed && css.animationIterationCount === '5', 'Incorrect stroke uses the error red for five blinks');
  if (reducedMotion) {
    assert(parseFloat(css.animationDuration) < .001 && Number(css.opacity) === 1, 'Reduced motion keeps a static visible red stroke');
  } else {
    assert(animation?.animationName === 'wrong-stroke-blink', 'Incorrect stroke has a blink animation');
    animation.pause(); animation.currentTime = 0;
    const opaque = Number(getComputedStyle(failed).opacity);
    animation.currentTime = 300;
    assert(Number(getComputedStyle(failed).opacity) < opaque, 'Blink visibly fades the incorrect stroke');
    animation.currentTime = 3000;
    assert(Number(getComputedStyle(failed).opacity) === 1, 'Stroke stays visible after five blinks');
  }

  await click('.practice-actions .primary-button');
  assert(boxes()[0].querySelector('.stroke-error') !== failed, 'Checking again refreshes the incorrect stroke');
  if (!reducedMotion) assert(boxes()[0].querySelector('.stroke-error').getAnimations()[0] !== animation, 'Checking again restarts blink');
  await click('.writing-cell .cell-actions button');
  assert(!boxes()[0].querySelector('.stroke-error') && boxes()[1].querySelector('.stroke-error'), 'Editing clears only the edited box marker');
  await click('.practice-actions .primary-button');
  assert(!boxes()[0].querySelector('.stroke-error'), 'Stroke count failure must not falsely mark an existing line');
  await click('.writing-tools button');
  assert(!document.querySelector('.stroke-error') && !document.querySelector('.user-ink path'), 'Clear all resets ink and stroke errors');
  await fill(references, [4]); await click('.practice-actions .primary-button');
  assert(document.querySelectorAll('.stroke-error').length === 1, 'A correct neighboring kanji is not highlighted');
  await click('.practice-actions .secondary-button');
  assert(!document.querySelector('.stroke-error') && !document.querySelector('.user-ink path'), 'Show answer removes incorrect ink and blink');
  assert(boxes().every(svg => svg.getAttribute('aria-disabled') === 'true'), 'Show answer keeps all boxes locked');
  await click('.skip-button'); await ready();
  assert(!document.querySelector('.stroke-error'), 'New question has no stale marker');
  await fill(await assets()); await click('.practice-actions .primary-button');
  assert(document.querySelector('.feedback.success') && !document.querySelector('.stroke-error'), 'Correct writing keeps the normal success flow');
  assert(document.querySelector('.practice-actions').textContent.includes('Selanjutnya'), 'Correct writing waits for Selanjutnya');
  assert(document.documentElement.scrollWidth <= innerWidth, 'No horizontal overflow');
  return { viewport: `${innerWidth}x${innerHeight}`, reducedMotion, fifthStrokeFeedback: 'passed', multipleBoxes: 'passed', retryAndReset: 'passed', revealLock: 'passed', correctWriting: 'passed' };
})()
