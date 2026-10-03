import React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import MeshBackground from '../src/components/MeshBackground.jsx';
import { backgroundSize } from '../src/lib/background-budget.js';

// Integration probe runs against a real WebGL1 context through gstack /browse.
export async function checkMeshLifecycle() {
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const pause = () => new Promise(resolve => setTimeout(resolve, 200));
  const waitFor = async (predicate, message) => {
    for (let i = 0; !predicate() && i < 30; i++) await pause();
    assert(predicate(), message);
  };
  const media = new EventTarget();
  media.matches = false;
  const originalMatchMedia = window.matchMedia;
  const hiddenDescriptor = Object.getOwnPropertyDescriptor(document, 'hidden');
  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  const prototype = WebGLRenderingContext.prototype;
  const originalDraw = prototype.drawArrays;
  const host = document.createElement('div');
  host.style.cssText = 'visibility:hidden;pointer-events:none';
  document.body.append(host);
  let root;
  let draws = 0;
  let lastPixels;
  let gl;
  let scene;
  let blockWebGL = false;
  const frames = [];
  HTMLCanvasElement.prototype.getContext = function (type, ...args) {
    if (blockWebGL && host.contains(this) && type === 'webgl') return null;
    return originalGetContext.call(this, type, ...args);
  };
  prototype.drawArrays = function (...args) {
    const result = originalDraw.apply(this, args);
    if (host.contains(this.canvas)) {
      gl = this;
      draws++;
      const pixels = new Uint8Array(8 * 8 * 4);
      this.readPixels(Math.floor(this.canvas.width / 2), Math.floor(this.canvas.height / 2), 8, 8, this.RGBA, this.UNSIGNED_BYTE, pixels);
      lastPixels = pixels.join(',');
      scene = [...this.getUniform(this.getParameter(this.CURRENT_PROGRAM), this.getUniformLocation(this.getParameter(this.CURRENT_PROGRAM), 'u_scene'))];
      frames.push(scene[2]);
      assert(args[0] === this.TRIANGLES && args[1] === 0 && args[2] === 3, 'Renderer must draw one fullscreen triangle');
      assert(this.getError() === this.NO_ERROR, 'WebGL must draw without errors');
    }
    return result;
  };
  const mount = () => {
    root = createRoot(host);
    window.matchMedia = query => query.includes('prefers-reduced-motion') ? media : originalMatchMedia(query);
    flushSync(() => root.render(<React.StrictMode><MeshBackground /></React.StrictMode>));
    window.matchMedia = originalMatchMedia;
  };
  const unmount = () => { flushSync(() => root.unmount()); root = null; };
  try {
    mount();
    assert(host.firstChild.dataset.renderer === 'webgl', 'Real shader must compile and link');
    const canvas = host.querySelector('canvas');
    const size = backgroundSize(innerWidth, innerHeight, devicePixelRatio);
    assert(canvas.width === size.width && canvas.height === size.height, 'Background must respect DPR and pixel budget');
    const firstPixels = lastPixels;
    await waitFor(() => frames.at(-1) > 0.1, 'Time must advance');
    assert(lastPixels !== firstPixels, 'Shader output must animate');
    const uniform = name => [...gl.getUniform(gl.getParameter(gl.CURRENT_PROGRAM), gl.getUniformLocation(gl.getParameter(gl.CURRENT_PROGRAM), name))];
    const near = (values, expected) => values.length === expected.length && values.every((value, index) => Math.abs(value - expected[index]) < .00001);
    assert(near(uniform('u_shape'), [1.1, .34, .5, 0]), 'Shape must match supplied recipe');
    assert(near(uniform('u_surface'), [2.4, .96, -.1, .96]), 'Surface must match supplied recipe');
    assert(near(uniform('u_finish'), [0, .36, .026, .07]), 'Finish must match supplied recipe');
    assert(uniform('u_cursor')[0] === 0, 'Cursor effect must be off');

    media.matches = true;
    media.dispatchEvent(new Event('change'));
    const pausedDraws = draws, pausedPixels = lastPixels;
    await pause();
    assert(draws === pausedDraws, 'Reduced motion must stop RAF');
    flushSync(() => root.render(<React.StrictMode><MeshBackground theme="writing" /></React.StrictMode>));
    await pause();
    assert(host.querySelector('canvas') === canvas && draws === pausedDraws && lastPixels === pausedPixels, 'Mode switch must retain canvas, palette and paused frame');

    media.matches = false;
    media.dispatchEvent(new Event('change'));
    await waitFor(() => draws > pausedDraws, 'Motion must resume');
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
    const hiddenDraws = draws, hiddenTime = scene[2];
    await pause();
    assert(draws === hiddenDraws, 'Hidden tab must stop RAF');
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
    await waitFor(() => draws > hiddenDraws, 'Visible tab must resume');
    assert(frames[hiddenDraws] === hiddenTime, 'Resume must not jump over hidden time');

    const loss = gl.getExtension('WEBGL_lose_context');
    assert(loss, 'Test needs WebGL context-loss extension');
    loss.loseContext();
    await waitFor(() => host.firstChild.dataset.renderer === 'fallback', 'Context loss must show fallback');
    const lostDraws = draws;
    await pause();
    assert(draws === lostDraws, 'Lost context must stop RAF');
    loss.restoreContext();
    await waitFor(() => host.firstChild.dataset.renderer === 'webgl' && draws > lostDraws, 'Restored context must rebuild GPU resources');

    const program = gl.getParameter(gl.CURRENT_PROGRAM);
    const buffer = gl.getParameter(gl.ARRAY_BUFFER_BINDING);
    unmount();
    const finalDraws = draws;
    await pause();
    assert(draws === finalDraws && !gl.isProgram(program) && !gl.isBuffer(buffer), 'Unmount must stop frames and dispose GPU resources');

    media.matches = true;
    mount();
    const initialReducedDraws = draws;
    assert(scene[2] === 0, 'Reduced-motion mount must draw phase zero');
    await pause();
    assert(draws === initialReducedDraws, 'Reduced-motion mount must remain static');
    unmount();

    blockWebGL = true;
    mount();
    assert(host.firstChild.dataset.renderer === 'fallback', 'Unavailable WebGL must show CSS fallback');
    assert(getComputedStyle(host.firstChild).backgroundImage.includes('radial-gradient'), 'Fallback must have a visible mesh');
    unmount();
    return { webgl1: 'passed', recipeUniforms: 'passed', animation: 'passed', reducedMotion: 'passed', visibilityAndResume: 'passed', contextRecovery: 'passed', cleanup: 'passed', cssFallback: 'passed', pixelBudget: 'passed', frames: draws };
  } finally {
    if (root) unmount();
    window.matchMedia = originalMatchMedia;
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    prototype.drawArrays = originalDraw;
    if (hiddenDescriptor) Object.defineProperty(document, 'hidden', hiddenDescriptor);
    else delete document.hidden;
    document.dispatchEvent(new Event('visibilitychange'));
    host.remove();
  }
}
