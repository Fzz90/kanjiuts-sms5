/** Pure stroke geometry. Coordinates use the full writing square, in [0, 1]. */
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export function pathLength(points) {
  return points.slice(1).reduce((sum, point, i) => sum + distance(points[i], point), 0);
}

export function resample(points, count = 32) {
  if (!points.length) return [];
  const length = pathLength(points);
  if (length < 1e-8) return Array.from({ length: count }, () => ({ ...points[0] }));
  const samples = [], step = length / (count - 1);
  let segment = 1, traversed = 0;
  for (let i = 0; i < count; i++) {
    const target = i * step;
    while (segment < points.length - 1 && traversed + distance(points[segment - 1], points[segment]) < target) {
      traversed += distance(points[segment - 1], points[segment]);
      segment++;
    }
    const start = points[segment - 1], end = points[segment];
    const ratio = Math.min(1, Math.max(0, (target - traversed) / (distance(start, end) || 1)));
    samples.push({ x: start.x + (end.x - start.x) * ratio, y: start.y + (end.y - start.y) * ratio });
  }
  return samples;
}

function bounds(strokes) {
  const points = strokes.flat();
  const xs = points.map(p => p.x), ys = points.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  return { width: maxX - minX, height: maxY - minY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
}

function align(strokes, reference) {
  const actual = bounds(strokes), expected = bounds(reference);
  // One uniform transform per character; never align individual strokes independently.
  const scale = Math.min(expected.width / Math.max(actual.width, .001), expected.height / Math.max(actual.height, .001));
  return strokes.map(stroke => stroke.map(point => ({ x: (point.x - actual.cx) * scale + expected.cx, y: (point.y - actual.cy) * scale + expected.cy })));
}

const meanDistance = (a, b) => a.reduce((sum, p, i) => sum + distance(p, b[i]), 0) / a.length;
const tolerances = { relaxed: .15, normal: .115, strict: .085 };

function simplify(points, epsilon = .016) {
  if (points.length < 3) return points;
  const first = points[0], last = points.at(-1);
  const dx = last.x - first.x, dy = last.y - first.y, denominator = dx * dx + dy * dy;
  let furthest = 0, maximum = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const ratio = denominator ? Math.min(1, Math.max(0, ((points[i].x - first.x) * dx + (points[i].y - first.y) * dy) / denominator)) : 0;
    const error = distance(points[i], { x: first.x + dx * ratio, y: first.y + dy * ratio });
    if (error > maximum) { maximum = error; furthest = i; }
  }
  return maximum > epsilon
    ? [...simplify(points.slice(0, furthest + 1), epsilon).slice(0, -1), ...simplify(points.slice(furthest), epsilon)]
    : [first, last];
}

export function gradeDrawing(drawn, reference, sensitivity = 'normal') {
  if (!reference?.length) return { correct: false, type: 'unavailable', message: 'Contoh stroke belum tersedia. Coba muat ulang.' };
  if (!Array.isArray(drawn) || !drawn.length) return { correct: false, type: 'empty', message: 'Kotak masih kosong. Tulis kanjinya terlebih dahulu.' };
  if (drawn.some(stroke => !Array.isArray(stroke) || !stroke.length || stroke.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y)))) {
    return { correct: false, type: 'invalid', message: 'Jejak tulisan belum terbaca. Hapus dan coba lagi.' };
  }
  if (drawn.length !== reference.length) return { correct: false, type: 'count', message: `Jumlah stroke belum sesuai (${drawn.length} dari ${reference.length}).` };
  const box = bounds(drawn), expectedBox = bounds(reference);
  if (Math.max(box.width, box.height) < .25) return { correct: false, type: 'size', message: 'Tulisan terlalu kecil. Gunakan bagian tengah kotak.' };
  const ratio = (box.width / Math.max(box.height, .001)) / (expectedBox.width / Math.max(expectedBox.height, .001));
  if (ratio < .5 || ratio > 1.8) return { correct: false, type: 'shape', message: 'Perbandingan lebar dan tinggi belum sesuai.' };
  const actual = align(drawn, reference).map(stroke => resample(simplify(stroke)));
  const expected = reference.map(stroke => resample(stroke));
  const tolerance = tolerances[sensitivity] ?? tolerances.normal;
  let total = 0;
  for (let i = 0; i < actual.length; i++) {
    const stroke = actual[i], target = expected[i], error = meanDistance(stroke, target);
    const backwards = meanDistance(stroke, [...target].reverse());
    if (backwards + .025 < error && distance(target[0], target.at(-1)) > .08) {
      return { correct: false, type: 'direction', stroke: i, message: `Arah stroke ${i + 1} terbalik. Coba dari titik awalnya.` };
    }
    const alternate = expected.findIndex((other, j) => j !== i && error > .007 && meanDistance(stroke, other) < error * .6);
    if (alternate >= 0) {
      return { correct: false, type: 'order', stroke: i, message: `Urutan stroke ${i + 1} belum sesuai. Perhatikan urutan pada animasi.` };
    }
    const drawnLength = pathLength(stroke), targetLength = pathLength(target);
    // Absolute allowance prevents a few pixels of pen jitter from multiplying a short dot's length.
    if (error > tolerance * 1.55 || distance(stroke[0], target[0]) > tolerance * 2 || distance(stroke.at(-1), target.at(-1)) > tolerance * 2 || drawnLength < targetLength * .42 - .015 || drawnLength > targetLength * 2.2 + .045) {
      return { correct: false, type: 'shape', stroke: i, message: `Bentuk atau posisi stroke ${i + 1} belum sesuai. Coba tulis ulang.` };
    }
    total += error;
  }
  const error = total / actual.length;
  return error <= tolerance
    ? { correct: true, type: 'correct', score: Math.round(Math.max(0, 1 - error) * 100), message: 'Bentuk dan urutan stroke sesuai.' }
    : { correct: false, type: 'shape', message: 'Bentuk kanji belum sesuai. Perhatikan posisi tiap stroke.' };
}
