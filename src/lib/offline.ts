/** Offline audio: downloaded songs are stored as Blobs in this browser's IndexedDB and played from there. */
const NAME = 'postmark-offline';
let dbp: Promise<IDBDatabase> | null = null;
function open(): Promise<IDBDatabase> {
  if (!dbp) dbp = new Promise((ok, no) => {
    const q = indexedDB.open(NAME, 1);
    q.onupgradeneeded = () => { q.result.createObjectStore('audio'); q.result.createObjectStore('kv'); };
    q.onsuccess = () => ok(q.result);
    q.onerror = () => { dbp = null; no(q.error); };
  });
  return dbp;
}
async function run<T>(store: 'audio' | 'kv', mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((ok, no) => { const t = db.transaction(store, mode); const r = fn(t.objectStore(store)); t.oncomplete = () => ok(r.result); t.onerror = () => no(t.error); t.onabort = () => no(t.error); });
}
export const kvGet = <T,>(k: string) => run<T | undefined>('kv', 'readonly', s => s.get(k)).catch(() => undefined);
export const kvSet = (k: string, v: unknown) => run('kv', 'readwrite', s => s.put(v, k)).catch(() => undefined);

export interface OfflineRec { blob: Blob; size: number; savedAt: number }
export const offlineIds = () => run<IDBValidKey[]>('audio', 'readonly', s => s.getAllKeys()).then(k => k.map(String)).catch(() => [] as string[]);
export const offlineAll = () => run<OfflineRec[]>('audio', 'readonly', s => s.getAll()).catch(() => [] as OfflineRec[]);
export const removeAudio = async (id: string) => { urls.delete(id); await run('audio', 'readwrite', s => s.delete(id)); };
export const clearAudio = async () => { urls.clear(); await run('audio', 'readwrite', s => s.clear()); };

const urls = new Map<string, string>();
export async function offlineUrl(id: string): Promise<string | null> {
  const hit = urls.get(id); if (hit) return hit;
  const rec = await run<OfflineRec | undefined>('audio', 'readonly', s => s.get(id)).catch(() => undefined);
  if (!rec) return null;
  const u = URL.createObjectURL(rec.blob); urls.set(id, u); return u;
}

export async function downloadAudio(id: string, onProgress?: (f: number) => void): Promise<void> {
  const res = await fetch(`/api/songs/${id}/audio`);
  if (!res.ok || !res.body) throw new Error('Download failed');
  const total = Number(res.headers.get('content-length')) || 0;
  const reader = res.body.getReader(); const parts: Uint8Array<ArrayBuffer>[] = []; let got = 0;
  for (;;) {
    const { done, value } = await reader.read(); if (done) break;
    parts.push(value as Uint8Array<ArrayBuffer>); got += value.length; if (total) onProgress?.(got / total);
  }
  const blob = new Blob(parts, { type: res.headers.get('content-type') || 'audio/mpeg' });
  await run('audio', 'readwrite', s => s.put({ blob, size: blob.size, savedAt: Date.now() } satisfies OfflineRec, id));
  onProgress?.(1);
}

export async function storageUsage() {
  try { const e = await navigator.storage.estimate(); return { used: e.usage ?? 0, quota: e.quota ?? 0 }; } catch { return { used: 0, quota: 0 }; }
}
/** Ask the browser not to evict downloaded songs under storage pressure. */
export async function keepStorage(): Promise<boolean> {
  try { return (await navigator.storage?.persisted?.()) || (await navigator.storage?.persist?.()) || false; } catch { return false; }
}
