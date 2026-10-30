// Kumpulan contoh animasi per mode. Semua bisa diubah bebas di editor.
// Mode Remotion/Canvas bisa mengekspor `config` untuk menimpa pengaturan panel.

export const TEMPLATES = {
  remotion: {
    'Judul Kinetic (Spring)': `import React from 'react';
import {AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig} from 'remotion';

export const config = {durationInFrames: 150, fps: 30, width: 1280, height: 720};

const WORDS = ['BUAT', 'ANIMASI', 'PRO', 'DI', 'BROWSER'];

export default function Judul() {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return (
    <AbsoluteFill style={{background: 'linear-gradient(135deg, #0f172a, #1e293b 55%, #312e81)', justifyContent: 'center', alignItems: 'center'}}>
      <div style={{display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center', padding: 40}}>
        {WORDS.map((w, i) => {
          const s = spring({frame: frame - i * 7, fps, config: {damping: 12, stiffness: 160, mass: 0.7}});
          const y = interpolate(s, [0, 1], [90, 0]);
          const rot = interpolate(s, [0, 1], [-8, 0]);
          const hue = 220 + i * 28 + frame * 0.9;
          return (
            <span key={w} style={{
              fontFamily: 'system-ui', fontWeight: 900, fontSize: 104, letterSpacing: '-0.04em',
              color: 'hsl(' + hue + ' 90% 65%)', opacity: s,
              transform: 'translateY(' + y + 'px) rotate(' + rot + 'deg)',
              textShadow: '0 12px 44px rgba(99,102,241,.45)'
            }}>{w}</span>
          );
        })}
      </div>
      <div style={{marginTop: 36, width: 640, height: 8, borderRadius: 4, background: '#334155', overflow: 'hidden'}}>
        <div style={{
          width: interpolate(frame, [25, 140], [0, 100], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) + '%',
          height: '100%', background: 'linear-gradient(90deg,#22d3ee,#a78bfa)'
        }} />
      </div>
    </AbsoluteFill>
  );
}`,

    'Kartu Slide (TransitionSeries)': `import React from 'react';
import {AbsoluteFill} from 'remotion';
import {TransitionSeries, fade, slide, linearTiming} from '@remotion/transitions';

export const config = {durationInFrames: 165, fps: 30, width: 1280, height: 720};

const Card = ({title, sub, color}) => (
  <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', background: 'linear-gradient(160deg, ' + color + '26, #0b1020 72%)'}}>
    <div style={{textAlign: 'center'}}>
      <div style={{fontSize: 96, fontWeight: 900, color, letterSpacing: '-0.03em'}}>{title}</div>
      <div style={{fontSize: 28, color: '#94a3b8', marginTop: 12}}>{sub}</div>
    </div>
  </AbsoluteFill>
);

export default function Slideshow() {
  return (
    <AbsoluteFill style={{background: '#0b1020'}}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={45}>
          <Card title="DESAIN" sub="Scene satu — slide dari kanan" color="#38bdf8" />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({direction: 'from-right'})} timing={linearTiming({durationInFrames: 15})} />
        <TransitionSeries.Sequence durationInFrames={45}>
          <Card title="ANIMASI" sub="Scene dua — fade mulus" color="#a78bfa" />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({durationInFrames: 15})} />
        <TransitionSeries.Sequence durationInFrames={45}>
          <Card title="EKSPOR MP4" sub="Scene tiga — siap diunduh" color="#34d399" />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
}`,

    'Partikel Noise': `import React from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig, random, noise2D} from 'remotion';

export const config = {durationInFrames: 150, fps: 30, width: 1280, height: 720};

const N = 170;

export default function Partikel() {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const t = frame / 60;
  return (
    <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 40%, #1e1b4b, #020617 78%)'}}>
      {Array.from({length: N}, (_, i) => {
        const ox = random('x' + i) * width;
        const oy = random('y' + i) * height;
        const nx = noise2D(ox / 320, oy / 320 + t);
        const ny = noise2D(oy / 320 + 100, ox / 320 + t);
        const pulse = 0.5 + 0.5 * Math.sin(frame / 12 + i);
        const size = 3 + random('s' + i) * 11 * pulse;
        const hue = (noise2D(i / 10, t) * 60 + 200 + frame) % 360;
        return (
          <div key={i} style={{
            position: 'absolute', left: ox + nx * 130, top: oy + ny * 130,
            width: size, height: size, borderRadius: '50%',
            background: 'hsl(' + hue + ' 90% 65%)',
            opacity: 0.3 + 0.6 * pulse,
            boxShadow: '0 0 ' + size * 2.4 + 'px hsl(' + hue + ' 90% 65%)'
          }} />
        );
      })}
    </AbsoluteFill>
  );
}`,

    'Counter & Meter': `import React from 'react';
import {AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig} from 'remotion';

export const config = {durationInFrames: 150, fps: 30, width: 1280, height: 720};

export default function Counter() {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const val = Math.round(interpolate(frame, [0, 120], [0, 2026], {extrapolateRight: 'clamp'}));
  const s = spring({frame, fps, config: {damping: 200}});
  return (
    <AbsoluteFill style={{background: '#020617', justifyContent: 'center', alignItems: 'center', fontFamily: 'system-ui'}}>
      <div style={{
        fontSize: 168, fontWeight: 900, color: '#e2e8f0', fontVariantNumeric: 'tabular-nums',
        transform: 'scale(' + interpolate(s, [0, 1], [0.6, 1]) + ')'
      }}>{val.toLocaleString('id-ID')}</div>
      <div style={{fontSize: 28, color: '#64748b', letterSpacing: '0.32em', marginTop: 8}}>SATU BROWSER · TANPA SERVER</div>
      <div style={{marginTop: 34, display: 'flex', gap: 10}}>
        {[0, 1, 2, 3, 4].map((i) => {
          const h = interpolate(frame, [30 + i * 6, 70 + i * 6], [8, 26 + i * 14], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
          return <div key={i} style={{width: 34, height: h, borderRadius: 6, background: 'linear-gradient(180deg,#22d3ee,#6366f1)'}} />;
        })}
      </div>
    </AbsoluteFill>
  );
}`,

    'TSX Lengkap (TypeScript)': `// TSX penuh: interface, type alias, enum, generic, satisfies, dekorator —
// runtime JSX otomatis, jadi TIDAK perlu import React. Simpan berkas sebagai .tsx.
import {AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring} from 'remotion';

export const config = {durationInFrames: 150, fps: 30, width: 1280, height: 720};

interface Kartu {
  teks: string;
  hue: number;
  delay: number;
}

enum Arah {
  Naik = 1,
  Turun = -1,
}

type Sekumpulan = {judul: string; kata: string[]};

function buatKartu(kata: string, i: number): Kartu {
  return {teks: kata, hue: 200 + i * 26, delay: i * 6} satisfies Kartu;
}

// Generic: tipe K mengikuti argumen — hanya contoh, dihapus saat kompilasi.
function ulang<K extends string>(t: K, n: number): K[] {
  return Array.from({length: n}, () => t);
}

const OPSI: Sekumpulan = {judul: ulang('TSX', 1)[0] + ' PENUH', kata: ['TYPE', 'SAFE', 'ENUM', 'GENERIC']};

const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));

export default function AnimasiTSX() {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const kartu: Kartu[] = OPSI.kata.map(buatKartu);
  const arah: Arah = frame < 90 ? Arah.Naik : Arah.Turun;
  return (
    <AbsoluteFill style={{background: 'linear-gradient(135deg, #0b1020, #1e1b4b)', justifyContent: 'center', alignItems: 'center', fontFamily: 'system-ui'}}>
      <div style={{fontSize: 34, fontWeight: 800, color: '#a5b4fc', letterSpacing: '0.28em', marginBottom: 26}}>
        {OPSI.judul} {arah === Arah.Naik ? '▲' : '▼'}
      </div>
      <div style={{display: 'flex', gap: 18}}>
        {kartu.map((k) => {
          const s = spring({frame: frame - k.delay, fps, config: {damping: 14, stiffness: 170}});
          const y = interpolate(s, [0, 1], [60 * arah, 0]);
          return (
            <div key={k.teks} style={{
              padding: '18px 30px', borderRadius: 16, background: 'hsl(' + k.hue + ' 70% 22%)',
              border: '2px solid hsl(' + k.hue + ' 80% 55%)', color: 'hsl(' + k.hue + ' 90% 80%)',
              fontSize: 40, fontWeight: 900, opacity: clamp01(s),
              transform: 'translateY(' + y + 'px) scale(' + (0.8 + 0.2 * s) + ')'
            }}>{k.teks}</div>
          );
        })}
      </div>
      <div style={{position: 'absolute', bottom: 28, fontSize: 17, color: '#64748b', letterSpacing: '0.12em'}}>
        interface · enum · generic · satisfies · tanpa import React
      </div>
    </AbsoluteFill>
  );
}`,

    'Framer Motion + Ikon (motion.div)': `// Modul pendukung kini tersedia di sandbox: framer-motion, lucide-react, zustand, clsx, nanoid.
// Catatan ekspor: animasi time-based framer (initial/animate) hanya realtime di pratinjau —
// untuk ekspor deterministik, turunkan gaya dari useCurrentFrame (seperti contoh ini).
import {AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring} from 'remotion';
import {motion} from 'framer-motion';
import {Sparkles} from 'lucide-react';

export const config = {durationInFrames: 150, fps: 30, width: 1280, height: 720};

export default function FramerBola() {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame, fps, config: {damping: 12, stiffness: 140}});
  const y = interpolate(s, [0, 1], [-220, 0]);
  const squash = interpolate(s, [0, 0.6, 1], [1.25, 0.85, 1]);
  const spin = interpolate(frame, [0, 150], [0, 360]);
  const glow = Math.min(1, Math.max(0.2, s));
  return (
    <AbsoluteFill style={{background: 'radial-gradient(circle at 50% 120%, #1e1b4b, #020617)', justifyContent: 'center', alignItems: 'center'}}>
      <motion.div
        style={{
          width: 160, height: 160, borderRadius: '50%',
          background: 'linear-gradient(135deg, #818cf8, #22d3ee)',
          transform: 'translateY(' + y + 'px) scaleY(' + squash + ') scaleX(' + (2 - squash) + ')',
          boxShadow: '0 30px 80px rgba(99,102,241,.5)', opacity: glow,
        }}
      />
      <motion.div style={{display: 'flex', alignItems: 'center', gap: 14, marginTop: 44, opacity: s}}>
        <Sparkles size={30} color="#facc15" />
        <span style={{color: '#94a3b8', fontSize: 22, letterSpacing: '0.18em'}}>
          framer-motion + lucide di sandbox
        </span>
        <Sparkles size={30} color="#facc15" style={{transform: 'rotate(' + spin + 'deg)'}} />
      </motion.div>
    </AbsoluteFill>
  );
}`,
  },

  canvas: {
    'Galaksi Flow Field (2.500 partikel)': `// Mode Canvas: function animate(ctx, t, w, h, frame, fps)
// Pustaka FX tersedia otomatis: easing, noise, palet warna, helper.
export const config = {width: 1280, height: 720, fps: 30, duration: 5};

let parts = null, W = 0, H = 0;

export function animate(ctx, t, w, h, frame, fps) {
  if (!parts || W !== w || H !== h) {
    W = w; H = h;
    const r = FX.rand(2026);
    parts = FX.range(2500).map(() => ({
      x: r() * w, y: r() * h,
      sp: 30 + r() * 170,
      hue: 185 + r() * 105
    }));
    ctx.fillStyle = '#04060f';
    ctx.fillRect(0, 0, w, h);
  }
  FX.fade(ctx, w, h, 0.12, '#04060f');
  ctx.globalCompositeOperation = 'lighter';
  const dt = 1 / fps;
  for (const p of parts) {
    const a = FX.noise2D(p.x / 400, p.y / 400 + t * 0.25) * Math.PI * 2.2;
    p.x += Math.cos(a) * p.sp * dt;
    p.y += Math.sin(a) * p.sp * dt;
    if (p.x < -8) p.x = w + 8; else if (p.x > w + 8) p.x = -8;
    if (p.y < -8) p.y = h + 8; else if (p.y > h + 8) p.y = -8;
    ctx.fillStyle = FX.hsl(p.hue + t * 22, 88, 62, 0.55);
    ctx.fillRect(p.x, p.y, 2, 2);
  }
  ctx.globalCompositeOperation = 'source-over';
  const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.72);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,.5)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
}`,

    'Retro Synthwave Grid': `export const config = {width: 1280, height: 720, fps: 30, duration: 5};

export function animate(ctx, t, w, h) {
  const horizon = h * 0.55;
  const sky = ctx.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, '#160a33');
  sky.addColorStop(1, '#3b0f4f');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, horizon);

  const sy = horizon - 40 + Math.sin(t * 0.7) * 12;
  const g = ctx.createLinearGradient(0, sy - 180, 0, sy + 20);
  g.addColorStop(0, '#ff7eb3');
  g.addColorStop(1, '#ffcf5c');
  ctx.save();
  FX.glow(ctx, '#ff7eb3', 70);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(w / 2, sy - 60, 150, 0, FX.TAU);
  ctx.fill();
  ctx.fillStyle = '#160a33';
  for (let i = 0; i < 6; i++) {
    const yy = sy - 160 + i * 28 + ((t * 34) % 28);
    ctx.fillRect(w / 2 - 155, yy, 310, 7 + i * 2);
  }
  ctx.restore();

  ctx.fillStyle = '#12052e';
  ctx.fillRect(0, horizon, w, h - horizon);
  ctx.strokeStyle = 'rgba(255,60,172,.8)';
  ctx.lineWidth = 2;
  FX.glow(ctx, '#ff3cac', 16);
  for (let i = -14; i <= 14; i++) {
    ctx.beginPath();
    ctx.moveTo(w / 2 + i * 46, horizon);
    ctx.lineTo(w / 2 + i * 340, h);
    ctx.stroke();
  }
  for (let r = 0; r < 15; r++) {
    const p = (r / 15 + t * 0.35) % 1;
    const y = horizon + Math.pow(p, 2.2) * (h - horizon);
    ctx.globalAlpha = 0.2 + p * 0.8;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  FX.noGlow(ctx);
  ctx.fillStyle = 'rgba(0,0,0,.15)';
  for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 2);
}`,

    'Tipografi Kinetik (Glitch)': `export const config = {width: 1280, height: 720, fps: 30, duration: 5};
const TXT = 'MOTION SUITE';

export function animate(ctx, t, w, h, frame) {
  ctx.fillStyle = '#05060a';
  ctx.fillRect(0, 0, w, h);
  const intro = FX.ease.outExpo(FX.clamp(t / 0.9));
  const letters = TXT.split('');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const size = Math.min(w / (letters.length * 0.72), h * 0.32);
  ctx.font = '900 ' + size + 'px system-ui, sans-serif';
  const glitch = (t * 0.55) % 1 > 0.86;

  letters.forEach((ch, i) => {
    const inT = FX.ease.outBack(FX.clamp((t - i * 0.055) / 0.5));
    const x = w / 2 + (i - (letters.length - 1) / 2) * size * 0.66;
    const y = h / 2 + Math.sin(t * 2.2 + i * 0.7) * 16 * intro;
    const jx = glitch ? (FX.rand(i * 31 + Math.floor(frame / 2))() - 0.5) * 20 : 0;
    const sc = 0.4 + 0.6 * inT;
    if (glitch) {
      ctx.fillStyle = 'rgba(255,45,120,.85)';
      ctx.fillText(ch, x + jx - 7, y);
      ctx.fillStyle = 'rgba(8,247,254,.85)';
      ctx.fillText(ch, x + jx + 7, y);
    }
    ctx.fillStyle = 'rgba(248,250,252,' + sc + ')';
    ctx.fillText(ch, x + jx, y);
  });

  const bw = w * 0.5 * FX.ease.inOutCubic(FX.clamp((t - 0.4) / 1.5));
  FX.glow(ctx, '#08f7fe', 24);
  ctx.fillStyle = '#08f7fe';
  ctx.fillRect(w / 2 - bw / 2, h / 2 + size * 0.72, bw, 6);
  FX.noGlow(ctx);
}`,

    'Lava Metaball': `export const config = {width: 1280, height: 720, fps: 30, duration: 5};

export function animate(ctx, t, w, h) {
  ctx.fillStyle = '#070313';
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 9; i++) {
    const r = Math.min(w, h) * (0.14 + 0.09 * FX.noise2D(i * 9.7, 0.3));
    const x = w * (0.5 + 0.36 * FX.noise2D(i * 3.1 + t * 0.22, i));
    const y = h * (0.5 + 0.33 * FX.noise2D(i, t * 0.22 + 50 * i));
    const hue = (i * 36 + t * 42) % 360;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, FX.hsl(hue, 95, 62, 0.85));
    g.addColorStop(0.55, FX.hsl(hue + 24, 95, 50, 0.32));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, FX.TAU);
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
  const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.32, w / 2, h / 2, Math.max(w, h) * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,.6)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
}`,

    'Starfield Warp': `export const config = {width: 1280, height: 720, fps: 30, duration: 5};

let stars = null;

export function animate(ctx, t, w, h, frame, fps) {
  if (!stars) {
    const r = FX.rand(42);
    stars = FX.range(900).map(() => ({
      a: r() * FX.TAU,
      d: 0.05 + r() * 0.95,
      s: 1 + r() * 2.6,
      hue: 200 + r() * 70
    }));
  }
  ctx.fillStyle = '#010208';
  ctx.fillRect(0, 0, w, h);
  const cycle = (Math.sin((t * FX.TAU) / 5 - Math.PI / 2) + 1) / 2;
  const sp = 0.15 + 2.4 * FX.ease.inOutSine(cycle);
  const cx = w / 2, cy = h / 2, R = Math.hypot(w, h) / 2;
  const dt = 1 / fps;
  ctx.globalCompositeOperation = 'lighter';
  for (const s of stars) {
    const d0 = s.d;
    s.d = d0 + sp * dt * 0.55;
    if (s.d > 1.05) s.d = 0.04;
    const r0 = Math.pow(d0, 2.4) * R;
    const r1 = Math.pow(s.d, 2.4) * R;
    ctx.strokeStyle = FX.hsl(s.hue, 85, 74, Math.min(1, s.d * 2.2));
    ctx.lineWidth = s.s * s.d * 1.8;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(s.a) * r0, cy + Math.sin(s.a) * r0);
    ctx.lineTo(cx + Math.cos(s.a) * r1, cy + Math.sin(s.a) * r1);
    ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';
  FX.circle(ctx, cx, cy, 3 + 3 * cycle, '#dbeafe');
}`,
  },

  html: {
    'Loader CSS Murni': `<style>
  body { margin: 0; height: 100vh; display: grid; place-items: center; background: radial-gradient(circle at 50% 45%, #1e293b, #020617 72%); overflow: hidden; }
  .wrap { position: relative; display: grid; place-items: center; }
  .ring { width: 120px; height: 120px; border-radius: 50%; border: 10px solid rgba(148,163,184,.15); border-top-color: #22d3ee; animation: spin 1.6s cubic-bezier(.6,.15,.4,.85) infinite; }
  .ring.inner { position: absolute; width: 74px; height: 74px; border-width: 8px; border-top-color: #a78bfa; animation-direction: reverse; animation-duration: 1.1s; }
  .pulse { position: absolute; width: 160px; height: 160px; border-radius: 50%; border: 2px solid rgba(34,211,238,.4); animation: pulse 2s ease-out infinite; }
  .label { position: absolute; bottom: -84px; color: #94a3b8; font: 600 15px system-ui; letter-spacing: .35em; animation: breathe 2s ease-in-out infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pulse { 0% { transform: scale(.6); opacity: .9; } 100% { transform: scale(1.55); opacity: 0; } }
  @keyframes breathe { 0%, 100% { opacity: .45; } 50% { opacity: 1; } }
</style>
<div class="wrap">
  <div class="pulse"></div>
  <div class="ring"></div>
  <div class="ring inner"></div>
  <div class="label">MEMUAT</div>
</div>`,

    'Jam Analog SVG (JS)': `<style>
  body { margin: 0; height: 100vh; display: grid; place-items: center; background: #0b1020; }
  svg { filter: drop-shadow(0 14px 44px rgba(56,189,248,.28)); }
</style>
<svg id="c" width="420" height="420" viewBox="-210 -210 420 420">
  <circle r="202" fill="#0f172a" stroke="#1e293b" stroke-width="10"/>
  <g id="ticks"></g>
  <line id="hr" x1="0" y1="14" x2="0" y2="-100" stroke="#e2e8f0" stroke-width="10" stroke-linecap="round"/>
  <line id="mn" x1="0" y1="18" x2="0" y2="-150" stroke="#94a3b8" stroke-width="6" stroke-linecap="round"/>
  <line id="sc" x1="0" y1="30" x2="0" y2="-172" stroke="#22d3ee" stroke-width="3" stroke-linecap="round"/>
  <circle r="10" fill="#22d3ee"/>
</svg>
<script>
  var NS = 'http://www.w3.org/2000/svg';
  var ticks = document.getElementById('ticks');
  for (var i = 0; i < 60; i++) {
    var a = (i / 60) * Math.PI * 2;
    var big = i % 5 === 0;
    var l1 = big ? 176 : 186;
    var ln = document.createElementNS(NS, 'line');
    ln.setAttribute('x1', Math.sin(a) * l1);
    ln.setAttribute('y1', -Math.cos(a) * l1);
    ln.setAttribute('x2', Math.sin(a) * 194);
    ln.setAttribute('y2', -Math.cos(a) * 194);
    ln.setAttribute('stroke', big ? '#94a3b8' : '#334155');
    ln.setAttribute('stroke-width', big ? 4 : 2);
    ticks.appendChild(ln);
  }
  function loop(ms) {
    var s = ms / 1000;
    document.getElementById('sc').setAttribute('transform', 'rotate(' + ((s % 60) * 6) + ')');
    document.getElementById('mn').setAttribute('transform', 'rotate(' + (((s / 60) % 60) * 6) + ')');
    document.getElementById('hr').setAttribute('transform', 'rotate(' + (((s / 3600) % 12) * 30) + ')');
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
</script>`,

    'Banner Partikel CSS': `<style>
  body { margin: 0; height: 100vh; overflow: hidden; background: linear-gradient(120deg, #020617, #1e1b4b); font-family: system-ui; }
  h1 { position: fixed; left: 50%; top: 50%; transform: translate(-50%, -50%); font-size: 64px; font-weight: 900; color: #f8fafc; letter-spacing: -.02em; margin: 0; text-shadow: 0 8px 44px rgba(129,140,248,.55); z-index: 2; }
  .p { position: fixed; bottom: -30px; border-radius: 50%; opacity: .8; animation: rise linear infinite; box-shadow: 0 0 14px currentColor; }
  @keyframes rise {
    0% { transform: translateY(0) scale(1); opacity: 0; }
    12% { opacity: .85; }
    100% { transform: translateY(calc(-100vh - 60px)) scale(.35); opacity: 0; }
  }
</style>
<h1>BATCH READY</h1>
<script>
  var colors = ['#818cf8', '#22d3ee', '#f472b6', '#fbbf24'];
  // hash deterministik — hasil ekspor selalu sama dengan pratinjau
  function r(n) { var x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  for (var i = 0; i < 52; i++) {
    var d = document.createElement('div');
    d.className = 'p';
    var size = 5 + r(i) * 13;
    d.style.left = r(i + 100) * 100 + 'vw';
    d.style.width = d.style.height = size + 'px';
    d.style.color = colors[i % colors.length];
    d.style.background = colors[i % colors.length];
    d.style.animationDuration = 2.6 + r(i + 200) * 3 + 's';
    d.style.animationDelay = -r(i + 300) * 5 + 's';
    document.body.appendChild(d);
  }
</script>`,

    'Donut SVG + JS': `<style>
  body { margin: 0; height: 100vh; display: grid; place-items: center; background: #020617; font-family: system-ui; }
  .card { text-align: center; color: #e2e8f0; }
  .card b { font-size: 52px; display: block; margin-top: 20px; font-weight: 800; font-variant-numeric: tabular-nums; }
</style>
<div class="card">
  <svg width="240" height="240" viewBox="0 0 240 240">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#22d3ee"/><stop offset="1" stop-color="#a78bfa"/>
      </linearGradient>
    </defs>
    <circle cx="120" cy="120" r="100" fill="none" stroke="#1e293b" stroke-width="18"/>
    <circle id="arc" cx="120" cy="120" r="100" fill="none" stroke="url(#g)" stroke-width="18"
      stroke-linecap="round" stroke-dasharray="628.3" stroke-dashoffset="628.3" transform="rotate(-90 120 120)"/>
  </svg>
  <b id="pct">0%</b>
</div>
<script>
  var C = 2 * Math.PI * 100;
  function loop(ms) {
    var p = Math.min(1, ms / 4000);
    var e = 1 - Math.pow(1 - p, 3);
    document.getElementById('arc').style.strokeDashoffset = C * (1 - e);
    document.getElementById('pct').textContent = Math.round(e * 100) + '%';
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
</script>`,
  },
};

export const DEFAULT_CODE = {
  remotion: TEMPLATES.remotion['Judul Kinetic (Spring)'],
  canvas: TEMPLATES.canvas['Galaksi Flow Field (2.500 partikel)'],
  html: TEMPLATES.html['Loader CSS Murni'],
};