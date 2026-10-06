return (async () => {
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  const click = async selector => {
    const button = document.querySelector(selector);
    assert(button && !button.disabled, `Unavailable ${selector}`);
    button.click(); await pause(35);
  };
  const overlaps = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  const layout = () => {
    const home = document.querySelector('.home-button').getBoundingClientRect();
    const sfx = document.querySelector('.sfx-control').getBoundingClientRect();
    const actions = document.querySelector('.header-actions').getBoundingClientRect();
    assert(sfx.left > home.right && Math.abs((sfx.top + sfx.height / 2) - (home.top + home.height / 2)) < 1, 'SFX sits immediately to the right of Awal on the same row');
    assert(!overlaps(actions, document.querySelector('.brand').getBoundingClientRect()) && !overlaps(actions, document.querySelector('.mode-nav').getBoundingClientRect()), 'Header controls do not overlap title or navigation');
    for (const button of document.querySelectorAll('.header-actions button')) {
      const rect = button.getBoundingClientRect();
      assert(rect.left >= 0 && rect.right <= innerWidth && rect.width >= 44 && rect.height >= 44, 'Usable header control fits viewport');
    }
    assert(document.querySelectorAll('.sfx-control [aria-pressed="true"]').length === 1, 'One SFX option selected');
    assert(document.documentElement.scrollWidth <= innerWidth, 'No horizontal overflow');
  };
  const report = [];
  for (const mode of ['reading', 'writing']) {
    await click(`.mode-nav [data-mode="${mode}"]`);
    layout();
    await click('.meeting-card[data-tm="2"]');
    layout();
    await click('.session-nav .text-button');
    layout();
    await click('.kanji-card[data-kanji="窓"]');
    for (let i = 0; document.querySelector('.skip-button') && i < 6; i++) await click('.skip-button');
    assert(document.querySelector('.result-screen'), 'Session result is visible');
    layout();
    report.push({ mode, selectPracticeChooserResult: 'passed' });
  }
  return { viewport: `${innerWidth}x${innerHeight}`, report, placement: 'right of Awal', touchTargets: '44px minimum', overflow: false };
})()
