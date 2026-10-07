// Run through gstack browse eval on the development server.
return (async () => {
  const { entries, isKanji, loadCharacter } = await import('/src/lib/bank.js');
  const { gradeDrawing } = await import('/src/lib/grading.js');
  const expect = (value, message) => { if (!value) throw new Error(message); };
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  const wait = async predicate => {
    for (let i = 0; i < 300 && !predicate(); i++) await pause(25);
    expect(predicate(), 'Expected UI state missing');
  };
  const click = async selector => {
    const button = document.querySelector(selector);
    expect(button && !button.disabled, `Unavailable ${selector}`);
    button.click(); await pause(40);
  };
  const looseEnds = reference => reference.map(stroke => {
    const points = stroke.slice(4, -4);
    const end = points.at(-1), previous = points.at(-3);
    const length = Math.hypot(end.x - previous.x, end.y - previous.y);
    return [...points, { x: end.x + (end.x - previous.x) * .06 / length, y: end.y + (end.y - previous.y) * .06 / length }];
  });
  const lost = (await loadCharacter('失')).reference;
  const missingTop = reference => reference.map((stroke, n) => n === 3 ? stroke.filter(p => p.y >= .34) : stroke);
  expect(!gradeDrawing(missingTop(lost), lost, 'free').correct, 'Missing upper 失 protrusion must fail');
  expect(!gradeDrawing(lost, missingTop(lost), 'free').correct, 'Extra protrusion must also fail against arrow-like reference');
  for (const character of ['口', '田']) {
    const reference = (await loadCharacter(character)).reference;
    expect(gradeDrawing(looseEnds(reference), reference, 'free').correct, `${character} permits small gaps and overhangs`);
  }
  const report = [];
  for (const scenario of [
    { tm: 2, root: '窓', character: '口', word: '窓口' },
    { tm: 2, root: '吉', character: '田', word: '吉田さん' },
    { tm: 7, root: '失', character: '失' },
  ]) {
    await click('.mode-nav [data-mode="writing"]');
    await click(`.meeting-card[data-tm="${scenario.tm}"]`);
    await click(`.root-grid [aria-label="Latih kanji ${scenario.root}"]`);
    const currentItem = () => entries.find(item => item.id === document.querySelector('.practice-sheet')?.dataset.entryId);
    if (scenario.word) {
      for (let i = 0; i < 12 && currentItem()?.word !== scenario.word; i++) await click('.skip-button');
      expect(currentItem()?.word === scenario.word, 'Target vocabulary reached');
    }
    await wait(() => document.querySelector('.writing-box') && !document.querySelector('.asset-status'));
    const select = document.querySelector('.sensitivity select');
    select.value = 'free'; select.dispatchEvent(new Event('change', { bubbles: true }));
    await pause(40);
    const item = currentItem();
    const draw = async broken => {
      const characters = [...item.word].filter(isKanji);
      const boxes = [...document.querySelectorAll('.writing-box')];
      for (let b = 0; b < boxes.length; b++) {
        const character = characters[b], svg = boxes[b];
        let strokes = (await loadCharacter(character)).reference;
        if (character === scenario.character) strokes = character === '失' ? (broken ? missingTop(strokes) : strokes) : looseEnds(strokes);
        svg.setPointerCapture = () => {};
        svg.hasPointerCapture = () => false;
        const rect = svg.getBoundingClientRect();
        const send = (type, point, buttons) => svg.dispatchEvent(new PointerEvent(type, {
          bubbles: true, pointerId: 1, pointerType: 'mouse', button: type === 'pointermove' ? -1 : 0, buttons,
          clientX: rect.left + point.x * rect.width, clientY: rect.top + point.y * rect.height,
        }));
        for (const stroke of strokes) {
          send('pointerdown', stroke[0], 1);
          for (const point of stroke.slice(1)) send('pointermove', point, 1);
          send('pointerup', stroke.at(-1), 0); await pause(20);
        }
      }
      await click('.practice-actions .primary-button');
    };
    if (scenario.character === '失') {
      await draw(true);
      expect(document.querySelector('.feedback.error'), 'UI rejects 失 without upper protrusion');
      const erase = [...document.querySelectorAll('button')].find(button => button.textContent.includes('Hapus semua'));
      expect(erase && !erase.disabled, 'Wrong drawing can be cleared');
      erase.click(); await pause(40);
    }
    await draw(false);
    expect(document.querySelector('.feedback.success'), 'Valid handwriting accepted');
    expect(document.querySelector('.writing-correct-answer'), 'Correct answer printed');
    expect(document.querySelector('.practice-actions .primary-button').textContent.includes('Selanjutnya'), 'Manual advance remains');
    report.push({ word: item.word, character: scenario.character, smallGapsAndOverhangs: scenario.character !== '失', distinctiveTipChecked: scenario.character === '失' });
  }
  expect(document.documentElement.scrollWidth <= innerWidth, 'No horizontal overflow');
  return { viewport: `${innerWidth}x${innerHeight}`, report };
})()
