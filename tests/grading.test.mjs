import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gradeDrawing, resample } from '../src/lib/grading.js';

const point = (x, y) => ({ x, y });
// 木: horizontal, vertical, left falling, right falling, in that order.
const reference = [
  [point(.18, .3), point(.84, .3)],
  [point(.51, .12), point(.51, .88)],
  [point(.49, .34), point(.35, .55), point(.12, .78)],
  [point(.52, .35), point(.65, .55), point(.9, .79)],
];

test('accepts correct geometry with uneven sampling, modest translation and scale', () => {
  const drawn = reference.map(stroke => resample(stroke, 47).map((p, i) => point(p.x * .82 + .07 + Math.sin(i) * .006, p.y * .82 + .06 + Math.cos(i) * .006)));
  assert.equal(gradeDrawing(drawn, reference).correct, true);
});

test('rejects exchanged stroke order despite correct finished character', () => {
  const reordered = [reference[1], reference[0], ...reference.slice(2)];
  assert.equal(gradeDrawing(reordered, reference).type, 'order');
});

test('rejects reverse stroke direction', () => {
  const reversed = [[...reference[0]].reverse(), ...reference.slice(1)];
  assert.equal(gradeDrawing(reversed, reference).type, 'direction');
});

test('rejects exchanged nearby parallel strokes even under relaxed shape tolerance', () => {
  const close = [
    [point(.15, .3), point(.8, .3)],
    [point(.15, .34), point(.8, .34)],
    [point(.5, .12), point(.5, .88)],
  ];
  assert.equal(gradeDrawing([close[1], close[0], close[2]], close, 'relaxed').type, 'order');
});

test('rejects missing, extra and empty strokes', () => {
  assert.equal(gradeDrawing([], reference).type, 'empty');
  assert.equal(gradeDrawing(reference.slice(1), reference).type, 'count');
  assert.equal(gradeDrawing([...reference, reference[0]], reference).type, 'count');
});

test('rejects scribbles even with expected stroke count', () => {
  const scribbles = reference.map(() => Array.from({ length: 32 }, (_, i) => point(i % 2 ? .9 : .1, .1 + i / 40)));
  assert.equal(gradeDrawing(scribbles, reference).correct, false);
});

test('rejects tiny drawings and malformed pointer coordinates', () => {
  assert.equal(gradeDrawing(reference.map(s => s.map(p => point(p.x / 8, p.y / 8))), reference).type, 'size');
  assert.equal(gradeDrawing([[point(NaN, 0)]], reference).type, 'invalid');
});

test('ignores small pointer jitter on short strokes without accepting large zigzags', () => {
  const dots = [...reference, [point(.7, .2), point(.74, .23)]];
  const jittered = dots.map(stroke => resample(stroke, 48).map((p, i) => point(p.x + Math.sin(i) * .008, p.y + Math.cos(i) * .008)));
  assert.equal(gradeDrawing(jittered, dots).correct, true);
});

test('resampling preserves start, end and arc length distribution', () => {
  const result = resample([point(0, 0), point(1, 0), point(1, 1)], 5);
  assert.deepEqual(result, [point(0, 0), point(.5, 0), point(1, 0), point(1, .5), point(1, 1)]);
});

test('Bebas accepts the same shape with shuffled and reversed strokes', () => {
  const drawn = [reference[3], reference[1], reference[0], reference[2]].map(stroke => [...stroke].reverse());
  assert.equal(gradeDrawing(drawn, reference, 'free').correct, true);
  for (const sensitivity of ['relaxed', 'normal', 'strict']) {
    assert.equal(gradeDrawing(drawn, reference, sensitivity).correct, false);
  }
});

test('Bebas accepts split strokes, joined adjacent strokes and retracing', () => {
  const split = reference.flatMap(stroke => {
    const points = resample(stroke, 13);
    return [points.slice(0, 5), points.slice(4, 9), points.slice(8)];
  }).reverse();
  assert.equal(gradeDrawing(split, reference, 'free').correct, true);
  assert.equal(gradeDrawing(split, reference, 'relaxed').type, 'count');
  const corner = [
    [point(.2, .2), point(.8, .2)],
    [point(.8, .2), point(.8, .8)],
    [point(.8, .8), point(.2, .8)],
  ];
  assert.equal(gradeDrawing([corner.flat()], corner, 'free').correct, true);
  assert.equal(gradeDrawing([...reference, reference[0]], reference, 'free').correct, true);
});

test('Bebas tolerates uneven sampling, translation, scale and small handwriting variations', () => {
  const drawn = reference.map((stroke, n) => resample(stroke, 20 + n * 23)
    .map((p, i) => point(p.x * .74 + .14 + Math.sin(i) * .012, p.y * .74 + .11 + Math.cos(i) * .012)));
  assert.equal(gradeDrawing(drawn, reference, 'free').correct, true);
});

test('Bebas handles flat shapes without losing their horizontal or vertical extent', () => {
  for (const line of [[point(.15, .5), point(.85, .5)], [point(.5, .15), point(.5, .85)]]) {
    const points = resample(line, 11).reverse();
    assert.equal(gradeDrawing([points.slice(0, 6), points.slice(5)], [line], 'free').correct, true);
  }
});

test('Bebas rejects missing major parts, extra unrelated ink and scribbles', () => {
  const invalid = [
    reference.slice(1),
    [...reference, [point(.1, .02), point(.9, .02)]],
    [Array.from({ length: 35 }, (_, i) => point(i % 2 ? .9 : .1, .1 + i / 45))],
    [[point(.15, .15), point(.85, .15), point(.85, .85), point(.15, .85), point(.15, .15)]],
    [reference[0]],
  ];
  for (const drawn of invalid) {
    const grade = gradeDrawing(drawn, reference, 'free');
    assert.equal(grade.correct, false);
    assert.equal(grade.type, 'shape');
    assert.equal(grade.stroke, undefined);
  }
});

test('Bebas still rejects empty, invalid and unusably small input', () => {
  assert.equal(gradeDrawing([], reference, 'free').type, 'empty');
  assert.equal(gradeDrawing([[point(NaN, 0)]], reference, 'free').type, 'invalid');
  assert.equal(gradeDrawing(reference.map(s => s.map(p => point(p.x / 8, p.y / 8))), reference, 'free').type, 'size');
});

test('Bebas rejects dense scribbles that run near every line of a complex shape', () => {
  const grid = [
    ...[.2, .4, .6, .8].map(y => [point(.1, y), point(.9, y)]),
    ...[.2, .4, .6, .8].map(x => [point(x, .1), point(x, .9)]),
  ];
  const scribble = [Array.from({ length: 60 }, (_, i) => point(i % 2 ? .9 : .1, .1 + i * .8 / 59))];
  assert.equal(gradeDrawing(scribble, grid, 'free').correct, false);
  assert.equal(gradeDrawing([...grid, ...grid], grid, 'free').correct, true);
});
