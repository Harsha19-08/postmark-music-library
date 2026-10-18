'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { pickFiles, useSongMenu } from '@/components/actions';
import { Icon } from '@/components/Icon';
import { Reel, type ReelItem } from '@/components/Reel';
import { Stamp } from '@/components/Stamp';
import { CATALOG, matchCatalog, type CatalogEntry } from '@/lib/catalog';
import { catalogCover, coverOf } from '@/lib/cover';
import { usePlayer } from '@/lib/player';
import { useLib } from '@/lib/store';
import { ThemeButton } from '@/components/ThemeButton';
import type { Lang, Song } from '@/lib/types';

const greet = (date: Date) => { const h = date.getHours(); return h < 5 ? 'Still up' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : h < 22 ? 'Good evening' : 'Late night'; };

function SongStamp({ song, ids, index }: { song: Song; ids: string[]; index: number }) {
  const playing = usePlayer(s => s.currentId === song.id && s.playing), current = usePlayer(s => s.currentId === song.id);
  const off = useLib(s => s.offline.has(song.id)), menu = useSongMenu();
  return <Stamp cover={coverOf(song)} title={song.title} sub={song.artist} playing={current && playing} tag={off ? 'ON DEVICE' : undefined} className={current ? 'is-cur' : ''}
    onClick={() => usePlayer.getState().playList(ids, index)} onMore={e => menu(e, song)} />;
}
const Ghost = ({ e }: { e: CatalogEntry }) => <Stamp ghost cover={catalogCover(e)} title={e.title} sub={e.artist} tag="ADD FILE" label={`${e.title} by ${e.artist}. Add your copy of this song.`} onClick={() => pickFiles({ catalogId: e.id })} />;

export default function Home() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);
  const songs = useLib(s => s.songs), recent = useLib(s => s.recent), byId = useLib(s => s.byId), loaded = useLib(s => s.loaded);
  const owned = useMemo(() => new Set(songs.map(s => s.catalogId ?? matchCatalog(s.title, s.artist)?.id).filter(Boolean) as string[]), [songs]);
  const missing = useMemo(() => CATALOG.filter(c => !owned.has(c.id)), [owned]);
  const recentSongs = recent.map(i => byId[i]).filter(Boolean).slice(0, 14);
  const added = songs.slice(0, 14);
  const shelves = (['Telugu', 'Hindi', 'English'] as Lang[]).map(l => ({ lang: l, mine: songs.filter(s => s.lang === l), ghosts: missing.filter(c => c.lang === l) }));
  const other = songs.filter(s => s.lang === 'Other');

  const reel: ReelItem[] = useMemo(() => {
    const mine = songs.slice(0, 8), ids = mine.map(s => s.id);
    const items: ReelItem[] = mine.map((s, i) => ({ key: s.id, cover: coverOf(s), title: s.title, sub: s.artist, onSelect: () => usePlayer.getState().playList(ids, i) }));
    const pick: CatalogEntry[] = []; for (let i = 0; pick.length < Math.max(0, 12 - items.length) && i < 12; i++) for (const l of ['Telugu', 'Hindi', 'English']) { const g = missing.filter(c => c.lang === l)[i]; if (g && pick.length < 12 - items.length) pick.push(g); }
    return [...items, ...pick.map(e => ({ key: e.id, cover: catalogCover(e), title: e.title, sub: e.artist, ghost: true, onSelect: () => pickFiles({ catalogId: e.id }) }))];
  }, [songs, missing]);

  return (
    <div className="page home">
      <header className="top">
        <div><span className="mono">{now?.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</span><h1 className="hello">{now ? greet(now) : 'Welcome back'}</h1></div>
        <div className="top-acts"><Link href="/search" className="ib" aria-label="Search"><Icon name="search" size={22} /></Link><Link href="/settings" className="ib" aria-label="Settings"><Icon name="gear" size={22} /></Link><ThemeButton /></div>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <h2>Every song, <em>stamped</em> and kept.</h2>
          <p>{songs.length ? `${songs.length} song${songs.length === 1 ? '' : 's'} in your library. Stored on your server, ready on every device.` : 'Upload your music once. It lives in your own database and plays on every device, offline.'}</p>
          <div className="hero-cta">
            <button className="btn solid" disabled={!songs.length} onClick={() => usePlayer.getState().playList(songs.map(s => s.id), 0)}><Icon name="play" size={18} />Play library</button>
            <button className="btn" onClick={() => { usePlayer.setState({ shuffle: true }); const ids = songs.map(s => s.id); usePlayer.getState().playList(ids, Math.floor(Math.random() * Math.max(1, ids.length))); }} disabled={!songs.length}><Icon name="shuffle" size={18} />Shuffle</button>
            <Link href="/upload" className="btn hide-m"><Icon name="add" size={18} />Add music</Link>
          </div>
        </div>
        <Reel items={reel} />
      </section>

      {loaded && songs.length === 0 && (
        <section className="starter"><div><h3>Start your collection</h3><p>The stamps below are favourites from Telugu, Hindi and English. Tap one to add your own copy of the file, or drop in a whole folder.</p></div>
          <button className="btn solid" onClick={() => pickFiles({ multiple: true, directory: true })}><Icon name="add" size={18} />Add a folder</button></section>
      )}

      {recentSongs.length > 0 && <section className="sec"><div className="sec-h"><h2>Continue listening</h2></div><div className="shelf">{recentSongs.map((s, i) => <SongStamp key={s.id} song={s} ids={recentSongs.map(x => x.id)} index={i} />)}</div></section>}
      {added.length > 0 && <section className="sec"><div className="sec-h"><h2>Recently added</h2><Link href="/library" className="more">See all</Link></div><div className="shelf">{added.map((s, i) => <SongStamp key={s.id} song={s} ids={added.map(x => x.id)} index={i} />)}</div></section>}

      {shelves.map(({ lang, mine, ghosts }) => (
        <section className="sec" key={lang}>
          <div className="sec-h"><div><span className="mono">{lang === 'Telugu' ? 'తెలుగు' : lang === 'Hindi' ? 'हिन्दी' : 'English'}</span><h2>{lang} favourites</h2></div><Link href={`/language/${lang}`} className="more">See all</Link></div>
          <div className="shelf">
            {mine.slice(0, 14).map((s, i) => <SongStamp key={s.id} song={s} ids={mine.map(x => x.id)} index={i} />)}
            {ghosts.slice(0, Math.max(0, 12 - mine.length)).map(e => <Ghost key={e.id} e={e} />)}
          </div>
        </section>
      ))}
      {other.length > 0 && <section className="sec"><div className="sec-h"><h2>More of your music</h2><Link href="/language/Other" className="more">See all</Link></div><div className="shelf">{other.slice(0, 14).map((s, i) => <SongStamp key={s.id} song={s} ids={other.map(x => x.id)} index={i} />)}</div></section>}
    </div>
  );
}
