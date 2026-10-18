'use client';
import { coverOf } from '@/lib/cover';
import { usePlayer } from '@/lib/player';
import { useLib } from '@/lib/store';
import type { Song } from '@/lib/types';
import { useSongMenu } from './actions';
import { Icon } from './Icon';

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function SongRow({ song, ids, index, playlistId }: { song: Song; ids: string[]; index: number; playlistId?: string }) {
  const current = usePlayer(s => s.currentId === song.id), playing = usePlayer(s => s.currentId === song.id && s.playing);
  const liked = useLib(s => s.likes.has(song.id)), off = useLib(s => s.offline.has(song.id)), dl = useLib(s => s.dl[song.id]);
  const menu = useSongMenu();
  const play = () => usePlayer.getState().playList(ids, index);
  return (
    <div className={`row${current ? ' is-current' : ''}`} role="button" tabIndex={0} onClick={play}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); play(); } }} onContextMenu={e => { e.preventDefault(); menu(e, song, { playlistId }); }}
      aria-label={`Play ${song.title} by ${song.artist}`}>
      <span className="row-art">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={coverOf(song)} alt="" loading="lazy" decoding="async" />
        {current && <span className={`eqbars${playing ? ' on' : ''}`} aria-hidden="true"><i /><i /><i /></span>}</span>
      <span className="row-main"><span className="row-title">{song.title}</span><span className="row-sub">{song.artist}</span></span>
      <span className="row-album">{song.album}</span>
      <span className="row-meta">
        {dl !== undefined ? <span className="ring" style={{ ['--p' as string]: `${Math.round(dl * 100)}%` }} aria-label="Downloading" /> : off ? <Icon name="download" size={14} className="row-off" /> : null}
        <span className="row-dur">{fmt(song.duration)}</span>
      </span>
      <span className="row-acts">
        <button className={`ib${liked ? ' on' : ''}`} aria-label={liked ? 'Unlike' : 'Like'} aria-pressed={liked} onClick={e => { e.stopPropagation(); void useLib.getState().like(song.id); }}><Icon name={liked ? 'heartFill' : 'heart'} size={19} /></button>
        <button className="ib" aria-label="More options" onClick={e => menu(e, song, { playlistId })}><Icon name="more" size={20} /></button>
      </span>
    </div>
  );
}
