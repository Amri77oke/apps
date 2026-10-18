import {transform} from 'sucrase';
import {
  Output,
  BufferTarget,
  Mp4OutputFormat,
  WebMOutputFormat,
  CanvasSource,
  canEncodeVideo,
  getFirstEncodableVideoCodec,
} from 'mediabunny';
import {FX} from './fx.js';

export {makeHtmlProvider} from './htmlmode.js';

export const MAX_FRAMES = 5400;

export const evenize = (n) => Math.max(2, Math.round(n / 2) * 2);

const QUALITY_BPP = {'very-low': 0.04, low: 0.07, medium: 0.11, high: 0.16, 'very-high': 0.26};

export function bitrateFor(quality, w, h, fps) {
  const bpp = QUALITY_BPP[quality] ?? 0.14;
  return Math.round(Math.min(120e6, Math.max(400e3, w * h * Math.max(fps, 8) * bpp)));
}

export async function pickCodec(container, w, h, fps, quality) {
  if (typeof VideoEncoder === 'undefined') return null;
  const wanted = container === 'mp4' ? ['avc', 'hevc', 'av1'] : ['vp9', 'vp8', 'av1'];
  try {
    return await getFirstEncodableVideoCodec(wanted, {
      width: w,
      height: h,
      bitrate: bitrateFor(quality, w, h, fps),
    });
  } catch (e) {
    return null;
  }
}

export function checkAbort(signal) {
  if (signal && signal.aborted) {
    const err = new Error('Ekspor dibatalkan');
    err.aborted = true;
    throw err;
  }
}

// Kompilasi kode mode Canvas: dukung JS/TS + export, fungsi animate/draw,
// dengan pustaka FX tersedia di dalam scope.
export function compileCanvas(code) {
  const {code: js} = transform(code, {
    transforms: ['typescript', 'jsx', 'imports'],
    jsxRuntime: 'classic',
    production: true,
  });
  const mod = {exports: {}};
  const factory = new Function(
    'require',
    'module',
    'exports',
    'FX',
    js +
      '\n;return typeof animate === "function" ? animate : (typeof draw === "function" ? draw : ((module.exports && (module.exports.default || module.exports.animate || module.exports.draw)) || null));'
  );
  const fn = factory(() => {
    throw new Error('Impor tidak tersedia di mode Canvas. Semua helper tersedia lewat objek FX.');
  }, mod, mod.exports, FX);
  if (typeof fn !== 'function') {
    throw new Error('Definisikan "function animate(ctx, t, w, h, frame, fps) { ... }"');
  }
  return {fn, config: mod.exports.config || {}};
}

export function markUserCodeError(err, context) {
  const e = err instanceof Error ? err : new Error(String((err && err.message) || err));
  e.userCode = true;
  e.message = (context ? context + ': ' : '') + e.message;
  return e;
}

export function makeCanvasProvider({code, width, height, fps}) {
  const {fn} = compileCanvas(code);
  return {
    name: 'canvas',
    async init() {},
    async renderFrame(i, cnv) {
      const ctx = cnv.getContext('2d');
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      try {
        if (i === 0) ctx.clearRect(0, 0, cnv.width, cnv.height);
        fn(ctx, i / fps, cnv.width, cnv.height, i, fps, FX);
      } catch (err) {
        throw markUserCodeError(err, 'Kode animasi gagal di frame ' + i);
      } finally {
        ctx.restore();
      }
    },
    destroy() {},
  };
}

async function encodeWithMediabunny({width, height, fps, frames, container, codec, quality, provider, signal, onProgress, onPhase}) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const output = new Output({
    format: container === 'mp4' ? new Mp4OutputFormat({fastStart: 'in-memory'}) : new WebMOutputFormat(),
    target: new BufferTarget(),
  });
  const source = new CanvasSource(canvas, {
    codec,
    bitrate: bitrateFor(quality, width, height, fps),
    keyFrameInterval: 2,
  });
  output.addVideoTrack(source, {frameRate: fps});
  await output.start();
  try {
    if (onPhase) onPhase('render');
    for (let i = 0; i < frames; i++) {
      checkAbort(signal);
      await provider.renderFrame(i, canvas);
      await source.add(i / fps, 1 / fps);
      if (onProgress) onProgress((i + 1) / frames);
    }
    if (onPhase) onPhase('finalize');
    await output.finalize();
  } catch (err) {
    try {
      await output.cancel();
    } catch (e) {}
    throw err;
  }
  const buffer = output.target.buffer;
  return {
    blob: new Blob([buffer], {type: container === 'mp4' ? 'video/mp4' : 'video/webm'}),
    ext: container === 'mp4' ? 'mp4' : 'webm',
    via: 'webcodecs/' + codec,
  };
}

async function encodeWithMediaRecorder({width, height, fps, frames, container, quality, provider, signal, onProgress, onPhase}) {
  const mimes =
    container === 'mp4'
      ? ['video/mp4;codecs=avc1.640034', 'video/mp4;codecs=avc1.4d0034', 'video/mp4;codecs=avc1.42E01E', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm']
      : ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  const mime = mimes.find((m) => window.MediaRecorder && MediaRecorder.isTypeSupported(m));
  if (!mime) throw new Error('Browser tidak mendukung encoder video (WebCodecs/MediaRecorder).');
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const stream = canvas.captureStream(fps);
  const rec = new MediaRecorder(stream, {mimeType: mime, videoBitsPerSecond: bitrateFor(quality, width, height, fps)});
  const chunks = [];
  let recErr = null;
  rec.ondataavailable = (e) => e.data && e.data.size && chunks.push(e.data);
  const stopped = new Promise((res, rej) => {
    rec.onstop = () => (recErr ? rej(recErr) : res());
    rec.onerror = (e) => {
      recErr = (e && e.error) || new Error('Perekaman MediaRecorder gagal.');
      try {
        if (rec.state !== 'inactive') rec.stop();
      } catch (err) {}
    };
  });
  rec.start(1000);
  const frameMs = 1000 / fps;
  const wallStart = performance.now();
  let stoppedErr = null;
  if (onPhase) onPhase('render');
  try {
    for (let i = 0; i < frames; i++) {
      checkAbort(signal);
      const t0 = performance.now();
      await provider.renderFrame(i, canvas);
      const wait = frameMs - (performance.now() - t0);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      if (onProgress) onProgress((i + 1) / frames);
    }
  } finally {
    await new Promise((r) => setTimeout(r, 150));
    try {
      if (rec.state !== 'inactive') rec.stop();
    } catch (e) {}
    try {
      for (const t of stream.getVideoTracks()) t.stop();
    } catch (e) {}
    try {
      await stopped;
    } catch (e) {
      stoppedErr = e;
    }
  }
  if (stoppedErr && !chunks.length) throw stoppedErr;
  if (!chunks.length) throw new Error('Perekam MediaRecorder tidak menghasilkan data video.');
  const type = mime.split(';')[0];
  const wall = (performance.now() - wallStart) / 1000;
  const note = wall > (frames / fps) * 1.15 && frames > 1 ? ' (durasi riil ' + wall.toFixed(1) + 's — render melambat dari waktu-nyata)' : '';
  return {blob: new Blob(chunks, {type}), ext: type.includes('mp4') ? 'mp4' : 'webm', via: 'mediarecorder', note};
}

export async function encodeFrames({width, height, fps, frames, container, quality, provider, signal, onProgress, onPhase}) {
  await provider.init();
  try {
    const codec = await pickCodec(container, width, height, fps, quality);
    if (codec) {
      try {
        return await encodeWithMediabunny({width, height, fps, frames, container, codec, quality, provider, signal, onProgress, onPhase});
      } catch (err) {
        if ((signal && signal.aborted) || err.aborted || err.userCode) throw err;
        console.warn('WebCodecs gagal, beralih ke MediaRecorder:', err);
      }
    }
    return await encodeWithMediaRecorder({width, height, fps, frames, container, quality, provider, signal, onProgress, onPhase});
  } finally {
    provider.destroy();
  }
}

export async function renderPngFrame({width, height, fps, provider, frame, signal}) {
  await provider.init();
  try {
    checkAbort(signal);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    await provider.renderFrame(frame, canvas);
    return await new Promise((res, rej) =>
      canvas.toBlob((b) => (b ? res(b) : rej(new Error('Gagal membuat PNG'))), 'image/png')
    );
  } finally {
    provider.destroy();
  }
}

export async function canExportWebCodec(container, w, h, fps, quality) {
  const codec = await pickCodec(container, w, h, fps, quality);
  if (!codec) return false;
  return canEncodeVideo(codec, {width: w, height: h, bitrate: bitrateFor(quality, w, h, fps)});
}