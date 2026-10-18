import React, {useState, useEffect, useRef, useMemo, useCallback} from 'react';
import {Player} from '@remotion/player';
import {transform} from 'sucrase';
import * as R from 'remotion';
import * as shapes from '@remotion/shapes';
import * as paths from '@remotion/paths';
import * as noise from '@remotion/noise';
import * as tr from '@remotion/transitions';
import {fade} from '@remotion/transitions/fade';
import {slide} from '@remotion/transitions/slide';
import {wipe} from '@remotion/transitions/wipe';
import {flip} from '@remotion/transitions/flip';
import {renderMediaOnWeb, renderStillOnWeb, canRenderMediaOnWeb} from '@remotion/web-renderer';
import {TEMPLATES, DEFAULT_CODE} from './templates.js';
import {FX} from './fx.js';
import {
  encodeFrames,
  renderPngFrame,
  makeCanvasProvider,
  makeHtmlProvider,
  compileCanvas,
  evenize,
  MAX_FRAMES,
} from './encoder.js';
import {buildDoc, buildStandalone} from './htmlmode.js';
import {toCSV, toTXT, entriesFromFile, CODE_FILE_ACCEPT} from './batchio.js';
import * as store from './store.js';
import {zipSync, strToU8} from 'fflate';

const MODS = {
  react: React,
  remotion: R,
  '@remotion/shapes': shapes,
  '@remotion/paths': paths,
  '@remotion/noise': noise,
  '@remotion/transitions': tr,
  '@remotion/transitions/fade': {fade},
  '@remotion/transitions/slide': {slide},
  '@remotion/transitions/wipe': {wipe},
  '@remotion/transitions/flip': {flip},
};

function compileRemotion(src) {
  const {code} = transform(src, {transforms: ['typescript', 'jsx', 'imports'], jsxRuntime: 'classic', production: true});
  const mod = {exports: {}};
  const req = (n) => {
    if (!(n in MODS)) throw new Error('Modul "' + n + '" tidak tersedia. Yang ada: ' + Object.keys(MODS).join(', '));
    return MODS[n];
  };
  new Function('require', 'module', 'exports', 'React', code)(req, mod, mod.exports, React);
  const ex = mod.exports;
  const comp = ex.default || Object.values(ex).find((v) => typeof v === 'function');
  if (!comp) throw new Error('Komponen tidak ditemukan. Gunakan: export default function Nama() {...}');
  return {comp, config: ex.config || {}};
}

const MODES = [
  {id: 'remotion', label: 'Remotion · React'},
  {id: 'canvas', label: 'Canvas · JS'},
  {id: 'html', label: 'HTML · CSS · JS'},
];
const MODE_HINT = {
  remotion: 'Komponen React + Remotion: interpolate, spring, noise, transitions, shapes.',
  canvas: 'Tulis "function animate(ctx, t, w, h, frame, fps)". Pustaka FX (easing, noise, palet, helper) tersedia otomatis.',
  html: 'Dokumen HTML/CSS/JS lengkap. Animasi CSS, rAF, dan timer disinkronkan otomatis saat ekspor.',
};
const DEFAULT_CFG = {width: 1280, height: 720, fps: 30, dur: 5, quality: 'high'};
const QUALS = ['very-low', 'low', 'medium', 'high', 'very-high'];
const PRESETS = [
  ['SD 640×360', 640, 360],
  ['480p 854×480', 854, 480],
  ['HD 1280×720', 1280, 720],
  ['Full HD 1920×1080', 1920, 1080],
  ['Quad HD 2560×1440', 2560, 1440],
  ['4K 3840×2160', 3840, 2160],
  ['8K 7680×4320', 7680, 4320],
  ['Persegi 1080×1080', 1080, 1080],
  ['Vertikal 9:16 1080×1920', 1080, 1920],
  ['Sinematik 21:9 2560×1080', 2560, 1080],
];

const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);

const slug = (s) =>
  String(s || 'animasi')
    .trim()
    .replace(/[^\p{L}\p{N}_-]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'animasi';

const clampNum = (v, min, max, d) => {
  const n = Number(v);
  return isFinite(n) ? Math.min(max, Math.max(min, n)) : d;
};

const sanitizeCfg = (c) => ({
  width: clampNum(c.width, 16, 8192, 1280),
  height: clampNum(c.height, 16, 8192, 720),
  fps: clampNum(c.fps, 1, 120, 30),
  dur: clampNum(c.dur, 0.1, 300, 5),
  quality: QUALS.includes(c.quality) ? c.quality : 'high',
});

const fmtSize = (b) => (b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB');

const extFor = (m) => (m === 'html' ? 'html' : m === 'canvas' ? 'js' : 'jsx');

function downloadBlob(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

function downloadText(text, name, mime) {
  downloadBlob(new Blob([text], {type: mime + ';charset=utf-8'}), name);
}

const lsGet = (k, fb) => {
  try {
    const v = localStorage.getItem(k);
    return v ? JSON.parse(v) : fb;
  } catch (e) {
    return fb;
  }
};
const lsSet = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch (e) {}
};

const MODE_LABEL = (m) => (MODES.find((x) => x.id === m) || {}).label || m;

function PreviewCard({job, autoplayAll, onDelete, onRender, renderBusy, updJob, apiRegistry}) {
  const mode = job.mode;
  const cfg = job.cfg || {};
  const prefs = job.prefs || {};
  const loop = prefs.loop !== false;
  const autoplayInit = prefs.autoplay !== false && autoplayAll;
  const w = Math.max(2, Math.round(cfg.width || 1280));
  const h = Math.max(2, Math.round(cfg.height || 720));
  const fps = Math.max(1, cfg.fps || 30);
  const dur = Math.max(0.1, cfg.dur || 5);
  const framesN = Math.min(MAX_FRAMES, Math.max(1, Math.round(dur * fps)));

  const rootRef = useRef(null);
  const playerRef = useRef(null);
  const cnvRef = useRef(null);
  const iframeRef = useRef(null);
  const stageRef = useRef(null);
  const rafRef = useRef(0);
  const tRef = useRef(0);

  const [wantPlay, setWantPlay] = useState(autoplayInit);
  const wantPlayRef = useRef(wantPlay);
  wantPlayRef.current = wantPlay;
  const [visible, setVisible] = useState(false);
  const [playing, setPlaying] = useState(autoplayInit);
  const [tSec, setTSec] = useState(0);
  const [err, setErr] = useState('');
  const [scale, setScale] = useState(1);

  const rswApi = () => iframeRef.current && iframeRef.current.contentWindow && iframeRef.current.contentWindow.__rsw;

  const compiled = useMemo(() => {
    if (mode === 'remotion') {
      try {
        const r = compileRemotion(job.code);
        return {comp: r.comp, fn: null, err: ''};
      } catch (e) {
        return {comp: null, fn: null, err: String(e.message || e)};
      }
    }
    if (mode === 'canvas') {
      try {
        const r = compileCanvas(job.code);
        return {comp: null, fn: r.fn, err: ''};
      } catch (e) {
        return {comp: null, fn: null, err: String(e.message || e)};
      }
    }
    return {comp: null, fn: null, err: ''};
  }, [mode, job.code]);

  const srcDoc = useMemo(() => (mode === 'html' ? buildDoc(job.code, 'LIVE') : ''), [mode, job.code]);

  const drawCanvas = useCallback(
    (t) => {
      const c = cnvRef.current;
      if (!c || !compiled.fn) return;
      const ctx = c.getContext('2d');
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      try {
        compiled.fn(ctx, t, c.width, c.height, Math.round(t * fps), fps, FX);
      } finally {
        ctx.restore();
      }
    },
    [compiled, fps]
  );

  useEffect(() => {
    setErr(compiled.err || '');
  }, [compiled]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (es) => {
        for (const en of es) if (en.target === el) setVisible(en.isIntersecting);
      },
      {threshold: 0.05}
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (mode !== 'html') return;
    const onMsg = (e) => {
      if (e.source !== (iframeRef.current && iframeRef.current.contentWindow)) return;
      const d = e.data;
      if (d && d.rsw === 'error') setErr('HTML: ' + d.message);
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [mode, srcDoc]);

  useEffect(() => {
    if (mode !== 'html') return;
    const id = setTimeout(() => {
      const r = rswApi();
      if (r && !wantPlayRef.current) r.pause();
    }, 80);
    return () => clearTimeout(id);
  }, [mode, srcDoc]);

  useEffect(() => {
    if (mode === 'canvas') return;
    if (visible) {
      if (wantPlayRef.current) {
        if (mode === 'remotion') {
          if (playerRef.current) playerRef.current.play();
        } else {
          const r = rswApi();
          if (r) r.play();
        }
      }
    } else if (mode === 'remotion') {
      if (playerRef.current) playerRef.current.pause();
    } else {
      const r = rswApi();
      if (r) r.pause();
    }
  }, [visible, mode, srcDoc, framesN]);

  useEffect(() => {
    if (mode !== 'canvas') return;
    const c = cnvRef.current;
    if (!c) return;
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    tRef.current = 0;
    setTSec(0);
    if (compiled.fn) drawCanvas(0);
  }, [mode, compiled, w, h, drawCanvas]);

  useEffect(() => {
    if (mode !== 'canvas' || !wantPlay || !visible) return;
    let alive = true;
    let last = performance.now();
    const tick = (ts) => {
      if (!alive) return;
      const dt = Math.min(0.1, (ts - last) / 1000);
      last = ts;
      if (compiled.fn) {
        tRef.current += dt;
        if (tRef.current >= dur) {
          if (loop) {
            tRef.current = 0;
            const c = cnvRef.current;
            if (c) {
              const ctx = c.getContext('2d');
              ctx.setTransform(1, 0, 0, 1, 0, 0);
              ctx.clearRect(0, 0, c.width, c.height);
            }
          } else {
            tRef.current = dur;
            setWantPlay(false);
          }
        }
        drawCanvas(tRef.current);
        setTSec(tRef.current);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      alive = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [mode, wantPlay, visible, loop, dur, compiled, drawCanvas]);

  useEffect(() => {
    if (mode !== 'remotion') return;
    const id = setInterval(() => {
      const p = playerRef.current;
      if (!p) return;
      setTSec(p.getCurrentFrame() / fps);
      setPlaying(p.isPlaying());
    }, 120);
    return () => clearInterval(id);
  }, [mode, fps]);

  useEffect(() => {
    if (mode !== 'html') return;
    const id = setInterval(() => {
      const r = rswApi();
      if (!r) return;
      r.setDur(dur);
      r.setLoop(loop);
      const st = r.state();
      setTSec(st.t / 1000);
      setPlaying(st.playing);
    }, 140);
    return () => clearInterval(id);
  }, [mode, dur, loop]);

  useEffect(() => {
    if (mode !== 'html') return;
    const el = stageRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      if (r.width) setScale(r.width / w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [mode, w]);

  const clearCanvas = () => {
    const c = cnvRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
  };

  const implRef = useRef(null);
  implRef.current = {
    play: () => {
      setWantPlay(true);
      if (mode === 'remotion') {
        if (playerRef.current) playerRef.current.play();
      } else if (mode === 'html') {
        const r = rswApi();
        if (r) r.play();
      }
    },
    pause: () => {
      setWantPlay(false);
      if (mode === 'remotion') {
        if (playerRef.current) playerRef.current.pause();
      } else if (mode === 'html') {
        const r = rswApi();
        if (r) r.pause();
      }
    },
    stop: () => {
      setWantPlay(false);
      if (mode === 'remotion') {
        const p = playerRef.current;
        if (p) {
          p.pause();
          p.seekTo(0);
        }
      } else if (mode === 'html') {
        const r = rswApi();
        if (r) {
          r.pause();
          r.seek(0);
        }
      } else {
        tRef.current = 0;
        setTSec(0);
        clearCanvas();
        if (compiled.fn) drawCanvas(0);
      }
    },
    restart: () => {
      setWantPlay(true);
      if (mode === 'remotion') {
        const p = playerRef.current;
        if (p) {
          p.seekTo(0);
          p.play();
        }
      } else if (mode === 'html') {
        const r = rswApi();
        if (r) {
          r.seek(0);
          r.play();
        }
      } else {
        tRef.current = 0;
        setTSec(0);
        clearCanvas();
        if (compiled.fn) drawCanvas(0);
      }
    },
  };

  const api = useMemo(
    () => ({
      play: () => implRef.current.play(),
      pause: () => implRef.current.pause(),
      stop: () => implRef.current.stop(),
      restart: () => implRef.current.restart(),
    }),
    []
  );

  useEffect(() => {
    apiRegistry.current.set(job.id, api);
    return () => {
      apiRegistry.current.delete(job.id);
    };
  }, [apiRegistry, api, job.id]);

  const onSeek = (e) => {
    const f = Number(e.target.value);
    const t = f / fps;
    setTSec(t);
    if (mode === 'remotion') {
      if (playerRef.current) playerRef.current.seekTo(f);
    } else if (mode === 'canvas') {
      tRef.current = t;
      clearCanvas();
      drawCanvas(t);
    } else {
      const r = rswApi();
      if (r) r.seek(Math.round(t * 1000));
    }
  };

  const setPref = (k, v) => updJob(job.id, {prefs: {...(job.prefs || {}), [k]: v}});

  const isPlaying = mode === 'canvas' ? wantPlay : playing;
  const transportFrame = Math.min(framesN - 1, Math.max(0, Math.round(tSec * fps)));

  return (
    <div className="pv-card" ref={rootRef}>
      <div className="pv-head">
        <span className="pv-title" title={job.name}>
          {job.name}
        </span>
        <span className="chip mode">{MODE_LABEL(mode)}</span>
        <div className="pv-actions">
          <button title="Render + unduh animasi ini" disabled={renderBusy} onClick={onRender}>
            ⬇
          </button>
          <button className="danger" title="Hapus dari batch & pratinjau" onClick={onDelete}>
            ✕
          </button>
        </div>
      </div>
      <div className="pv-stage" ref={stageRef} style={{aspectRatio: w + ' / ' + h}}>
        {mode === 'remotion' && compiled.comp && (
          <div className="pv-player">
            <Player
              ref={playerRef}
              component={compiled.comp}
              durationInFrames={framesN}
              fps={fps}
              compositionWidth={w}
              compositionHeight={h}
              loop={loop}
              style={{width: '100%', height: '100%'}}
              acknowledgeRemotionLicense
            />
          </div>
        )}
        {mode === 'canvas' && <canvas ref={cnvRef} width={w} height={h} />}
        {mode === 'html' && (
          <iframe
            ref={iframeRef}
            title={'Pratinjau ' + job.name}
            srcDoc={srcDoc}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: w,
              height: h,
              border: 0,
              transform: 'scale(' + scale + ')',
              transformOrigin: '0 0',
            }}
          />
        )}
        {err && <div className="pv-err">{err}</div>}
        {!visible && !err && (
          <div className="pv-offscreen">
            <span>Pratinjau dijeda di luar pandangan</span>
            <span style={{fontSize: 10.5, opacity: 0.7}}>gulir ke sini untuk melanjutkan</span>
          </div>
        )}
      </div>
      <div className="pv-transport">
        <button title={isPlaying ? 'Jeda' : 'Putar'} onClick={isPlaying ? implRef.current.pause : implRef.current.play}>
          {isPlaying ? '⏸' : '▶'}
        </button>
        <button title="Ulang dari awal" onClick={implRef.current.restart}>
          ↺
        </button>
        <button title="Stop" onClick={implRef.current.stop}>
          ⏹
        </button>
        <input type="range" min={0} max={Math.max(0, framesN - 1)} value={transportFrame} onChange={onSeek} aria-label="Scrub waktu" />
        <span className="time">
          {tSec.toFixed(1)}s / {dur.toFixed(1)}s
        </span>
      </div>
      <div className="pv-foot">
        <label className="check">
          <input type="checkbox" checked={loop} onChange={(e) => setPref('loop', e.target.checked)} />
          Ulangi
        </label>
        <label className="check">
          <input type="checkbox" checked={prefs.autoplay !== false} onChange={(e) => setPref('autoplay', e.target.checked)} />
          Auto-play
        </label>
        <span className="pv-meta">
          {w}×{h} · {fps}fps
        </span>
      </div>
    </div>
  );
}

export default function App() {
  const [mode, setMode] = useState(() => lsGet('rsw-mode', 'remotion'));
  const [codes, setCodes] = useState(() => ({...DEFAULT_CODE, ...lsGet('rsw-codes', {})}));
  const [cfg, setCfg] = useState(() => sanitizeCfg({...DEFAULT_CFG, ...lsGet('rsw-cfg', {})}));
  const [prefs, setPrefs] = useState(() => ({
    loop: true,
    autoDl: true,
    pvAuto: true,
    pvCols: 2,
    pvDir: 'v',
    theme: 'dark',
    ...lsGet('rsw-prefs', {}),
  }));
  const [jobs, setJobs] = useState(() =>
    lsGet('rsw-batch', []).map((j) => ({...j, prefs: {loop: true, autoplay: true, ...(j.prefs || {})}}))
  );
  const [logs, setLogs] = useState([]);
  const [animName, setAnimName] = useState('animasi');
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [prog, setProg] = useState(null);
  const [busy, setBusy] = useState(null);
  const [tab, setTab] = useState('batch');
  const [playing, setPlaying] = useState(true);
  const [tSec, setTSec] = useState(0);
  const [frame, setFrame] = useState(0);
  const [batchContainer, setBatchContainer] = useState('mp4');
  const [dragOver, setDragOver] = useState(false);
  const [stageScale, setStageScale] = useState(1);

  const playerRef = useRef(null);
  const cnvRef = useRef(null);
  const iframeRef = useRef(null);
  const stageRef = useRef(null);
  const abortRef = useRef(null);
  const rafRef = useRef(0);
  const tRef = useRef(0);
  const lastCfgRef = useRef('');
  const pvApi = useRef(new Map());

  const {loop, autoDl, pvAuto, pvCols, pvDir, theme} = prefs;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => lsSet('rsw-mode', mode), [mode]);
  useEffect(() => lsSet('rsw-codes', codes), [codes]);
  useEffect(() => lsSet('rsw-cfg', cfg), [cfg]);
  useEffect(() => lsSet('rsw-prefs', prefs), [prefs]);
  useEffect(() => lsSet('rsw-batch', jobs), [jobs]);

  useEffect(() => {
    store.getRenders().then((l) => {
      if (Array.isArray(l) && l.length) setLogs(l.sort((a, b) => b.at - a.at));
    });
  }, []);

  useEffect(() => {
    const onMsg = (e) => {
      if (e.source !== (iframeRef.current && iframeRef.current.contentWindow)) return;
      const d = e.data;
      if (d && d.rsw === 'error') setErr('HTML: ' + d.message);
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  const compiled = useMemo(() => {
    if (mode === 'remotion') {
      try {
        const r = compileRemotion(codes.remotion);
        return {...r, err: ''};
      } catch (e) {
        return {comp: null, fn: null, config: {}, err: String(e.message || e)};
      }
    }
    if (mode === 'canvas') {
      try {
        const r = compileCanvas(codes.canvas);
        return {...r, err: ''};
      } catch (e) {
        return {comp: null, fn: null, config: {}, err: String(e.message || e)};
      }
    }
    return {comp: null, fn: null, config: {}, err: ''};
  }, [mode, codes.remotion, codes.canvas]);

  useEffect(() => {
    if (mode === 'html') {
      setErr('');
      return;
    }
    setErr(compiled.err || '');
  }, [compiled, mode]);

  useEffect(() => {
    const c = compiled.config || {};
    const key = JSON.stringify(c);
    if (!key || key === '{}' || key === lastCfgRef.current) return;
    lastCfgRef.current = key;
    setCfg((s) => {
      const next = {...s};
      if (c.width) next.width = clampNum(c.width, 16, 8192, s.width);
      if (c.height) next.height = clampNum(c.height, 16, 8192, s.height);
      if (c.fps) next.fps = clampNum(c.fps, 1, 120, s.fps);
      if (c.durationInFrames && (c.fps || s.fps)) next.dur = clampNum(c.durationInFrames / (c.fps || s.fps), 0.1, 300, s.dur);
      else if (c.dur) next.dur = clampNum(c.dur, 0.1, 300, s.dur);
      return next;
    });
  }, [compiled]);

  const frames = Math.max(1, Math.round(cfg.dur * cfg.fps));
  const framesOut = Math.min(frames, MAX_FRAMES);

  const srcDoc = useMemo(() => (mode === 'html' ? buildDoc(codes.html, 'LIVE') : ''), [mode, codes.html]);

  const rsw = () => iframeRef.current && iframeRef.current.contentWindow && iframeRef.current.contentWindow.__rsw;

  useEffect(() => {
    if (mode !== 'html') return;
    const id = setInterval(() => {
      const r = rsw();
      if (!r) return;
      r.setDur(cfg.dur);
      r.setLoop(loop);
      const st = r.state();
      setTSec(st.t / 1000);
      setPlaying(st.playing);
    }, 120);
    return () => clearInterval(id);
  }, [mode, cfg.dur, loop]);

  useEffect(() => {
    if (mode !== 'remotion') return;
    const id = setInterval(() => {
      const p = playerRef.current;
      if (!p) return;
      setFrame(p.getCurrentFrame());
      setPlaying(p.isPlaying());
    }, 90);
    return () => clearInterval(id);
  }, [mode]);

  const drawCanvas = useCallback(
    (t) => {
      const c = cnvRef.current;
      if (!c || !compiled.fn) return;
      const ctx = c.getContext('2d');
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      try {
        compiled.fn(ctx, t, c.width, c.height, Math.round(t * cfg.fps), cfg.fps, FX);
      } finally {
        ctx.restore();
      }
    },
    [compiled, cfg.fps]
  );

  useEffect(() => {
    if (mode !== 'canvas') return;
    const c = cnvRef.current;
    if (!c) return;
    c.width = cfg.width;
    c.height = cfg.height;
    const ctx = c.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    tRef.current = 0;
    setTSec(0);
    if (compiled.fn) drawCanvas(0);
  }, [mode, compiled, cfg.width, cfg.height, drawCanvas]);

  useEffect(() => {
    if (mode !== 'canvas') return;
    let alive = true;
    let last = performance.now();
    const tick = (ts) => {
      if (!alive) return;
      const dt = Math.min(0.1, (ts - last) / 1000);
      last = ts;
      if (playing && compiled.fn) {
        tRef.current += dt;
        if (tRef.current >= cfg.dur) {
          if (loop) {
            tRef.current = 0;
            const c = cnvRef.current;
            if (c) {
              const ctx = c.getContext('2d');
              ctx.setTransform(1, 0, 0, 1, 0, 0);
              ctx.clearRect(0, 0, c.width, c.height);
            }
          } else {
            tRef.current = cfg.dur;
            setPlaying(false);
          }
        }
        drawCanvas(tRef.current);
        setTSec(tRef.current);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      alive = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [mode, playing, loop, cfg.dur, compiled, drawCanvas]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      if (r.width && cfg.width && cfg.height) {
        setStageScale(Math.min(r.width / cfg.width, r.height / cfg.height));
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [cfg.width, cfg.height]);

  const togglePlay = () => {
    if (mode === 'remotion') {
      const p = playerRef.current;
      if (p) p.toggle();
    } else if (mode === 'canvas') {
      setPlaying((v) => !v);
    } else {
      const r = rsw();
      if (r) (r.state().playing ? r.pause() : r.play());
    }
  };

  const restart = () => {
    if (mode === 'remotion') {
      const p = playerRef.current;
      if (p) {
        p.seekTo(0);
        p.play();
      }
    } else if (mode === 'canvas') {
      const c = cnvRef.current;
      if (c) {
        const ctx = c.getContext('2d');
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, c.width, c.height);
      }
      tRef.current = 0;
      setTSec(0);
      setPlaying(true);
      if (compiled.fn) drawCanvas(0);
    } else {
      const r = rsw();
      if (r) {
        r.seek(0);
        r.play();
      }
    }
  };

  const onSeek = (e) => {
    const f = Number(e.target.value);
    const t = f / cfg.fps;
    if (mode === 'remotion') {
      setFrame(f);
      const p = playerRef.current;
      if (p) p.seekTo(f);
    } else if (mode === 'canvas') {
      const c = cnvRef.current;
      if (c) {
        const ctx = c.getContext('2d');
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, c.width, c.height);
      }
      tRef.current = t;
      setTSec(t);
      if (compiled.fn) drawCanvas(t);
    } else {
      const r = rsw();
      if (r) r.seek(Math.round(t * 1000));
      setTSec(t);
    }
  };

  const setCode = (text) => setCodes((c) => ({...c, [mode]: text}));

  const onTabKey = (e) => {
    if (e.key !== 'Tab') return;
    e.preventDefault();
    const el = e.target;
    const s = el.selectionStart;
    setCode(codes[mode].slice(0, s) + '  ' + codes[mode].slice(el.selectionEnd));
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = s + 2;
    });
  };

  const pickTemplate = (e) => {
    const k = e.target.value;
    if (!k) return;
    setCode(TEMPLATES[mode][k]);
    setAnimName(slug(k));
    setMsg('Template "' + k + '" dimuat.');
    e.target.value = '';
  };

  const openFile = (e) => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    f.text().then((text) => {
      const entries = entriesFromFile(f.name, text);
      if (!entries.length) return setMsg('File kosong atau tidak dikenali.');
      const first = entries[0];
      setMode(first.mode);
      setCodes((c) => ({...c, [first.mode]: first.code}));
      setAnimName(slug(first.name));
      if (entries.length > 1) {
        setJobs((s) => [
          ...s,
          ...entries.slice(1).map((en) => ({id: uid(), ...en, status: 'idle', progress: 0})),
        ]);
      }
      setMsg(
        '"' + f.name + '" dimuat ke editor (' + first.mode + ')' +
          (entries.length > 1 ? ' · ' + (entries.length - 1) + ' entri lain masuk Batch.' : '.')
      );
    });
  };

  const saveCode = () => {
    const ext = mode === 'html' ? 'html' : mode === 'canvas' ? 'js' : 'jsx';
    downloadText(codes[mode], slug(animName) + '.' + ext, 'text/plain');
    setMsg('Kode disimpan: ' + slug(animName) + '.' + ext);
  };

  const resetAll = () => {
    if (!window.confirm('Reset semua pengaturan, kode editor, dan daftar batch ke kondisi awal? Log ekspor tetap tersimpan.')) return;
    ['rsw-mode', 'rsw-codes', 'rsw-cfg', 'rsw-batch', 'rsw-prefs'].forEach((k) => localStorage.removeItem(k));
    setMode('remotion');
    setCodes({...DEFAULT_CODE});
    setCfg({...DEFAULT_CFG});
    setPrefs((p) => ({loop: true, autoDl: true, pvAuto: true, pvCols: 2, pvDir: 'v', theme: p.theme}));
    setJobs([]);
    setAnimName('animasi');
    lastCfgRef.current = '';
    setErr('');
    setMsg('Pengaturan direset ke awal (durasi default 5 detik).');
  };

  const updJob = (id, patch) => setJobs((s) => s.map((x) => (x.id === id ? {...x, ...patch} : x)));

  const saveRender = async (entry) => {
    setLogs((l) => [entry, ...l].slice(0, 300));
    store.putRender(entry);
    if (autoDl) downloadBlob(entry.blob, entry.name);
    setMsg(
      'Selesai: ' + entry.name + ' (' + fmtSize(entry.size) + ')' + (entry.via ? ' · ' + entry.via : '') + (autoDl ? ' · terunduh' : ' · unduh lewat tab Log')
    );
  };

  const runExport = async ({job, container}) => {
    const j = job
      ? {name: job.name, mode: job.mode, code: job.code, cfg: sanitizeCfg(job.cfg)}
      : {name: animName, mode, code: codes[mode], cfg: sanitizeCfg(cfg)};
    if (!j.code.trim()) {
      setMsg('Kode kosong.');
      return {ok: false};
    }
    if (j.mode !== 'html' && busyErr(j.mode)) {
      setMsg('Perbaiki dulu error pada kode.');
      return {ok: false};
    }
    const w = evenize(j.cfg.width);
    const h = evenize(j.cfg.height);
    const framesN = Math.min(MAX_FRAMES, Math.max(1, Math.round(j.cfg.dur * j.cfg.fps)));
    const label = job ? job.name : animName;
    setBusy(job ? job.id : 'editor');
    setProg(0);
    setMsg('Merender ' + label + ' → ' + container.toUpperCase() + ' ' + w + '×' + h + ' @' + j.cfg.fps + 'fps…');
    if (w !== j.cfg.width || h !== j.cfg.height) {
      setMsg('Dimensi disesuaikan ke bilangan genap untuk encoder: ' + w + '×' + h);
    } else if (Math.round(j.cfg.dur * j.cfg.fps) > MAX_FRAMES) {
      setMsg('Frame dibatasi ke ' + MAX_FRAMES + ' (kurangi durasi/FPS untuk hasil penuh).');
    }
    abortRef.current = new AbortController();
    const onProgress = (p) => {
      setProg(p);
      if (job) updJob(job.id, {progress: p});
    };
    try {
      if (j.mode === 'remotion') {
        const {comp} = compileRemotion(j.code);
        const composition = {id: 'main', component: comp, durationInFrames: framesN, fps: j.cfg.fps, width: w, height: h};
        const videoCodec = container === 'mp4' ? 'h264' : 'vp9';
        const chk = await canRenderMediaOnWeb({width: w, height: h, container, videoCodec});
        if (!chk.canRender) throw new Error(chk.issues.map((i) => i.message).join('\n'));
        const res = await renderMediaOnWeb({
          composition,
          container,
          videoCodec,
          videoBitrate: j.cfg.quality,
          signal: abortRef.current.signal,
          onProgress: (p) => onProgress(p.progress),
        });
        const blob = await res.getBlob();
        await saveRender({
          id: uid(),
          name: slug(label) + '.' + container,
          at: Date.now(),
          size: blob.size,
          mode: j.mode,
          w,
          h,
          fps: j.cfg.fps,
          dur: framesN / j.cfg.fps,
          quality: j.cfg.quality,
          ext: container,
          blob,
        });
      } else {
        const provider =
          j.mode === 'canvas'
            ? makeCanvasProvider({code: j.code, width: w, height: h, fps: j.cfg.fps})
            : makeHtmlProvider({code: j.code, width: w, height: h, fps: j.cfg.fps});
        const out = await encodeFrames({
          width: w,
          height: h,
          fps: j.cfg.fps,
          frames: framesN,
          container,
          quality: j.cfg.quality,
          provider,
          signal: abortRef.current.signal,
          onProgress,
        });
        await saveRender({
          id: uid(),
          name: slug(label) + '.' + out.ext,
          at: Date.now(),
          size: out.blob.size,
          mode: j.mode,
          w,
          h,
          fps: j.cfg.fps,
          dur: framesN / j.cfg.fps,
          quality: j.cfg.quality,
          ext: out.ext,
          via: out.via,
          blob: out.blob,
        });
        if (provider.warn) setMsg(provider.warn);
      }
      if (job) updJob(job.id, {status: 'done', progress: 1});
      return {ok: true, aborted: false};
    } catch (e) {
      const aborted = (abortRef.current && abortRef.current.signal.aborted) || e.aborted;
      if (job) updJob(job.id, {status: aborted ? 'idle' : 'error'});
      setMsg(aborted ? 'Ekspor dibatalkan.' : 'Gagal ekspor: ' + (e.message || e));
      return {ok: false, aborted: !!aborted};
    } finally {
      setProg(null);
      setBusy(null);
      abortRef.current = null;
    }
  };

  const busyErr = (m) => (m === 'remotion' ? !compiled.comp : m === 'canvas' ? !compiled.fn : false);

  const canExport = prog === null && (mode === 'html' || (!busyErr(mode) && !!codes[mode].trim()));

  const exportPng = async () => {
    if (prog !== null) return;
    const w = evenize(cfg.width);
    const h = evenize(cfg.height);
    let fIdx = 0;
    let provider = null;
    try {
      if (mode === 'remotion') {
        if (!compiled.comp) return setMsg('Perbaiki dulu error pada kode.');
        fIdx = playerRef.current ? playerRef.current.getCurrentFrame() : 0;
        const composition = {id: 'main', component: compiled.comp, durationInFrames: framesOut, fps: cfg.fps, width: w, height: h};
        const r = await renderStillOnWeb({composition, frame: fIdx});
        const blob = await r.blob();
        await saveRender({
          id: uid(),
          name: slug(animName) + '-frame' + fIdx + '.png',
          at: Date.now(),
          size: blob.size,
          mode,
          w,
          h,
          fps: cfg.fps,
          dur: 0,
          quality: cfg.quality,
          ext: 'png',
          blob,
        });
      } else {
        if (mode === 'canvas' && !compiled.fn) return setMsg('Perbaiki dulu error pada kode.');
        fIdx = Math.round(tSec * cfg.fps);
        provider =
          mode === 'canvas'
            ? makeCanvasProvider({code: codes.canvas, width: w, height: h, fps: cfg.fps})
            : makeHtmlProvider({code: codes.html, width: w, height: h, fps: cfg.fps});
        const blob = await renderPngFrame({width: w, height: h, fps: cfg.fps, provider, frame: fIdx});
        await saveRender({
          id: uid(),
          name: slug(animName) + '-frame' + fIdx + '.png',
          at: Date.now(),
          size: blob.size,
          mode,
          w,
          h,
          fps: cfg.fps,
          dur: 0,
          quality: cfg.quality,
          ext: 'png',
          blob,
        });
      }
    } catch (e) {
      setMsg('Gagal ekspor PNG: ' + (e.message || e));
    }
  };

  const downloadHtml = () => {
    downloadText(buildStandalone(codes.html), slug(animName) + '.html', 'text/html');
    setMsg('HTML mandiri terunduh — berisi pemutar ▶ ⏸ ↺ bawaan.');
  };

  const runBatch = async () => {
    for (const j of jobs) {
      updJob(j.id, {status: 'rendering', progress: 0});
      const r = await runExport({job: j, container: batchContainer});
      if (r.aborted) break;
    }
  };

  const addCurrent = () => {
    if (!canExport) return setMsg('Perbaiki dulu error pada kode sebelum menambah ke batch.');
    const job = {
      id: uid(),
      name: animName || 'Animasi ' + (jobs.length + 1),
      mode,
      code: codes[mode],
      cfg: sanitizeCfg(cfg),
      prefs: {loop: true, autoplay: pvAuto},
      status: 'idle',
      progress: 0,
    };
    setJobs((s) => [...s, job]);
    setMsg('Ditambahkan ke batch: "' + job.name + '".');
  };

  const loadJob = (j) => {
    setMode(j.mode);
    setCodes((c) => ({...c, [j.mode]: j.code}));
    setCfg(sanitizeCfg(j.cfg));
    setAnimName(j.name);
    lastCfgRef.current = '';
    setMsg('Pratinjau batch "' + j.name + '" dimuat ke studio.');
  };

  const delJob = (id) => setJobs((s) => s.filter((x) => x.id !== id));

  const importFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const entries = [];
    const failed = [];
    for (const f of files) {
      try {
        const text = await f.text();
        const es = entriesFromFile(f.name, text);
        if (es.length) entries.push(...es);
        else failed.push(f.name);
      } catch (e) {
        failed.push(f.name);
      }
    }
    if (!entries.length) {
      setMsg(failed.length ? 'Tidak ada animasi valid dari ' + failed.length + ' file yang dilewati.' : 'Tidak ada animasi valid di file terpilih.');
      return;
    }
    setJobs((s) => {
      const names = new Set(s.map((x) => x.name));
      const added = entries.map((en) => {
        let name = en.name;
        let k = 2;
        while (names.has(name)) name = en.name + ' (' + k++ + ')';
        names.add(name);
        return {id: uid(), ...en, name, prefs: {loop: true, autoplay: pvAuto}, status: 'idle', progress: 0};
      });
      return [...s, ...added];
    });
    setTab('batch');
    const perMode = ['remotion', 'canvas', 'html']
      .map((m) => {
        const n = entries.filter((e) => e.mode === m).length;
        return n ? m + ' ' + n : '';
      })
      .filter(Boolean)
      .join(' · ');
    setMsg(
      entries.length +
        ' file kode diimpor (' + (perMode || 'mixed') + ')' +
        (failed.length ? ' · ' + failed.length + ' dilewati' : '') +
        ' → tab Batch.'
    );
  };

  const exportZip = () => {
    const list = jobs.length
      ? jobs
      : [{name: animName, mode, code: codes[mode], cfg: sanitizeCfg(cfg)}];
    const files = {};
    const used = new Set();
    for (const j of list) {
      let base = slug(j.name);
      let k = 2;
      while (used.has(base)) base = slug(j.name) + '-' + k++;
      used.add(base);
      files[base + '.' + extFor(j.mode)] = strToU8(j.code);
    }
    files['_MANIFEST.csv'] = strToU8(toCSV(list));
    files['_MANIFEST.txt'] = strToU8(toTXT(list));
    const z = zipSync(files);
    downloadBlob(new Blob([z], {type: 'application/zip'}), 'sa-animation-studio-kode.zip');
    setMsg('ZIP berisi ' + list.length + ' file kode + manifest (CSV/TXT) terunduh.');
  };

  const exportBatch = (kind) => {
    const list = jobs.length
      ? jobs
      : [{name: animName, mode, code: codes[mode], cfg: sanitizeCfg(cfg)}];
    if (kind === 'csv') downloadText(toCSV(list), 'animasi-batch.csv', 'text/csv');
    else downloadText(toTXT(list), 'animasi-batch.txt', 'text/plain');
    setMsg('Diekspor: ' + (kind === 'csv' ? 'animasi-batch.csv' : 'animasi-batch.txt') + ' (' + list.length + ' animasi).');
  };

  const reDownload = (l) => {
    if (!l.blob) return setMsg('Berkas tidak tersimpan di log ini.');
    downloadBlob(l.blob, l.name);
  };

  const delLog = (id) => {
    store.deleteRender(id);
    setLogs((l) => l.filter((x) => x.id !== id));
  };

  const clearLogs = () => {
    if (!logs.length) return;
    if (!window.confirm('Hapus semua ' + logs.length + ' entri log ekspor?')) return;
    store.clearRenders();
    setLogs([]);
    setMsg('Log ekspor dibersihkan.');
  };

  const presetKey = (PRESETS.find((p) => p[1] === cfg.width && p[2] === cfg.height) || [])[0] || '';

  const applyPreset = (e) => {
    const p = PRESETS.find((x) => x[0] === e.target.value);
    if (!p) return;
    setCfg((c) => ({...c, width: p[1], height: p[2]}));
  };

  const setCfgField = (k) => (e) => {
    const v = e.target.value;
    if (v === '') return;
    setCfg((c) => ({...c, [k]: k === 'quality' ? v : Number(v)}));
  };

  const transportTime = mode === 'remotion' ? frame / cfg.fps : tSec;
  const transportFrame = mode === 'remotion' ? frame : Math.min(framesOut - 1, Math.round(tSec * cfg.fps));

  return (
    <div className="app">
      <header>
        <div className="brand">
          <div className="brand-text">
            <h1>
              SA Animation Studio <span className="badge">Suite</span>
            </h1>
            <span className="tagline">Pratinjau multi, batch, dan ekspor video — semuanya berjalan di browser</span>
          </div>
        </div>
        <div className="row">
          <button
            className="icon-btn"
            onClick={() => setPrefs((p) => ({...p, theme: p.theme === 'dark' ? 'light' : 'dark'}))}
            title={theme === 'dark' ? 'Ganti ke mode siang' : 'Ganti ke mode malam'}
            aria-label="Mode siang/malam"
          >
            {theme === 'dark' ? '☀' : '🌙'}
          </button>
          <label className="btn">
            Buka file
            <input type="file" accept={CODE_FILE_ACCEPT} hidden onChange={openFile} />
          </label>
          <button onClick={saveCode}>Simpan kode</button>
          <button onClick={resetAll}>Reset pengaturan</button>
        </div>
      </header>

      <main>
        <section className="editor">
          <div className="row mode-tabs">
            {MODES.map((m) => (
              <button key={m.id} className={mode === m.id ? 'chip active' : 'chip'} onClick={() => setMode(m.id)}>
                {m.label}
              </button>
            ))}
          </div>
          <div className="row editor-tools">
            <select onChange={pickTemplate} defaultValue="" aria-label="Contoh kode">
              <option value="">Contoh kode… ({Object.keys(TEMPLATES[mode]).length})</option>
              {Object.keys(TEMPLATES[mode]).map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
            <input
              className="name-input"
              value={animName}
              onChange={(e) => setAnimName(e.target.value)}
              placeholder="nama-file"
              title="Nama dasar file ekspor"
            />
          </div>
          <textarea
            spellCheck={false}
            value={codes[mode]}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={onTabKey}
            aria-label="Kode animasi"
          />
          <p className="hint-inline">{MODE_HINT[mode]}</p>
          {err && <pre className="err">{err}</pre>}
        </section>

        <section className="side">
          <div className="stage" ref={stageRef} style={{aspectRatio: cfg.width + ' / ' + cfg.height}}>
            {mode === 'remotion' && compiled.comp && (
              <Player
                ref={playerRef}
                component={compiled.comp}
                durationInFrames={framesOut}
                fps={cfg.fps}
                compositionWidth={cfg.width}
                compositionHeight={cfg.height}
                loop={loop}
                style={{width: '100%', height: '100%'}}
                acknowledgeRemotionLicense
                errorFallback={({error}) => <pre className="err">{error.message}</pre>}
              />
            )}
            {mode === 'remotion' && !compiled.comp && <div className="stage-empty">Perbaiki error kode untuk melihat pratinjau</div>}
            {mode === 'canvas' && <canvas ref={cnvRef} width={cfg.width} height={cfg.height} />}
            {mode === 'html' && (
              <iframe
                ref={iframeRef}
                title="Pratinjau HTML"
                srcDoc={srcDoc}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: cfg.width,
                  height: cfg.height,
                  border: 0,
                  transform: 'scale(' + stageScale + ')',
                  transformOrigin: '0 0',
                }}
              />
            )}
          </div>

          <div className="transport">
            <button onClick={togglePlay} title={playing ? 'Jeda' : 'Putar'}>
              {playing ? '⏸' : '▶'}
            </button>
            <button onClick={restart} title="Ulang dari awal">
              ↺
            </button>
            <input type="range" min={0} max={Math.max(0, framesOut - 1)} value={transportFrame} onChange={onSeek} />
            <span className="time">
              {transportTime.toFixed(1)}s / {cfg.dur.toFixed(1)}s
            </span>
            <label className="check">
              <input type="checkbox" checked={loop} onChange={(e) => setPrefs((p) => ({...p, loop: e.target.checked}))} />
              Ulangi
            </label>
          </div>

          <div className="grid">
            <label>
              Ukuran
              <select value={presetKey} onChange={applyPreset}>
                {PRESETS.map((p) => (
                  <option key={p[0]} value={p[0]}>
                    {p[0]}
                  </option>
                ))}
                {!presetKey && <option value="">Kustom</option>}
              </select>
            </label>
            <label>
              Lebar
              <input type="number" min="16" max="8192" value={cfg.width} onChange={setCfgField('width')} />
            </label>
            <label>
              Tinggi
              <input type="number" min="16" max="8192" value={cfg.height} onChange={setCfgField('height')} />
            </label>
            <label>
              FPS
              <input type="number" min="1" max="120" value={cfg.fps} onChange={setCfgField('fps')} />
            </label>
            <label>
              Durasi (detik)
              <input type="number" step="0.5" min="0.1" max="300" value={cfg.dur} onChange={setCfgField('dur')} />
            </label>
            <label>
              Kualitas
              <select value={cfg.quality} onChange={setCfgField('quality')}>
                {QUALS.map((q) => (
                  <option key={q} value={q}>
                    {q}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="row">
            <button className="primary" disabled={!canExport} onClick={() => runExport({container: 'mp4'})}>
              Ekspor MP4
            </button>
            <button disabled={!canExport} onClick={() => runExport({container: 'webm'})}>
              Ekspor WebM
            </button>
            <button disabled={!canExport} onClick={exportPng}>
              Ekspor PNG
            </button>
            {mode === 'html' && (
              <button disabled={!codes.html.trim()} onClick={downloadHtml}>
                Unduh HTML
              </button>
            )}
            <button className="ghost" disabled={!canExport} onClick={addCurrent}>
              + Batch
            </button>
            {prog !== null && (
              <button className="danger" onClick={() => abortRef.current && abortRef.current.abort()}>
                Batalkan
              </button>
            )}
          </div>

          {prog !== null && <progress value={prog} max={1} />}
          <label className="check auto-dl">
            <input type="checkbox" checked={autoDl} onChange={(e) => setPrefs((p) => ({...p, autoDl: e.target.checked}))} />
            Unduh otomatis setelah render
          </label>
          {msg && <p className="msg">{msg}</p>}
        </section>
      </main>

      {jobs.length > 0 && (
        <section className="previews">
          <div className="previews-head">
            <h2>Pratinjau Multi · {jobs.length}</h2>
            <span className="hint-inline">
              Kartu pratinjau tertaut langsung dengan daftar batch di bawah — tambah/hapus/rename di satu tempat tersinkron otomatis.
            </span>
          </div>
          <div className="pv-toolbar">
            <button
              onClick={() => {
                for (const api of pvApi.current.values()) api.play();
              }}
              title="Putar semua pratinjau"
            >
              ▶ Semua
            </button>
            <button
              onClick={() => {
                for (const api of pvApi.current.values()) api.pause();
              }}
              title="Jeda semua pratinjau"
            >
              ⏸ Jeda semua
            </button>
            <button
              onClick={() => {
                for (const api of pvApi.current.values()) api.stop();
              }}
              title="Stop semua pratinjau"
            >
              ⏹ Stop semua
            </button>
            <span className="sep" />
            <label className="check">
              <input type="checkbox" checked={pvAuto} onChange={(e) => setPrefs((p) => ({...p, pvAuto: e.target.checked}))} />
              Auto-play
            </label>
            <div className="layout-ctl">
              <div className="seg">
                <button
                  className={pvDir === 'v' ? 'active' : ''}
                  onClick={() => setPrefs((p) => ({...p, pvDir: 'v'}))}
                  title="Tata grid vertikal"
                >
                  ⬍ Grid
                </button>
                <button
                  className={pvDir === 'h' ? 'active' : ''}
                  onClick={() => setPrefs((p) => ({...p, pvDir: 'h'}))}
                  title="Tata strip horizontal (geser)"
                >
                  ⬌ Strip
                </button>
              </div>
              <label>
                Jumlah kolom
                <input
                  type="range"
                  min="1"
                  max="4"
                  step="1"
                  value={pvCols}
                  onChange={(e) => setPrefs((p) => ({...p, pvCols: Math.max(1, Number(e.target.value) || 2)}))}
                />
              </label>
            </div>
          </div>
          <div className={'previews-grid' + (pvDir === 'h' ? ' strip' : '')} style={{'--pv-cols': pvCols}}>
            {jobs.map((j) => (
              <PreviewCard
                key={j.id}
                job={j}
                autoplayAll={pvAuto}
                onDelete={() => delJob(j.id)}
                onRender={() => runExport({job: j, container: batchContainer})}
                renderBusy={prog !== null}
                updJob={updJob}
                apiRegistry={pvApi}
              />
            ))}
          </div>
        </section>
      )}

      <section className={'panel' + (dragOver ? ' drag' : '')}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          importFiles(e.dataTransfer.files);
        }}
      >
        <div className="tabs">
          <button className={tab === 'batch' ? 'active' : ''} onClick={() => setTab('batch')}>
            Batch ({jobs.length})
          </button>
          <button className={tab === 'logs' ? 'active' : ''} onClick={() => setTab('logs')}>
            Log Ekspor ({logs.length})
          </button>
        </div>

        {tab === 'batch' && (
          <>
            <div className="panel-head">
              <div className="row">
                <button className="ghost" disabled={!canExport || prog !== null} onClick={addCurrent}>
                  + Tambah dari editor
                </button>
                <label className="btn">
                  Impor kode
                  <input
                    type="file"
                    multiple
                    accept={CODE_FILE_ACCEPT}
                    hidden
                    onChange={(e) => {
                      importFiles(e.target.files);
                      e.target.value = '';
                    }}
                  />
                </label>
                <span className="group-label">Ekspor</span>
                <button disabled={!jobs.length && !codes[mode].trim()} onClick={exportZip}>
                  ZIP kode
                </button>
                <button disabled={!jobs.length && !codes[mode].trim()} onClick={() => exportBatch('csv')}>
                  Ekspor CSV
                </button>
                <button disabled={!jobs.length && !codes[mode].trim()} onClick={() => exportBatch('txt')}>
                  Ekspor TXT
                </button>
                <select value={batchContainer} onChange={(e) => setBatchContainer(e.target.value)} aria-label="Format batch">
                  <option value="mp4">MP4</option>
                  <option value="webm">WebM</option>
                </select>
                <button
                  className="primary"
                  disabled={!jobs.length || prog !== null}
                  onClick={prog !== null ? () => abortRef.current && abortRef.current.abort() : runBatch}
                >
                  {prog !== null ? '⏹ Batalkan semua' : '▶ Render semua'}
                </button>
              </div>
              <p className="hint">
                Tarik-lepas file kode ke panel ini: JSX/TSX (Remotion), JS/TS (Canvas), HTML/CSS/SVG, atau CSV/TXT berisi banyak
                animasi. Klik "Pratinjau" untuk memuat job ke panggung.
              </p>
            </div>
            <ul className="jobs">
              {jobs.map((j) => (
                <li key={j.id}>
                  <input className="job-name" value={j.name} onChange={(e) => updJob(j.id, {name: e.target.value})} />
                  <span className="chip mode">{(MODES.find((m) => m.id === j.mode) || {}).label || j.mode}</span>
                  <span className="meta">
                    {j.cfg.width}×{j.cfg.height} · {j.cfg.fps}fps · {Number(j.cfg.dur).toFixed(1)}s
                  </span>
                  {j.status === 'rendering' && <progress value={j.progress || 0} max={1} />}
                  {j.status === 'done' && <span className="ok">✓</span>}
                  {j.status === 'error' && <span className="fail">✗</span>}
                  <div className="row">
                    <button onClick={() => loadJob(j)}>Pratinjau</button>
                    <button disabled={prog !== null} onClick={() => runExport({job: j, container: batchContainer})}>
                      Render
                    </button>
                    <button className="danger" onClick={() => delJob(j.id)}>
                      Hapus
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            {!jobs.length && <p className="hint-empty">Belum ada job batch. Tambahkan dari editor atau impor CSV/TXT (bisa banyak file sekaligus).</p>}
          </>
        )}

        {tab === 'logs' && (
          <>
            <div className="panel-head">
              <div className="row">
                <button className="danger" disabled={!logs.length} onClick={clearLogs}>
                  Hapus semua log
                </button>
                <span className="hint-inline">
                  {logs.length ? fmtSize(logs.reduce((a, b) => a + (b.size || 0), 0)) + ' total' : 'Belum ada render'}
                </span>
              </div>
            </div>
            <ul className="logs">
              {logs.map((l) => (
                <li key={l.id}>
                  <span className={'chip ext-' + l.ext}>{String(l.ext || '').toUpperCase()}</span>
                  <div className="log-info">
                    <b>{l.name}</b>
                    <small>
                      {(MODES.find((m) => m.id === l.mode) || {}).label || l.mode} · {l.w}×{l.h} · {l.fps}fps ·{' '}
                      {Number(l.dur || 0).toFixed(1)}s · {fmtSize(l.size)} · {new Date(l.at).toLocaleString('id-ID')}
                      {l.via ? ' · ' + l.via : ''}
                    </small>
                  </div>
                  <div className="row">
                    <button onClick={() => reDownload(l)}>Unduh</button>
                    <button className="danger" onClick={() => delLog(l.id)}>
                      Hapus
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            {!logs.length && <p className="hint-empty">Belum ada file yang dirender. Semua ekspor berhasil tercatat di sini dan bisa diunduh ulang.</p>}
          </>
        )}
      </section>

      <footer className="footer">
        <span>SA Animation Studio · render, batch, dan ekspor video berjalan sepenuhnya di browser — tanpa server</span>
      </footer>
    </div>
  );
}