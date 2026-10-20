export const RSW_CONTROLLER = `(function(){
'use strict';
var MODE = 'LIVE';
var S = window.__RSW = { t: 0, playing: true, dur: 0, loop: true, mode: MODE, raf: [], timers: [], seq: 1 };
var realRAF = window.requestAnimationFrame
  ? window.requestAnimationFrame.bind(window)
  : function (f) { return setTimeout(function () { f(Date.now()); }, 16); };
var realNow = window.performance && performance.now
  ? function () { return performance.now.call(performance); }
  : function () { return Date.now(); };
var lastReal = realNow();
performance.now = function () { return S.t; };
Date.now = function () { return S.t; };
var __rs = 17654321;
Math.random = function () {
  __rs |= 0;
  __rs = (__rs + 0x6d2b79f5) | 0;
  var t = Math.imul(__rs ^ (__rs >>> 15), 1 | __rs);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
window.requestAnimationFrame = function (cb) { S.raf.push(cb); return S.raf.length; };
window.cancelAnimationFrame = function () {};
window.setTimeout = function (fn, ms) {
  var id = S.seq++;
  var a = Array.prototype.slice.call(arguments, 2);
  S.timers.push({ id: id, at: S.t + (ms || 0), fn: fn, a: a, int: 0 });
  return id;
};
window.clearTimeout = function (id) {
  for (var i = S.timers.length - 1; i >= 0; i--) if (S.timers[i].id === id) S.timers.splice(i, 1);
};
window.setInterval = function (fn, ms) {
  var id = S.seq++;
  var a = Array.prototype.slice.call(arguments, 2);
  S.timers.push({ id: id, at: S.t + (ms || 1), fn: fn, a: a, int: ms || 1 });
  return id;
};
window.clearInterval = window.clearTimeout;
function syncAnims() {
  if (!document.getAnimations) return;
  var l = document.getAnimations({ subtree: true });
  for (var i = 0; i < l.length; i++) {
    try { l[i].pause(); l[i].currentTime = S.t; } catch (e) {}
  }
}
function runTimers() {
  var fired = [];
  S.timers = S.timers.filter(function (x) {
    if (x.at <= S.t) {
      fired.push(x);
      if (x.int > 0) { x.at = S.t + x.int; return true; }
      return false;
    }
    return true;
  });
  for (var i = 0; i < fired.length; i++) {
    try { fired[i].fn.apply(null, fired[i].a); } catch (e) { console.error(e); }
  }
}
function pass() {
  var list = S.raf;
  S.raf = [];
  for (var i = 0; i < list.length; i++) {
    try { list[i](S.t); } catch (e) { console.error(e); }
  }
}
function advanceTo(target) {
  var guard = 0;
  while (guard++ < 100000) {
    var nextT = Infinity;
    for (var i = 0; i < S.timers.length; i++) if (S.timers[i].at < nextT) nextT = S.timers[i].at;
    if (nextT >= target) break;
    S.t = nextT;
    runTimers();
  }
  S.t = target;
  runTimers();
}
function loop() {
  if (!S.playing) return;
  realRAF(function (now) {
    if (!S.playing) return;
    var dt = Math.min(100, now - lastReal);
    lastReal = now;
    advanceTo(S.t + dt);
    pass();
    syncAnims();
    if (S.dur > 0 && S.t >= S.dur * 1000) {
      if (S.loop) { S.t = 0; syncAnims(); }
      else { S.playing = false; return; }
    }
    loop();
  });
}
window.__rsw = {
  play: function () { if (!S.playing) { S.playing = true; lastReal = realNow(); loop(); } },
  pause: function () { S.playing = false; },
  seek: function (ms) { S.t = Math.max(0, ms); advanceTo(S.t); pass(); syncAnims(); },
  step: function (ms) { advanceTo(S.t + ms); pass(); syncAnims(); },
  time: function () { return S.t; },
  state: function () { return { t: S.t, playing: S.playing }; },
  setDur: function (d) { S.dur = d; },
  setLoop: function (b) { S.loop = !!b; }
};
var POST_TARGET = (function () {
  try { var o = location && location.origin; return o && o !== 'null' ? o : '*'; } catch (e) { return '*'; }
})();
function postToParent(msg) {
  try { parent.postMessage(msg, POST_TARGET); } catch (e) {
    try { parent.postMessage(msg, '*'); } catch (x) {}
  }
}
window.addEventListener('error', function (e) {
  postToParent({ rsw: 'error', message: String((e && e.message) || e) });
});
window.addEventListener('unhandledrejection', function (e) {
  postToParent({ rsw: 'error', message: String((e && e.reason && e.reason.message) || e.reason) });
});
if (MODE === 'SEEK') S.playing = false;
else loop();
})();`;

export const RSW_UI = `(function(){
if (!window.__rsw) return;
var b = document.createElement('div');
b.style.cssText = 'position:fixed;bottom:14px;right:14px;display:flex;gap:6px;z-index:2147483647';
var st = 'padding:8px 14px;border-radius:10px;border:0;background:rgba(15,23,42,.88);color:#fff;font:600 13px system-ui,sans-serif;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,.35)';
function mk(l, f) { var s = document.createElement('button'); s.textContent = l; s.style.cssText = st; s.onclick = f; b.appendChild(s); }
mk('▶', function () { window.__rsw.play(); });
mk('⏸', function () { window.__rsw.pause(); });
mk('↺', function () { window.__rsw.seek(0); });
document.body.appendChild(b);
})();`;

export function controllerTag(mode) {
  const m = mode === 'SEEK' ? 'SEEK' : 'LIVE';
  return '<' + 'script>' + RSW_CONTROLLER.replace("'LIVE'", "'" + m + "'") + '<' + '/script>';
}

export function buildDoc(code, mode) {
  const hasHtml = /<html[\s>]/i.test(code);
  let doc = hasHtml
    ? code
    : '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body>' + code + '</body></html>';
  const tag = controllerTag(mode);
  if (/<head[^>]*>/i.test(doc)) doc = doc.replace(/<head[^>]*>/i, (m) => m + tag);
  else if (/<html[^>]*>/i.test(doc)) doc = doc.replace(/<html[^>]*>/i, (m) => m + tag);
  else doc = tag + doc;
  return doc;
}

export function buildStandalone(code) {
  const ui = '<' + 'script>' + RSW_UI + '<' + '/script>';
  const doc = buildDoc(code, 'LIVE');
  return doc.includes('</body>') ? doc.replace(/<\/body>/i, ui + '</body>') : doc + ui;
}

const imgCache = new Map();
const textCache = new Map();

function blobToDataURL(blob) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = () => rej(r.error);
    r.readAsDataURL(blob);
  });
}

export async function fetchDataURL(url) {
  if (imgCache.has(url)) return imgCache.get(url);
  let du = null;
  try {
    const resp = await fetch(url, {mode: 'cors', credentials: 'omit'});
    if (resp.ok) du = await blobToDataURL(await resp.blob());
  } catch (e) {
    du = null;
  }
  imgCache.set(url, du);
  return du;
}

async function fetchStylesheetText(url) {
  if (textCache.has(url)) return textCache.get(url);
  let css = null;
  try {
    const resp = await fetch(url, {mode: 'cors', credentials: 'omit'});
    if (resp.ok) css = await resp.text();
  } catch (e) {
    css = null;
  }
  textCache.set(url, css);
  return css;
}

const IMPORT_RE = /@import\s+(?:url\(\s*(['"]?)([^'")]+?)\1\s*\)|(['"])([^'"]+?)\3)\s*([^;{]*);?/gi;
const CSS_URL_RE = /url\(\s*(['"]?)([^'")]+?)\1\s*\)/g;

async function bakeCssUrls(css, base) {
  if (!css || css.indexOf('url(') < 0) return css;
  CSS_URL_RE.lastIndex = 0;
  const found = [];
  let m;
  while ((m = CSS_URL_RE.exec(css))) {
    const raw = (m[2] || '').trim();
    if (!raw || raw.startsWith('data:') || raw.startsWith('#')) continue;
    let abs = raw;
    try {
      abs = new URL(raw, base).href;
    } catch (e) {
      continue;
    }
    if (!found.some((f) => f.abs === abs)) found.push({abs, match: m[0]});
  }
  if (!found.length) return css;
  for (const f of found) f.du = await fetchDataURL(f.abs);
  let out = css;
  for (const f of found) {
    if (f.du) out = out.split(f.match).join('url("' + f.du + '")');
  }
  return out;
}

export async function inlineExternalStyles(win) {
  const doc = win.document;
  const base = doc.baseURI || location.href;
  // 1) Inline @import di dalam <style> yang ada (SVG image tidak bisa memuat resource eksternal).
  for (const st of Array.from(doc.querySelectorAll('style'))) {
    if (!st.textContent || st.textContent.indexOf('@import') < 0) continue;
    const inlined = await inlineImports(st.textContent, base, 0);
    st.textContent = inlined;
  }
  // 2) Ganti setiap <link rel="stylesheet"> dengan <style> berisi CSS + aset data-URL.
  const links = Array.from(doc.querySelectorAll('link[rel="stylesheet" i][href]'));
  let failed = 0;
  for (const link of links) {
    const href = link.getAttribute('href');
    let abs = href;
    try {
      abs = new URL(href, base).href;
    } catch (e) {}
    const css = await fetchStylesheetText(abs);
    if (!css) {
      failed++;
      continue;
    }
    const baked = await inlineImports(css, abs, 1);
    const st = doc.createElement('style');
    if (link.getAttribute('media')) st.setAttribute('media', link.getAttribute('media'));
    st.textContent = baked;
    link.parentNode.insertBefore(st, link);
    link.remove();
  }
  // 3) Bake url() di semua <style> (font & gambar) agar ikut terekspor.
  for (const st of Array.from(doc.querySelectorAll('style'))) {
    if (!st.textContent || st.textContent.indexOf('url(') < 0) continue;
    st.textContent = await bakeCssUrls(st.textContent, base);
  }
  return failed;
}

async function inlineImports(css, base, depth) {
  if (!css || depth > 3 || css.indexOf('@import') < 0) return css;
  const matches = [];
  IMPORT_RE.lastIndex = 0;
  let m;
  while ((m = IMPORT_RE.exec(css))) {
    const url = m[2] || m[4];
    if (!url) continue;
    let abs = url;
    try {
      abs = new URL(url, base).href;
    } catch (e) {
      continue;
    }
    matches.push({full: m[0], abs, media: m[5] || ''});
  }
  if (!matches.length) return css;
  let out = css;
  for (const {full, abs, media} of matches) {
    const nested = await fetchStylesheetText(abs);
    let replacement = '';
    if (nested) {
      replacement = await inlineImports(nested, abs, depth + 1);
      const wrap = media && !/layer|supports/i.test(media) ? media.trim() : '';
      if (wrap) replacement = '@media ' + wrap + '{' + replacement + '}';
    }
    out = out.split(full).join(replacement);
  }
  return out;
}

const splitList = (s) => {
  const out = [];
  let depth = 0;
  let cur = '';
  for (const ch of s || '') {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    else if (ch === ',' && depth === 0) {
      out.push(cur.trim());
      cur = '';
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out.length ? out : ['0s'];
};

const parseSec = (s) => {
  const v = parseFloat(s);
  if (!isFinite(v)) return 0;
  return String(s).trim().endsWith('ms') ? v / 1000 : v;
};

const hyphen = (p) => (p.startsWith('--') ? p : p.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase()));

async function inlineImages(doc, clone) {
  const src = Array.from(doc.querySelectorAll('img, image'));
  const dst = Array.from(clone.querySelectorAll('img, image'));
  for (let i = 0; i < src.length; i++) {
    const el = src[i];
    const ce = dst[i];
    if (!ce) continue;
    const raw = el.getAttribute('src') || el.getAttribute('href') || el.getAttribute('xlink:href') || '';
    if (!raw || raw.startsWith('data:')) continue;
    let abs = raw;
    try {
      abs = new URL(raw, doc.baseURI || location.href).href;
    } catch (e) {}
    const du = await fetchDataURL(abs);
    if (!du) continue;
    if (ce.tagName.toLowerCase() === 'img') {
      ce.removeAttribute('srcset');
      ce.removeAttribute('sizes');
      ce.setAttribute('src', du);
    }
    ce.setAttribute('href', du);
    ce.removeAttribute('xlink:href');
  }
}

const URL_RE = /url\((['"]?)([^'")]+)\1\)/g;

export async function collectBackgrounds(doc) {
  const out = [];
  // doc.querySelectorAll('*') sudah mencakup <html>; clone (elemen) tidak — urutan harus sejajar.
  const els = Array.from(doc.querySelectorAll('*'));
  const dv = doc.defaultView;
  for (let i = 0; i < els.length; i++) {
    let bi = '';
    try {
      bi = dv.getComputedStyle(els[i]).backgroundImage;
    } catch (e) {
      continue;
    }
    if (!bi || bi === 'none' || !bi.includes('url(')) continue;
    const resolved = {};
    URL_RE.lastIndex = 0;
    let m;
    while ((m = URL_RE.exec(bi))) {
      const u = m[2];
      if (!u || u.startsWith('data:')) continue;
      if (!(u in resolved)) resolved[u] = await fetchDataURL(u);
    }
    out.push({i, css: bi, resolved});
  }
  return out;
}

function applyBakedBackgrounds(clone, baked) {
  if (!baked || !baked.length) return;
  const cEls = [clone, ...clone.querySelectorAll('*')];
  for (const b of baked) {
    const el = cEls[b.i];
    if (!el) continue;
    let css = b.css;
    for (const [u, du] of Object.entries(b.resolved)) if (du) css = css.split(u).join(du);
    el.style.backgroundImage = css;
  }
}

function freeze(doc, clone, tMs) {
  const dv = doc.defaultView;
  // doc.querySelectorAll('*') sudah mencakup <html>, sedangkan clone.querySelectorAll('*')
  // tidak mencakup clone itu sendiri. Jangan tambahkan documentElement lagi — itu menggeser
  // indeks satu posisi dan membuat animasi/background jatuh ke elemen berikutnya.
  const oEls = Array.from(doc.querySelectorAll('*'));
  const cEls = [clone, ...clone.querySelectorAll('*')];
  const idx = new Map();
  oEls.forEach((el, i) => idx.set(el, i));
  for (let i = 0; i < oEls.length; i++) {
    let cs;
    try {
      cs = dv.getComputedStyle(oEls[i]);
    } catch (e) {
      continue;
    }
    const ce = cEls[i];
    if (!ce) continue;
    if (cs.animationName !== 'none') ce.style.animation = 'none';
    if (cs.transitionProperty !== 'none') ce.style.transition = 'none';
  }
  const t = tMs / 1000;
  let anims = [];
  try {
    anims = doc.getAnimations({subtree: true});
  } catch (e) {}
  // Kumpulkan SEMUA animasi per elemen agar elemen dengan beberapa animasi
  // tetap dirender benar (bukan hanya animasi terakhir).
  const byTarget = new Map();
  for (const a of anims) {
    const target = a.effect && a.effect.target;
    if (!target) continue;
    if (!byTarget.has(target)) byTarget.set(target, []);
    byTarget.get(target).push(a);
  }
  for (const [target, list] of byTarget) {
    const ce = cEls[idx.get(target)];
    if (!ce) continue;
    const cs = dv.getComputedStyle(target);
    const cssAnims = list.filter((a) => typeof a.animationName === 'string');
    if (cssAnims.length) {
      const names = splitList(cs.animationName);
      const durs = splitList(cs.animationDuration);
      const dels = splitList(cs.animationDelay);
      const tfs = splitList(cs.animationTimingFunction);
      const iters = splitList(cs.animationIterationCount);
      const dirs = splitList(cs.animationDirection);
      const fills = splitList(cs.animationFillMode);
      const pick = (arr, name) => {
        const k = Math.max(0, names.indexOf(name));
        return arr[Math.min(k, arr.length - 1)];
      };
      const st = ce.style;
      st.animationName = cssAnims.map((a) => a.animationName).join(', ');
      st.animationDuration = cssAnims.map((a) => pick(durs, a.animationName)).join(', ');
      st.animationDelay = cssAnims.map((a) => parseSec(pick(dels, a.animationName)) - t + 's').join(', ');
      st.animationTimingFunction = cssAnims.map((a) => pick(tfs, a.animationName)).join(', ');
      st.animationIterationCount = cssAnims.map((a) => pick(iters, a.animationName)).join(', ');
      st.animationDirection = cssAnims.map((a) => pick(dirs, a.animationName)).join(', ');
      st.animationFillMode = cssAnims.map((a) => pick(fills, a.animationName)).join(', ');
      st.animationPlayState = 'paused';
    }
    for (const a of list) {
      if (typeof a.animationName === 'string') continue;
      const props = new Set();
      try {
        for (const kf of a.effect.getKeyframes()) {
          for (const p of Object.keys(kf)) {
            if (p !== 'offset' && p !== 'composite' && p !== 'easing') props.add(p);
          }
        }
      } catch (e) {}
      if (!props.size && typeof a.transitionProperty === 'string') props.add(a.transitionProperty);
      for (const p of props) {
        try {
          ce.style.setProperty(hyphen(p), cs.getPropertyValue(hyphen(p)));
        } catch (e) {}
      }
    }
  }
  return clone;
}

export async function snapshotToCanvas(win, cnv, cache) {
  const doc = win.document;
  const clone = doc.documentElement.cloneNode(true);
  // PENTING: jangan hapus elemen dari clone sebelum freeze/applyBakedBackgrounds —
  // freeze memetakan elemen doc → clone lewat indeks; menghapus node menggeser indeks
  // dan membuat cEls[i] undefined ("can't access property style, a[m] is undefined").
  const tMs = win.__RSW ? win.__RSW.t : 0;
  freeze(doc, clone, tMs);
  await inlineImages(doc, clone);
  if (cache && cache.baked) applyBakedBackgrounds(clone, cache.baked);
  // Baru setelah pemetaan selesai: buang script & stylesheet eksternal dari snapshot.
  clone.querySelectorAll('script').forEach((s) => s.remove());
  clone.querySelectorAll('link[rel="stylesheet" i]').forEach((s) => s.remove());
  const xml = new XMLSerializer().serializeToString(clone);
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + cnv.width + '" height="' + cnv.height + '">' +
    '<foreignObject width="100%" height="100%">' + xml + '</foreignObject></svg>';
  const ctx = cnv.getContext('2d');
  if (cache && cache.svg === svg && cache.img) {
    ctx.drawImage(cache.img, 0, 0, cnv.width, cnv.height);
    return;
  }
  const url = URL.createObjectURL(new Blob([svg], {type: 'image/svg+xml;charset=utf-8'}));
  try {
    const img = new Image();
    // Pasang handler SEBELUM memicu load — decode() bisa menolak setelah event error terlewat.
    const ready = new Promise((res, rej) => {
      img.onload = res;
      img.onerror = () => rej(new Error('Rasterisasi DOM gagal (SVG foreignObject ditolak browser)'));
    });
    img.src = url;
    try {
      await img.decode();
    } catch (e) {
      await Promise.race([
        ready,
        new Promise(
          (_, rej) =>
            setTimeout(() => rej(new Error('Rasterisasi DOM gagal (SVG foreignObject ditolak browser)')), 15000)
        ),
      ]);
    }
    ctx.drawImage(img, 0, 0, cnv.width, cnv.height);
    if (cache) {
      cache.svg = svg;
      cache.img = img;
    }
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function makeHtmlProvider({code, width, height, fps}) {
  let iframe = null;
  let win = null;
  const cache = {svg: null, img: null, baked: null};
  return {
    name: 'html',
    async init() {
      iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:fixed;left:-100000px;top:0;border:0;visibility:hidden;';
      iframe.setAttribute('width', String(width));
      iframe.setAttribute('height', String(height));
      iframe.srcdoc = buildDoc(code, 'SEEK');
      await new Promise((res, rej) => {
        const to = setTimeout(() => rej(new Error('Iframe HTML gagal dimuat (timeout)')), 20000);
        iframe.onload = () => {
          clearTimeout(to);
          res();
        };
        document.body.appendChild(iframe);
      });
      win = iframe.contentWindow;
      const t0 = Date.now();
      while (!(win && win.__rsw)) {
        if (Date.now() - t0 > 10000) throw new Error('Kontroler jam virtual tidak aktif di iframe');
        await new Promise((r) => setTimeout(r, 25));
      }
      win.__rsw.seek(0);
      let failedLinks = 0;
      try {
        failedLinks = await inlineExternalStyles(win);
      } catch (e) {
        failedLinks = Array.from(win.document.querySelectorAll('link[rel="stylesheet" i][href]')).length;
      }
      // Tunggu font hasil inline selesai dimuat agar metrik teks konsisten sejak frame pertama.
      try {
        await Promise.race([win.document.fonts.ready, new Promise((r) => setTimeout(r, 2000))]);
      } catch (e) {}
      cache.baked = await collectBackgrounds(win.document);
      if (failedLinks > 0) {
        this.warn =
          'Catatan: ' + failedLinks + ' stylesheet eksternal gagal di-inline (CORS) — tampilan ekspor bisa berbeda. Gunakan <style> inline bila memungkinkan.';
      }
    },
    async renderFrame(i, cnv) {
      try {
        win.__rsw.seek(Math.round((i * 1000) / fps));
        await snapshotToCanvas(win, cnv, cache);
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String((err && err.message) || err));
        e.userCode = true;
        e.message = 'Kode HTML gagal dirender di frame ' + i + ': ' + e.message;
        throw e;
      }
    },
    destroy() {
      if (iframe) {
        iframe.remove();
        iframe = null;
        win = null;
      }
    },
  };
}