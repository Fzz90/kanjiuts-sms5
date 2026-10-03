import test from 'node:test';
import assert from 'node:assert/strict';
import { STUDY_THEMES, MEETING_THEMES } from '../src/lib/study-themes.js';

function luminance(hex) {
  const channels = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
}
function contrast(first, second) {
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (lighter + .05) / (darker + .05);
}

test('mode and meeting colors meet WCAG AA on dark surfaces and filled buttons', () => {
  const themes = { ...STUDY_THEMES, ...MEETING_THEMES };
  for (const [name, theme] of Object.entries(themes)) {
    for (const background of ['#1B2330', '#10151F', '#121B26', theme.soft, theme.wash].filter(Boolean)) {
      for (const foreground of [theme.accent, theme.deep].filter(Boolean)) {
        const ratio = contrast(foreground, background);
        assert.ok(ratio >= 4.5, `${name}: ${foreground} on ${background} is ${ratio.toFixed(2)}:1`);
      }
    }
    for (const fill of [theme.accent, theme.deep].filter(Boolean)) {
      assert.ok(contrast('#10151F', fill) >= 4.5, `${name}: filled/hover button label contrast`);
    }
  }
  for (const color of ['#EAF0F7', '#A8B4C4', '#FFA3AC', '#90DAB5']) {
    for (const surface of ['#1B2330', '#40262E', '#20382F']) {
      assert.ok(contrast(color, surface) >= 4.5, `${color} on ${surface}: text or feedback contrast`);
    }
  }
  // Conservative per-channel upper bound after shader post-processing, maximum
  // grain and the night overlay. Exposed text uses the primary text token.
  assert.ok(contrast('#EAF0F7', '#33486C') >= 4.5, 'Exposed text must remain readable over the moving mesh');
});
