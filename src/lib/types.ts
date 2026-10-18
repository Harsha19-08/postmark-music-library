export type Lang = 'Telugu' | 'Hindi' | 'English' | 'Other';
export const LANGS: Lang[] = ['Telugu', 'Hindi', 'English', 'Other'];

export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  lang: Lang;
  genre: string;
  year: number | null;
  trackNo: number | null;
  duration: number;
  mime: string;
  size: number;
  hasCover: boolean;
  catalogId: string | null;
  createdAt: number;
  plays: number;
}
export interface Playlist { id: string; name: string; createdAt: number; songIds: string[] }
export interface SavedLink { id: string; title: string; artist: string; url: string; provider: string; createdAt: number }
export interface Library { songs: Song[]; playlists: Playlist[]; likes: string[]; links: SavedLink[] }
