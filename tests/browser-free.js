// Run through a browser eval runner on the Vite development server.
// Synthetic pointers verify React integration, not real handwriting accuracy.
return (async () => {
  const { entries, isKanji, loadCharacter } = await import('/src/lib/bank.js');
  const pause = () => new Promise(resolve => setTimeout(resolve, 20));
  const expect = (value, message) => { if (!value) throw new Error(message); };
  const waitFor = async predicate => {
    for (let i = 0; i < 250; i++) { if (predicate()) return; await pause(); }
    throw new Error('UI did not reach the expected state');
  };
  const ready = () => document.querySelector('.writing-box') && !document.querySelector('.asset-status');
  document.querySelector('.mode-card[data-mode="writing"]').click();
  await pause();
  await waitFor(() => document.querySelector('.meeting-card[data-tm="2"]'));
  document.querySelector('.meeting-card[data-tm="2"]').click();
  await pause();
  await waitFor(ready);
  document.querySelector('[aria-label="Latih kanji 婚"]').click();
  await pause();
  await waitFor(() => document.querySelector('.practice-screen')?.dataset.kanji === '婚');
  await waitFor(ready);

  const options = [...document.querySelector('.sensitivity select').options].map(option => option.textContent);
  expect(options.join('|') === 'Bebas|Longgar|Normal|Ketat', 'Bebas must be first');
  expect(document.querySelector('.sensitivity select').value === 'normal', 'Normal remains the default');

  const draw = async variant => {
    const id = document.querySelector('.practice-sheet').dataset.entryId;
    const item = entries.find(value => value.id === id);
    const chars = [...item.word].filter(isKanji);
    const boxes = [...document.querySelectorAll('.writing-box')];
    for (let boxIndex = 0; boxIndex < boxes.length; boxIndex++) {
      const svg = boxes[boxIndex];
      const asset = await loadCharacter(chars[boxIndex]);
      let strokes = asset.reference.map(stroke => [...stroke].reverse()).reverse();
      if (variant === 'split') strokes = strokes.flatMap(stroke => [stroke.slice(0, 25), stroke.slice(24)]);
      if (variant === 'scribble') strokes = [Array.from({ length: 35 }, (_, i) => ({ x: i % 2 ? .9 : .1, y: .1 + i / 45 }))];
      if (variant === 'dot') strokes = [[{ x: .5, y: .5 }]];
      svg.setPointerCapture = () => {};
      svg.hasPointerCapture = () => false;
      const rect = svg.getBoundingClientRect();
      const send = (type, point, buttons) => svg.dispatchEvent(new PointerEvent(type, {
        bubbles: true, pointerId: 1, pointerType: 'mouse',
        button: type === 'pointermove' ? -1 : 0, buttons,
        clientX: rect.left + point.x * rect.width, clientY: rect.top + point.y * rect.height,
      }));
      for (const stroke of strokes) {
        send('pointerdown', stroke[0], 1);
        for (const point of stroke.slice(1)) send('pointermove', point, 1);
        send('pointerup', stroke.at(-1), 0);
        await pause();
      }
    }
    return item.word;
  };
  const check = async () => {
    const button = document.querySelector('.practice-actions .primary-button');
    expect(button && !button.disabled, 'Drawing must enable Periksa tulisan');
    button.click();
    await pause();
  };
  await draw('reversed');
  await check();
  expect(document.querySelector('.feedback.error'), 'Normal must reject reversed strokes');
  const select = document.querySelector('.sensitivity select');
  select.value = 'free';
  select.dispatchEvent(new Event('change', { bubbles: true }));
  await pause();
  expect(document.querySelector('.grading-note').textContent.includes('tanpa penilaian'), 'Explain unrestricted writing');
  await check();
  expect(document.querySelector('.feedback.success'), 'Bebas must accept the same reversed drawing');
  expect(document.querySelector('.feedback').textContent.includes('Latihan menulis selesai'), 'Confirm practice completion without claiming shape accuracy');
  expect(document.querySelector('.writing-correct-answer'), 'Reveal the canonical answer after success');
  expect(document.querySelector('.sensitivity select').disabled, 'Lock sensitivity after success');
  document.querySelector('.practice-actions .next-button').click();
  await pause();
  await waitFor(ready);
  expect(document.querySelector('.sensitivity select').value === 'free', 'Keep Bebas for the next question');

  document.querySelector('.practice-actions .secondary-button').click();
  await pause();
  expect(document.querySelector('.retry-writing'), 'Show answer offers writing retry in Bebas');
  expect([...document.querySelectorAll('.writing-box')].every(box => box.getAttribute('aria-disabled') === 'true'), 'Show answer locks all boxes');
  expect(document.querySelector('.practice-actions .primary-button').disabled, 'Cannot grade a revealed answer');
  document.querySelector('.retry-writing').click();
  await pause();
  expect(!document.querySelector('.answer-shadow'), 'Retry clears the revealed shape');

  await draw('scribble');
  await check();
  expect(document.querySelector('.feedback.success'), 'Bebas accepts unrelated scribbles');
  document.querySelector('.practice-actions .next-button').click();
  await pause();
  await waitFor(ready);
  expect(document.querySelector('.practice-actions .primary-button').disabled, 'Empty boxes cannot complete practice');
  const word = await draw('dot');
  await check();
  expect(document.querySelector('.feedback.success'), 'Bebas accepts a single tap in each box');
  expect(document.documentElement.scrollWidth <= innerWidth, 'No horizontal document overflow');
  return { word, options, viewport: innerWidth, scribblesAccepted: true, tapsAccepted: true, emptyBoxesBlocked: true };
})()
