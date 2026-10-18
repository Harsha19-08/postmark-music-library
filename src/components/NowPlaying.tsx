'use client';
import { useEffect, useRef, useState } from 'react';
import { coverOf } from '@/lib/cover';
import { getAnalyser } from '@/lib/engine';
import { usePlayer } from '@/lib/player';
import { useLib } from '@/lib/store';
import { useUI } from '@/lib/ui';
import { addToPlaylistFlow } from './actions';
import { FxPanel } from './FxPanel';
import { Icon } from './Icon';
import { QueuePanel } from './QueuePanel';
import { SeekBar } from './SeekBar';
import { Stamp } from './Stamp';

function Viz() {
  const ref = useRef<HTMLCanvasElement>(null), playing = usePlayer(s => s.playing);
  useEffect(() => {
    const c = ref.current; if (!c || !playing) return;
    const x = c.getContext('2d')!, reduce = matchMedia('(prefers-reduced-motion: reduce)').matches; let raf = 0;
    const draw = () => {
      const an = getAnalyser(); const W = c.width, H = c.height; x.clearRect(0, 0, W, H);
      if (an && !reduce) {
        const d = new Uint8Array(an.frequencyBinCount); an.getByteFrequencyData(d);
        const n = 36, gap = 6, bw = (W - gap * (n - 1)) / n; const grad = x.createLinearGradient(0, 0, W, 0);
        grad.addColorStop(0, '#7f8cff'); grad.addColorStop(0.55, '#b79bff'); grad.addColorStop(1, '#ff9bd2'); x.fillStyle = grad;
        for (let i = 0; i < n; i++) { const v = d[Math.floor((i * d.length * 0.78) / n)] / 255, h = Math.max(5, v * H); x.beginPath(); x.roundRect(i * (bw + gap), H - h, bw, h, bw / 2); x.fill(); }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [playing]);
  return <canvas ref={ref} className="viz" width={720} height={96} aria-hidden="true" />;
}

export function NowPlaying() {
  const open = useUI(s => s.sheet), tab = useUI(s => s.tab), close = useUI(s => s.closeSheet), setTab = (t: 'now' | 'fx' | 'queue') => useUI.setState({ tab: t });
  const id = usePlayer(s => s.currentId), playing = usePlayer(s => s.playing), loading = usePlayer(s => s.loading);
  const shuffle = usePlayer(s => s.shuffle), repeat = usePlayer(s => s.repeat), sleep = usePlayer(s => s.sleepMin), p = usePlayer.getState;
  const song = useLib(s => (id ? s.byId[id] : undefined)), liked = useLib(s => (id ? s.likes.has(id) : false));
  const off = useLib(s => (id ? s.offline.has(id) : false)), dl = useLib(s => (id ? s.dl[id] : undefined));
  const [dy, setDy] = useState(0), drag = useRef<{ y: number; t: number } | null>(null);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    document.getElementById('app')?.toggleAttribute('inert', open);
    return () => { document.body.style.overflow = ''; };
  }, [open]);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape' && open) close(); }; addEventListener('keydown', k); return () => removeEventListener('keydown', k); }, [open, close]);

  const down = (e: React.PointerEvent) => { drag.current = { y: e.clientY, t: Date.now() }; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); };
  const move = (e: React.PointerEvent) => { if (drag.current) setDy(Math.max(0, e.clientY - drag.current.y)); };
  const up = (e: React.PointerEvent) => {
    if (!drag.current) return; const d = Math.max(0, e.clientY - drag.current.y), v = d / Math.max(1, Date.now() - drag.current.t);
    drag.current = null; setDy(0); if (d > 140 || (d > 40 && v > 0.6)) close();
  };

  return (
    <div className={`sheet${open ? ' on' : ''}`} aria-hidden={!open} role="dialog" aria-label="Now playing" aria-modal="true"
      style={dy ? { transform: `translateY(${dy}px)`, transition: 'none' } : undefined}>
      {song && <div className="sheet-bg" style={{ backgroundImage: `url("${coverOf(song)}")` }} />}
      <header className="sheet-top" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        <button className="ib" aria-label="Close" onClick={close} onPointerDown={e => e.stopPropagation()}><Icon name="down" size={26} /></button>
        <span className="sheet-grab" aria-hidden="true" />
        <span className="mono sheet-from">{song ? `${song.lang === 'Other' ? 'My music' : song.lang}` : ''}</span>
      </header>
      {song && (
        <div className="sheet-body">
          <section className="sheet-main">
            <div className="sheet-stamp"><Stamp cover={coverOf(song)} title={song.title} sub={song.artist + (song.album ? ` · ${song.album}` : '')} playing={playing} tag={off ? 'ON DEVICE' : undefined} /></div>
            <div className="sheet-seek"><SeekBar /></div>
            <div className="ctl-main">
              <button className={`ib${shuffle ? ' on' : ''}`} aria-label="Shuffle" aria-pressed={shuffle} onClick={() => p().setShuffle(!shuffle)}><Icon name="shuffle" size={22} /></button>
              <button className="ib big" aria-label="Previous" onClick={() => p().prev()}><Icon name="prev" size={26} /></button>
              <button className={`play-btn xl${loading && playing ? ' is-loading' : ''}`} aria-label={playing ? 'Pause' : 'Play'} onClick={() => p().toggle()}><Icon name={playing ? 'pause' : 'play'} size={30} /></button>
              <button className="ib big" aria-label="Next" onClick={() => p().next(false)}><Icon name="next" size={26} /></button>
              <button className={`ib${repeat ? ' on' : ''}`} aria-label={['Repeat off', 'Repeat all', 'Repeat one'][repeat]} aria-pressed={repeat > 0} onClick={() => p().cycleRepeat()}><Icon name="repeat" size={22} />{repeat === 2 && <i className="one">1</i>}</button>
            </div>
            <div className="quick">
              <button className={`chip${liked ? ' on' : ''}`} aria-pressed={liked} onClick={() => void useLib.getState().like(song.id)}><Icon name={liked ? 'heartFill' : 'heart'} size={17} />{liked ? 'Liked' : 'Like'}</button>
              <button className={`chip${off ? ' on' : ''}`} disabled={dl !== undefined} onClick={() => (off ? void useLib.getState().removeDownloads([song.id]) : void useLib.getState().download([song.id]))}>
                <Icon name={off ? 'check' : 'download'} size={17} />{dl !== undefined ? `${Math.round(dl * 100)}%` : off ? 'Downloaded' : 'Download'}</button>
              <button className="chip" onClick={() => void addToPlaylistFlow([song.id])}><Icon name="plus" size={17} />Playlist</button>
              <button className={`chip${sleep ? ' on' : ''}`} onClick={() => p().cycleSleep()}><Icon name="clock" size={17} />{sleep ? `${sleep} min` : 'Sleep'}</button>
            </div>
            <Viz />
          </section>
          <section className="sheet-side">
            <div className="seg" role="tablist" aria-label="Panels">
              <button role="tab" aria-selected={tab !== 'fx'} onClick={() => setTab('queue')}>Queue</button>
              <button role="tab" aria-selected={tab === 'fx'} onClick={() => setTab('fx')}>Effects</button>
            </div>
            {tab === 'fx' ? <FxPanel /> : <QueuePanel />}
          </section>
        </div>
      )}
    </div>
  );
}
