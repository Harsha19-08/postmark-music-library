'use client';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/Icon';
import { ThemeButton } from '@/components/ThemeButton';
import { keepStorage, storageUsage } from '@/lib/offline';
import { useLib } from '@/lib/store';
import { useUI } from '@/lib/ui';

const size = (n: number) => (n > 1e9 ? `${(n / 1e9).toFixed(2)} GB` : n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.round(n / 1e3)} KB`);

export default function Settings() {
  const songs = useLib(s => s.songs), offline = useLib(s => s.offline), byId = useLib(s => s.byId);
  const [use, setUse] = useState({ used: 0, quota: 0 }), [kept, setKept] = useState<boolean | null>(null);
  useEffect(() => { void storageUsage().then(setUse); void keepStorage().then(setKept); }, [offline.size]);
  const total = songs.reduce((a, s) => a + s.size, 0), onDevice = [...offline].reduce((a, i) => a + (byId[i]?.size ?? 0), 0);
  const missing = songs.filter(s => !offline.has(s.id)).map(s => s.id);
  const logout = async () => { await fetch('/api/auth/logout', { method: 'POST' }); location.href = '/login'; };
  return (
    <div className="page">
      <header className="top"><h1 className="hello">Settings</h1></header>
      <section className="panel-s"><h3>Your library</h3>
        <dl><div><dt>Songs</dt><dd>{songs.length}</dd></div><div><dt>On the server</dt><dd>{size(total)}</dd></div><div><dt>Downloaded on this device</dt><dd>{offline.size} · {size(onDevice)}</dd></div>
          {use.quota > 0 && <div><dt>Browser storage used</dt><dd>{size(use.used)} of {size(use.quota)}</dd></div>}</dl></section>
      <section className="panel-s"><h3>Offline listening</h3>
        <p className="muted">Downloaded songs are saved inside this browser and play with no connection. Each device keeps its own downloads.</p>
        <div className="coll-acts">
          <button className="btn solid" disabled={!missing.length} onClick={() => void useLib.getState().download(missing)}><Icon name="download" size={18} />Download everything ({missing.length})</button>
          <button className="btn" disabled={!offline.size} onClick={async () => { if (await useUI.getState().confirm('Remove all downloads?', 'Songs stay in your library. You can download them again any time.', 'Remove')) await useLib.getState().removeDownloads(); }}>Remove downloads</button>
        </div>
        {kept === false && <p className="muted">This browser may clear downloads when it runs low on space. Installing Postmark to your home screen makes them safer.</p>}
      </section>
      <section className="panel-s"><h3>Appearance</h3><ThemeButton label /></section>
      <section className="panel-s"><h3>Account</h3><button className="btn" onClick={logout}>Sign out</button></section>
    </div>
  );
}
