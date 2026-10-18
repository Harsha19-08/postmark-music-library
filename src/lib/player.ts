import { create } from 'zustand';
import { coverPng } from './cover';
import { FX_OFF, PRESETS, applyFx, fxNeedsGraph, getAudio, hasGraph, initGraph, resumeCtx, type Fx } from './engine';
import { offlineUrl } from './offline';
import { useLib } from './store';
import { useUI } from './ui';

interface Player {
  queue: string[]; base: string[]; index: number; currentId: string | null;
  playing: boolean; loading: boolean; shuffle: boolean; repeat: 0 | 1 | 2; time: number; dur: number;
  vol: number; muted: boolean; fx: Fx; sleepMin: number;
  playList: (ids: string[], start?: number) => void;
  toggle: () => void; next: (auto?: boolean) => void; prev: () => void; seek: (t: number) => void;
  setShuffle: (on: boolean) => void; cycleRepeat: () => void;
  enqueue: (id: string, where: 'next' | 'end') => void; removeAt: (i: number) => void; move: (from: number, to: number) => void; jump: (i: number) => void; clear: () => void;
  setPreset: (id: string) => void; setFx: (p: Partial<Fx>) => void;
  setVol: (v: number) => void; toggleMute: () => void; cycleSleep: () => void; restore: () => void;
}

const say = (m: string) => useUI.getState().say(m);
const shuf = <T,>(a: T[]) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const coarse = () => typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
let token = 0, counted = false, bound = false, sleepT: ReturnType<typeof setTimeout> | undefined, lastSave = 0, lastPos = 0;

function save() {
  const s = usePlayer.getState();
  try { localStorage.setItem('pm-player', JSON.stringify({ queue: s.queue, base: s.base, index: s.index, id: s.currentId, time: s.time, shuffle: s.shuffle, repeat: s.repeat, vol: s.vol, fx: s.fx })); } catch { /* ignore */ }
}

async function loadSong(id: string, play: boolean, at = 0) {
  const song = useLib.getState().byId[id]; if (!song) return;
  const el = getAudio(), mine = ++token; counted = false;
  usePlayer.setState({ currentId: id, loading: true, time: at, dur: song.duration });
  let src = await offlineUrl(id);
  if (!src) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) { say('Not downloaded. Download it to play offline.'); usePlayer.setState({ loading: false, playing: false }); return; }
    src = `/api/songs/${id}/audio`;
  }
  if (mine !== token) return;
  const s = usePlayer.getState();
  if (!coarse() || fxNeedsGraph(s.fx)) initGraph();
  el.src = src;
  if (at > 0) el.addEventListener('loadedmetadata', () => { el.currentTime = at; }, { once: true });
  applyFx(s.fx, s.vol, s.muted);
  if (play) { resumeCtx(); try { await el.play(); } catch (e) { if ((e as Error).name === 'NotAllowedError') say('Tap play to start'); else if ((e as Error).name !== 'AbortError') say('This song could not be played'); } }
  usePlayer.setState({ loading: false });
  useLib.getState().pushRecent(id);
  if ('mediaSession' in navigator) {
    const set = (art: string) => { try { navigator.mediaSession.metadata = new MediaMetadata({ title: song.title, artist: song.artist, album: song.album, artwork: art ? [{ src: art, sizes: '512x512', type: 'image/png' }] : [] }); } catch { /* ignore */ } };
    set(''); void coverPng(song).then(set);
  }
  save();
}

function bind() {
  if (bound || typeof window === 'undefined') return; bound = true;
  const el = getAudio();
  el.addEventListener('timeupdate', () => {
    const song = usePlayer.getState().currentId ? useLib.getState().byId[usePlayer.getState().currentId!] : null;
    const d = Number.isFinite(el.duration) && el.duration > 0 ? el.duration : song?.duration ?? 0;
    usePlayer.setState({ time: el.currentTime, dur: d });
    if (!counted && el.currentTime > Math.min(20, d * 0.5) && song) { counted = true; void fetch(`/api/songs/${song.id}/played`, { method: 'POST' }).catch(() => undefined); }
    const now = Date.now();
    if (now - lastSave > 5000) { lastSave = now; save(); }
    if (now - lastPos > 1000 && 'mediaSession' in navigator && d && el.currentTime <= d) { lastPos = now; try { navigator.mediaSession.setPositionState({ duration: d, position: el.currentTime, playbackRate: el.playbackRate }); } catch { /* ignore */ } }
  });
  el.addEventListener('durationchange', () => { if (Number.isFinite(el.duration) && el.duration > 0) usePlayer.setState({ dur: el.duration }); });
  el.addEventListener('play', () => { usePlayer.setState({ playing: true }); if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing'; });
  el.addEventListener('pause', () => { usePlayer.setState({ playing: false }); save(); if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused'; });
  el.addEventListener('waiting', () => usePlayer.setState({ loading: true }));
  el.addEventListener('playing', () => usePlayer.setState({ loading: false }));
  el.addEventListener('canplay', () => usePlayer.setState({ loading: false }));
  el.addEventListener('ended', () => usePlayer.getState().next(true));
  el.addEventListener('error', () => { if (el.getAttribute('src')) { usePlayer.setState({ loading: false, playing: false }); say(navigator.onLine ? 'This song could not be played' : 'You are offline. Download songs to play them offline.'); } });
  if ('mediaSession' in navigator) {
    const h = (a: MediaSessionAction, f: MediaSessionActionHandler) => { try { navigator.mediaSession.setActionHandler(a, f); } catch { /* unsupported */ } };
    h('play', () => { void el.play(); }); h('pause', () => el.pause());
    h('previoustrack', () => usePlayer.getState().prev()); h('nexttrack', () => usePlayer.getState().next(false));
    h('seekto', e => { if (e.seekTime != null) el.currentTime = e.seekTime; });
    h('seekbackward', () => { el.currentTime = Math.max(0, el.currentTime - 10); }); h('seekforward', () => { el.currentTime += 10; });
  }
}

export const usePlayer = create<Player>((set, get) => {
  bind();
  return {
    queue: [], base: [], index: -1, currentId: null, playing: false, loading: false, shuffle: false, repeat: 0, time: 0, dur: 0, vol: 0.85, muted: false, fx: FX_OFF, sleepMin: 0,

    playList(ids, start = 0) {
      if (!ids.length) return;
      const { byId } = useLib.getState(); ids = ids.filter(i => byId[i]); start = Math.min(start, ids.length - 1);
      if (get().shuffle) { const c = ids[start]; set({ base: ids, queue: [c, ...shuf(ids.filter((_, i) => i !== start))], index: 0 }); } else set({ base: ids, queue: ids.slice(), index: start });
      void loadSong(get().queue[get().index], true);
    },
    toggle() {
      const s = get(), el = getAudio();
      if (!s.currentId) { const l = useLib.getState().songs; if (l.length) get().playList(l.map(x => x.id), 0); return; }
      if (!el.getAttribute('src')) { void loadSong(s.currentId, true, s.time); return; }
      resumeCtx(); if (el.paused) void el.play().catch(() => say('Tap play to start')); else el.pause();
    },
    next(auto = false) {
      const s = get(), el = getAudio(); if (!s.queue.length) return;
      if (auto && s.repeat === 2) { el.currentTime = 0; void el.play(); return; }
      let i = s.index + 1;
      if (i >= s.queue.length) { if (s.repeat === 1 || !auto) i = 0; else { el.pause(); el.currentTime = 0; return; } }
      set({ index: i }); void loadSong(s.queue[i], true);
    },
    prev() {
      const s = get(), el = getAudio(); if (!s.queue.length) return;
      if (el.currentTime > 3) { el.currentTime = 0; return; }
      const i = s.index > 0 ? s.index - 1 : s.repeat === 1 ? s.queue.length - 1 : 0;
      set({ index: i }); void loadSong(s.queue[i], true);
    },
    seek(t) { const el = getAudio(); if (Number.isFinite(t)) { el.currentTime = t; set({ time: t }); } },
    setShuffle(on) {
      const s = get(), cur = s.queue[s.index];
      if (on) set({ shuffle: true, queue: s.queue.slice(0, s.index + 1).concat(shuf(s.queue.slice(s.index + 1))) });
      else { const i = s.base.indexOf(cur); set(i >= 0 ? { shuffle: false, queue: s.base.slice(), index: i } : { shuffle: false }); }
      save();
    },
    cycleRepeat() { const r = ((get().repeat + 1) % 3) as 0 | 1 | 2; set({ repeat: r }); say(['Repeat off', 'Repeat all', 'Repeat one'][r]); save(); },
    enqueue(id, where) {
      const s = get(); if (!s.queue.length) { get().playList([id], 0); return; }
      const q = s.queue.slice(); where === 'next' ? q.splice(s.index + 1, 0, id) : q.push(id);
      set({ queue: q, base: [...s.base, id] }); say(where === 'next' ? 'Plays next' : 'Added to queue'); save();
    },
    removeAt(i) {
      const s = get(), q = s.queue.slice(); q.splice(i, 1);
      if (i < s.index) set({ queue: q, index: s.index - 1 });
      else if (i === s.index) { set({ queue: q, index: Math.min(s.index, q.length - 1) }); if (q.length) void loadSong(q[get().index], true); else { getAudio().pause(); set({ currentId: null }); } }
      else set({ queue: q });
      save();
    },
    move(from, to) {
      const s = get(), q = s.queue.slice(), cur = q[s.index]; const [m] = q.splice(from, 1); q.splice(to, 0, m); set({ queue: q, index: q.indexOf(cur) }); save();
    },
    jump(i) { set({ index: i }); void loadSong(get().queue[i], true); },
    clear() { const s = get(), c = s.queue[s.index]; set({ queue: c ? [c] : [], base: c ? [c] : [], index: c ? 0 : -1 }); say('Queue cleared'); save(); },

    setPreset(id) {
      const p = PRESETS.find(x => x.id === id); if (!p) return;
      const fx: Fx = { preset: id, ...JSON.parse(JSON.stringify(p.fx)) };
      if (fxNeedsGraph(fx)) initGraph(); resumeCtx(); set({ fx }); applyFx(fx, get().vol, get().muted); save(); say(p.name);
    },
    setFx(patch) {
      const fx: Fx = { ...get().fx, ...patch, preset: patch.preset ?? 'custom' };
      if (fxNeedsGraph(fx)) initGraph(); resumeCtx(); set({ fx }); applyFx(fx, get().vol, get().muted); save();
    },
    setVol(v) { set({ vol: v, muted: false }); applyFx(get().fx, v, false); save(); },
    toggleMute() { const m = !get().muted; set({ muted: m }); applyFx(get().fx, get().vol, m); },
    cycleSleep() {
      const o = [0, 15, 30, 60], m = o[(o.indexOf(get().sleepMin) + 1) % o.length]; clearTimeout(sleepT); set({ sleepMin: m });
      if (m) { sleepT = setTimeout(() => { getAudio().pause(); set({ sleepMin: 0 }); say('Sleep timer ended'); }, m * 60000); say(`Stops in ${m} minutes`); } else say('Sleep timer off');
    },
    restore() {
      try {
        const d = JSON.parse(localStorage.getItem('pm-player') || 'null'); if (!d) return;
        const { byId } = useLib.getState(), ok = (a: unknown): string[] => (Array.isArray(a) ? a.filter((x): x is string => typeof x === 'string' && !!byId[x]) : []);
        const queue = ok(d.queue), id = typeof d.id === 'string' && byId[d.id] ? d.id : null;
        set({ queue, base: ok(d.base), index: id ? Math.max(0, queue.indexOf(id)) : -1, currentId: id, time: Number(d.time) || 0, dur: id ? byId[id].duration : 0, shuffle: !!d.shuffle, repeat: [0, 1, 2].includes(d.repeat) ? d.repeat : 0, vol: typeof d.vol === 'number' ? d.vol : 0.85, fx: d.fx?.eq ? d.fx : FX_OFF });
        applyFx(get().fx, get().vol, false);
        if (hasGraph() === false && fxNeedsGraph(get().fx) && !coarse()) initGraph();
      } catch { /* ignore */ }
    },
  };
});
