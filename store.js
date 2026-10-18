const DB_NAME = 'rsw-suite';
const STORE = 'renders';
let dbp = null;

function open() {
  if (dbp) return dbp;
  dbp = new Promise((res, rej) => {
    if (typeof indexedDB === 'undefined') return rej(new Error('IndexedDB tidak tersedia'));
    const rq = indexedDB.open(DB_NAME, 1);
    rq.onupgradeneeded = () => {
      rq.result.createObjectStore(STORE, {keyPath: 'id'});
    };
    rq.onsuccess = () => res(rq.result);
    rq.onerror = () => rej(rq.error);
  });
  dbp.catch(() => {
    dbp = null;
  });
  return dbp;
}

async function tx(mode, fn) {
  let db;
  try {
    db = await open();
  } catch (e) {
    return null;
  }
  return await new Promise((res) => {
    try {
      const t = db.transaction(STORE, mode);
      const rq = fn(t.objectStore(STORE));
      t.oncomplete = () => res(rq && rq.result);
      t.onerror = () => res(null);
      t.onabort = () => res(null);
    } catch (e) {
      res(null);
    }
  });
}

export const putRender = (entry) => tx('readwrite', (s) => s.put(entry));
export const getRenders = () => tx('readonly', (s) => s.getAll());
export const deleteRender = (id) => tx('readwrite', (s) => s.delete(id));
export const clearRenders = () => tx('readwrite', (s) => s.clear());

export async function pruneRenders(keep = 300) {
  const db = await open().catch(() => null);
  if (!db) return;
  const entries = await new Promise((res) => {
    try {
      const t = db.transaction(STORE, 'readonly');
      const out = [];
      const rq = t.objectStore(STORE).openCursor();
      rq.onsuccess = () => {
        const c = rq.result;
        if (c) {
          const v = c.value || {};
          out.push({id: v.id, at: v.at || 0});
          c.continue();
        } else res(out);
      };
      rq.onerror = () => res([]);
    } catch (e) {
      res([]);
    }
  });
  if (entries.length <= keep) return;
  const victims = entries
    .sort((a, b) => a.at - b.at)
    .slice(0, entries.length - keep)
    .map((e) => e.id)
    .filter(Boolean);
  if (!victims.length) return;
  await new Promise((res) => {
    try {
      const t = db.transaction(STORE, 'readwrite');
      const s = t.objectStore(STORE);
      for (const id of victims) s.delete(id);
      t.oncomplete = () => res(true);
      t.onerror = () => res(false);
      t.onabort = () => res(false);
    } catch (e) {
      res(false);
    }
  });
}