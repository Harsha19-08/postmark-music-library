'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { pickFiles } from '@/components/actions';
import { Icon } from '@/components/Icon';
import { SongRow } from '@/components/SongRow';
import { Stamp } from '@/components/Stamp';
import { CATALOG, matchCatalog, norm } from '@/lib/catalog';
import { catalogCover, textCover } from '@/lib/cover';
import { useLib } from '@/lib/store';
import { LANGS } from '@/lib/types';

export default function Search() {
  const songs = useLib(s => s.songs);
  const [q, setQ] = useState('');
  const n = norm(q);
  const hits = useMemo(() => (n ? songs.filter(s => norm(`${s.title} ${s.artist} ${s.album}`).includes(n)) : []), [songs, n]);
  const owned = useMemo(() => new Set(songs.map(s => s.catalogId ?? matchCatalog(s.title, s.artist)?.id)), [songs]);
  const ghosts = useMemo(() => (n ? CATALOG.filter(c => !owned.has(c.id) && norm(`${c.title} ${c.artist} ${c.album}`).includes(n)).slice(0, 8) : []), [n, owned]);
  const ids = hits.map(s => s.id);
  return (
    <div className="page">
      <header className="top"><h1 className="hello">Search</h1></header>
      <label className="searchbox"><Icon name="search" size={20} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Songs, artists, albums" aria-label="Search your library" type="search" autoFocus enterKeyHint="search" /></label>
      {!n && (
        <section className="sec"><div className="sec-h"><h2>Browse by language</h2></div>
          <div className="grid">
            {[...LANGS].map(l => { const c = songs.filter(s => s.lang === l).length; return <Link key={l} href={`/language/${l}`} className="stamp-link"><Stamp cover={textCover(l)} title={l === 'Other' ? 'My music' : l} sub={`${c} song${c === 1 ? '' : 's'}`} /></Link>; })}
            <Link href="/liked" className="stamp-link"><Stamp cover={textCover('Liked')} title="Liked" sub="Your favourites" /></Link>
          </div>
        </section>
      )}
      {n && (
        <section className="sec">
          <div className="sec-h"><h2>{hits.length ? `${hits.length} in your library` : 'Nothing in your library'}</h2></div>
          {hits.length > 0 && <div className="rows">{hits.slice(0, 60).map((s, i) => <SongRow key={s.id} song={s} ids={ids} index={i} />)}</div>}
          {ghosts.length > 0 && <><div className="sec-h" style={{ marginTop: 28 }}><h2>Not added yet</h2></div><div className="grid">{ghosts.map(g => <Stamp key={g.id} ghost cover={catalogCover(g)} title={g.title} sub={g.artist} tag="ADD FILE" onClick={() => pickFiles({ catalogId: g.id })} />)}</div></>}
          {!hits.length && !ghosts.length && <div className="empty"><h3>No match for “{q}”</h3><p>Try an artist, a film or part of a title.</p></div>}
        </section>
      )}
    </div>
  );
}
