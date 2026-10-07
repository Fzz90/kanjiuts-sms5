import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, BookOpen, ExternalLink, Maximize, Maximize2, MoveHorizontal, RotateCcw, X, ZoomIn, ZoomOut } from 'lucide-react';
import './book-reader.css';
import { assetUrl } from '../lib/assets.js';

const PAGE_COUNT = 30;
const FIRST_PDF_PAGE = 180;
const STORAGE_KEY = 'kanji-uts-book-page-v2';
const PDF_URL = assetUrl('book/kanji-look-and-learn-180-209.pdf');

function readLastPage() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === null) {
      const legacy = window.localStorage.getItem('kanji-uts-book-page-v1');
      const index = legacy !== null && /^\d+$/.test(legacy) ? Number(legacy) : -1;
      return Number.isInteger(index) && index >= 0 && index < 25 ? index + 5 : 0;
    }
    if (!/^\d+$/.test(saved)) return 0;
    const value = Number(saved);
    return Number.isInteger(value) && value >= FIRST_PDF_PAGE && value < FIRST_PDF_PAGE + PAGE_COUNT ? value - FIRST_PDF_PAGE : 0;
  } catch {
    return 0;
  }
}

export default function BookReader({ onBack }) {
  const [page, setPage] = useState(readLastPage);
  const [zoom, setZoom] = useState(1);
  const [fitToWidth, setFitToWidth] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [retry, setRetry] = useState(0);
  const [imageState, setImageState] = useState({ key: '', state: 'loading' });
  const [ratio, setRatio] = useState(2 / 3);
  const [viewportSize, setViewportSize] = useState({ width: 0, boxWidth: 0, boxHeight: 0 });
  const viewportRef = useRef(null);
  const cardRef = useRef(null);
  const dialogRef = useRef(null);
  const pendingAnchor = useRef(null);
  const gesture = useRef({ pointers: new Map(), drag: null, pinch: null });
  const zoomRef = useRef(zoom);
  const previousPage = useRef(page);
  const imageKey = `${page}-${retry}`;
  const status = imageState.key === imageKey ? imageState.state : 'loading';
  const pageNumber = FIRST_PDF_PAGE + page;
  const imageUrl = assetUrl(`book/pages/page-${pageNumber}.webp${retry ? `?retry=${retry}` : ''}`);
  // The unzoomed reference size must not shrink when a scrollbar appears.
  const fitWidth = viewportSize.boxWidth > 0
    ? Math.max(1, Math.min(viewportSize.boxWidth - 24, (viewportSize.boxHeight - 24) * ratio))
    : 480;
  const currentZoom = fitToWidth ? Math.max(1, (viewportSize.width - 24) / fitWidth) : zoom;
  zoomRef.current = currentZoom;
  const maxZoom = Math.max(4, (viewportSize.width - 24) / fitWidth);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(FIRST_PDF_PAGE + page));
    } catch {
      // Reading remains available when storage is blocked or full.
    }
    viewportRef.current?.scrollTo({ left: 0, top: 0 });
    if (previousPage.current !== page) {
      if (!expanded) cardRef.current?.scrollIntoView({ block: 'start', behavior: 'auto' });
      previousPage.current = page;
    }
    pendingAnchor.current = null;
    gesture.current = { pointers: new Map(), drag: null, pinch: null };
    setDragging(false);
  }, [page, expanded]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return undefined;
    const measure = () => {
      const box = viewport.getBoundingClientRect();
      const nextSize = { width: viewport.clientWidth, boxWidth: box.width, boxHeight: box.height };
      setViewportSize(current => current.width === nextSize.width && current.boxWidth === nextSize.boxWidth && current.boxHeight === nextSize.boxHeight ? current : nextSize);
    };
    measure();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => window.removeEventListener('resize', measure);
    }
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [expanded]);

  useEffect(() => {
    if (!expanded) return undefined;
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    let nativeModal = false;
    try { dialog.showModal(); nativeModal = true; }
    catch {
      dialog.setAttribute('open', '');
      dialog.classList.add('is-fallback');
    }
    const fallbackKeys = event => {
      if (nativeModal) return;
      if (event.key === 'Escape') { event.preventDefault(); closeExpanded(); }
      if (event.key === 'Tab') {
        const targets = [...dialog.querySelectorAll('button:not(:disabled), select, [tabindex="0"]')];
        const index = targets.indexOf(document.activeElement);
        if ((!event.shiftKey && index === targets.length - 1) || (event.shiftKey && index <= 0)) {
          event.preventDefault();
          targets[event.shiftKey ? targets.length - 1 : 0]?.focus();
        }
      }
    };
    document.addEventListener('keydown', fallbackKeys);
    viewportRef.current?.focus({ preventScroll: true });
    return () => {
      document.removeEventListener('keydown', fallbackKeys);
      if (nativeModal) dialog.close();
      else dialog.removeAttribute('open');
      document.body.style.overflow = previousOverflow;
      window.requestAnimationFrame(() => cardRef.current?.querySelector('.book-expand-button')?.focus({ preventScroll: true }));
    };
  }, [expanded]);

  useLayoutEffect(() => {
    const anchor = pendingAnchor.current;
    const viewport = viewportRef.current;
    const image = viewport?.querySelector('.book-page-image');
    if (!anchor || !image) return;
    viewport.scrollLeft = image.offsetLeft + anchor.x * image.clientWidth - anchor.clientX;
    viewport.scrollTop = image.offsetTop + anchor.y * image.clientHeight - anchor.clientY;
    pendingAnchor.current = null;
  }, [currentZoom, fitWidth, fitToWidth]);

  useEffect(() => {
    const navigate = (event) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const target = event.target;
      if (target instanceof Element && target.closest('input, select, textarea, [contenteditable="true"], [role="textbox"]')) return;
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setPage((current) => Math.max(0, current - 1));
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        setPage((current) => Math.min(PAGE_COUNT - 1, current + 1));
      }
    };
    window.addEventListener('keydown', navigate);
    return () => window.removeEventListener('keydown', navigate);
  }, []);

  const fitPage = () => {
    pendingAnchor.current = null;
    setFitToWidth(false);
    setZoom(1);
    viewportRef.current?.scrollTo({ left: 0, top: 0 });
  };

  const closeExpanded = () => {
    pendingAnchor.current = null;
    setFitToWidth(false);
    setExpanded(false);
    setZoom(1);
  };

  const openExpanded = (initialZoom = 1) => {
    setFitToWidth(false);
    setZoom(initialZoom);
    setExpanded(true);
  };

  const anchorAt = (clientX, clientY) => {
    const viewport = viewportRef.current;
    const image = viewport?.querySelector('.book-page-image');
    if (!viewport || !image) return null;
    const rect = viewport.getBoundingClientRect();
    return {
      x: (viewport.scrollLeft + clientX - rect.left - image.offsetLeft) / image.clientWidth,
      y: (viewport.scrollTop + clientY - rect.top - image.offsetTop) / image.clientHeight,
      clientX: clientX - rect.left,
      clientY: clientY - rect.top,
    };
  };

  const zoomAround = (value, anchor) => {
    const nextZoom = Math.max(1, Math.min(maxZoom, value));
    pendingAnchor.current = anchor;
    setFitToWidth(false);
    if (nextZoom === zoomRef.current && anchor) {
      const viewport = viewportRef.current;
      const image = viewport.querySelector('.book-page-image');
      viewport.scrollLeft = image.offsetLeft + anchor.x * image.clientWidth - anchor.clientX;
      viewport.scrollTop = image.offsetTop + anchor.y * image.clientHeight - anchor.clientY;
      pendingAnchor.current = null;
    }
    setZoom(nextZoom);
  };

  const changeZoom = (amount) => {
    if (!expanded && amount > 0) {
      openExpanded(2);
      return;
    }
    const viewport = viewportRef.current;
    const rect = viewport.getBoundingClientRect();
    zoomAround(zoomRef.current + amount, anchorAt(rect.left + rect.width / 2, rect.top + rect.height / 2));
  };

  const fitWidthToScreen = () => {
    pendingAnchor.current = null;
    // Let CSS fill the content box directly, including changes in scrollbar space.
    // Converting fit width to a zoom multiplier creates a resize feedback loop.
    setFitToWidth(true);
    viewportRef.current?.scrollTo({ left: 0, top: 0 });
  };

  const beginGesture = (event) => {
    if (!expanded || status !== 'loaded' || event.button !== 0) return;
    event.preventDefault();
    const viewport = event.currentTarget;
    try { viewport.setPointerCapture?.(event.pointerId); } catch { /* Pointer can end before capture. */ }
    const current = gesture.current;
    current.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (current.pointers.size === 1) {
      current.drag = { x: event.clientX, y: event.clientY, left: viewport.scrollLeft, top: viewport.scrollTop };
      setDragging(true);
    } else if (current.pointers.size === 2) {
      const [first, second] = [...current.pointers.values()];
      current.pinch = {
        distance: Math.max(1, Math.hypot(first.x - second.x, first.y - second.y)),
        zoom: zoomRef.current,
        anchor: anchorAt((first.x + second.x) / 2, (first.y + second.y) / 2),
      };
      setDragging(false);
    }
  };

  const moveGesture = (event) => {
    const current = gesture.current;
    if (!current.pointers.has(event.pointerId)) return;
    current.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (current.pointers.size >= 2 && current.pinch?.anchor) {
      const [first, second] = [...current.pointers.values()];
      const rect = event.currentTarget.getBoundingClientRect();
      zoomAround(current.pinch.zoom * Math.hypot(first.x - second.x, first.y - second.y) / current.pinch.distance, {
        ...current.pinch.anchor,
        clientX: (first.x + second.x) / 2 - rect.left,
        clientY: (first.y + second.y) / 2 - rect.top,
      });
    } else if (current.drag) {
      event.currentTarget.scrollLeft = current.drag.left - (event.clientX - current.drag.x);
      event.currentTarget.scrollTop = current.drag.top - (event.clientY - current.drag.y);
    }
  };

  const endGesture = (event) => {
    const current = gesture.current;
    current.pointers.delete(event.pointerId);
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture?.(event.pointerId);
    current.pinch = null;
    const remaining = [...current.pointers.values()][0];
    current.drag = remaining ? { ...remaining, left: event.currentTarget.scrollLeft, top: event.currentTarget.scrollTop } : null;
    setDragging(Boolean(remaining));
  };

  const readerCard = (
      <div className="book-reader-card" ref={cardRef}>
        <div className="book-toolbar">
          <label className="book-page-select">
            <span>Halaman</span>
            <select value={page} onChange={(event) => setPage(Number(event.target.value))} aria-label="Pilih halaman PDF">
              {Array.from({ length: PAGE_COUNT }, (_, index) => (
                <option key={index} value={index}>PDF {FIRST_PDF_PAGE + index}</option>
              ))}
            </select>
          </label>
          <div className="book-zoom-controls" role="group" aria-label="Ukuran halaman">
            <button type="button" onClick={() => changeZoom(-0.25)} disabled={currentZoom <= 1} aria-label="Perkecil halaman" title="Perkecil">
              <ZoomOut size={18} aria-hidden="true" />
            </button>
            <output className="book-zoom-value" aria-label="Pembesaran dari ukuran pas">{Math.round(currentZoom * 100)}%</output>
            <button type="button" onClick={() => changeZoom(0.25)} disabled={currentZoom >= maxZoom} aria-label="Perbesar halaman" title={expanded ? 'Perbesar' : 'Perbesar di layar penuh'}>
              <ZoomIn size={18} aria-hidden="true" />
            </button>
            <button className="book-fit-button" type="button" onClick={fitPage} aria-label="Pas halaman" title="Kembali ke ukuran pas halaman">
              <Maximize size={16} aria-hidden="true" /><span>Pas halaman</span>
            </button>
            {expanded && <button className="book-fit-button" type="button" onClick={fitWidthToScreen} aria-label="Pas lebar layar" title="Pas lebar layar">
              <MoveHorizontal size={17} aria-hidden="true" /><span>Pas lebar</span>
            </button>}
            {!expanded && <button className="book-expand-button" type="button" onClick={() => openExpanded()} aria-label="Buka buku layar penuh" title="Buka layar penuh">
              <Maximize2 size={18} aria-hidden="true" /><span>Layar penuh</span>
            </button>}
          </div>
          {expanded && <button className="book-close-button" type="button" onClick={closeExpanded} aria-label="Tutup layar penuh" title="Tutup layar penuh (Esc)">
            <X size={20} aria-hidden="true" /><span>Tutup</span>
          </button>}
        </div>

        <div className={`book-page-viewport${dragging ? ' is-dragging' : ''}`} ref={viewportRef} role="region" aria-label={`Halaman PDF ${pageNumber}`} tabIndex={0} aria-busy={status === 'loading'} onPointerDown={beginGesture} onPointerMove={moveGesture} onPointerUp={endGesture} onPointerCancel={endGesture} onLostPointerCapture={endGesture}>
          {status === 'loading' && (
            <div className="book-page-message" role="status">
              <span className="book-loading-dot" aria-hidden="true" />
              <p>Memuat halaman {pageNumber}…</p>
            </div>
          )}
          {status === 'error' && (
            <div className="book-page-message book-page-error" role="alert">
              <BookOpen size={30} aria-hidden="true" />
              <h2>Halaman belum bisa dibuka</h2>
              <p>Coba muat ulang halaman {pageNumber}, atau baca melalui PDF.</p>
              <div className="book-error-actions">
                <button type="button" onClick={() => setRetry((value) => value + 1)}><RotateCcw size={16} aria-hidden="true" /> Coba lagi</button>
                <a href={`${PDF_URL}#page=${page + 1}`} target="_blank" rel="noopener noreferrer">Buka PDF <ExternalLink size={15} aria-hidden="true" /></a>
              </div>
            </div>
          )}
          <img
            key={imageKey}
            className={`book-page-image${status === 'loaded' ? ' is-loaded' : ''}`}
            src={imageUrl}
            alt={`Halaman PDF ${pageNumber}, Kanji Look and Learn`}
            style={{ width: fitToWidth ? '100%' : `${fitWidth * zoom}px` }}
            decoding="async"
            draggable="false"
            onLoad={(event) => {
              const { naturalWidth, naturalHeight } = event.currentTarget;
              if (naturalWidth && naturalHeight) setRatio(naturalWidth / naturalHeight);
              setImageState({ key: imageKey, state: 'loaded' });
            }}
            onError={() => setImageState({ key: imageKey, state: 'error' })}
          />
        </div>

        <footer className="book-navigation">
          <button className="book-prev-button" type="button" onClick={() => setPage((value) => Math.max(0, value - 1))} disabled={page === 0}>
            <ArrowLeft size={17} aria-hidden="true" /><span>Kembali</span>
          </button>
          <div className="book-page-counter" role="status" aria-live="polite" aria-atomic="true">
            <strong>{page + 1}<span> / {PAGE_COUNT}</span></strong>
            <span>PDF {pageNumber}</span>
          </div>
          <button className="book-next-button" type="button" onClick={() => setPage((value) => Math.min(PAGE_COUNT - 1, value + 1))} disabled={page === PAGE_COUNT - 1}>
            <span>Berikutnya</span><ArrowRight size={17} aria-hidden="true" />
          </button>
        </footer>
      </div>
  );

  return (
    <section className="book-reader" aria-labelledby="book-reader-title">
      <header className="book-reader-heading">
        <button className="book-back-button" type="button" onClick={onBack}>
          <ArrowLeft size={17} aria-hidden="true" /> Menu awal
        </button>
        <div className="book-title-block">
          <span className="book-eyebrow"><BookOpen size={15} aria-hidden="true" /> KANJI LOOK AND LEARN</span>
          <h1 id="book-reader-title">Baca Buku</h1>
          <p>Materi halaman PDF 180–209. Baca satu halaman, lanjut sesuai ritmemu.</p>
        </div>
        <a className="book-pdf-link" href={`${PDF_URL}#page=${page + 1}`} target="_blank" rel="noopener noreferrer">
          Buka PDF <ExternalLink size={15} aria-hidden="true" />
        </a>
      </header>
      {expanded ? createPortal(
        <dialog className="book-reader book-fullscreen-dialog" ref={dialogRef} aria-modal="true" aria-label="Pembaca buku layar penuh" onCancel={(event) => { event.preventDefault(); closeExpanded(); }}>
          {readerCard}
        </dialog>, document.body,
      ) : readerCard}
      <p className="book-reader-hint">Layar penuh untuk membaca lebih besar. Cubit atau geser halaman; gunakan ← → untuk pindah halaman.</p>
    </section>
  );
}
