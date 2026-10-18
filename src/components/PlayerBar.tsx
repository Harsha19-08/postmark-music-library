'use client';
import { useEffect } from 'react';
import { coverOf } from '@/lib/cover';
import { usePlayer } from '@/lib/player';
import { useLib } from '@/lib/store';
import { useUI } from '@/lib/ui';
import { Icon } from './Icon';
import { SeekBar } from './SeekBar';

export function PlayerBar() {
  const id = usePlayer(s => s.currentId), playing = usePlayer(s => s.playing), loading = usePlayer(s => s.loading);
  const shuffle = usePlayer(s => s.shuffle), repeat = usePlayer(s => s.repeat), vol = usePlayer(s => s.vol), muted = usePlayer(s => s.muted);
  const progress = usePlayer(s => (s.dur ? s.time / s.dur : 0));
  const song = useLib(s => (id ? s.byId[id] : undefined));
  const p = usePlayer.getState, open = useUI(s => s.openSheet);
  useEffect(() => { document.body.dataset.player = song ? '1' : '0'; }, [song]);
  if (!song) return null;
  return (
    <div className="bar" role="region" aria-label="Player">
      <span className="bar-prog" style={{ transform: `scaleX(${progress})` }} />
      <button className="bar-np" onClick={() => open('now')} aria-label={`Open now playing: ${song.title}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={coverOf(song)} alt="" />
        <span className="bar-text"><b>{song.title}</b><span>{song.artist}</span></span>
      </button>
      <div className="bar-ctl">
        <div className="bar-btns">
          <button className={`ib hide-s${shuffle ? ' on' : ''}`} aria-label="Shuffle" aria-pressed={shuffle} onClick={() => p().setShuffle(!shuffle)}><Icon name="shuffle" size={19} /></button>
          <button className="ib hide-s" aria-label="Previous" onClick={() => p().prev()}><Icon name="prev" size={20} /></button>
          <button className={`play-btn${loading && playing ? ' is-loading' : ''}`} aria-label={playing ? 'Pause' : 'Play'} onClick={() => p().toggle()}><Icon name={playing ? 'pause' : 'play'} size={22} /></button>
          <button className="ib" aria-label="Next" onClick={() => p().next(false)}><Icon name="next" size={20} /></button>
          <button className={`ib hide-s${repeat ? ' on' : ''}`} aria-label={['Repeat off', 'Repeat all', 'Repeat one'][repeat]} aria-pressed={repeat > 0} onClick={() => p().cycleRepeat()}><Icon name="repeat" size={19} />{repeat === 2 && <i className="one">1</i>}</button>
        </div>
        <div className="bar-seek"><SeekBar compact /></div>
      </div>
      <div className="bar-right">
        <button className="ib" aria-label="Effects" onClick={() => open('fx')}><Icon name="sliders" size={20} /></button>
        <button className="ib" aria-label="Queue" onClick={() => open('queue')}><Icon name="queue" size={20} /></button>
        <button className="ib" aria-label={muted ? 'Unmute' : 'Mute'} onClick={() => p().toggleMute()}><Icon name={muted || vol === 0 ? 'mute' : 'volume'} size={20} /></button>
        <input type="range" className="vol" min={0} max={100} value={muted ? 0 : Math.round(vol * 100)} style={{ ['--p' as string]: `${muted ? 0 : vol * 100}%` }} aria-label="Volume" onChange={e => p().setVol(Number(e.target.value) / 100)} />
      </div>
    </div>
  );
}
