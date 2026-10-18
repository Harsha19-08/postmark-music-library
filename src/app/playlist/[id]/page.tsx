'use client';
import { use } from 'react';
import { useRouter } from 'next/navigation';
import { Collection } from '@/components/Collection';
import { Icon } from '@/components/Icon';
import { textCover } from '@/lib/cover';
import { useLib } from '@/lib/store';
import { useUI } from '@/lib/ui';

export default function Playlist({ params }: { params: Promise<{ id: string }> }) {
  const id = use(params).id, router = useRouter(), p = useLib(s => s.playlists.find(x => x.id === id)), loaded = useLib(s => s.loaded);
  if (!p) return <div className="page">{loaded ? <div className="empty"><h3>Playlist not found</h3><p>It may have been deleted.</p></div> : null}</div>;
  const rename = async () => { const v = await useUI.getState().form('Rename playlist', [{ name: 'name', label: 'Name', value: p.name, required: true }]); if (v?.name.trim()) void useLib.getState().renamePlaylist(id, v.name.trim()); };
  const del = async () => { if (await useUI.getState().confirm('Delete playlist?', `“${p.name}” will be deleted. The songs stay in your library.`, 'Delete', true)) { await useLib.getState().deletePlaylist(id); router.replace('/library'); } };
  return <Collection kind="Playlist" title={p.name} ids={p.songIds} cover={textCover(p.id)} playlistId={id}
    extra={<><button className="btn" onClick={rename}>Rename</button><button className="btn" onClick={del} aria-label="Delete playlist"><Icon name="trash" size={18} /></button></>} />;
}
