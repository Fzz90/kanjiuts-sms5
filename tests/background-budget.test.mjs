import { test } from 'node:test';
import assert from 'node:assert/strict';
import { backgroundSize, createBackgroundClock, createBackgroundQuality, BACKGROUND_BUDGET } from '../src/lib/background-budget.js';
import { createMeshRenderer } from '../src/lib/mesh-drift.js';

test('retina, tablet, 4K and reduced-quality buffers respect GPU budget and aspect', () => {
  for (const [w, h, dpr] of [[375, 812, 3], [820, 1180, 2], [1440, 1000, 2], [3840, 2160, 2]]) {
    for (const quality of [1, .5, .25]) {
      const size = backgroundSize(w, h, dpr, quality);
      assert.ok(size.width * size.height <= BACKGROUND_BUDGET.pixels * quality);
      assert.ok(size.width <= w * 1.5 && size.height <= h * 1.5);
      assert.ok(Math.abs(size.width / size.height - w / h) < .01);
    }
  }
  assert.deepEqual(backgroundSize(4000, 2000, 3, 1, [300, 200], 256), { width: 256, height: 128 });
  assert.deepEqual(backgroundSize(0, 0, 0), { width: 1, height: 1 });
});

test('background caps drawing to 30 fps on high-refresh displays without quantising phase', () => {
  const clock = createBackgroundClock();
  const frames = [];
  for (let index = 0; index < 240; index++) {
    const frame = clock.step(index * 1000 / 240);
    if (frame) frames.push(frame.elapsed);
  }
  assert.ok(frames.length <= 30 && frames.length >= 27);
  assert.equal(frames[0], 0);
  assert.ok(frames.at(-1) > .93);
  assert.ok(frames.some(time => time * 1000 !== Math.round(time * 1000)));
});

test('pause and resume preserve visible phase, excluding hidden time and pending frames', () => {
  const clock = createBackgroundClock();
  clock.step(0);
  const visible = clock.step(40).elapsed;
  assert.equal(clock.step(50), null);
  clock.pause();
  assert.equal(clock.step(60000).elapsed, visible);
  assert.equal(clock.step(60040).elapsed, visible + .04);
});

test('blocked or throwing WebGL creation uses fallback without breaking application', () => {
  assert.equal(createMeshRenderer({ getContext: () => null }, ''), null);
  assert.equal(createMeshRenderer({ getContext: () => { throw new Error('Blocked'); } }, ''), null);
});

test('isolated slow frames retain quality; sustained load reduces pixels before stopping motion', () => {
  const budget = createBackgroundQuality();
  for (let index = 0; index < 40; index++) { budget.sample(200); budget.sample(16); }
  assert.equal(budget.quality, 1);
  for (const expected of [.5, .25, .25]) {
    for (let index = 0; index < 11; index++) assert.equal(budget.sample(90), false);
    assert.equal(budget.sample(90), true);
    assert.equal(budget.quality, expected);
  }
  assert.equal(budget.staticMotion, true);
  assert.equal(budget.sample(200), false);
});
