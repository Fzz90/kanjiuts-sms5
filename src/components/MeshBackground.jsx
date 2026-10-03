import { useEffect, useRef } from 'react';
import { createMeshRenderer } from '../lib/mesh-drift.js';
import { createBackgroundClock, createBackgroundQuality } from '../lib/background-budget.js';
import fragmentShader from '../shaders/mesh-drift.frag?raw';
import './mesh-background.css';

export default function MeshBackground({ theme = 'home', paused = false }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const pausedRef = useRef(paused);
  const syncRef = useRef(null);

  useEffect(() => {
    pausedRef.current = paused;
    syncRef.current?.();
  }, [paused]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let renderer = null;
    let frameId = 0;
    const clock = createBackgroundClock();
    const budget = createBackgroundQuality();

    const stop = () => {
      window.cancelAnimationFrame(frameId);
      frameId = 0;
      clock.pause();
    };
    const tick = timestamp => {
      const frame = clock.step(timestamp, budget.quality === 1 ? 30 : 20);
      if (frame) {
        // Sustained slow frames reduce work; transient loading/layout spikes do not.
        if (budget.sample(frame.interval)) {
          if (!budget.staticMotion) resize();
          else {
            container.dataset.motion = 'static';
            stop();
            return;
          }
        }
        renderer.draw(frame.elapsed);
      }
      frameId = window.requestAnimationFrame(tick);
    };
    const syncMotion = () => {
      stop();
      container.dataset.motion = !renderer || pausedRef.current || preference.matches || budget.staticMotion || document.hidden ? 'static' : 'animated';
      if (renderer && !preference.matches && !document.hidden && !pausedRef.current && !budget.staticMotion) {
        frameId = window.requestAnimationFrame(tick);
      }
    };
    const resize = (force = false) => {
      if (!renderer) return;
      const { width, height } = container.getBoundingClientRect();
      if (renderer.resize(width, height, window.devicePixelRatio, budget.quality) || force === true) {
        renderer.draw(clock.elapsed);
      }
    };
    const initialize = () => {
      renderer = createMeshRenderer(canvas, fragmentShader);
      resize(true); // Draw immediately, including an initial reduced-motion mount.
      container.dataset.renderer = renderer ? 'webgl' : 'fallback';
      syncMotion();
    };
    const lost = event => {
      event.preventDefault(); // Permit browser-driven WebGL restoration.
      stop();
      renderer = null; // The lost context invalidates all GPU resources.
      container.dataset.renderer = 'fallback';
      container.dataset.motion = 'static';
    };
    const restored = () => initialize();
    syncRef.current = syncMotion;
    canvas.addEventListener('webglcontextlost', lost);
    canvas.addEventListener('webglcontextrestored', restored);
    initialize();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
    observer?.observe(container);
    window.addEventListener('resize', resize); // Also covers DPR/display changes.
    if (preference.addEventListener) preference.addEventListener('change', syncMotion);
    else preference.addListener?.(syncMotion);
    document.addEventListener('visibilitychange', syncMotion);

    return () => {
      stop();
      syncRef.current = null;
      observer?.disconnect();
      window.removeEventListener('resize', resize);
      if (preference.removeEventListener) preference.removeEventListener('change', syncMotion);
      else preference.removeListener?.(syncMotion);
      document.removeEventListener('visibilitychange', syncMotion);
      canvas.removeEventListener('webglcontextlost', lost);
      canvas.removeEventListener('webglcontextrestored', restored);
      renderer?.dispose();
    };
  }, []);

  return <div className="mesh-background" ref={containerRef} data-theme={theme} aria-hidden="true">
    <canvas ref={canvasRef} />
  </div>;
}
