return (async () => {
  const { checkMeshLifecycle } = await import(`/tests/mesh-harness.jsx?qa=${Date.now()}`);
  const lifecycle = await checkMeshLifecycle();
  const background = document.querySelector('.mesh-background');
  const canvas = background.querySelector('canvas');
  return {
    ...lifecycle,
    renderer: background.dataset.renderer,
    buffer: `${canvas.width}x${canvas.height}`,
    viewport: `${innerWidth}x${innerHeight}`,
    ariaHidden: background.getAttribute('aria-hidden'),
    pointerEvents: getComputedStyle(background).pointerEvents,
    darkOverlay: getComputedStyle(background, '::after').backgroundColor,
    overflow: document.documentElement.scrollWidth > innerWidth,
  };
})()
