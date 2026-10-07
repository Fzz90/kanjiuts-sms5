return (async () => {
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  const click = async selector => {
    const element = document.querySelector(selector);
    assert(element && !element.disabled, `Unavailable control: ${selector}`);
    element.click(); await pause(35);
  };
  const fits = selector => {
    for (const element of document.querySelectorAll(selector)) {
      const rect = element.getBoundingClientRect();
      if (!rect.width || !rect.height) continue;
      assert(rect.left >= -1 && rect.right <= innerWidth + 1, `Element outside viewport: ${selector}`);
    }
    assert(document.documentElement.scrollWidth <= innerWidth, 'No horizontal document overflow');
  };
  const touchTargets = selector => {
    for (const element of document.querySelectorAll(selector)) {
      const rect = element.getBoundingClientRect();
      assert(rect.width >= 44 && rect.height >= 44, `Touch target too small: ${selector}`);
    }
  };
  const report = [];
  for (const mode of ['reading', 'writing']) {
    await click(`.mode-nav [data-mode="${mode}"]`);
    fits('.mode-nav, .brand, .meeting-card');
    await click('.meeting-card[data-tm="all"]');
    for (let i = 0; mode === 'writing' && !document.querySelector('.writing-box') && i < 120; i++) await pause(25);
    fits('.session-nav, .session-nav strong, .practice-sheet, .prompt h2, .study-sidebar, .tm-pills button, .writing-box');
    touchTargets('.tm-pills button, .all-tm-roots summary, .practice-actions button');
    await click('.all-tm-roots summary');
    fits('.root-grid button'); touchTargets('.root-grid button');
    assert(document.querySelectorAll('.root-grid button').length === 78, 'All roots fit the expandable sidebar');
    await click('.session-nav .text-button');
    fits('.all-kanji-card, .kanji-card'); touchTargets('.kanji-card');
    await click('.all-kanji-card');
    fits('.session-nav, .practice-sheet, .question-origins');
    report.push({ mode, allTmCard: 'passed', sessionAndSidebar: 'passed', allRootsAndChooser: 'passed' });
  }
  return { viewport: `${innerWidth}x${innerHeight}`, report, overflow: false };
})()
