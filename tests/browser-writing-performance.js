return (async () => {
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const tick = () => new Promise(resolve => requestAnimationFrame(resolve));
  const box = document.querySelector('.writing-box');
  box.setPointerCapture = () => {};
  box.hasPointerCapture = () => false;
  const rect = box.getBoundingClientRect();
  const send = (type, x, y) => box.dispatchEvent(new PointerEvent(type, {
    bubbles: true, pointerId: 777, pointerType: 'touch', button: 0,
    buttons: type === 'pointerup' || type === 'pointercancel' ? 0 : 1,
    clientX: rect.left + x * rect.width, clientY: rect.top + y * rect.height,
  }));
  send('pointerdown', .1, .15);
  await tick(); await tick();
  assert(document.querySelector('.mesh-background').dataset.motion === 'static', 'Writing must pause decorative GPU animation');
  let mutations = 0;
  const observer = new MutationObserver(records => { mutations += records.length; });
  observer.observe(box.querySelector('.user-ink'), { childList: true, subtree: true, attributes: true });
  for (let index = 1; index <= 200; index++) send('pointermove', .1 + .8 * index / 200, .15 + .65 * index / 200);
  await tick(); await tick();
  assert(mutations <= 2, `Burst must update preview once, got ${mutations} mutations`);
  send('pointerup', .95, .85);
  await tick(); await tick();
  const paths = [...box.querySelectorAll('.user-ink path')];
  assert(paths.length === 1, 'Finished stroke must commit once with no stale preview');
  const d = paths[0].getAttribute('d');
  assert(d.match(/[ML]/g).length === 202, 'Every sampled point and the final endpoint must survive throttling');
  assert(d.startsWith('M10.90,16.35') && d.endsWith('L103.55,92.65'), 'Endpoints must remain unchanged');
  send('pointerdown', .2, .2);
  send('pointermove', .8, .8);
  send('pointercancel', .8, .8);
  await tick(); await tick();
  assert(box.querySelectorAll('.user-ink path').length === 1, 'Cancelled pointer must neither commit nor repaint stale ink');
  observer.disconnect();
  document.querySelector('.cell-actions button:last-child').click();
  await tick();
  return { previewBatching: 'passed', preservedPoints: 202, previewMutations: mutations, cancellation: 'passed', backgroundPause: 'passed' };
})()
