import { test } from 'node:test';
import assert from 'node:assert/strict';

let moduleId = 0;
const freshSounds = () => import(`../src/lib/sounds.js?test=${moduleId++}`);
function install(t, values) {
  const previous = Object.fromEntries(Object.keys(values).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  Object.entries(values).forEach(([key, value]) => Object.defineProperty(globalThis, key, { configurable: true, writable: true, value }));
  t.after(() => Object.entries(previous).forEach(([key, descriptor]) => descriptor ? Object.defineProperty(globalThis, key, descriptor) : delete globalThis[key]));
}
function audioHarness() {
  const started = [], gains = [], contexts = [];
  class AudioContext {
    constructor() { this.state = 'suspended'; this.currentTime = 1; this.destination = {}; contexts.push(this); }
    async resume() { this.state = 'running'; }
    async decodeAudioData(bytes) { return { file: bytes, duration: 1 }; }
    createGain() {
      const gain = { connect() { return this; }, disconnect() {}, gain: { setValueAtTime(value) { gains.push(value); }, exponentialRampToValueAtTime() {} } };
      return gain;
    }
    createBufferSource() { return this.source('file'); }
    createOscillator() { return this.source('tone'); }
    source(kind) {
      return { kind, connect(gain) { return gain; }, disconnect() {}, frequency: { setValueAtTime(value) { this.value = value; } }, start() { started.push(this); }, stop() { this.stopped = true; } };
    }
  }
  return { AudioContext, started, gains, contexts };
}
const response = file => ({ ok: true, arrayBuffer: async () => file });

test('saved Off prevents every SFX from preparing or playing; On restores audio and preference', async t => {
  const harness = audioHarness(), requested = [], saved = new Map([['kanji-uts-s5-sfx-v1', 'off']]);
  const localStorage = { getItem: key => saved.get(key), setItem: (key, value) => saved.set(key, value) };
  install(t, { window: { AudioContext: harness.AudioContext, localStorage }, fetch: async path => { requested.push(path); return response(path); } });
  const sounds = await freshSounds();
  assert.equal(sounds.areSoundsEnabled(), false);
  sounds.prepareSounds();
  for (const name of ['correct', 'wrong', 'reveal', 'replay', 'skip', 'finish']) await sounds.playSound(name);
  assert.equal(harness.contexts.length, 0);
  assert.deepEqual(requested, []);
  sounds.setSoundsEnabled(true);
  await sounds.playSound('replay');
  assert.equal(saved.get(sounds.SFX_STORAGE), 'on');
  assert.equal(harness.started.length, 1);
  sounds.setSoundsEnabled(false);
  assert.equal(harness.started[0].stopped, true);
  await sounds.playSound('finish');
  assert.equal(harness.started.length, 1);
  assert.equal((await freshSounds()).areSoundsEnabled(), false);
});

test('muting cancels pending audio even if On is restored before decoding finishes', async t => {
  const harness = audioHarness();
  let release;
  install(t, { window: { AudioContext: harness.AudioContext }, fetch: path => path.includes('right') ? new Promise(resolve => { release = resolve; }) : Promise.resolve(response(path)) });
  const sounds = await freshSounds();
  const pending = sounds.playSound('correct');
  await new Promise(resolve => setImmediate(resolve));
  sounds.setSoundsEnabled(false);
  sounds.setSoundsEnabled(true);
  release(response('/sfx/right.mp3'));
  await pending;
  assert.deepEqual(harness.started, []);
  await sounds.playSound('wrong');
  assert.equal(harness.started[0].buffer.file, '/sfx/wrong.mp3');
});

test('Off pauses media fallback and works when browser storage is blocked', async t => {
  const played = [], instances = [];
  class Audio {
    constructor(path) { this.src = path; instances.push(this); }
    async play() { played.push(this.src); }
    pause() { this.paused = true; }
  }
  const browser = {};
  Object.defineProperty(browser, 'localStorage', { get() { throw new Error('Storage blocked'); } });
  install(t, { window: browser, Audio });
  const sounds = await freshSounds();
  await sounds.playSound('reveal');
  assert.doesNotThrow(() => sounds.setSoundsEnabled(false));
  assert.equal(instances[0].paused, true);
  await sounds.playSound('skip');
  assert.deepEqual(played, ['/sfx/reveal.mp3']);
  assert.doesNotThrow(() => sounds.setSoundsEnabled(true));
  await sounds.playSound('replay');
  assert.deepEqual(played, ['/sfx/reveal.mp3', '/sfx/replay.mp3']);
});

test('preloaded recordings preserve playback volume, including boosted replay; newer actions stop the previous sound', async t => {
  const harness = audioHarness(), requested = [];
  install(t, { window: { AudioContext: harness.AudioContext }, fetch: async path => { requested.push(path); return response(path); } });
  const sounds = await freshSounds();
  sounds.prepareSounds();
  await sounds.playSound('correct');
  await sounds.playSound('wrong');
  await sounds.playSound('replay');
  assert.equal(harness.contexts.length, 1);
  assert.equal(harness.contexts[0].state, 'running');
  assert.deepEqual(new Set(requested), new Set(['right', 'wrong', 'reveal', 'replay', 'skip', 'finish'].map(name => `/sfx/${name}.mp3`)));
  assert.deepEqual(harness.started.map(source => source.buffer.file), ['/sfx/right.mp3', '/sfx/wrong.mp3', '/sfx/replay.mp3']);
  assert.deepEqual(harness.gains, [.65, .6, 1]);
  assert.equal(harness.started[0].stopped, true);
  sounds.stopSounds();
  assert.equal(harness.started[1].stopped, true);
  assert.equal(harness.started[2].stopped, true);
});

test('late loading cannot play a stale answer sound after another action or TM switch', async t => {
  const harness = audioHarness();
  let release;
  install(t, { window: { AudioContext: harness.AudioContext }, fetch: path => path.includes('right') ? new Promise(resolve => { release = resolve; }) : Promise.resolve(response(path)) });
  const sounds = await freshSounds();
  const pending = sounds.playSound('correct');
  await new Promise(resolve => setImmediate(resolve));
  await sounds.playSound('skip');
  sounds.stopSounds(); // TM switch cancels both pending and active playback.
  release(response('/sfx/right.mp3'));
  await pending;
  assert.deepEqual(harness.started.map(source => source.buffer.file), ['/sfx/skip.mp3']);
  assert.equal(harness.started[0].stopped, true);
});

test('interrupted Safari audio resumes; closed context is recreated on next action', async t => {
  const harness = audioHarness();
  install(t, { window: { webkitAudioContext: harness.AudioContext }, fetch: async path => response(path) });
  const sounds = await freshSounds();
  sounds.prepareSounds();
  harness.contexts[0].state = 'interrupted';
  await sounds.playSound('correct');
  assert.equal(harness.contexts[0].state, 'running');
  harness.contexts[0].state = 'closed';
  await sounds.playSound('wrong');
  assert.equal(harness.contexts.length, 2);
  assert.equal(harness.started.length, 2);
});

test('missing MP3 falls back to the reference tone without rejecting the action', async t => {
  const harness = audioHarness();
  install(t, { window: { AudioContext: harness.AudioContext }, fetch: async () => ({ ok: false }) });
  const sounds = await freshSounds();
  await sounds.playSound('wrong');
  assert.equal(harness.started[0].kind, 'tone');
  assert.equal(harness.started[0].frequency.value, 196);
  assert.equal(harness.started[0].type, 'sawtooth');
});

test('media fallback and unavailable or blocked browser audio never interrupt practice', async t => {
  const played = [], volumes = [];
  class Audio {
    constructor(path) { this.src = path; }
    async play() { played.push(this.src); volumes.push(this.volume); throw new Error('Autoplay blocked'); }
    pause() {}
  }
  install(t, { window: {}, Audio });
  const sounds = await freshSounds();
  sounds.prepareSounds();
  await assert.doesNotReject(sounds.playSound('finish'));
  await assert.doesNotReject(sounds.playSound('replay'));
  assert.deepEqual(played, ['/sfx/finish.mp3', '/sfx/replay.mp3']);
  assert.deepEqual(volumes, [.6, 1]);
  sounds.stopSounds();
  globalThis.Audio = undefined;
  const unavailable = await freshSounds();
  assert.doesNotThrow(unavailable.prepareSounds);
  await assert.doesNotReject(unavailable.playSound('correct'));
  await assert.doesNotReject(unavailable.playSound('unknown'));
});
