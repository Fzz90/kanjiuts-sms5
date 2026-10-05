return (async () => {
  const { STUDY_THEMES, MEETING_THEMES } = await import(`/src/lib/study-themes.js?qa=${Date.now()}`);
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const pause = () => new Promise(resolve => setTimeout(resolve, 220));
  const rgb = hex => `rgb(${[1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)).join(', ')})`;
  const color = (selector, property = 'color') => getComputedStyle(document.querySelector(selector))[property];
  const click = async selector => { document.querySelector(selector).click(); await pause(); };
  const expectColor = async (selector, property, expected, message) => {
    // Wait for the CSS color transition, rather than sampling an intermediate RGB.
    for (let i = 0; i < 8 && color(selector, property) !== expected; i++) await pause();
    assert(color(selector, property) === expected, `${message}: ${color(selector, property)} vs ${expected}`);
  };
  if (document.querySelector('.book-fullscreen-dialog')) await click('[aria-label="Tutup layar penuh"]');
  await click('.brand');
  assert(getComputedStyle(document.documentElement).colorScheme === 'dark', 'Native controls must use dark mode');
  assert(color('.mode-card', 'backgroundColor') === 'rgb(27, 35, 48)', 'Home cards must be dark');
  assert(getComputedStyle(document.querySelector('.mesh-background'), '::after').backgroundColor === 'rgba(9, 15, 26, 0.6)', 'Mesh drift needs its dark tint');
  const cards = [...document.querySelectorAll('.mode-card')];
  assert(new Set(cards.map(card => getComputedStyle(card).getPropertyValue('--accent'))).size === 3, 'Home modes need distinct palettes');
  const colors = {};
  for (const [index, mode] of ['reading', 'writing'].entries()) {
    await click(`.mode-nav button:nth-child(${index + 1})`);
    assert(document.body.dataset.studyTheme === mode, `${mode}: body theme`);
    assert(document.querySelector('.mesh-background').dataset.theme === mode, `${mode}: background remains mounted`);
    const meetings = [...document.querySelectorAll('.meeting-title h2')].map(node => getComputedStyle(node).color);
    assert(new Set(meetings).size === 7, `${mode}: six TM markers and Semua TM need distinct colors`);
    await click('.meeting-card[data-tm="2"]');
    for (let i = 0; mode === 'writing' && !document.querySelector('.writing-box') && i < 50; i++) await pause();
    assert(color('.prompt h2') === rgb(STUDY_THEMES[mode].accent), `${mode}: prompt color`);
    const promptStyle = getComputedStyle(document.querySelector('.prompt h2'));
    assert(promptStyle.fontWeight === '500' && parseFloat(promptStyle.webkitTextStrokeWidth) > 0, `${mode}: visibly heavier Kosugi Maru prompt`);
    assert(promptStyle.textShadow !== 'none', `${mode}: prompt glow`);
    assert(color('.practice-sheet', 'backgroundColor') === 'rgb(27, 35, 48)', `${mode}: dark practice card`);
    const english = document.querySelector('.meaning-en');
    const indonesian = document.querySelector('.meaning-id');
    assert(english.textContent.trim() && color('.meaning-en') === 'rgb(229, 99, 153)', `${mode}: English translation and requested pink`);
    assert(getComputedStyle(english).fontSize === '24px', `${mode}: English must be enlarged to 24px`);
    assert(color('.meaning-id') === 'rgb(6, 214, 160)' && getComputedStyle(indonesian).fontStyle === 'italic', `${mode}: Indonesian styling`);
    assert(indonesian.querySelector('q') && getComputedStyle(indonesian.querySelector('q')).quotes.includes('“'), `${mode}: Indonesian quotation marks`);
    assert(indonesian.getBoundingClientRect().top >= english.getBoundingClientRect().bottom, `${mode}: English above Indonesian`);
    await expectColor('.primary-button', 'backgroundColor', rgb(STUDY_THEMES[mode].accent), `${mode}: CTA color`);
    await click('.tm-pills [data-tm="7"]');
    assert(document.querySelector('.practice-screen')?.dataset.tm === '7' && !document.querySelector('.kanji-screen'), `${mode}: switching TM must open questions directly`);
    assert(document.querySelector('.practice-screen').dataset.kanji === 'all', `${mode}: switching TM covers all its kanji`);
    await expectColor('.tm-pills .active', 'backgroundColor', rgb(MEETING_THEMES[7].accent), `${mode}: TM switching`);
    assert(color('.prompt h2') === rgb(STUDY_THEMES[mode].accent), `${mode}: theme persists between TMs`);
    if (mode === 'writing') {
      for (let i = 0; !document.querySelector('.writing-box') && i < 50; i++) await pause();
      await click('.practice-actions .secondary-button');
      assert(color('.answer-animation path', 'stroke') === rgb(STUDY_THEMES.writing.deep), 'Stroke animation must use jade ink');
      const icons = [...document.querySelectorAll('.cell-actions .icon-button')];
      assert(icons.every(button => { const rect = button.getBoundingClientRect(); return rect.width >= 44 && rect.height >= 44; }), 'Writing tools must have 44px touch targets');
    }
    colors[mode] = color('.prompt h2');
    assert(document.documentElement.scrollWidth <= innerWidth, `${mode}: document overflow`);
  }
  await click('.mode-nav button:nth-child(3)');
  assert(document.body.dataset.studyTheme === 'book', 'Book theme activates');
  await click('[aria-label="Buka buku layar penuh"]');
  assert(document.querySelector('.book-fullscreen-dialog').matches(':modal'), 'Reader remains modal');
  await expectColor('.book-next-button', 'backgroundColor', rgb(STUDY_THEMES.book.accent), 'Portal must inherit terracotta palette');
  assert(color('.book-next-button') === 'rgb(16, 21, 31)', 'Fullscreen button label remains high contrast');
  assert(color('.book-fullscreen-dialog', 'backgroundColor') === 'rgb(16, 21, 31)', 'Fullscreen reader must use the dark surface');
  const pageStyle = getComputedStyle(document.querySelector('.book-page-image'));
  assert(pageStyle.filter.includes('invert(0.9)') && !pageStyle.filter.includes('blur'), 'Book page must have a static night treatment');
  colors.book = color('.book-next-button', 'backgroundColor');
  await click('[aria-label="Tutup layar penuh"]');
  await click('.brand');
  assert(document.body.dataset.studyTheme === 'home', 'Returning home resets theme');
  assert(document.querySelector('.mesh-background').dataset.theme === 'home', 'Returning home preserves the Mesh drift background');
  return { colors, bilingualPracticeStyles: 'passed in both modes', darkSurfaces: 'passed', promptGlowAndWeight: 'passed', tmColors: 'six distinct plus all-TM', strokePalette: 'passed', portalPalette: 'passed', touchTargets: 'passed', viewport: `${innerWidth}x${innerHeight}`, overflow: document.documentElement.scrollWidth > innerWidth };
})()
