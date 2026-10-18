import React, {useState, useEffect, useRef} from 'react';
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
import {TEMPLATES} from './templates.js';

const MODS = {react: React, remotion: R, '@remotion/shapes': shapes, '@remotion/paths': paths,
  '@remotion/noise': noise, '@remotion/transitions': tr, '@remotion/transitions/fade': {fade},
  '@remotion/transitions/slide': {slide}, '@remotion/transitions/wipe': {wipe}, '@remotion/transitions/flip': {flip}};

function compile(src) {
  const {code} = transform(src, {transforms: ['typescript', 'jsx', 'imports'], jsxRuntime: 'classic', production: true});
  const mod = {exports: {}};
  const req = (n) => { if (!(n in MODS)) throw new Error('Modul "' + n + '" tidak tersedia. Yang ada: ' + Object.keys(MODS).join(', ')); return MODS[n]; };
  new Function('require', 'module', 'exports', 'React', code)(req, mod, mod.exports, React);
  const ex = mod.exports;
  const comp = ex.default || Object.values(ex).find((v) => typeof v === 'function');
  if (!comp) throw new Error('Komponen tidak ditemukan. Gunakan: export default function Nama() {...}');
  return {comp, config: ex.config || {}};
}
const save = (blob, name) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); };
const PRESETS = {'HD 1280×720': [1280, 720], 'Full HD 1920×1080': [1920, 1080], 'Persegi 1080×1080': [1080, 1080], 'Vertikal 1080×1920': [1080, 1920]};

export default function App() {
  const first = Object.keys(TEMPLATES)[0];
  const [code, setCode] = useState(() => localStorage.getItem('rsw-code') || TEMPLATES[first]);
  const [cfg, setCfg] = useState({width: 1280, height: 720, fps: 30, dur: 4});
  const [comp, setComp] = useState(null);
  const [err, setErr] = useState('');
  const [quality, setQuality] = useState('high');
  const [prog, setProg] = useState(null);
  const [msg, setMsg] = useState('');
  const player = useRef(null), abort = useRef(null), lastCfg = useRef('');
  const frames = Math.max(1, Math.round(cfg.dur * cfg.fps));
  const set = (k) => (e) => setCfg((c) => ({...c, [k]: Math.max(0.1, Number(e.target.value) || 1)}));

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        const r = compile(code);
        setComp(() => r.comp); setErr('');
        const key = JSON.stringify(r.config);
        if (key !== lastCfg.current) {
          lastCfg.current = key;
          const {width, height, fps, durationInFrames} = r.config;
          setCfg((c) => ({...c, ...(width && {width}), ...(height && {height}), ...(fps && {fps}),
            ...(durationInFrames && {dur: durationInFrames / (fps || c.fps)})}));
        }
        localStorage.setItem('rsw-code', code);
      } catch (e) { setErr(String(e.message || e)); }
    }, 500);
    return () => clearTimeout(t);
  }, [code]);

  const composition = () => ({id: 'main', component: comp, durationInFrames: frames, fps: cfg.fps, width: cfg.width, height: cfg.height});

  async function exportMp4() {
    setMsg('');
    try {
      const chk = await canRenderMediaOnWeb({width: cfg.width, height: cfg.height, container: 'mp4', videoCodec: 'h264'});
      if (!chk.canRender) { setMsg(chk.issues.map((i) => i.message).join('\n')); return; }
      abort.current = new AbortController(); setProg(0);
      const {getBlob} = await renderMediaOnWeb({composition: composition(), container: 'mp4', videoCodec: 'h264',
        videoBitrate: quality, signal: abort.current.signal, onProgress: (p) => setProg(p.renderedFrames / frames)});
      save(await getBlob(), 'animasi.mp4'); setMsg('Selesai: animasi.mp4 terunduh.');
    } catch (e) { setMsg(abort.current?.signal.aborted ? 'Ekspor dibatalkan.' : 'Gagal ekspor: ' + (e.message || e)); }
    setProg(null);
  }
  async function exportPng() {
    try {
      const frame = player.current?.getCurrentFrame() ?? 0;
      const {blob} = await renderStillOnWeb({composition: composition(), frame, imageFormat: 'png'});
      save(blob, 'frame-' + frame + '.png');
    } catch (e) { setMsg('Gagal ekspor PNG: ' + (e.message || e)); }
  }
  const onTab = (e) => { if (e.key === 'Tab') { e.preventDefault(); const s = e.target.selectionStart;
    setCode(code.slice(0, s) + '  ' + code.slice(e.target.selectionEnd)); requestAnimationFrame(() => { e.target.selectionStart = e.target.selectionEnd = s + 2; }); } };
  const openFile = (e) => { const f = e.target.files[0]; if (f) f.text().then(setCode); e.target.value = ''; };

  return (
    <div className="app">
      <header>
        <h1>Remotion Studio Web</h1>
        <div className="row">
          <select onChange={(e) => e.target.value && setCode(TEMPLATES[e.target.value])} defaultValue="">
            <option value="">Contoh kode…</option>{Object.keys(TEMPLATES).map((k) => <option key={k}>{k}</option>)}
          </select>
          <label className="btn">Buka file<input type="file" accept=".tsx,.jsx,.ts,.js,.txt" hidden onChange={openFile} /></label>
          <button onClick={() => save(new Blob([code]), 'animasi.tsx')}>Simpan kode</button>
          <button onClick={() => navigator.clipboard.writeText(code)}>Salin</button>
        </div>
      </header>
      <main>
        <section className="editor">
          <textarea spellCheck={false} value={code} onChange={(e) => setCode(e.target.value)} onKeyDown={onTab} aria-label="Kode animasi" />
          {err && <pre className="err">{err}</pre>}
        </section>
        <section className="side">
          <div className="stage" style={{aspectRatio: cfg.width + '/' + cfg.height}}>
            {comp && <Player ref={player} component={comp} durationInFrames={frames} fps={cfg.fps}
              compositionWidth={cfg.width} compositionHeight={cfg.height} controls loop style={{width: '100%', height: '100%'}}
              errorFallback={({error}) => <pre className="err">{error.message}</pre>} />}
          </div>
          <div className="grid">
            <label>Ukuran<select onChange={(e) => { const [w, h] = PRESETS[e.target.value]; setCfg((c) => ({...c, width: w, height: h})); }} value="">
              <option value="" disabled>{cfg.width}×{cfg.height}</option>{Object.keys(PRESETS).map((k) => <option key={k}>{k}</option>)}</select></label>
            <label>FPS<input type="number" value={cfg.fps} min="1" max="60" onChange={set('fps')} /></label>
            <label>Durasi (detik)<input type="number" step="0.5" value={cfg.dur} min="0.1" onChange={set('dur')} /></label>
            <label>Kualitas<select value={quality} onChange={(e) => setQuality(e.target.value)}>
              <option value="low">Rendah</option><option value="medium">Sedang</option><option value="high">Tinggi</option><option value="very-high">Sangat tinggi</option></select></label>
          </div>
          <div className="row">
            <button className="primary" disabled={!comp || !!err || prog !== null} onClick={exportMp4}>Ekspor MP4</button>
            <button disabled={!comp || !!err} onClick={exportPng}>Ekspor frame PNG</button>
            {prog !== null && <button onClick={() => abort.current?.abort()}>Batalkan</button>}
          </div>
          {prog !== null && <progress value={prog} max="1" />}
          {msg && <p className="msg">{msg}</p>}
          <p className="hint">{frames} frame. Atur ukuran/FPS/durasi lewat <code>export const config</code> di kode atau panel ini. Modul: remotion, react, @remotion/shapes, paths, noise, transitions (fade, slide, wipe, flip).</p>
        </section>
      </main>
    </div>
  );
}
