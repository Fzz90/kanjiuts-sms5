return (async () => {
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  const wait = async (predicate, message) => {
    for (let i = 0; i < 240 && !predicate(); i++) await pause(25);
    assert(predicate(), message);
  };
  const click = async selector => {
    const button = document.querySelector(selector);
    assert(button && !button.disabled, `Unavailable ${selector}`);
    button.click(); await pause(35);
  };
  const audio = window.__qaAudio;
  assert(audio, 'Install sound observer before entering a mode');
  const starts = () => audio.events.filter(event => event.type === 'start');
  const expectSound = async (file, selector) => {
    const before = starts().length;
    await click(selector);
    await wait(() => starts().length > before, `Missing ${file}`);
    assert(starts().at(-1).file === file, `Expected ${file}`);
  };
  await click('.mode-nav [data-mode="writing"]');
  const original = document.querySelector('[data-sfx="on"]').getAttribute('aria-pressed') === 'true';
  try {
    await click('[data-sfx="on"]');
    await click('.meeting-card[data-tm="2"]');
    await wait(() => !!document.querySelector('.writing-box'), 'Writing assets load');
    await expectSound('reveal.mp3', '.practice-actions .secondary-button');
    await click('[data-sfx="off"]');
    assert(audio.events.some(event => event.type === 'stop' && event.file === 'reveal.mp3'), 'Off stops active playback');
    const mutedCount = starts().length;
    await click('.cell-replay');
    assert(document.querySelector('.answer-animation'), 'Muting does not disable animation');
    await click('.retry-writing');
    await click('.skip-button');
    await pause(100);
    assert(starts().length === mutedCount, 'Replay, retry and skip stay silent while Off');
    assert(localStorage.getItem('kanji-uts-s5-sfx-v1') === 'off', 'Off preference saved');
    await click('.mode-nav [data-mode="reading"]');
    assert(document.querySelector('[data-sfx="off"]').getAttribute('aria-pressed') === 'true', 'Off follows mode changes');
    await click('.meeting-card[data-tm="2"]');
    await click('.practice-actions .secondary-button');
    await pause(100);
    assert(starts().length === mutedCount, 'Yomikata Show answer also stays silent');
    await click('[data-sfx="on"]');
    await expectSound('skip.mp3', '.skip-button');
    assert(localStorage.getItem('kanji-uts-s5-sfx-v1') === 'on', 'On preference saved and restores audio');
    return { viewport: `${innerWidth}x${innerHeight}`, stopActiveAudio: 'passed', mutedReadingWritingReplayRetryAndSkip: 'passed', modePersistence: 'passed', onRestoresSound: 'passed' };
  } finally {
    await click(original ? '[data-sfx="on"]' : '[data-sfx="off"]');
    audio.restore();
  }
})()
