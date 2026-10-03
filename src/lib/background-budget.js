// Background is decorative: spend GPU time on interaction before extra pixels.
export const BACKGROUND_BUDGET = Object.freeze({ pixels: 1_000_000, dpr: 1.5, fps: 30 });

export function backgroundSize(width, height, pixelRatio = 1, quality = 1, maxViewport = [Infinity, Infinity], maxBuffer = Infinity) {
  const w = Math.max(1, width), h = Math.max(1, height);
  const ratio = Math.min(BACKGROUND_BUDGET.dpr, pixelRatio || 1,
    Math.sqrt(BACKGROUND_BUDGET.pixels * quality / (w * h)),
    maxViewport[0] / w, maxViewport[1] / h, maxBuffer / Math.max(w, h));
  return { width: Math.max(1, Math.floor(w * ratio)), height: Math.max(1, Math.floor(h * ratio)) };
}

export function createBackgroundClock() {
  let elapsed = 0, visibleElapsed = 0, previous = null, lastDraw = null;
  return {
    get elapsed() { return elapsed; },
    pause() { elapsed = visibleElapsed; previous = null; lastDraw = null; },
    step(timestamp, fps = BACKGROUND_BUDGET.fps) {
      const interval = previous === null ? 0 : Math.max(0, timestamp - previous);
      elapsed += interval / 1000;
      previous = timestamp;
      if (lastDraw !== null && timestamp - lastDraw < 1000 / fps) return null;
      lastDraw = timestamp;
      visibleElapsed = elapsed;
      return { elapsed, interval };
    },
  };
}

export function createBackgroundQuality() {
  let quality = 1, slowFrames = 0, staticMotion = false;
  return {
    get quality() { return quality; },
    get staticMotion() { return staticMotion; },
    sample(interval) {
      slowFrames = interval > 75 ? slowFrames + 1 : Math.max(0, slowFrames - 1);
      if (slowFrames < 12 || staticMotion) return false;
      slowFrames = 0;
      if (quality > .25) quality /= 2;
      else staticMotion = true;
      return true;
    },
  };
}
