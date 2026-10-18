'use client';
import type { MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import { catalogCover } from '@/lib/cover';
import type { CatalogEntry } from '@/lib/catalog';
import { usePlayer } from '@/lib/player';
import { useLib } from '@/lib/store';
import type { MenuEntry } from '@/lib/ui';
import { useUI } from '@/lib/ui';
import { LANGS, type Lang, type Song } from '@/lib/types';

export const enc = (s: string) => encodeURIComponent(s);

export async function addToPlaylistFlow(ids: string[]) {
  const ui = useUI.getState(), lib = useLib.getState();
  const opts = [{ id: '__new', label: 'New playlist…', sub: 'Create and add' }, ...lib.playlists.map(p => ({ id: p.id, label: p.name, sub: `${p.songIds.length} songs` }))];
  const pick = await ui.pick('Add to playlist', opts);
  if (!pick) return;
  if (pick === '__new') {
    const v = await ui.form('New playlist', [{ name: 'name', label: 'Name', placeholder: 'Late night drive', required: true }], 'Create');
    if (v?.name.trim()) await lib.createPlaylist(v.name.trim(), ids);
  } else await lib.addToPlaylist(pick, ids);
}

export async function editSongFlow(s: Song) {
  const ui = useUI.getState();
  const v = await ui.form('Edit details', [
    { name: 'title', label: 'Title', value: s.title, required: true }, { name: 'artist', label: 'Artist', value: s.artist, required: true },
    { name: 'album', label: 'Album', value: s.album }, { name: 'lang', label: `Language (${LANGS.join(', ')})`, value: s.lang },
  ]);
  if (!v) return;
  const lang = LANGS.find(l => l.toLowerCase() === v.lang.trim().toLowerCase()) as Lang | undefined;
  await useLib.getState().editSong(s.id, { title: v.title, artist: v.artist, album: v.album, ...(lang ? { lang } : {}) });
}

/** Opens the system file picker and uploads the chosen file(s). */
export function pickFiles(opts: { multiple?: boolean; directory?: boolean; catalogId?: string } = {}) {
  const i = document.createElement('input');
  i.type = 'file'; i.accept = 'audio/*,.mp3,.m4a,.aac,.wav,.flac,.ogg,.opus,.webm'; i.multiple = !!opts.multiple;
  if (opts.directory) (i as HTMLInputElement & { webkitdirectory: boolean }).webkitdirectory = true;
  i.onchange = () => { const f = [...(i.files ?? [])]; if (f.length) { useLib.getState().upload(f, opts.catalogId); useUI.getState().say(`Uploading ${f.length} file${f.length > 1 ? 's' : ''}…`); } };
  i.click();
}

export function useSongMenu() {
  const router = useRouter();
  return (e: MouseEvent<HTMLElement>, song: Song, opts: { playlistId?: string } = {}) => {
    e.stopPropagation();
    const lib = useLib.getState(), pl = usePlayer.getState(), ui = useUI.getState();
    const off = lib.offline.has(song.id);
    const items: MenuEntry[] = [
      { label: 'Play next', onSelect: () => pl.enqueue(song.id, 'next') },
      { label: 'Add to queue', onSelect: () => pl.enqueue(song.id, 'end') },
      { label: 'Add to playlist…', onSelect: () => void addToPlaylistFlow([song.id]) },
      { label: lib.likes.has(song.id) ? 'Remove from Liked' : 'Like', onSelect: () => void lib.like(song.id) },
      { label: off ? 'Remove download' : 'Download for offline', onSelect: () => (off ? void lib.removeDownloads([song.id]) : void lib.download([song.id])) },
    ];
    if (opts.playlistId) items.push({ label: 'Remove from this playlist', onSelect: () => void lib.removeFromPlaylist(opts.playlistId!, song.id) });
    items.push('sep', { label: 'Go to artist', onSelect: () => router.push(`/artist/${enc(song.artist.split(',')[0].trim())}`) });
    if (song.album) items.push({ label: 'Go to album', onSelect: () => router.push(`/album/${enc(song.album)}`) });
    items.push('sep', { label: 'Edit details…', onSelect: () => void editSongFlow(song) },
      { label: 'Delete from library…', danger: true, onSelect: async () => { if (await ui.confirm('Delete this song?', `“${song.title}” will be removed from the database and from every device.`, 'Delete', true)) void lib.deleteSong(song.id); } });
    ui.openMenu(e, items);
  };
}

export const catalogSub = (c: CatalogEntry) => c.artist;
export const catCover = catalogCover;
