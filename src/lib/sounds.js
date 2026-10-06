// Local recordings keep sound available on Pages. Web Audio allows auto-advance audio.
import { assetUrl } from './assets.js';

const sounds = {
  correct: { file: 'right.mp3', frequency: 880 },
  wrong: { file: 'wrong.mp3', frequency: 196 },
  reveal: { file: 'reveal.mp3', frequency: 660 },
  replay: { file: 'replay.mp3', frequency: 660, volume: 1 },
  skip: { file: 'skip.mp3', frequency: 330 },
  finish: { file: 'finish.mp3', frequency: 523.25 },
};

// Each page load starts with sound On; muting lasts until the page is closed or refreshed.
let enabled = true;

let context, activeSource, activeMedia, playback = 0;
const buffers = new Map();
const media = new Map();
const volume = name => sounds[name].volume ?? (name === 'correct' ? .65 : .6);

function getContext() {
  if (typeof window === 'undefined') return null;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;
  try {
    if (!context || context.state === 'closed') context = new AudioContext();
    return context;
  }
  catch { return null; }
}

function loadBuffer(name) {
  if (!buffers.has(name)) {
    buffers.set(name, fetch(assetUrl(`sfx/${sounds[name].file}`))
      .then(response => { if (!response.ok) throw new Error('Sound unavailable'); return response.arrayBuffer(); })
      .then(bytes => context.decodeAudioData(bytes))
      .catch(() => null));
  }
  return buffers.get(name);
}

function loadMedia(name) {
  if (typeof Audio === 'undefined') return null;
  if (!media.has(name)) {
    try {
      const audio = new Audio(assetUrl(`sfx/${sounds[name].file}`));
      audio.preload = 'auto';
      audio.volume = volume(name);
      media.set(name, audio);
    } catch { return null; }
  }
  return media.get(name);
}

export function stopSounds() {
  playback += 1;
  try { activeSource?.stop(); } catch { /* A completed source is already stopped. */ }
  activeSource = null;
  try { activeMedia?.pause(); } catch { /* Restricted media must not block muting. */ }
  activeMedia = null;
}

export const areSoundsEnabled = () => enabled;
export function setSoundsEnabled(value) {
  enabled = Boolean(value);
  if (!enabled) stopSounds();
  if (enabled) prepareSounds();
}

export function prepareSounds() {
  if (!enabled) return;
  const audioContext = getContext();
  if (audioContext) {
    // Resume inside the initial mode/TM tap, before any asynchronous work.
    if (audioContext.state === 'suspended' || audioContext.state === 'interrupted') void audioContext.resume().catch(() => {});
    Object.keys(sounds).forEach(loadBuffer);
  } else Object.keys(sounds).forEach(loadMedia);
}

async function playMedia(name) {
  if (!enabled) return;
  const audio = loadMedia(name);
  if (!audio) return;
  try {
    activeMedia = audio;
    audio.currentTime = 0;
    await audio.play();
  } catch { /* Browser audio restrictions must not interrupt practice. */ }
}

export async function playSound(name) {
  if (!enabled || !sounds[name]) return;
  stopSounds();
  const request = playback;
  const audioContext = getContext();
  if (!audioContext) { await playMedia(name); return; }
  try {
    if (audioContext.state === 'suspended' || audioContext.state === 'interrupted') await audioContext.resume();
    const buffer = await loadBuffer(name);
    if (request !== playback) return; // Discard a late load after another action/TM.
    if (audioContext.state !== 'running') { await playMedia(name); return; }
    const gain = audioContext.createGain();
    const source = buffer ? audioContext.createBufferSource() : audioContext.createOscillator();
    source.connect(gain).connect(audioContext.destination);
    activeSource = source;
    source.onended = () => { source.disconnect(); gain.disconnect(); if (activeSource === source) activeSource = null; };
    const now = audioContext.currentTime;
    if (buffer) {
      source.buffer = buffer;
      gain.gain.setValueAtTime(volume(name), now);
      source.start();
    } else {
      // Same fallback pitch and envelope as the reference UAS project.
      source.type = name === 'correct' ? 'triangle' : 'sawtooth';
      source.frequency.setValueAtTime(sounds[name].frequency, now);
      gain.gain.setValueAtTime(.0001, now);
      gain.gain.exponentialRampToValueAtTime(.1, now + .015);
      gain.gain.exponentialRampToValueAtTime(.0001, now + .22);
      source.start(now);
      source.stop(now + .26);
    }
  } catch {
    if (request === playback) await playMedia(name);
  }
}
