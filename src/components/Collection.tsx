'use client';
import { useMemo } from 'react';
import { coverOf } from '@/lib/cover';
import { usePlayer } from '@/lib/player';
import { useLib } from '@/lib/store';
import { Icon } from './Icon';
import { SongRow } from './SongRow';
import { Stamp } from './Stamp';

export function Collection({ kind, title, sub, ids, cover, playlistId, extra }: { kind: string; title: string; sub?: string; ids: string[]; cover?: string; playlistId?: string; extra?: React.ReactNode }) {
  const byId = useLib(s => s.byId), offline = useLib(s => s.offline), loaded = useLib(s => s.loaded);
  const songs = useMemo(() => ids.map(i => byId[i]).filter(Boolean), [ids, byId]);
  const mins = Math.round(songs.reduce((a, s) => a + s.duration, 0) / 60);
  const missing = songs.filter(s => !offline.has(s.id)).length;
  const art = cover ?? (songs[0] ? coverOf(songs[0]) : '');
  const list = songs.map(s => s.id), p = usePlayer.getState;
  return (
    <div className="page">
      <div className="coll-head">
        <div className="coll-stamp"><Stamp cover={art} title={title} sub={sub ?? `${songs.length} songs`} /></div>
        <div className="coll-meta">
          <span className="mono">{kind} · {songs.length} song{songs.length === 1 ? '' : 's'}{mins ? ` · ${mins} min` : ''}</span>
          <h1>{title}</h1>
          <div className="coll-acts">
            <button className="btn solid" disabled={!songs.length} onClick={() => p().playList(list, 0)}><Icon name="play" size={18} />Play</button>
            <button className="btn" disabled={!songs.length} onClick={() => { usePlayer.setState({ shuffle: true }); p().playList(list, Math.floor(Math.random() * list.length)); }}><Icon name="shuffle" size={18} />Shuffle</button>
            <button className="btn" disabled={!missing} onClick={() => void useLib.getState().download(list)}><Icon name={missing ? 'download' : 'check'} size={18} />{missing ? 'Download all' : 'Downloaded'}</button>
            {extra}
          </div>
        </div>
      </div>
      {loaded && songs.length === 0
        ? <div className="empty"><h3>Nothing here yet</h3><p>{playlistId ? 'Use ••• on any song, then “Add to playlist”.' : 'Add music and it will show up here.'}</p></div>
        : <div className="rows">{songs.map((s, i) => <SongRow key={s.id} song={s} ids={list} index={i} playlistId={playlistId} />)}</div>}
    </div>
  );
}
