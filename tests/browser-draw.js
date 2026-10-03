// Integration fixture: synthetic pointer events exercise the actual React drawing handlers.
// Pointer capture is shimmed because synthetic events are not active hardware pointers.
return (async () => {
  const { entries, isKanji, loadCharacter } = await import('/src/lib/bank.js');
  const reading = document.querySelector('.kana-prompt').textContent;
  const meaning = document.querySelector('.meaning-id q').textContent;
  const item = entries.find(value => value.reading === reading && value.meanings.join(' / ') === meaning);
  if (!item) throw new Error('Prompt not found in source bank');
  const chars = [...item.word].filter(isKanji);
  const variant = window.__qaVariant ?? 'correct';
  const boxes = [...document.querySelectorAll('.writing-box')];
  if (document.querySelector('.writing-correct-answer')) throw new Error('Correct answers must stay hidden before grading');
  const pause = () => new Promise(resolve => setTimeout(resolve, 0));
  for (let boxIndex = 0; boxIndex < boxes.length; boxIndex++) {
    const svg = boxes[boxIndex];
    const asset = await loadCharacter(chars[boxIndex]);
    svg.setPointerCapture = () => {};
    svg.hasPointerCapture = () => false;
    let strokes = asset.reference;
    if (variant === 'reversed' && boxIndex === 0) strokes = strokes.map((stroke, i) => i === 0 ? [...stroke].reverse() : stroke);
    if (variant === 'swapped' && boxIndex === 0 && strokes.length > 1) strokes = [strokes[1], strokes[0], ...strokes.slice(2)];
    if (variant === 'scribble') strokes = strokes.map(() => Array.from({ length: 35 }, (_, i) => ({ x: i % 2 ? .85 : .15, y: .1 + i / 45 })));
    const rect = svg.getBoundingClientRect();
    const send = (type, p, buttons) => svg.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 1, pointerType: 'mouse', button: type === 'pointermove' ? -1 : 0, buttons, clientX: rect.left + p.x * rect.width, clientY: rect.top + p.y * rect.height }));
    for (const stroke of strokes) {
      send('pointerdown', stroke[0], 1);
      for (const point of stroke.slice(1)) send('pointermove', point, 1);
      send('pointerup', stroke.at(-1), 0);
      await pause();
    }
  }
  await pause();
  document.querySelector('.practice-actions .primary-button').click();
  await pause();
  const answers = [...document.querySelectorAll('.writing-correct-answer')];
  if (variant === 'correct') {
    if (answers.length !== chars.length || answers.some((answer, i) => answer.querySelector('strong').textContent !== chars[i])) throw new Error('Correct writing must reveal each canonical kanji');
    if (answers.some(answer => answer.getBoundingClientRect().top < answer.closest('.writing-cell').querySelector('.writing-box').getBoundingClientRect().bottom)) throw new Error('Each answer must appear below its drawing box');
    if (document.documentElement.scrollWidth > innerWidth) throw new Error('Correct-answer row must fit the viewport');
  } else if (answers.length) throw new Error('Incorrect writing must not reveal correct-answer rows');
  return { word: item.word, variant, feedback: document.querySelector('.feedback').textContent, incorrectBoxes: document.querySelectorAll('.writing-cell.invalid').length, writtenStrokeCounts: [...document.querySelectorAll('.cell-meta')].map(element => element.textContent), answersUnderBoxes: answers.map(answer => answer.querySelector('strong').textContent) };
})()
