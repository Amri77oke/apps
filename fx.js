export const TAU = Math.PI * 2;

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const map = (v, a, b, c, d, cl = true) => {
  let t = (v - a) / (b - a || 1e-9);
  if (cl) t = clamp(t);
  return c + (d - c) * t;
};
export const smoothstep = (t) => {
  t = clamp(t);
  return t * t * (3 - 2 * t);
};

export const ease = {
  linear: (t) => t,
  inQuad: (t) => t * t,
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  inCubic: (t) => t * t * t,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  inQuart: (t) => Math.pow(t, 4),
  outQuart: (t) => 1 - Math.pow(1 - t, 4),
  inOutQuart: (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2),
  inQuint: (t) => Math.pow(t, 5),
  outQuint: (t) => 1 - Math.pow(1 - t, 5),
  inOutQuint: (t) => (t < 0.5 ? 16 * Math.pow(t, 5) : 1 - Math.pow(-2 * t + 2, 5) / 2),
  inSine: (t) => 1 - Math.cos((t * Math.PI) / 2),
  outSine: (t) => Math.sin((t * Math.PI) / 2),
  inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  inExpo: (t) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
  outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inOutExpo: (t) => (t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2),
  inCirc: (t) => 1 - Math.sqrt(1 - Math.pow(t, 2)),
  outCirc: (t) => Math.sqrt(1 - Math.pow(t - 1, 2)),
  inOutCirc: (t) => (t < 0.5 ? (1 - Math.sqrt(1 - Math.pow(2 * t, 2))) / 2 : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2),
  inBack: (t) => 2.70158 * t * t * t - 1.70158 * t * t,
  outBack: (t) => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2),
  inOutBack: (t) => {
    const c = 2.5949095;
    return t < 0.5
      ? (Math.pow(2 * t, 2) * ((c + 1) * 2 * t - c)) / 2
      : (Math.pow(2 * t - 2, 2) * ((c + 1) * (t * 2 - 2) + c) + 2) / 2;
  },
  inElastic: (t) => (t === 0 ? 0 : t === 1 ? 1 : -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * ((2 * Math.PI) / 3))),
  outElastic: (t) => (t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1),
  inOutElastic: (t) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    const c = (2 * Math.PI) / 3;
    return t < 0.5
      ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * c)) / 2
      : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c)) / 2 + 1;
  },
  inBounce: (t) => 1 - outBounce(1 - t),
  outBounce,
  inOutBounce: (t) => (t < 0.5 ? (1 - outBounce(1 - 2 * t)) / 2 : (1 + outBounce(2 * t - 1)) / 2),
};

function outBounce(t) {
  const n1 = 7.5625, d1 = 2.75;
  if (t < 1 / d1) return n1 * t * t;
  if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
  if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
  return n1 * (t -= 2.625 / d1) * t + 0.984375;
}

export function makeRandom(seed = 1) {
  let s = seed >>> 0 || 1;
  return function () {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const rand = (seed) => {
  const r = makeRandom(seed);
  const fn = () => r();
  fn.range = (a, b) => a + r() * (b - a);
  fn.int = (a, b) => Math.floor(a + r() * (b - a + 1));
  fn.pick = (arr) => arr[Math.floor(r() * arr.length)];
  fn.sign = () => (r() < 0.5 ? -1 : 1);
  return fn;
};

const GRAD3 = [
  1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1,
];

function buildPerm(seed) {
  const r = makeRandom(seed);
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    const t = p[i];
    p[i] = p[j];
    p[j] = t;
  }
  const perm = new Uint8Array(512);
  const permMod12 = new Uint8Array(512);
  for (let i = 0; i < 512; i++) {
    perm[i] = p[i & 255];
    permMod12[i] = perm[i] % 12;
  }
  return {perm, permMod12};
}

export function makeNoise2D(seed = 1337) {
  const {perm, permMod12} = buildPerm(seed);
  const F2 = 0.5 * (Math.sqrt(3) - 1);
  const G2 = (3 - Math.sqrt(3)) / 6;
  return function noise2D(xin, yin) {
    let n0 = 0, n1 = 0, n2 = 0;
    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const t = (i + j) * G2;
    const x0 = xin - (i - t);
    const y0 = yin - (j - t);
    const i1 = x0 > y0 ? 1 : 0;
    const j1 = x0 > y0 ? 0 : 1;
    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2;
    const y2 = y0 - 1 + 2 * G2;
    const ii = i & 255;
    const jj = j & 255;
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 > 0) {
      const gi = permMod12[ii + perm[jj]] * 3;
      t0 *= t0;
      n0 = t0 * t0 * (GRAD3[gi] * x0 + GRAD3[gi + 1] * y0);
    }
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 > 0) {
      const gi = permMod12[ii + i1 + perm[jj + j1]] * 3;
      t1 *= t1;
      n1 = t1 * t1 * (GRAD3[gi] * x1 + GRAD3[gi + 1] * y1);
    }
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 > 0) {
      const gi = permMod12[ii + 1 + perm[jj + 1]] * 3;
      t2 *= t2;
      n2 = t2 * t2 * (GRAD3[gi] * x2 + GRAD3[gi + 1] * y2);
    }
    return 70 * (n0 + n1 + n2);
  };
}

export function makeNoise3D(seed = 1337) {
  const {perm, permMod12} = buildPerm(seed);
  const F3 = 1 / 3;
  const G3 = 1 / 6;
  return function noise3D(xin, yin, zin) {
    let n0 = 0, n1 = 0, n2 = 0, n3 = 0;
    const s = (xin + yin + zin) * F3;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const k = Math.floor(zin + s);
    const t = (i + j + k) * G3;
    const x0 = xin - (i - t);
    const y0 = yin - (j - t);
    const z0 = zin - (k - t);
    let i1, j1, k1, i2, j2, k2;
    if (x0 >= y0) {
      if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
      else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; }
      else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; }
    } else {
      if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; }
      else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; }
      else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
    }
    const x1 = x0 - i1 + G3, y1 = y0 - j1 + G3, z1 = z0 - k1 + G3;
    const x2 = x0 - i2 + 2 * G3, y2 = y0 - j2 + 2 * G3, z2 = z0 - k2 + 2 * G3;
    const x3 = x0 - 1 + 3 * G3, y3 = y0 - 1 + 3 * G3, z3 = z0 - 1 + 3 * G3;
    const ii = i & 255, jj = j & 255, kk = k & 255;
    let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
    if (t0 > 0) {
      const gi = permMod12[ii + perm[jj + perm[kk]]] * 3;
      t0 *= t0;
      n0 = t0 * t0 * (GRAD3[gi] * x0 + GRAD3[gi + 1] * y0 + GRAD3[gi + 2] * z0);
    }
    let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
    if (t1 > 0) {
      const gi = permMod12[ii + i1 + perm[jj + j1 + perm[kk + k1]]] * 3;
      t1 *= t1;
      n1 = t1 * t1 * (GRAD3[gi] * x1 + GRAD3[gi + 1] * y1 + GRAD3[gi + 2] * z1);
    }
    let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
    if (t2 > 0) {
      const gi = permMod12[ii + i2 + perm[jj + j2 + perm[kk + k2]]] * 3;
      t2 *= t2;
      n2 = t2 * t2 * (GRAD3[gi] * x2 + GRAD3[gi + 1] * y2 + GRAD3[gi + 2] * z2);
    }
    let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
    if (t3 > 0) {
      const gi = permMod12[ii + 1 + perm[jj + 1 + perm[kk + 1]]] * 3;
      t3 *= t3;
      n3 = t3 * t3 * (GRAD3[gi] * x3 + GRAD3[gi + 1] * y3 + GRAD3[gi + 2] * z3);
    }
    return 32 * (n0 + n1 + n2 + n3);
  };
}

const noise2D = makeNoise2D(1337);
const noise3D = makeNoise3D(1337);

export const fbm2D = (x, y, oct = 4, lac = 2, gain = 0.5) => {
  let a = 1, f = 1, sum = 0, norm = 0;
  for (let o = 0; o < oct; o++) {
    sum += a * noise2D(x * f, y * f);
    norm += a;
    a *= gain;
    f *= lac;
  }
  return sum / norm;
};

export const hsl = (h, s, l, a = 1) =>
  'hsla(' + (((h % 360) + 360) % 360).toFixed(1) + ',' + clamp(s, 0, 100) + '%,' + clamp(l, 0, 100) + '%,' + clamp(a, 0, 1) + ')';

export function hexToRgb(hex) {
  let h = String(hex).replace('#', '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export const lerpColor = (a, b, t) => {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return 'rgb(' + Math.round(lerp(A[0], B[0], t)) + ',' + Math.round(lerp(A[1], B[1], t)) + ',' + Math.round(lerp(A[2], B[2], t)) + ')';
};

export const PALETTES = {
  neon: ['#ff2d78', '#08f7fe', '#f5d300', '#7c3aed', '#22c55e'],
  sunset: ['#ff5e62', '#ff9966', '#ffd86f', '#fc4a1a', '#f76b1c'],
  ocean: ['#0cd7d7', '#2b6cff', '#7c4dff', '#00e5a0', '#9ff7ff'],
  candy: ['#ff8fab', '#ffb3c6', '#fb6f92', '#ffc2d1', '#c9184a'],
  fire: ['#ffd166', '#ef476f', '#f78c6b', '#e63946', '#ff9f1c'],
  forest: ['#95d5b2', '#52b788', '#2d6a4f', '#b7e4c7', '#40916c'],
  mono: ['#ffffff', '#b0b8c4', '#6c7a89', '#3c4650', '#141a21'],
};

export const pal = (name) => PALETTES[name] || PALETTES.neon;

export const fade = (ctx, w, h, alpha = 0.08, color = '#000') => {
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = color;
  ctx.globalAlpha = clamp(alpha);
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
};

export const glow = (ctx, color, blur = 20) => {
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
};

export const noGlow = (ctx) => {
  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';
};

export const circle = (ctx, x, y, r, color) => {
  if (color) ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
};

export const ring = (ctx, x, y, r, width = 2, color) => {
  if (color) ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.stroke();
};

export const poly = (ctx, pts, close = true) => {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
  if (close) ctx.closePath();
};

export const line = (ctx, x1, y1, x2, y2) => {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
};

export const wave = (t, opts = {}) => {
  const amp = opts.amp ?? 1;
  const freq = opts.freq ?? 1;
  const phase = opts.phase ?? 0;
  const x = t * freq + phase;
  if (opts.type === 'tri') return amp * (2 * Math.abs(2 * (x - Math.floor(x + 0.5))) - 1);
  if (opts.type === 'saw') return amp * (2 * (x - Math.floor(x + 0.5)));
  if (opts.type === 'square') return amp * (x - Math.floor(x) < 0.5 ? 1 : -1);
  return amp * Math.sin(x * TAU);
};

export const range = (n) => Array.from({length: n}, (_, i) => i);

export const gridPos = (i, cols, rows, w, h) => ({
  x: (((i % cols) + 0.5) * w) / cols,
  y: ((Math.floor(i / cols) % Math.max(1, rows)) + 0.5) * h / Math.max(1, rows),
});

export const FX = {
  TAU, clamp, lerp, map, smoothstep, ease, rand, noise2D, noise3D, makeNoise2D, makeNoise3D,
  fbm2D, hsl, hexToRgb, lerpColor, PALETTES, pal, fade, glow, noGlow, circle, ring, poly, line,
  wave, range, gridPos,
};

export default FX;