'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { enc } from '@/components/actions';
import { Icon } from '@/components/Icon';
import { SongRow } from '@/components/SongRow';
import { Stamp } from '@/components/Stamp';
import { coverOf, textCover } from '@/lib/cover';
import { albums, artists, useLib } from '@/lib/store';
import { useUI } from '@/lib/ui';
import { LANGS, type Lang } from '@/lib/types';

const TABS = ['Songs', 'Albums', 'Artists', 'Playlists', 'Downloaded'] as const;

export default function Library() {
  const songs = useLib(s => s.songs), playlists = useLib(s => s.playlists), byId = useLib(s => s.byId), offline = useLib(s => s.offline), loaded = useLib(s => s.loaded);
  const [tab, setTab] = useState<(typeof TABS)[number]>('Songs'), [lang, setLang] = useState<Lang | 'All'>('All');
  const list = useMemo(() => songs.filter(s => lang === 'All' || s.lang === lang), [songs, lang]);
  const ids = list.map(s => s.id), al = useMemo(() => albums(songs), [songs]), ar = useMemo(() => artists(songs), [songs]);
  const dl = songs.filter(s => offline.has(s.id)), dlIds = dl.map(s => s.id);
  const newPl = async () => { const v = await useUI.getState().form('New playlist', [{ name: 'name', label: 'Name', placeholder: 'Late night drive', required: true }], 'Create'); if (v?.name.trim()) await useLib.getState().createPlaylist(v.name.trim()); };
  return (
    <div className="page">
      <header className="top"><h1 className="hello">Library</h1><Link href="/upload" className="btn"><Icon name="add" size={18} />Add</Link></header>
      <div className="seg scroll-x" role="tablist" aria-label="Library sections">{TABS.map(t => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>{t}</button>)}</div>
      {tab === 'Songs' && (
        <section className="sec tight">
          <div className="seg scroll-x sub" aria-label="Filter by language">{(['All', ...LANGS] as const).map(l => <button key={l} aria-pressed={lang === l} onClick={() => setLang(l)}>{l === 'Other' ? 'My music' : l}</button>)}</div>
          {list.length ? <div className="rows">{list.map((s, i) => <SongRow key={s.id} song={s} ids={ids} index={i} />)}</div>
            : <div className="empty"><h3>{loaded ? 'No songs yet' : 'Loading…'}</h3><p>Upload music and it appears here, stored in your database.</p><Link href="/upload" className="btn solid">Add music</Link></div>}
        </section>
      )}
      {tab === 'Albums' && <section className="sec"><div className="grid">{al.map(a => <Link key={a.key} href={`/album/${enc(a.key)}`} className="stamp-link"><Stamp cover={coverOf(byId[a.ids[0]])} title={a.name} sub={a.sub} tag={`${a.ids.length} SONGS`} /></Link>)}</div>{!al.length && <div className="empty"><h3>No albums yet</h3><p>Albums come from each file’s tags.</p></div>}</section>}
      {tab === 'Artists' && <section className="sec"><div className="grid">{ar.map(a => <Link key={a.key} href={`/artist/${enc(a.key)}`} className="stamp-link"><Stamp round cover={textCover('artist-' + a.name)} title={a.name} sub={a.sub} /></Link>)}</div>{!ar.length && <div className="empty"><h3>No artists yet</h3></div>}</section>}
      {tab === 'Playlists' && (
        <section className="sec"><div className="grid">
          <button className="stamp-link new-pl" onClick={newPl}><Stamp cover={textCover('new playlist')} title="New playlist" sub="Start empty" badge={<span className="plus-badge"><Icon name="plus" size={34} /></span>} /></button>
          <Link href="/liked" className="stamp-link"><Stamp cover={textCover('Liked')} title="Liked" sub="Your favourites" /></Link>
          {playlists.map(p => <Link key={p.id} href={`/playlist/${p.id}`} className="stamp-link"><Stamp cover={p.songIds[0] && byId[p.songIds[0]] ? coverOf(byId[p.songIds[0]]) : textCover(p.id)} title={p.name} sub={`${p.songIds.length} songs`} /></Link>)}
        </div></section>
      )}
      {tab === 'Downloaded' && (
        <section className="sec">
          {dl.length ? <><p className="muted">{dl.length} song{dl.length === 1 ? '' : 's'} stored on this device. They play with no connection.</p><div className="rows">{dl.map((s, i) => <SongRow key={s.id} song={s} ids={dlIds} index={i} />)}</div></>
            : <div className="empty"><h3>Nothing downloaded</h3><p>Open ••• on any song and choose “Download for offline”, or use “Download all” on an album or playlist.</p></div>}
        </section>
      )}
    </div>
  );
}
