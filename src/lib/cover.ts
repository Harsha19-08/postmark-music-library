import { coverUri } from './art';
import type { CatalogEntry } from './catalog';
import type { Song } from './types';

/** Stable seed so a song keeps the same generated art wherever it appears. */
export const seedOf = (title: string, artist: string) => `${title}|${artist}`;
export const coverOf = (s: Pick<Song, 'id' | 'title' | 'artist' | 'hasCover'>) => (s.hasCover ? `/api/songs/${s.id}/cover` : coverUri(seedOf(s.title, s.artist)));
export const catalogCover = (e: CatalogEntry) => coverUri(seedOf(e.title, e.artist));
export const textCover = (label: string) => coverUri('collection|' + label);

const pngCache = new Map<string, Promise<string>>();
/** PNG data URL for the lock-screen artwork (iOS does not render SVG there). */
export function coverPng(s: Pick<Song, 'id' | 'title' | 'artist' | 'hasCover'>): Promise<string> {
  const key = s.hasCover ? s.id : seedOf(s.title, s.artist);
  let p = pngCache.get(key);
  if (!p) {
    p = new Promise<string>((ok) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas'); c.width = c.height = 512;
        const x = c.getContext('2d')!; const m = Math.min(img.width, img.height);
        x.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, 512, 512);
        ok(c.toDataURL('image/png'));
      };
      img.onerror = () => ok('');
      img.src = coverOf(s);
    });
    pngCache.set(key, p);
  }
  return p;
}
