import fs from 'node:fs';
import { createClient, type Client, type Row } from '@libsql/client';
import { AUDIO_DIR, COVER_DIR, DATA_DIR, DB_URL, TMP_DIR } from './config';
import type { Lang, Library, Playlist, SavedLink, Song } from './types';

const g = globalThis as unknown as { __pm_db?: Client; __pm_ready?: Promise<void> };

function client(): Client {
  if (!g.__pm_db) {
    if (process.env.VERCEL && !process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is required on Vercel. Use a hosted libSQL/Turso database.');
    }
    for (const d of [DATA_DIR, AUDIO_DIR, COVER_DIR, TMP_DIR]) fs.mkdirSync(d, { recursive: true });
    g.__pm_db = createClient({ url: DB_URL, authToken: process.env.DATABASE_AUTH_TOKEN });
  }
  return g.__pm_db;
}

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS songs (
     id TEXT PRIMARY KEY, title TEXT NOT NULL, artist TEXT NOT NULL, album TEXT NOT NULL DEFAULT '',
     lang TEXT NOT NULL DEFAULT 'Other', genre TEXT NOT NULL DEFAULT '', year INTEGER, track_no INTEGER,
     duration REAL NOT NULL DEFAULT 0, mime TEXT NOT NULL, size INTEGER NOT NULL, file TEXT NOT NULL,
     cover TEXT, hash TEXT NOT NULL UNIQUE, catalog_id TEXT, created_at INTEGER NOT NULL,
     plays INTEGER NOT NULL DEFAULT 0, last_played INTEGER)`,
  `CREATE INDEX IF NOT EXISTS songs_artist ON songs(artist)`,
  `CREATE INDEX IF NOT EXISTS songs_album ON songs(album)`,
  `CREATE TABLE IF NOT EXISTS playlists (id TEXT PRIMARY KEY, name TEXT NOT NULL, created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS playlist_songs (
     playlist_id TEXT NOT NULL, song_id TEXT NOT NULL, position INTEGER NOT NULL,
     PRIMARY KEY (playlist_id, song_id))`,
  `CREATE INDEX IF NOT EXISTS ps_order ON playlist_songs(playlist_id, position)`,
  `CREATE TABLE IF NOT EXISTS likes (song_id TEXT PRIMARY KEY, created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS links (id TEXT PRIMARY KEY, title TEXT NOT NULL, artist TEXT NOT NULL DEFAULT '', url TEXT NOT NULL, provider TEXT NOT NULL, created_at INTEGER NOT NULL)`,
];

export async function db(): Promise<Client> {
  const c = client();
  if (!g.__pm_ready) {
    g.__pm_ready = (async () => {
      try { await c.execute('PRAGMA journal_mode=WAL'); } catch { /* remote libsql */ }
      await c.batch(SCHEMA, 'write');
    })();
    g.__pm_ready.catch(() => { g.__pm_ready = undefined; });
  }
  await g.__pm_ready;
  return c;
}

const toSong = (r: Row): Song => ({
  id: String(r.id), title: String(r.title), artist: String(r.artist), album: String(r.album), lang: String(r.lang) as Lang,
  genre: String(r.genre), year: r.year == null ? null : Number(r.year), trackNo: r.track_no == null ? null : Number(r.track_no),
  duration: Number(r.duration), mime: String(r.mime), size: Number(r.size), hasCover: !!r.cover,
  catalogId: r.catalog_id == null ? null : String(r.catalog_id), createdAt: Number(r.created_at), plays: Number(r.plays),
});

export async function library(): Promise<Library> {
  const c = await db();
  const [s, p, ps, l, lk] = await Promise.all([
    c.execute('SELECT * FROM songs ORDER BY created_at DESC'),
    c.execute('SELECT * FROM playlists ORDER BY created_at ASC'),
    c.execute('SELECT playlist_id, song_id FROM playlist_songs ORDER BY playlist_id, position'),
    c.execute('SELECT song_id FROM likes ORDER BY created_at DESC'),
    c.execute('SELECT * FROM links ORDER BY created_at DESC'),
  ]);
  const by = new Map<string, string[]>();
  for (const r of ps.rows) { const k = String(r.playlist_id); (by.get(k) ?? by.set(k, []).get(k)!).push(String(r.song_id)); }
  const playlists: Playlist[] = p.rows.map(r => ({ id: String(r.id), name: String(r.name), createdAt: Number(r.created_at), songIds: by.get(String(r.id)) ?? [] }));
  const links: SavedLink[] = lk.rows.map(r => ({ id: String(r.id), title: String(r.title), artist: String(r.artist), url: String(r.url), provider: String(r.provider), createdAt: Number(r.created_at) }));
  return { songs: s.rows.map(toSong), playlists, likes: l.rows.map(r => String(r.song_id)), links };
}

export interface SongRow {
  id: string; title: string; artist: string; album: string; lang: Lang; genre: string; year: number | null; trackNo: number | null;
  duration: number; mime: string; size: number; file: string; cover: string | null; hash: string; catalogId: string | null;
}

export async function songRow(id: string): Promise<(Song & { file: string; cover: string | null; hash: string }) | null> {
  const c = await db();
  const r = (await c.execute({ sql: 'SELECT * FROM songs WHERE id = ?', args: [id] })).rows[0];
  return r ? { ...toSong(r), file: String(r.file), cover: r.cover == null ? null : String(r.cover), hash: String(r.hash) } : null;
}
export async function songByHash(hash: string): Promise<Song | null> {
  const c = await db();
  const r = (await c.execute({ sql: 'SELECT * FROM songs WHERE hash = ?', args: [hash] })).rows[0];
  return r ? toSong(r) : null;
}
export async function insertSong(s: SongRow): Promise<Song> {
  const c = await db();
  await c.execute({
    sql: `INSERT INTO songs (id,title,artist,album,lang,genre,year,track_no,duration,mime,size,file,cover,hash,catalog_id,created_at)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    args: [s.id, s.title, s.artist, s.album, s.lang, s.genre, s.year, s.trackNo, s.duration, s.mime, s.size, s.file, s.cover, s.hash, s.catalogId, Date.now()],
  });
  const { file: _f, cover: _c, hash: _h, ...pub } = (await songRow(s.id))!;
  void _f; void _c; void _h;
  return pub;
}
export async function updateSong(id: string, p: Partial<Pick<Song, 'title' | 'artist' | 'album' | 'lang' | 'year' | 'genre'>>): Promise<Song | null> {
  const c = await db();
  const cols: string[] = [], args: (string | number | null)[] = [];
  for (const k of ['title', 'artist', 'album', 'lang', 'genre', 'year'] as const) if (p[k] !== undefined) { cols.push(`${k} = ?`); args.push(p[k] as string | number | null); }
  if (cols.length) await c.execute({ sql: `UPDATE songs SET ${cols.join(', ')} WHERE id = ?`, args: [...args, id] });
  const r = await songRow(id);
  if (!r) return null;
  const { file: _f, cover: _c, hash: _h, ...pub } = r;
  void _f; void _c; void _h;
  return pub;
}
export async function deleteSong(id: string) {
  const c = await db();
  await c.batch([
    { sql: 'DELETE FROM likes WHERE song_id = ?', args: [id] },
    { sql: 'DELETE FROM playlist_songs WHERE song_id = ?', args: [id] },
    { sql: 'DELETE FROM songs WHERE id = ?', args: [id] },
  ], 'write');
}
export async function bumpPlay(id: string) {
  const c = await db();
  await c.execute({ sql: 'UPDATE songs SET plays = plays + 1, last_played = ? WHERE id = ?', args: [Date.now(), id] });
}

export async function setLike(id: string, on: boolean) {
  const c = await db();
  if (on) await c.execute({ sql: 'INSERT OR IGNORE INTO likes (song_id, created_at) VALUES (?, ?)', args: [id, Date.now()] });
  else await c.execute({ sql: 'DELETE FROM likes WHERE song_id = ?', args: [id] });
}

export async function createPlaylist(name: string, songIds: string[] = []): Promise<Playlist> {
  const c = await db();
  const id = 'pl_' + crypto.randomUUID().slice(0, 8), now = Date.now();
  await c.batch([
    { sql: 'INSERT INTO playlists (id,name,created_at) VALUES (?,?,?)', args: [id, name, now] },
    ...songIds.map((s, i) => ({ sql: 'INSERT OR IGNORE INTO playlist_songs (playlist_id,song_id,position) VALUES (?,?,?)', args: [id, s, i] })),
  ], 'write');
  return { id, name, createdAt: now, songIds };
}
export async function renamePlaylist(id: string, name: string) { await (await db()).execute({ sql: 'UPDATE playlists SET name = ? WHERE id = ?', args: [name, id] }); }
export async function deletePlaylist(id: string) {
  await (await db()).batch([{ sql: 'DELETE FROM playlist_songs WHERE playlist_id = ?', args: [id] }, { sql: 'DELETE FROM playlists WHERE id = ?', args: [id] }], 'write');
}
export async function addToPlaylist(id: string, songIds: string[]) {
  const c = await db();
  const max = Number((await c.execute({ sql: 'SELECT COALESCE(MAX(position), -1) AS m FROM playlist_songs WHERE playlist_id = ?', args: [id] })).rows[0].m);
  await c.batch(songIds.map((s, i) => ({ sql: 'INSERT OR IGNORE INTO playlist_songs (playlist_id,song_id,position) VALUES (?,?,?)', args: [id, s, max + 1 + i] })), 'write');
}
export async function removeFromPlaylist(id: string, songId: string) { await (await db()).execute({ sql: 'DELETE FROM playlist_songs WHERE playlist_id = ? AND song_id = ?', args: [id, songId] }); }
export async function reorderPlaylist(id: string, songIds: string[]) {
  await (await db()).batch([
    { sql: 'DELETE FROM playlist_songs WHERE playlist_id = ?', args: [id] },
    ...songIds.map((s, i) => ({ sql: 'INSERT OR IGNORE INTO playlist_songs (playlist_id,song_id,position) VALUES (?,?,?)', args: [id, s, i] })),
  ], 'write');
}
export async function playlistExists(id: string) { return (await (await db()).execute({ sql: 'SELECT 1 FROM playlists WHERE id = ?', args: [id] })).rows.length > 0; }

export async function addLink(l: { title: string; artist: string; url: string; provider: string }): Promise<SavedLink> {
  const id = 'ln_' + crypto.randomUUID().slice(0, 8), now = Date.now();
  await (await db()).execute({ sql: 'INSERT INTO links (id,title,artist,url,provider,created_at) VALUES (?,?,?,?,?,?)', args: [id, l.title, l.artist, l.url, l.provider, now] });
  return { id, ...l, createdAt: now };
}
export async function deleteLink(id: string) { await (await db()).execute({ sql: 'DELETE FROM links WHERE id = ?', args: [id] }); }
