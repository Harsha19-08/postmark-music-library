import { create } from 'zustand';
import { AUDIO_EXT } from './config-client';
import { downloadAudio, kvGet, kvSet, offlineIds, removeAudio, clearAudio } from './offline';
import type { Lang, Library, Playlist, SavedLink, Song } from './types';
import { useUI } from './ui';

export interface UploadItem { key: string; name: string; size: number; progress: number; status: 'queued' | 'uploading' | 'done' | 'duplicate' | 'error'; message?: string; songId?: string }

async function api<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { ...init, headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) } });
  if (res.status === 401 && typeof location !== 'undefined' && !location.pathname.startsWith('/login')) { location.href = '/login'; throw new Error('Signed out'); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  return data as T;
}
const say = (m: string) => useUI.getState().say(m);
const index = (songs: Song[]) => Object.fromEntries(songs.map(s => [s.id, s]));

interface Lib {
  songs: Song[]; byId: Record<string, Song>; playlists: Playlist[]; likes: Set<string>; links: SavedLink[];
  loaded: boolean; stale: boolean; offline: Set<string>; dl: Record<string, number>; uploads: UploadItem[]; recent: string[];
  load: () => Promise<void>;
  like: (id: string) => Promise<void>;
  createPlaylist: (name: string, ids?: string[]) => Promise<Playlist | null>;
  renamePlaylist: (id: string, name: string) => Promise<void>;
  deletePlaylist: (id: string) => Promise<void>;
  addToPlaylist: (pid: string, ids: string[]) => Promise<void>;
  removeFromPlaylist: (pid: string, id: string) => Promise<void>;
  editSong: (id: string, patch: Partial<Pick<Song, 'title' | 'artist' | 'album' | 'lang' | 'year'>>) => Promise<void>;
  deleteSong: (id: string) => Promise<void>;
  upload: (files: File[], catalogId?: string) => void;
  clearUploads: () => void;
  download: (ids: string[]) => Promise<void>;
  removeDownloads: (ids?: string[]) => Promise<void>;
  addLink: (url: string, title: string, artist: string) => Promise<boolean>;
  deleteLink: (id: string) => Promise<void>;
  pushRecent: (id: string) => void;
}

let uploading = 0;
export const useLib = create<Lib>((set, get) => ({
  songs: [], byId: {}, playlists: [], likes: new Set(), links: [], loaded: false, stale: false, offline: new Set(), dl: {}, uploads: [], recent: [],

  async load() {
    try { set({ offline: new Set(await offlineIds()) }); } catch { /* private mode */ }
    try { const r = JSON.parse(localStorage.getItem('pm-recent') || '[]'); if (Array.isArray(r)) set({ recent: r }); } catch { /* ignore */ }
    try {
      const lib = await fetch('/api/library', { cache: 'no-store' });
      if (lib.status === 401) { location.href = '/login'; return; }
      if (!lib.ok) throw new Error('library');
      const d = (await lib.json()) as Library;
      set({ songs: d.songs, byId: index(d.songs), playlists: d.playlists, likes: new Set(d.likes), links: d.links, loaded: true, stale: false });
      void kvSet('library', d);
    } catch {
      const d = await kvGet<Library>('library');
      if (d) set({ songs: d.songs, byId: index(d.songs), playlists: d.playlists, likes: new Set(d.likes), links: d.links ?? [], loaded: true, stale: true });
      else set({ loaded: true, stale: true });
    }
  },

  async like(id) {
    const on = !get().likes.has(id), likes = new Set(get().likes);
    on ? likes.add(id) : likes.delete(id); set({ likes });
    try { await api(`/api/likes/${id}`, { method: on ? 'PUT' : 'DELETE' }); say(on ? 'Added to Liked' : 'Removed from Liked'); }
    catch (e) { const back = new Set(get().likes); on ? back.delete(id) : back.add(id); set({ likes: back }); say((e as Error).message); }
  },

  async createPlaylist(name, ids = []) {
    try { const { playlist } = await api<{ playlist: Playlist }>('/api/playlists', { method: 'POST', body: JSON.stringify({ name, songIds: ids }) }); set({ playlists: [...get().playlists, playlist] }); say(`Created “${playlist.name}”`); return playlist; }
    catch (e) { say((e as Error).message); return null; }
  },
  async renamePlaylist(id, name) {
    set({ playlists: get().playlists.map(p => p.id === id ? { ...p, name } : p) });
    try { await api(`/api/playlists/${id}`, { method: 'PATCH', body: JSON.stringify({ name }) }); } catch (e) { say((e as Error).message); void get().load(); }
  },
  async deletePlaylist(id) {
    set({ playlists: get().playlists.filter(p => p.id !== id) });
    try { await api(`/api/playlists/${id}`, { method: 'DELETE' }); say('Playlist deleted'); } catch (e) { say((e as Error).message); void get().load(); }
  },
  async addToPlaylist(pid, ids) {
    const p = get().playlists.find(x => x.id === pid); if (!p) return;
    const fresh = ids.filter(i => !p.songIds.includes(i));
    if (!fresh.length) { say(`Already in “${p.name}”`); return; }
    set({ playlists: get().playlists.map(x => x.id === pid ? { ...x, songIds: [...x.songIds, ...fresh] } : x) });
    try { await api(`/api/playlists/${pid}/songs`, { method: 'POST', body: JSON.stringify({ songIds: fresh }) }); say(`Added to “${p.name}”`); } catch (e) { say((e as Error).message); void get().load(); }
  },
  async removeFromPlaylist(pid, id) {
    set({ playlists: get().playlists.map(x => x.id === pid ? { ...x, songIds: x.songIds.filter(s => s !== id) } : x) });
    try { await api(`/api/playlists/${pid}/songs?songId=${id}`, { method: 'DELETE' }); } catch (e) { say((e as Error).message); void get().load(); }
  },

  async editSong(id, patch) {
    try { const { song } = await api<{ song: Song }>(`/api/songs/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }); const songs = get().songs.map(s => s.id === id ? song : s); set({ songs, byId: index(songs) }); }
    catch (e) { say((e as Error).message); }
  },
  async deleteSong(id) {
    try {
      await api(`/api/songs/${id}`, { method: 'DELETE' }); await removeAudio(id).catch(() => undefined);
      const songs = get().songs.filter(s => s.id !== id), likes = new Set(get().likes); likes.delete(id);
      const offline = new Set(get().offline); offline.delete(id);
      set({ songs, byId: index(songs), likes, offline, playlists: get().playlists.map(p => ({ ...p, songIds: p.songIds.filter(s => s !== id) })) }); say('Deleted from your library');
    } catch (e) { say((e as Error).message); }
  },

  upload(files, catalogId) {
    const items: UploadItem[] = files.map(f => {
      const ext = '.' + (f.name.split('.').pop() || '').toLowerCase();
      const bad = !AUDIO_EXT.includes(ext);
      return { key: Math.random().toString(36).slice(2), name: f.name, size: f.size, progress: 0, status: bad ? 'error' : 'queued', message: bad ? 'Not a supported audio file' : undefined };
    });
    const queue = files.map((f, i) => ({ f, item: items[i] })).filter(x => x.item.status === 'queued');
    set({ uploads: [...items, ...get().uploads] });
    const patch = (key: string, p: Partial<UploadItem>) => set({ uploads: get().uploads.map(u => u.key === key ? { ...u, ...p } : u) });
    const next = (): void => {
      while (uploading < 1 && queue.length) {
        const { f, item } = queue.shift()!; uploading++; patch(item.key, { status: 'uploading' });
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', `/api/songs/upload?name=${encodeURIComponent(f.name)}${catalogId ? `&catalogId=${encodeURIComponent(catalogId)}` : ''}`);
        xhr.upload.onprogress = e => { if (e.lengthComputable) patch(item.key, { progress: e.loaded / e.total }); };
        const done = (): void => { uploading--; next(); };
        xhr.onload = () => {
          let body: { song?: Song; duplicate?: boolean; error?: string } = {};
          try { body = JSON.parse(xhr.responseText); } catch { /* keep empty */ }
          if (xhr.status === 401) { location.href = '/login'; return done(); }
          if (xhr.status >= 200 && xhr.status < 300 && body.song) {
            const s = body.song;
            if (!get().byId[s.id]) { const songs = [s, ...get().songs]; set({ songs, byId: index(songs) }); }
            patch(item.key, { status: body.duplicate ? 'duplicate' : 'done', progress: 1, songId: s.id, message: body.duplicate ? 'Already in your library' : undefined });
          } else patch(item.key, { status: 'error', message: body.error || `Upload failed (${xhr.status})` });
          done();
        };
        xhr.onerror = () => { patch(item.key, { status: 'error', message: 'Connection lost' }); done(); };
        xhr.send(f);
      }
    };
    next();
  },
  clearUploads: () => set({ uploads: get().uploads.filter(u => u.status === 'queued' || u.status === 'uploading') }),

  async download(ids) {
    const todo = ids.filter(i => get().byId[i] && !get().offline.has(i) && get().dl[i] === undefined);
    if (!todo.length) { say('Already downloaded'); return; }
    if (typeof navigator !== 'undefined' && !navigator.onLine) { say('Connect to the internet to download'); return; }
    say(todo.length === 1 ? 'Downloading…' : `Downloading ${todo.length} songs…`);
    let ok = 0;
    for (const id of todo) {
      set({ dl: { ...get().dl, [id]: 0 } });
      try {
        await downloadAudio(id, f => set({ dl: { ...get().dl, [id]: f } }));
        const offline = new Set(get().offline); offline.add(id); set({ offline }); ok++;
      } catch { say('A download failed. Check your connection and try again.'); }
      const dl = { ...get().dl }; delete dl[id]; set({ dl });
    }
    if (ok) say(ok === 1 ? 'Ready offline' : `${ok} songs ready offline`);
  },
  async removeDownloads(ids) {
    if (!ids) { await clearAudio(); set({ offline: new Set() }); return; }
    for (const id of ids) await removeAudio(id).catch(() => undefined);
    const offline = new Set(get().offline); ids.forEach(i => offline.delete(i)); set({ offline });
  },

  async addLink(url, title, artist) {
    try { const { link } = await api<{ link: SavedLink }>('/api/links', { method: 'POST', body: JSON.stringify({ url, title, artist }) }); set({ links: [link, ...get().links] }); say('Link saved'); return true; }
    catch (e) { say((e as Error).message); return false; }
  },
  async deleteLink(id) { set({ links: get().links.filter(l => l.id !== id) }); try { await api(`/api/links/${id}`, { method: 'DELETE' }); } catch (e) { say((e as Error).message); } },

  pushRecent(id) { const recent = [id, ...get().recent.filter(x => x !== id)].slice(0, 24); set({ recent }); try { localStorage.setItem('pm-recent', JSON.stringify(recent)); } catch { /* ignore */ } },
}));

/* ---- derived collections ---- */
export interface Group { key: string; name: string; sub: string; ids: string[] }
export function albums(songs: Song[]): Group[] {
  const m = new Map<string, Song[]>();
  for (const s of songs) if (s.album) (m.get(s.album) ?? m.set(s.album, []).get(s.album)!).push(s);
  return [...m].map(([name, l]) => ({ key: name, name, sub: l[0].artist.split(',')[0], ids: l.slice().sort((a, b) => (a.trackNo ?? 99) - (b.trackNo ?? 99)).map(s => s.id) })).sort((a, b) => a.name.localeCompare(b.name));
}
export function artists(songs: Song[]): Group[] {
  const m = new Map<string, string[]>();
  for (const s of songs) for (const a of s.artist.split(',').map(x => x.trim()).filter(Boolean)) (m.get(a) ?? m.set(a, []).get(a)!).push(s.id);
  return [...m].map(([name, ids]) => ({ key: name, name, sub: `${ids.length} song${ids.length === 1 ? '' : 's'}`, ids })).sort((a, b) => b.ids.length - a.ids.length || a.name.localeCompare(b.name));
}
export const byLang = (songs: Song[], l: Lang) => songs.filter(s => s.lang === l);
