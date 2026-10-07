return (async () => {
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const pause = (time = 40) => new Promise(resolve => setTimeout(resolve, time));
  const waitForPage = async () => {
    for (let i = 0; i < 80 && !document.querySelector('.book-page-image.is-loaded'); i++) await pause();
    assert(document.querySelector('.book-page-image.is-loaded'), 'Page failed to load');
  };
  const choose = async index => {
    const select = document.querySelector('.book-page-select select');
    select.value = String(index);
    select.dispatchEvent(new Event('change', { bubbles: true }));
    await pause();
    await waitForPage();
  };
  if (document.querySelector('.book-fullscreen-dialog')) {
    document.querySelector('[aria-label="Tutup layar penuh"]').click();
    await pause();
  }
  await choose(0);
  const normalWidth = document.querySelector('.book-page-viewport').clientWidth;
  const bodyOverflow = document.body.style.overflow;
  document.querySelector('[aria-label="Buka buku layar penuh"]').click();
  await pause();
  await waitForPage();
  const dialog = document.querySelector('.book-fullscreen-dialog');
  const rect = dialog.getBoundingClientRect();
  assert(dialog.open && dialog.matches(':modal'), 'Reader must use a modal dialog');
  assert(Math.abs(rect.width - innerWidth) < 2 && Math.abs(rect.height - innerHeight) < 2, 'Reader must fill viewport');
  assert(document.body.style.overflow === 'hidden', 'Background scroll must be locked');
  assert(dialog.contains(document.activeElement), 'Focus must enter modal');

  document.querySelector('[aria-label="Pas lebar layar"]').click();
  await pause();
  const viewport = document.querySelector('.book-page-viewport');
  const image = document.querySelector('.book-page-image');
  assert(Math.abs(image.clientWidth - (viewport.clientWidth - 24)) < 2, 'Fit width must use screen width');
  const fittedWidth = image.clientWidth;
  const fittedZoom = Number.parseFloat(document.querySelector('.book-zoom-value').textContent);
  if (fittedZoom > 100) {
    document.querySelector('[aria-label="Perkecil halaman"]').click();
    await pause();
    assert(image.clientWidth < fittedWidth, 'Zoom out must use fitted width as its starting scale');
  } else {
    document.querySelector('[aria-label="Perbesar halaman"]').click();
    await pause();
    assert(image.clientWidth > fittedWidth, 'Zoom in must leave fit-width mode');
  }
  document.querySelector('[aria-label="Pas lebar layar"]').click();
  await pause();
  assert(Math.abs(image.clientWidth - fittedWidth) < 2, 'Fit width must restore its width after manual zoom');
  document.querySelector('[aria-label="Pas halaman"]').click();
  await pause();
  document.querySelector('[aria-label="Perbesar halaman"]').click();
  await pause();

  // Synthetic pointer fixture exercises the React handlers; capture needs a shim.
  const originalCapture = viewport.setPointerCapture;
  const originalHasCapture = viewport.hasPointerCapture;
  viewport.setPointerCapture = () => {};
  viewport.hasPointerCapture = () => false;
  const bounds = viewport.getBoundingClientRect();
  const send = (type, id, x, y, pointerType = 'touch') => viewport.dispatchEvent(new PointerEvent(type, {
    bubbles: true, pointerId: id, pointerType, button: type === 'pointermove' ? -1 : 0,
    buttons: type === 'pointerup' ? 0 : 1, clientX: bounds.left + x, clientY: bounds.top + y,
  }));
  try {
    const midX = viewport.clientWidth / 2, midY = viewport.clientHeight / 2;
    const beforePinch = image.clientWidth;
    send('pointerdown', 11, midX - 45, midY);
    send('pointerdown', 12, midX + 45, midY);
    send('pointermove', 11, midX - 90, midY);
    await pause();
    send('pointermove', 12, midX + 90, midY);
    await pause();
    assert(image.clientWidth > beforePinch * 1.8, 'Pinch must magnify the page');
    send('pointerup', 11, midX - 90, midY);
    send('pointerup', 12, midX + 90, midY);
    await pause();
    viewport.scrollTop = 0;
    send('pointerdown', 13, midX, midY, 'mouse');
    send('pointermove', 13, midX, midY - 90, 'mouse');
    await pause();
    assert(viewport.scrollTop > 60, 'Dragging must pan magnified page');
    send('pointerup', 13, midX, midY - 90, 'mouse');
    await pause();
  } finally {
    viewport.setPointerCapture = originalCapture;
    viewport.hasPointerCapture = originalHasCapture;
  }

  const zoomBeforeNavigation = document.querySelector('.book-zoom-value').textContent;
  document.querySelector('.book-next-button').click();
  await pause();
  await waitForPage();
  assert(dialog.open && document.querySelector('.book-page-select select').value === '1', 'Next must remain in full screen');
  assert(document.querySelector('.book-zoom-value').textContent === zoomBeforeNavigation, 'Navigation must preserve zoom');
  assert(viewport.scrollTop === 0 && viewport.scrollLeft === 0, 'New page must reset pan');
  await choose(29);
  assert(document.querySelector('.book-next-button').disabled, 'Last-page boundary must remain enforced');

  dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
  await pause();
  assert(!document.querySelector('.book-fullscreen-dialog'), 'Cancel must close modal');
  assert(document.body.style.overflow === bodyOverflow, 'Body scrolling must be restored');
  assert(document.querySelector('.book-page-select select').value === '29', 'Closing must preserve page');
  assert(document.querySelector('.book-zoom-value').textContent === '100%', 'Closing must restore normal fit');
  assert(document.activeElement.matches('.book-expand-button'), 'Focus must return to full-screen button');

  document.querySelector('[aria-label="Perbesar halaman"]').click();
  await pause();
  assert(document.querySelector('.book-fullscreen-dialog')?.open, 'Normal zoom must expand beyond container');
  assert(document.querySelector('.book-zoom-value').textContent === '200%', 'Normal zoom must start at readable magnification');
  document.querySelector('[aria-label="Tutup layar penuh"]').click();
  await pause();
  await choose(0);
  return { modal: 'passed', viewport: `${innerWidth}x${innerHeight}`, normalWidth, fitWidth: 'passed', pinch: 'passed', drag: 'passed', navigation: 'passed', cancelAndFocus: 'passed', automaticExpansion: 'passed', overflow: document.documentElement.scrollWidth > innerWidth };
})()
