import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Check, CheckCircle2, Eye, Home, Library, PenLine, RefreshCw, RotateCcw, Volume2, VolumeX, X } from 'lucide-react';
import { toHiragana } from 'wanakana';
import WritingBox from './components/WritingBox.jsx';
import BookReader from './components/BookReader.jsx';
import MeshBackground from './components/MeshBackground.jsx';
import { themeStyle, meetingStyle } from './lib/study-themes.js';
import { ALL_TM, meetingOptions, meetingLabel, meetingEntries, shuffle, checkReading, normalizeReading, isKanji, loadCharacter } from './lib/bank.js';
import { gradeDrawing } from './lib/grading.js';
import { areSoundsEnabled, setSoundsEnabled, prepareSounds, playSound, stopSounds } from './lib/sounds.js';
import { assetUrl } from './lib/assets.js';

const STORAGE = 'kanji-uts-s5-progress-v1';
const modeNames = { reading: 'Yomikata', writing: 'Kanji Renshuu' };
function readProgress() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE));
    return value && value.version === 1 && value.records && typeof value.records === 'object' && !Array.isArray(value.records) ? value.records : {};
  } catch { return {}; }
}

function Practice({ mode, item, sensitivity, onSensitivity, onAttempt, onHelp, onAdvance, onSkip, onWritingActivity }) {
  const characters = Array.from(item.word);
  const kanji = characters.filter(isKanji);
  const writingUnits = characters.reduce((units, character, index) => {
    if (isKanji(character)) units.push({ character, index, kana: '' });
    else if (units.length) units.at(-1).kana += character;
    else units.push({ character: null, index, kana: character });
    return units;
  }, []);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(mode === 'writing');
  const [assetError, setAssetError] = useState(false);
  const [reload, setReload] = useState(0);
  const [drawings, setDrawings] = useState(() => kanji.map(() => []));
  const [reading, setReading] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);
  const [usedHelp, setUsedHelp] = useState(false);
  const [answerAnimations, setAnswerAnimations] = useState(() => new Set());
  const answerAnimating = answerAnimations.size > 0;
  const [drawingReset, setDrawingReset] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [shake, setShake] = useState(0);
  const [failedBoxes, setFailedBoxes] = useState([]);
  const [failedStrokes, setFailedStrokes] = useState([]);
  const [hadMistake, setHadMistake] = useState(false);
  const input = useRef(null);
  const advanceButton = useRef(null);
  const correct = feedback?.correct;
  const writingRevealed = mode === 'writing' && showAnswer;

  useEffect(() => { if (mode === 'reading' && shake > 0) input.current?.focus(); }, [shake, mode]);

  useEffect(() => {
    if (mode !== 'writing') { input.current?.focus(); return; }
    let cancelled = false;
    setLoading(true);
    setAssetError(false);
    Promise.all(kanji.map(loadCharacter)).then(result => {
      if (!cancelled) { setAssets(result); setLoading(false); }
    }).catch(() => { if (!cancelled) { setAssetError(true); setLoading(false); } });
    return () => { cancelled = true; };
  }, [item.id, mode, reload]);

  useEffect(() => {
    if (!correct) return;
    if (mode === 'writing') {
      advanceButton.current?.focus({ preventScroll: true });
      return;
    }
    const timer = setTimeout(onAdvance, 1100);
    return () => clearTimeout(timer);
  }, [correct, mode, onAdvance]);

  const check = event => {
    event?.preventDefault();
    if (correct || writingRevealed || loading || assetError) return;
    if (mode === 'reading' && !reading.trim()) { input.current?.focus(); return; }
    let result;
    if (mode === 'reading') {
      result = checkReading(reading, item)
        ? { correct: true, message: 'Bacaan benar. Lanjut soal berikutnya.' }
        : { correct: false, message: 'Bacaan belum sesuai. Coba lagi atau buka jawabannya.' };
    } else {
      const checked = drawings.map((strokes, i) => gradeDrawing(strokes, assets[i]?.reference, sensitivity));
      const failures = checked.flatMap((grade, i) => grade.correct ? [] : [i]);
      setFailedBoxes(failures);
      setFailedStrokes(checked.map(grade => grade.correct ? null : grade.stroke ?? null));
      result = failures.length ? { ...checked[failures[0]], message: `Kotak ${failures[0] + 1}: ${checked[failures[0]].message}` } : { correct: true, message: `${sensitivity === 'free' ? 'Bentuk kanji mirip dengan contoh.' : 'Bentuk dan urutan stroke sesuai.'} Tekan Selanjutnya untuk melanjutkan.` };
    }
    setFeedback(result);
    void playSound(result.correct ? 'correct' : 'wrong');
    if (!result.correct) { setHadMistake(true); setShake(previous => previous + 1); }
    onAttempt({ correct: result.correct, helped: usedHelp, firstTry: !hadMistake && !usedHelp });
  };
  const reveal = () => {
    void playSound('reveal');
    if (!usedHelp) { setUsedHelp(true); onHelp(); }
    if (mode === 'writing') {
      setAnswerAnimations(new Set(kanji.map((_, number) => number)));
      setDrawings(kanji.map(() => []));
      setDrawingReset(previous => previous + 1);
      setFailedBoxes([]);
      setFailedStrokes([]);
      setFeedback(null);
    }
    setShowAnswer(true);
  };
  const retryWriting = () => {
    void playSound('reveal');
    setShowAnswer(false);
    setAnswerAnimations(new Set());
    setDrawings(kanji.map(() => []));
    setDrawingReset(previous => previous + 1);
    setFailedBoxes([]);
    setFailedStrokes([]);
    setFeedback(null);
  };
  let boxIndex = -1, animationOffset = 0;

  return <section className={`practice-sheet ${mode === 'writing' ? 'writing-sheet' : ''}`} data-entry-id={item.id}>
    <div className="prompt">
      <span className="prompt-label">{mode === 'reading' ? 'Bagaimana bacaan jukugo ini?' : 'Tulis kanji dari bacaan ini'}</span>
      <h2 className={`japanese ${mode === 'reading' ? 'word-prompt' : 'kana-prompt'}`} lang="ja">{mode === 'reading' ? item.word : normalizeReading(item.reading)}</h2>
      <p className="meaning meaning-en" lang="en">{item.englishMeaning}</p>
      <p className="meaning meaning-id" lang="id"><q>{item.meanings.join(' / ')}</q></p>
    </div>

    {mode === 'reading' ? <form className="reading-form" onSubmit={check}>
      <label htmlFor="reading">Jawaban hiragana</label>
      <div key={shake} className={`reading-input-wrap ${feedback && !correct ? 'shake invalid' : ''} ${correct ? 'valid' : ''}`}>
        <input id="reading" ref={input} value={reading} disabled={correct} lang="ja" autoComplete="off" autoCapitalize="off" spellCheck="false" placeholder="Ketik hiragana atau romaji" onChange={event => {
          if (event.nativeEvent.isComposing) setReading(event.target.value);
          else setReading(toHiragana(event.target.value, { IMEMode: true }));
          setFeedback(null);
        }} onCompositionEnd={event => setReading(toHiragana(event.currentTarget.value))} />
        <span className="input-symbol" aria-hidden="true">{correct ? <Check /> : 'あ'}</span>
      </div>
      <button className="primary-button check-reading" type="submit" disabled={!reading.trim() || correct}>Periksa jawaban <ArrowRight size={18} /></button>
    </form> : <>
      <p className="writing-instruction" id="writing-instruction">Tulis dengan jari, stylus, atau mouse. Satu garis dihitung satu stroke.</p>
      {loading ? <div className="asset-status" role="status">Menyiapkan kotak tulis…</div> : assetError ? <div className="asset-status error" role="alert">Contoh stroke gagal dimuat. <button className="text-button" onClick={() => setReload(value => value + 1)}>Coba lagi</button></div> : <div className="writing-word" aria-label="Area latihan menulis" aria-busy={answerAnimating}>
        {writingUnits.map(({ character, index, kana }) => {
          if (!character) return <span className="okurigana japanese" lang="ja" key={index}>{kana}</span>;
          const number = ++boxIndex, delay = animationOffset;
          animationOffset += (assets[number]?.paths.length ?? 0) * .58;
          return <div className="writing-unit" key={index}><WritingBox key={`${drawingReset}-${failedBoxes.includes(number) ? shake : 'steady'}`} number={number + 1} strokes={drawings[number]} onChange={strokes => {
            setDrawings(previous => previous.map((drawing, i) => i === number ? strokes : drawing));
            setFeedback(null);
            setFailedBoxes(previous => previous.filter(i => i !== number));
            setFailedStrokes(previous => previous.map((stroke, i) => i === number ? null : stroke));
          }} onActivity={onWritingActivity} asset={assets[number]} showAnswer={showAnswer} delay={delay} failed={failedBoxes.includes(number)} failedStroke={failedStrokes[number] ?? null} disabled={correct || writingRevealed} onAnswerAnimationStart={() => {
            void playSound('replay');
            setAnswerAnimations(previous => new Set(previous).add(number));
          }} onAnswerAnimationEnd={() => setAnswerAnimations(previous => {
            const active = new Set(previous);
            active.delete(number);
            return active;
          })} correctAnswer={correct ? character : null} />{kana && <span className="okurigana japanese" lang="ja">{kana}</span>}</div>;
        })}
      </div>}
      <div className="writing-tools">
        <button className="text-button" disabled={correct || writingRevealed || drawings.every(d => !d.length)} onClick={() => { setDrawings(kanji.map(() => [])); setFeedback(null); setFailedBoxes([]); setFailedStrokes([]); }}><RotateCcw size={16} /> Hapus semua</button>
        <label className="sensitivity">Toleransi bentuk <select value={sensitivity} onChange={event => onSensitivity(event.target.value)} disabled={correct}><option value="free">Bebas</option><option value="relaxed">Longgar</option><option value="normal">Normal</option><option value="strict">Ketat</option></select></label>
      </div>
    </>}

    <div className={`feedback ${feedback ? (correct ? 'success' : 'error') : ''}`} role="status" aria-live="polite">
      {feedback && <>{correct ? <CheckCircle2 size={19} /> : <X size={19} />}<span>{feedback.message}</span></>}
    </div>
    {showAnswer && <div className="answer-note" role="status">
      <div><span>Jawaban</span><strong className="japanese" lang="ja">{mode === 'reading' ? item.acceptedReadings.join(' / ') : item.word}</strong></div>
    </div>}
    <div className="practice-actions">
      {mode === 'writing' && correct ? <button ref={advanceButton} type="button" className="primary-button next-button" onClick={onAdvance}>Selanjutnya <ArrowRight size={18} /></button> : <>
      <button className={`secondary-button${writingRevealed ? ' retry-writing' : ''}`} onClick={writingRevealed ? retryWriting : reveal} disabled={correct || loading || assetError}>{writingRevealed ? <PenLine size={17} /> : <Eye size={17} />}{writingRevealed ? 'Ulangi menulis' : 'Show answer'}</button>
      {mode === 'writing' && <button className="primary-button" onClick={check} disabled={correct || writingRevealed || loading || assetError || drawings.every(d => !d.length)}>Periksa tulisan <Check size={17} /></button>}
      {correct ? <button className="text-button next-button" onClick={onAdvance}>Lanjut <ArrowRight size={16} /></button> : <button className="text-button skip-button" onClick={onSkip}>Lewati <ArrowRight size={16} /></button>}
      </>}
    </div>
    {mode === 'writing' && <p className="grading-note">{sensitivity === 'free' ? 'Mode Bebas menilai kemiripan bentuk akhir kanji. Jumlah, arah, dan urutan stroke tidak dinilai.' : 'Penilaian membandingkan bentuk dan urutan stroke. Gunakan “Bebas” untuk latihan berdasarkan kemiripan bentuk saja.'}</p>}
  </section>;
}

export default function App() {
  const [screen, setScreen] = useState('home');
  const [mode, setMode] = useState('reading');
  const [tm, setTm] = useState(1);
  const [selectedKanji, setSelectedKanji] = useState(null);
  const [queue, setQueue] = useState([]);
  const [index, setIndex] = useState(0);
  const [session, setSession] = useState(0);
  const [results, setResults] = useState({ correct: 0, independent: 0, helped: 0, wrong: 0, skipped: 0, review: [] });
  const [progress, setProgress] = useState(readProgress);
  const [storageError, setStorageError] = useState(false);
  const [sensitivity, setSensitivity] = useState('normal');
  const [sfxEnabled, setSfxEnabled] = useState(areSoundsEnabled);
  const [activeWriters, setActiveWriters] = useState(() => new Set());
  const writingActivity = useCallback((token, active) => setActiveWriters(current => {
    if (current.has(token) === active) return current;
    const next = new Set(current);
    if (active) next.add(token); else next.delete(token);
    return next;
  }), []);
  const activeTheme = screen === 'home' ? 'home' : screen === 'book' ? 'book' : mode;

  useLayoutEffect(() => {
    // Body scope also supplies the palette to the fullscreen reader portal.
    const properties = themeStyle(activeTheme);
    const previous = Object.fromEntries(Object.keys(properties).map(key => [key, document.body.style.getPropertyValue(key)]));
    const previousTheme = document.body.dataset.studyTheme;
    Object.entries(properties).forEach(([key, value]) => document.body.style.setProperty(key, value));
    document.body.dataset.studyTheme = activeTheme;
    return () => {
      Object.entries(previous).forEach(([key, value]) => value ? document.body.style.setProperty(key, value) : document.body.style.removeProperty(key));
      if (previousTheme) document.body.dataset.studyTheme = previousTheme;
      else delete document.body.dataset.studyTheme;
    };
  }, [activeTheme]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE, JSON.stringify({ version: 1, records: progress })); setStorageError(false); }
    catch { setStorageError(true); }
  }, [progress]);

  const start = (selectedTm, root = null, list) => {
    const selected = list ?? meetingEntries(selectedTm, mode, root);
    if (!selected.length) return;
    stopSounds();
    prepareSounds();
    setTm(selectedTm);
    setSelectedKanji(root);
    setQueue(shuffle(selected));
    setIndex(0);
    setSession(previous => previous + 1);
    setResults({ correct: 0, independent: 0, helped: 0, wrong: 0, skipped: 0, review: [] });
    setScreen('practice');
    window.scrollTo({ top: 0, behavior: 'auto' });
  };
  const chooseMeeting = selectedTm => {
    stopSounds();
    setTm(selectedTm);
    setSelectedKanji(null);
    setScreen('kanji');
    window.scrollTo({ top: 0, behavior: 'auto' });
  };
  const record = (item, field) => setProgress(previous => {
    const key = `${mode}:${item.id}`, old = previous[key] ?? {};
    return { ...previous, [key]: { ...old, [field]: (Number(old[field]) || 0) + 1, lastAt: new Date().toISOString() } };
  });
  const next = () => {
    if (index + 1 === queue.length) { void playSound('finish'); setScreen('result'); }
    else setIndex(previous => previous + 1);
    window.scrollTo({ top: 0, behavior: 'auto' });
  };
  const addReview = (list, item) => list.some(value => value.id === item.id) ? list : [...list, item];
  const meeting = meetingOptions.find(value => value.id === tm);
  const allTm = tm === ALL_TM;
  const tmLabel = meetingLabel(tm);
  const rootButtons = <div className="root-grid">{meeting.kanji.map(character => <button key={character} className={`japanese ${selectedKanji === character ? 'active' : ''}`} lang="ja" aria-label={`Latih kanji ${character}`} aria-pressed={selectedKanji === character} onClick={() => start(tm, character)}>{character}</button>)}</div>;
  const chooseMode = selected => {
    stopSounds();
    if (selected !== 'book') prepareSounds();
    if (selected === 'book') setScreen('book');
    else { setMode(selected); setScreen('select'); }
    window.scrollTo({ top: 0, behavior: 'auto' });
  };
  const changeSfx = value => {
    setSoundsEnabled(value);
    setSfxEnabled(value);
  };

  return <><MeshBackground theme={activeTheme} paused={screen === 'book' || activeWriters.size > 0} /><div className="app-shell" data-study-theme={activeTheme} data-screen={screen}>
    <header className="site-header">
      <nav className="mode-nav" aria-label="Pilihan belajar">
        <button style={themeStyle('reading')} data-mode="reading" className={screen !== 'home' && screen !== 'book' && mode === 'reading' ? 'active' : ''} aria-current={screen !== 'home' && screen !== 'book' && mode === 'reading' ? 'page' : undefined} onClick={() => chooseMode('reading')}><BookOpen size={18} />Yomikata</button>
        <button style={themeStyle('writing')} data-mode="writing" className={screen !== 'home' && screen !== 'book' && mode === 'writing' ? 'active' : ''} aria-current={screen !== 'home' && screen !== 'book' && mode === 'writing' ? 'page' : undefined} onClick={() => chooseMode('writing')}><PenLine size={18} />Kanji Renshuu</button>
        <button style={themeStyle('book')} data-mode="book" className={screen === 'book' ? 'active' : ''} aria-current={screen === 'book' ? 'page' : undefined} onClick={() => chooseMode('book')}><Library size={18} />Baca Buku</button>
      </nav>
      <button className="brand" onClick={() => setScreen('home')} aria-label="Halaman awal Kanji UTS"><span className="brand-mark japanese" lang="ja">漢</span><span>Latihan Kanji UTS<small>Semester 5 · Pertemuan 1–7</small></span></button>
      {screen !== 'home' && screen !== 'book' && <div className="header-actions">
        <button className="home-button" onClick={() => setScreen('home')}><Home size={16} /><span>Awal</span></button>
        <div className="sfx-control" role="group" aria-label="Pengaturan SFX">
          <span className="sfx-label" aria-hidden="true">{sfxEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}SFX</span>
          <button type="button" data-sfx="on" aria-label="SFX On" aria-pressed={sfxEnabled} onClick={() => changeSfx(true)}>On</button>
          <button type="button" data-sfx="off" aria-label="SFX Off" aria-pressed={!sfxEnabled} onClick={() => changeSfx(false)}>Off</button>
        </div>
      </div>}
    </header>

    <main>
      {screen === 'home' && <section className="home-screen">
        <div className="intro"><h1>Semangattt belajarnya rekk!!</h1><p>Semoga nilai kalian A (Aamiinn)</p></div>
        <div className="mode-choices">
          <button className="mode-card reading-card" data-mode="reading" style={themeStyle('reading')} onClick={() => chooseMode('reading')}>
            <div className="mode-preview reading-preview" aria-hidden="true"><span className="japanese" lang="ja">結婚</span><span className="preview-reading">けっこん</span></div>
            <div className="mode-content"><span className="mode-icon"><BookOpen size={23} /></span><h2>Yomikata</h2><p>Lihat jukugo.<br />Tebak bacaan hiragananya.</p><span className="mode-start">Latihan membaca <ArrowRight size={20} /></span></div>
          </button>
          <button className="mode-card writing-card" data-mode="writing" style={themeStyle('writing')} onClick={() => chooseMode('writing')}>
            <div className="mode-preview writing-preview" aria-hidden="true"><div className="preview-writing-word japanese" lang="ja"><div className="preview-square"><span className="preview-kanji">好</span><span className="preview-pen"><PenLine size={26} /></span></div><span className="preview-kana">き</span></div></div>
            <div className="mode-content"><span className="mode-icon"><PenLine size={23} /></span><h2>Kanji Renshuu</h2><p>Lihat hiragana.<br />Tulis kanji, periksa bentuk dan stroke.</p><span className="mode-start">Latihan menulis <ArrowRight size={20} /></span></div>
          </button>
          <button className="mode-card book-card" data-mode="book" style={themeStyle('book')} onClick={() => chooseMode('book')}>
            <div className="mode-preview book-preview" aria-hidden="true"><img src={assetUrl('book/pages/page-180.webp')} alt="" /><span><Library size={21} />30 halaman</span></div>
            <div className="mode-content"><span className="mode-icon"><Library size={23} /></span><h2>Baca Buku</h2><p>Kanji Look and Learn.<br />Baca halaman PDF 180–209 per slide.</p><span className="mode-start">Buka buku <ArrowRight size={20} /></span></div>
          </button>
        </div>
      </section>}

      {screen === 'book' && <BookReader onBack={() => setScreen('home')} />}

      {screen === 'select' && <section className="meeting-screen">
        <button className="back-link text-button" onClick={() => setScreen('home')}><ArrowLeft size={17} /> Ganti latihan</button>
        <div className="section-heading"><span className="mode-badge">{mode === 'reading' ? <BookOpen size={17} /> : <PenLine size={17} />}{modeNames[mode]}</span><h1>Pilih pertemuan</h1><p>Pilih satu TM, atau gabungkan seluruh TM dalam satu latihan.</p></div>
        <div className="meeting-grid">{meetingOptions.map(value => {
          const list = meetingEntries(value.id, mode);
          const studied = list.filter(item => progress[`${mode}:${item.id}`]?.correct > 0).length;
          return <button className={`meeting-card ${value.id === ALL_TM ? 'all-tm-card' : ''}`} key={value.id} data-tm={value.id} style={meetingStyle(value.id)} onClick={() => start(value.id)}>
            <div className="meeting-title"><h2>{value.id === ALL_TM && <Library size={20} />}{meetingLabel(value.id)}</h2><ArrowRight size={21} /></div>
            {value.id === ALL_TM ? <p className="all-tm-description">Campur seluruh kanji TM 1–7. Soal diacak dalam satu sesi.</p> : <p className="meeting-kanji japanese" lang="ja">{value.kanji.join(' ')}</p>}
            <div className="meeting-count"><span>{list.length} soal</span><span>{value.kanji.length} kanji</span></div>
            <div className="meeting-progress"><span style={{ width: `${studied / list.length * 100}%` }} /></div>
            <small>{studied ? `${studied} pernah dijawab benar` : 'Siap mulai latihan'}</small>
          </button>;
        })}</div>
        <p className="save-note">Progres baca dan tulis tersimpan terpisah di browser ini.</p>
      </section>}

      {screen === 'kanji' && <section className="meeting-screen kanji-screen" data-tm={tm} style={meetingStyle(tm)}>
        <button className="back-link text-button" onClick={() => setScreen('select')}><ArrowLeft size={17} /> Ganti TM</button>
        <div className="section-heading"><span className="mode-badge">{modeNames[mode]} · {tmLabel}</span><h1>Mau latihan kanji yang mana?</h1><p>{allTm ? 'Pilih satu kanji dari TM 1–7, atau latih seluruh kanji.' : 'Pilih satu kanji, atau latih semua kanji dalam pertemuan ini.'}</p></div>
        <button className="all-kanji-card" onClick={() => start(tm)}>
          <span className="all-kanji-icon"><Library size={25} /></span>
          <span><strong>{allTm ? 'Semua kanji · Semua TM' : `Semua kanji TM ${tm}`}</strong><small>{meetingEntries(tm, mode).length} soal · {meeting.kanji.length} kanji</small></span>
          <ArrowRight size={22} />
        </button>
        <h2 className="kanji-grid-title">Latihan per kanji</h2>
        <div className="kanji-grid">{meeting.kanji.map(character => {
          const list = meetingEntries(tm, mode, character);
          const studied = list.filter(item => progress[`${mode}:${item.id}`]?.correct > 0).length;
          return <button className="kanji-card" data-kanji={character} key={character} onClick={() => start(tm, character)} aria-label={`Latih kanji ${character}, ${list.length} soal`}>
            <span className="kanji-card-character japanese" lang="ja">{character}</span>
            <span className="kanji-card-count">{list.length} soal <ArrowRight size={17} /></span>
            <span className="meeting-progress"><span style={{ width: `${studied / list.length * 100}%` }} /></span>
            <small>{studied ? `${studied}/${list.length} pernah benar` : 'Mulai latihan'}</small>
          </button>;
        })}</div>
      </section>}

      {screen === 'practice' && queue[index] && <section className="practice-screen" data-tm={tm} data-kanji={selectedKanji ?? 'all'} data-mode={mode} style={meetingStyle(tm)}>
        <div className="practice-main">
        <div className="session-nav"><button className="text-button" onClick={() => chooseMeeting(tm)}><ArrowLeft size={17} /> Pilih kanji</button><span>{modeNames[mode]} <strong>{tmLabel} · {selectedKanji ? <span className="japanese" lang="ja">{selectedKanji}</span> : 'Semua kanji'}</strong></span></div>
        <div className="session-progress"><div><span>Soal {index + 1} <span className="muted">/ {queue.length}</span></span><span><CheckCircle2 size={15} /> {results.correct} benar</span></div><div className="progress-track"><span style={{ width: `${index / queue.length * 100}%` }} /></div></div>
        {allTm && <div className="question-origins" aria-label="Asal pertemuan soal"><span>Asal soal</span>{queue[index].tms.map(value => <span className="origin-tm" key={value} style={meetingStyle(value)}>TM {value}</span>)}</div>}
        <Practice key={`${session}:${index}`} mode={mode} item={queue[index]} sensitivity={sensitivity} onSensitivity={setSensitivity} onWritingActivity={writingActivity} onAdvance={next} onSkip={() => {
          void playSound('skip');
          record(queue[index], 'skipped');
          setResults(previous => ({ ...previous, skipped: previous.skipped + 1, review: addReview(previous.review, queue[index]) }));
          next();
        }} onHelp={() => {
          record(queue[index], 'helped');
          setResults(previous => ({ ...previous, helped: previous.helped + 1, review: addReview(previous.review, queue[index]) }));
        }} onAttempt={({ correct, firstTry }) => {
          record(queue[index], correct ? 'correct' : 'wrong');
          setResults(previous => ({ ...previous, correct: previous.correct + (correct ? 1 : 0), independent: previous.independent + (correct && firstTry ? 1 : 0), wrong: previous.wrong + (correct ? 0 : 1), review: !correct ? addReview(previous.review, queue[index]) : previous.review }));
        }} />
        </div>
        <aside className="study-sidebar" aria-label="Materi pertemuan">
          <div className="sidebar-heading"><h2>Pertemuan</h2><span>{modeNames[mode]}</span></div>
          <div className="tm-pills">{meetingOptions.map(value => <button key={value.id} data-tm={value.id} style={meetingStyle(value.id)} className={`${value.id === tm ? 'active' : ''} ${value.id === ALL_TM ? 'all-tm-pill' : ''}`} aria-pressed={value.id === tm} onClick={() => { if (value.id !== tm) start(value.id); }}>{meetingLabel(value.id)}</button>)}</div>
          <div className="sidebar-subtitle"><span>{allTm ? 'Kanji seluruh TM' : `Kanji TM ${tm}`}</span><span>{meeting.kanji.length} kanji</span></div>
          {allTm ? <details className="all-tm-roots"><summary>Pilih dari {meeting.kanji.length} kanji</summary>{rootButtons}</details> : rootButtons}
          <button className={`text-button sidebar-all ${selectedKanji === null ? 'active' : ''}`} onClick={() => start(tm)}>{allTm ? 'Latih semua kanji' : `Latih semua kanji TM ${tm}`} <ArrowRight size={16} /></button>
          <p className="sidebar-note">{selectedKanji ? `Jukugo dari bagian kanji ${selectedKanji}.` : allTm ? 'Jukugo dari seluruh TM 1–7.' : 'Jukugo dari seluruh kanji dalam pertemuan ini.'}</p>
          <button className="secondary-button sidebar-book" data-mode="book" style={themeStyle('book')} onClick={() => chooseMode('book')}><Library size={17} />Baca Buku</button>
        </aside>
      </section>}

      {screen === 'result' && <section className="result-screen" data-tm={tm} data-kanji={selectedKanji ?? 'all'}>
        <div className="result-icon"><CheckCircle2 size={42} /></div><span className="mode-badge">{modeNames[mode]} · {tmLabel} · {selectedKanji ?? 'Semua kanji'}</span><h1>Satu sesi selesai.</h1><p>{queue.length} soal {selectedKanji ? `untuk kanji ${selectedKanji}` : allTm ? 'dari seluruh TM 1–7' : `dari TM ${tm}`} sudah kamu latih.</p>
        <div className="result-stats"><div><strong>{results.independent}</strong><span>Benar tanpa bantuan</span></div><div><strong>{results.helped}</strong><span>Memakai show answer</span></div><div><strong>{results.skipped}</strong><span>Dilewati</span></div></div>
        <p className="result-detail">{results.correct} jawaban benar setelah latihan · {results.wrong} percobaan belum sesuai</p>
        {results.review.length > 0 && <button className="primary-button" onClick={() => start(tm, selectedKanji, results.review)}><RefreshCw size={18} /> Ulangi {results.review.length} soal yang perlu latihan</button>}
        <div className="result-actions"><button className="secondary-button repeat-session" onClick={() => start(tm, selectedKanji)}>Ulangi {selectedKanji ? `kanji ${selectedKanji}` : tmLabel}</button><button className="secondary-button choose-kanji" onClick={() => chooseMeeting(tm)}>Pilih kanji lain <ArrowRight size={17} /></button><button className="text-button" onClick={() => setScreen('select')}>Pilih TM lain</button></div>
        <p className="meeting-kanji japanese" lang="ja">{selectedKanji ?? meeting.kanji.join(' ')}</p>
      </section>}
      {storageError && <p className="storage-warning" role="status">Browser tidak bisa menyimpan progres. Sesi latihan tetap bisa dilanjutkan.</p>}
    </main>
    <footer className="site-footer"><span>Faiz Syihab © 2026</span></footer>
  </div></>;
}
