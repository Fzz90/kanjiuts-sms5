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

test('preloaded UAS recordings play at reference volume; newer actions stop the previous sound', async t => {
  const harness = audioHarness(), requested = [];
  install(t, { window: { AudioContext: harness.AudioContext }, fetch: async path => { requested.push(path); return response(path); } });
  const sounds = await freshSounds();
  sounds.prepareSounds();
  await sounds.playSound('correct');
  await sounds.playSound('wrong');
  assert.equal(harness.contexts.length, 1);
  assert.equal(harness.contexts[0].state, 'running');
  assert.deepEqual(new Set(requested), new Set(['right', 'wrong', 'reveal', 'skip', 'finish'].map(name => `/sfx/${name}.mp3`)));
  assert.deepEqual(harness.started.map(source => source.buffer.file), ['/sfx/right.mp3', '/sfx/wrong.mp3']);
  assert.deepEqual(harness.gains, [.65, .6]);
  assert.equal(harness.started[0].stopped, true);
  sounds.stopSounds();
  assert.equal(harness.started[1].stopped, true);
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
  const played = [];
  class Audio {
    constructor(path) { this.src = path; }
    async play() { played.push(this.src); throw new Error('Autoplay blocked'); }
    pause() {}
  }
  install(t, { window: {}, Audio });
  const sounds = await freshSounds();
  sounds.prepareSounds();
  await assert.doesNotReject(sounds.playSound('finish'));
  assert.deepEqual(played, ['/sfx/finish.mp3']);
  sounds.stopSounds();
  globalThis.Audio = undefined;
  const unavailable = await freshSounds();
  assert.doesNotThrow(unavailable.prepareSounds);
  await assert.doesNotReject(unavailable.playSound('correct'));
  await assert.doesNotReject(unavailable.playSound('unknown'));
});
