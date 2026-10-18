'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { usePlayer } from '@/lib/player';
import { useLib } from '@/lib/store';
import { useUI } from '@/lib/ui';
import { Icon, type IconName } from './Icon';
import { MenuLayer, ModalLayer, Toast } from './Layers';
import { NowPlaying } from './NowPlaying';
import { PlayerBar } from './PlayerBar';
import { ThemeButton } from './ThemeButton';

const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: '/', label: 'Home', icon: 'home' }, { href: '/search', label: 'Search', icon: 'search' },
  { href: '/library', label: 'Library', icon: 'library' }, { href: '/upload', label: 'Add', icon: 'add' },
];
const active = (path: string, href: string) => (href === '/' ? path === '/' : path === href || path.startsWith(href + '/'));

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname(), router = useRouter();
  const playlists = useLib(s => s.playlists), stale = useLib(s => s.stale), loaded = useLib(s => s.loaded);
  const [online, setOnline] = useState(true);

  useEffect(() => {
    if (path === '/login') return;
    void useLib.getState().load().then(() => usePlayer.getState().restore());
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    const on = () => { setOnline(true); void useLib.getState().load(); }, off = () => setOnline(false);
    setOnline(navigator.onLine); addEventListener('online', on); addEventListener('offline', off);
    return () => { removeEventListener('online', on); removeEventListener('offline', off); };
  }, [path === '/login']); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement; if (t.closest('input,textarea,select,[contenteditable]') || e.metaKey || e.ctrlKey || e.altKey) return;
      const p = usePlayer.getState();
      if (e.key === ' ' && !t.closest('button,[role="button"],a')) { e.preventDefault(); p.toggle(); }
      else if (e.key === 'ArrowRight') { e.shiftKey ? p.next(false) : p.seek(p.time + 5); }
      else if (e.key === 'ArrowLeft') { e.shiftKey ? p.prev() : p.seek(Math.max(0, p.time - 5)); }
      else if (e.key === '/') { e.preventDefault(); router.push('/search'); }
    };
    addEventListener('keydown', k); return () => removeEventListener('keydown', k);
  }, [router]);

  if (path === '/login') return <>{children}<Toast /></>;
  return (
    <>
      <div className="app" id="app">
        <aside className="side" aria-label="Sidebar">
          <Link href="/" className="brand"><span className="brand-mark" aria-hidden="true" />Postmark</Link>
          <nav className="side-nav" aria-label="Main">
            {NAV.map(n => <Link key={n.href} href={n.href} className="nav" aria-current={active(path, n.href) ? 'page' : undefined}><Icon name={n.icon} size={21} />{n.label}</Link>)}
            <Link href="/settings" className="nav" aria-current={active(path, '/settings') ? 'page' : undefined}><Icon name="gear" size={21} />Settings</Link>
          </nav>
          <div className="side-pl">
            <div className="side-pl-h"><span className="mono">Playlists</span>
              <button className="ib sm" aria-label="New playlist" onClick={async () => { const v = await useUI.getState().form('New playlist', [{ name: 'name', label: 'Name', placeholder: 'Late night drive', required: true }], 'Create'); if (v?.name.trim()) { const p = await useLib.getState().createPlaylist(v.name.trim()); if (p) router.push(`/playlist/${p.id}`); } }}><Icon name="plus" size={18} /></button></div>
            {playlists.length === 0 && <span className="side-empty">No playlists yet</span>}
            {playlists.map(p => <Link key={p.id} href={`/playlist/${p.id}`} className="side-link" aria-current={path === `/playlist/${p.id}` ? 'page' : undefined}>{p.name}<span className="mono">{p.songIds.length}</span></Link>)}
          </div>
          <div className="side-foot"><ThemeButton label /></div>
        </aside>
        <main className="main" id="main">
          {(!online || stale) && loaded && <div className="banner" role="status"><Icon name="download" size={15} />{online ? 'Showing your saved library' : 'Offline. Downloaded songs still play.'}</div>}
          {children}
        </main>
        <nav className="tabs" aria-label="Main">
          {NAV.map(n => <Link key={n.href} href={n.href} className="tab" aria-current={active(path, n.href) ? 'page' : undefined}><Icon name={n.icon} size={24} /><span>{n.label}</span></Link>)}
        </nav>
      </div>
      <PlayerBar /><NowPlaying /><MenuLayer /><ModalLayer /><Toast />
    </>
  );
}
