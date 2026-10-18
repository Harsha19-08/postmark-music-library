'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { pickFiles } from '@/components/actions';
import { Icon } from '@/components/Icon';
import { PROVIDER_NAMES, providerFor } from '@/lib/providers';
import { useLib } from '@/lib/store';
import { useUI } from '@/lib/ui';

const mb = (n: number) => (n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1e3))} KB`);

export default function Upload() {
  const uploads = useLib(s => s.uploads), links = useLib(s => s.links), clear = useLib(s => s.clearUploads);
  const [over, setOver] = useState(false), [url, setUrl] = useState(''), depth = useRef(0);
  const busy = uploads.some(u => u.status === 'uploading' || u.status === 'queued'), done = uploads.filter(u => u.status === 'done').length;
  const drop = (e: React.DragEvent) => { e.preventDefault(); depth.current = 0; setOver(false); const f = [...e.dataTransfer.files]; if (f.length) useLib.getState().upload(f); };
  const saveLink = async (e: React.FormEvent) => {
    e.preventDefault(); const p = providerFor(url);
    if (!p) { useUI.getState().say(`Supported links: ${PROVIDER_NAMES.join(', ')}`); return; }
    const v = await useUI.getState().form(`Save ${p.provider} link`, [{ name: 'title', label: 'Song title', required: true }, { name: 'artist', label: 'Artist' }], 'Save');
    if (v && (await useLib.getState().addLink(p.url, v.title, v.artist))) setUrl('');
  };
  return (
    <div className="page">
      <header className="top"><h1 className="hello">Add music</h1></header>
      <div className={`drop${over ? ' over' : ''}`} onDragEnter={e => { e.preventDefault(); depth.current++; setOver(true); }} onDragLeave={() => { if (--depth.current <= 0) setOver(false); }} onDragOver={e => e.preventDefault()} onDrop={drop}>
        <span className="mono">MP3 · M4A · AAC · WAV · FLAC · OGG · OPUS</span>
        <h2>Drop your songs here</h2>
        <p>Files go straight into your database and file storage on the server. Title, artist, album and cover art are read from each file. Add once on your laptop, play anywhere.</p>
        <div className="drop-acts"><button className="btn solid" onClick={() => pickFiles({ multiple: true })}><Icon name="add" size={18} />Choose files</button><button className="btn" onClick={() => pickFiles({ multiple: true, directory: true })}>Choose a folder</button></div>
      </div>

      {uploads.length > 0 && (
        <section className="sec">
          <div className="sec-h"><h2>{busy ? 'Uploading…' : `${done} added`}</h2>{!busy && <button className="chip" onClick={clear}>Clear</button>}</div>
          <ul className="ups">
            {uploads.map(u => (
              <li key={u.key} className={`up up-${u.status}`}>
                <span className="up-ico"><Icon name={u.status === 'done' ? 'check' : u.status === 'error' ? 'close' : u.status === 'duplicate' ? 'check' : 'music'} size={18} /></span>
                <span className="up-main"><b>{u.name}</b><i>{u.status === 'error' || u.status === 'duplicate' ? u.message : u.status === 'done' ? 'Added to your library' : u.status === 'queued' ? `Waiting · ${mb(u.size)}` : `${Math.round(u.progress * 100)}% of ${mb(u.size)}`}</i>
                  {u.status === 'uploading' && <span className="up-bar"><span style={{ transform: `scaleX(${u.progress})` }} /></span>}</span>
              </li>
            ))}
          </ul>
          {!busy && done > 0 && <Link className="btn" href="/library">Go to library</Link>}
        </section>
      )}

      <section className="sec">
        <div className="sec-h"><h2>Save a link</h2></div>
        <form className="linkform" onSubmit={saveLink}>
          <input value={url} onChange={e => setUrl(e.target.value)} type="url" inputMode="url" placeholder="Paste a YouTube, Spotify, Apple Music or SoundCloud link" aria-label="Music link" />
          <button className="btn solid" type="submit" disabled={!url.trim()}>Save</button>
        </form>
        <p className="muted">Links open in their own app or site. Postmark plays only the files you upload.</p>
        {links.length > 0 && <ul className="links">{links.map(l => (
          <li key={l.id}><a href={l.url} target="_blank" rel="noopener noreferrer"><span className="mono">{l.provider}</span><b>{l.title}</b><i>{l.artist}</i></a>
            <button className="ib" aria-label={`Remove ${l.title}`} onClick={() => void useLib.getState().deleteLink(l.id)}><Icon name="close" size={18} /></button></li>
        ))}</ul>}
      </section>

      <section className="sec how">
        <div><b>Downloaded from the web</b><span>Save the audio file to your laptop, then drop it above. Postmark stores your own files only.</span></div>
        <div><b>Add a folder</b><span>Pick your whole music folder. Duplicates are skipped automatically.</span></div>
        <div><b>Remix live</b><span>Open any song, tap Effects: slowed and reverb, nightcore, 8D, bass boost, lo-fi.</span></div>
      </section>
    </div>
  );
}
