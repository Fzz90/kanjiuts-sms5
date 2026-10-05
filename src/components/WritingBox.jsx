import { useEffect, useRef, useState } from 'react';
import { RotateCcw, Undo2 } from 'lucide-react';

const pathData = points => points.map((p, i) => `${i ? 'L' : 'M'}${(p.x * 109).toFixed(2)},${(p.y * 109).toFixed(2)}`).join(' ');

export default function WritingBox({ number, strokes, onChange, onActivity, asset, showAnswer, replay, delay, failed, failedStroke, disabled, correctAnswer, onAnswerAnimationStart, onAnswerAnimationEnd }) {
  const readOnly = disabled || showAnswer;
  const [liveStroke, setLiveStroke] = useState([]);
  const [localReplay, setLocalReplay] = useState(0);
  const animationLeadIn = localReplay || replay <= 1 ? .5 : 0;
  const pointer = useRef(null);
  const active = useRef([]);
  const frame = useRef(0);
  const token = useRef(Symbol('writing-box'));
  const cancelFrame = () => { cancelAnimationFrame(frame.current); frame.current = 0; };
  useEffect(() => () => {
    cancelFrame();
    onActivity?.(token.current, false);
  }, [onActivity]);
  const position = event => {
    const box = event.currentTarget.getBoundingClientRect();
    return { x: Math.min(1, Math.max(0, (event.clientX - box.left) / box.width)), y: Math.min(1, Math.max(0, (event.clientY - box.top) / box.height)) };
  };
  const finish = (event, cancelled = false) => {
    if (pointer.current !== event.pointerId) return;
    const points = [...active.current];
    if (!cancelled && event.type === 'pointerup') {
      const end = position(event);
      if (Math.hypot(end.x - points.at(-1).x, end.y - points.at(-1).y) > .0025) points.push(end);
    }
    pointer.current = null;
    active.current = [];
    cancelFrame();
    setLiveStroke([]);
    onActivity?.(token.current, false);
    if (!cancelled && !readOnly && points.length > 1) onChange([...strokes, points]);
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture?.(event.pointerId);
  };

  return <div className={`writing-cell ${failed ? 'shake invalid' : ''}`}>
    <div className="cell-meta"><span>Kanji {number}</span><span>{strokes.length} stroke</span></div>
    <svg className="writing-box" viewBox="0 0 109 109" role="img" aria-label={`Kotak tulis kanji ${number}`} aria-describedby="writing-instruction" aria-disabled={Boolean(readOnly)}
      onPointerDown={event => {
        if (readOnly || pointer.current !== null || (event.pointerType === 'mouse' && event.button !== 0)) return;
        event.preventDefault();
        pointer.current = event.pointerId;
        active.current = [position(event)];
        setLiveStroke([...active.current]);
        onActivity?.(token.current, true);
        try { event.currentTarget.setPointerCapture?.(event.pointerId); } catch { /* Synthetic or already-ended pointer. */ }
      }}
      onPointerMove={event => {
        if (readOnly || pointer.current !== event.pointerId) return;
        const box = event.currentTarget.getBoundingClientRect();
        const events = event.nativeEvent.getCoalescedEvents?.() ?? [event.nativeEvent];
        const next = active.current;
        for (const sample of events.length ? events : [event.nativeEvent]) {
          const point = { x: Math.min(1, Math.max(0, (sample.clientX - box.left) / box.width)), y: Math.min(1, Math.max(0, (sample.clientY - box.top) / box.height)) };
          if (Math.hypot(point.x - next.at(-1).x, point.y - next.at(-1).y) > .0025) next.push(point);
        }
        active.current = next;
        // Preserve every input sample; only redraw the preview once per screen frame.
        if (!frame.current) frame.current = requestAnimationFrame(() => {
          frame.current = 0;
          setLiveStroke([...active.current]);
        });
      }}
      onPointerUp={event => finish(event)}
      onPointerCancel={event => finish(event, true)}
      onLostPointerCapture={event => { if (pointer.current === event.pointerId) finish(event, true); }}>
      <path className="guide-line" d="M54.5 0V109 M0 54.5H109" />
      {showAnswer && asset && <g className="answer-shadow">{asset.paths.map((d, i) => <path key={i} d={d} />)}</g>}
      <g className="user-ink">{strokes.map((stroke, i) => <path key={i} className={failed && failedStroke === i ? 'stroke-error' : undefined} data-stroke-number={i + 1} d={pathData(stroke)} />)}{liveStroke.length > 0 && <path d={pathData(liveStroke)} />}</g>
      {showAnswer && asset && <g key={`${replay}-${localReplay}`} className="answer-animation" onAnimationEnd={event => {
        if (event.animationName === 'write-stroke' && event.target === event.currentTarget.lastElementChild) onAnswerAnimationEnd?.();
      }}>{asset.paths.map((d, i) => <path key={i} d={d} pathLength="1" style={{ '--stroke-delay': `${animationLeadIn + (localReplay ? 0 : delay) + i * .58}s` }} />)}</g>}
    </svg>
    {correctAnswer && <div className="writing-correct-answer" role="status"><span>Jawaban kanji</span><strong className="japanese" lang="ja">{correctAnswer}</strong></div>}
    <div className="cell-actions">
      {showAnswer ? <button type="button" className="text-button cell-replay" aria-label={`Ulangi animasi kanji ${number}`} disabled={!asset} onClick={() => {
        onAnswerAnimationStart?.();
        setLocalReplay(previous => previous + 1);
      }}><RotateCcw size={16} /> Ulangi Animasi</button> : <>
      <button className="icon-button" aria-label={`Undo stroke kanji ${number}`} title="Undo stroke" disabled={readOnly || !strokes.length} onClick={() => onChange(strokes.slice(0, -1))}><Undo2 size={15} /></button>
      <button className="icon-button" aria-label={`Hapus kanji ${number}`} title="Hapus kotak" disabled={readOnly || !strokes.length} onClick={() => onChange([])}><RotateCcw size={15} /></button>
      </>}
    </div>
  </div>;
}
