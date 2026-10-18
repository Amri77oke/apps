export const CSV_HEADER = ['name', 'mode', 'width', 'height', 'fps', 'duration', 'quality', 'code'];

const MODES = ['remotion', 'canvas', 'html'];
const QUALITIES = ['very-low', 'low', 'medium', 'high', 'very-high'];

const num = (v, d, min, max) => {
  const n = Number(v);
  return isFinite(n) ? Math.min(max, Math.max(min, n)) : d;
};

export function normalize(e) {
  return {
    name: String(e.name || 'Animasi').trim().slice(0, 80) || 'Animasi',
    mode: MODES.includes(e.mode) ? e.mode : 'canvas',
    cfg: {
      width: num(e.width, 1280, 16, 8192),
      height: num(e.height, 720, 16, 8192),
      fps: num(e.fps, 30, 1, 120),
      dur: num(e.dur, 5, 0.1, 300),
      quality: QUALITIES.includes(e.quality) ? e.quality : 'high',
    },
    code: String(e.code || ''),
  };
}

export function toCSV(jobs) {
  const esc = (v) => {
    const s = String(v ?? '');
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const rows = [CSV_HEADER.join(',')];
  for (const j of jobs) {
    rows.push([j.name, j.mode, j.cfg.width, j.cfg.height, j.cfg.fps, j.cfg.dur, j.cfg.quality, j.code].map(esc).join(','));
  }
  return rows.join('\r\n') + '\r\n';
}

export function parseCSV(text) {
  const rows = [];
  let row = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cur += '"';
          i++;
        } else q = false;
      } else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',') {
      row.push(cur);
      cur = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cur);
      cur = '';
      if (row.some((v) => v.trim() !== '')) rows.push(row);
      row = [];
    } else cur += c;
  }
  row.push(cur);
  if (row.some((v) => v.trim() !== '')) rows.push(row);
  if (!rows.length) return [];
  const first = rows[0].map((h) => h.trim().toLowerCase());
  const hasHeader = first.includes('name') && first.includes('code');
  const cols = hasHeader ? first : CSV_HEADER;
  const gi = (r, n) => {
    const i = cols.indexOf(n);
    return i >= 0 && i < r.length ? r[i] : '';
  };
  const out = [];
  for (const r of hasHeader ? rows.slice(1) : rows) {
    const code = gi(r, 'code');
    if (!code || !code.trim()) continue;
    out.push(
      normalize({
        name: gi(r, 'name') || 'Animasi',
        mode: gi(r, 'mode'),
        width: gi(r, 'width'),
        height: gi(r, 'height'),
        fps: gi(r, 'fps'),
        dur: gi(r, 'duration'),
        quality: gi(r, 'quality'),
        code,
      })
    );
    out[out.length - 1].settled = true;
  }
  return out;
}

export function toTXT(jobs) {
  return (
    jobs
      .map(
        (j) =>
          '=== ANIMASI: ' + j.name + ' ===\n' +
          'mode: ' + j.mode + '\n' +
          'width: ' + j.cfg.width + '\n' +
          'height: ' + j.cfg.height + '\n' +
          'fps: ' + j.cfg.fps + '\n' +
          'duration: ' + j.cfg.dur + '\n' +
          'quality: ' + j.cfg.quality + '\n' +
          '---\n' +
          j.code.replace(/\r\n/g, '\n').trim() + '\n'
      )
      .join('\n') + '\n'
  );
}

export function parseTXT(text) {
  const parts = text.split(/^=== ANIMASI:(.*)===.*$/m).slice(1);
  const out = [];
  for (let i = 0; i < parts.length; i += 2) {
    const name = parts[i].trim();
    const lines = (parts[i + 1] || '').replace(/^\r?\n/, '').split(/\r?\n/);
    const si = lines.findIndex((l) => l.trim() === '---');
    const meta = {};
    if (si >= 0) {
      for (const l of lines.slice(0, si)) {
        const m = l.match(/^(\w+)\s*:\s*(.*)$/);
        if (m) meta[m[1].toLowerCase()] = m[2].trim();
      }
    }
    const code = (si >= 0 ? lines.slice(si + 1) : lines).join('\n').replace(/\s+$/, '');
    if (!code.trim() && !name) continue;
    out.push(
      normalize({
        name: name || 'Animasi',
        mode: meta.mode,
        width: meta.width,
        height: meta.height,
        fps: meta.fps,
        dur: meta.duration,
        quality: meta.quality,
        code,
      })
    );
    out[out.length - 1].settled = true;
  }
  return out;
}

export function guessMode(code) {
  if (/<html[\s>]|\!doctype|<!doctype|<style[\s>]|<div[\s>]|<body[\s>]/i.test(code)) return 'html';
  if (/remotion|interpolate|useCurrentFrame|AbsoluteFill|spring\(/i.test(code)) return 'remotion';
  return 'canvas';
}

export function parseAny(text, filename) {
  if (/=== ANIMASI:/m.test(text)) return parseTXT(text);
  const first = (text.split(/\r?\n/)[0] || '').toLowerCase();
  if (first.includes('code') && (first.includes('name') || first.includes('mode'))) return parseCSV(text);
  if (!text.trim()) return [];
  return [
    normalize({
      name: (filename || 'Animasi').replace(/\.[^.]+$/, ''),
      mode: guessMode(text),
      code: text,
    }),
  ];
}

export const CODE_FILE_ACCEPT =
  '.jsx,.tsx,.js,.ts,.mjs,.html,.htm,.svg,.css,.txt,.csv,text/plain,text/csv,text/html,image/svg+xml';

function wrapCssDoc(css) {
  return (
    '<!doctype html>\n<html>\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<style>\n' +
    String(css).replace(/\r\n/g, '\n') +
    '\n</style>\n</head>\n<body>\n  <div id="app"></div>\n</body>\n</html>'
  );
}

export function entriesFromFile(name, text) {
  const base = String(name || 'animasi').replace(/\.[^.]+$/, '');
  const ext = (String(name).split('.').pop() || '').toLowerCase();
  if (ext === 'csv' || ext === 'txt') return parseAny(text, name);
  if (!String(text).trim()) return [];
  if (ext === 'html' || ext === 'htm' || ext === 'svg') {
    return [normalize({name: base, mode: 'html', code: String(text)})];
  }
  if (ext === 'jsx' || ext === 'tsx') {
    return [normalize({name: base, mode: 'remotion', code: String(text)})];
  }
  if (ext === 'css') {
    return [normalize({name: base + '-style', mode: 'html', code: wrapCssDoc(text)})];
  }
  return parseAny(text, name);
}