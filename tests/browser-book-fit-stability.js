return (async () => {
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const pause = time => new Promise(resolve => setTimeout(resolve, time));
  const frame = () => new Promise(resolve => requestAnimationFrame(resolve));
  if (!document.querySelector('.book-reader-heading')) {
    document.querySelector('.mode-nav button:nth-child(3)').click();
    await pause(40);
  }
  if (document.querySelector('.book-fullscreen-dialog')) {
    document.querySelector('[aria-label="Tutup layar penuh"]').click();
    await pause(40);
  }
  document.querySelector('[aria-label="Buka buku layar penuh"]').click();
  await document.fonts.ready;
  for (let i = 0; i < 100 && !document.querySelector('.book-page-image.is-loaded'); i++) await pause(30);
  assert(document.querySelector('.book-page-image.is-loaded'), 'Image did not load');
  await pause(150);
  const viewport = document.querySelector('.book-page-viewport');
  const image = document.querySelector('.book-page-image');
  const originalStyle = viewport.style.cssText;
  let gutterFrame = 0;
  let reserveVertical = false;
  let reserveHorizontal = false;
  // Headless Chromium hides native scrollbars. Model classic scrollbar space
  // with borders that consume the same 16px when content overflows.
  const updateGutters = () => {
    const vertical = viewport.scrollHeight > viewport.clientHeight;
    const horizontal = viewport.scrollWidth > viewport.clientWidth;
    if (vertical !== reserveVertical) {
      reserveVertical = vertical;
      viewport.style.borderRight = vertical ? '16px solid transparent' : '0px';
    }
    if (horizontal !== reserveHorizontal) {
      reserveHorizontal = horizontal;
      viewport.style.borderBottom = horizontal ? '16px solid transparent' : '0px';
    }
    gutterFrame = requestAnimationFrame(updateGutters);
  };
  const sample = () => ({ width: image.getBoundingClientRect().width, available: viewport.clientWidth - 24, zoom: document.querySelector('.book-zoom-value').textContent });
  const collect = async () => { const samples = []; for (let i = 0; i < 45; i++) { await frame(); samples.push(sample()); } return samples; };
  try {
    updateGutters();
    await frame();
    document.querySelector('[aria-label="Pas lebar layar"]').click();
    const firstSamples = await collect();
    const settled = firstSamples.slice(8);
    const widths = settled.map(value => value.width);
    const range = Math.max(...widths) - Math.min(...widths);
    assert(range < 0.1, `First fit-width click oscillates by ${range.toFixed(2)}px: ${[...new Set(widths)].join(', ')}`);
    assert(Math.abs(sample().width - sample().available) < 1, 'Fit width must match content area after scrollbar appears');
    assert(viewport.scrollWidth <= viewport.clientWidth, 'Fit width must not create horizontal overflow');
    document.querySelector('[aria-label="Pas lebar layar"]').click();
    const secondSamples = await collect();
    assert(Math.abs(secondSamples.at(-1).width - firstSamples.at(-1).width) < 0.1, 'Second click must not be needed to correct width');
    assert(image.getAnimations().length === 0, 'Fitted image must not animate');
    return { firstClick: 'stable', secondClick: 'identical', zoom: sample().zoom, imageWidth: sample().width, widthRange: range, simulatedClassicScrollbars: true };
  } finally {
    cancelAnimationFrame(gutterFrame);
    viewport.style.cssText = originalStyle;
    document.querySelector('[aria-label="Tutup layar penuh"]')?.click();
    document.querySelector('#qa-classic-scrollbars')?.remove();
  }
})()
