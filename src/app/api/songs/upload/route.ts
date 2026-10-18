import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { AUDIO_DIR, AUDIO_EXT, COVER_DIR, TMP_DIR } from '@/lib/config';
import { CATALOG, detectLang, matchCatalog } from '@/lib/catalog';
import { insertSong, songByHash } from '@/lib/db';
import { bad, json } from '@/lib/http';
import { hostedStorage, removeObject, uploadObject } from '@/lib/storage';
import { LANGS, type Lang } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MIME: Record<string, string> = {
  '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.aac': 'audio/aac', '.wav': 'audio/wav', '.flac': 'audio/flac',
  '.ogg': 'audio/ogg', '.oga': 'audio/ogg', '.opus': 'audio/ogg', '.webm': 'audio/webm', '.aiff': 'audio/aiff', '.aif': 'audio/aiff',
};
const COVER_EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };

function guess(filename: string) {
  const n = filename.replace(/\.[a-z0-9]{2,5}$/i, '').replace(/_+/g, ' ')
    .replace(/\s*[[(](official|lyric|audio|video|hd|hq|full|music|4k|visualizer)[^\])]*[\])]/gi, '')
    .replace(/\s*\[[\w-]{9,12}\]\s*$/, '').replace(/^\d{1,3}[\s.\-_)]+/, '').trim();
  const m = n.split(/\s+[-–—]\s+/);
  return m.length >= 2 ? { artist: m[0].trim(), title: m.slice(1).join(' - ').trim() } : { artist: '', title: n || 'Untitled' };
}

/**
 * Raw streaming upload: PUT /api/songs/upload?name=<filename>[&catalogId=..][&lang=..]
 * The browser streams the file; we hash while writing to disk, de-duplicate by SHA-256,
 * read tags + cover with music-metadata, then move the file into content-addressed storage.
 */
export async function PUT(req: Request) {
  if (hostedStorage && (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('your-db.turso.io'))) {
    return bad('Hosted Storage is configured, but DATABASE_URL is still missing or using the example Turso URL.', 503);
  }
  const url = new URL(req.url);
  const name = (url.searchParams.get('name') || 'untitled').slice(0, 300);
  const ext = path.extname(name).toLowerCase();
  if (!AUDIO_EXT.includes(ext)) return bad(`Unsupported file type "${ext || name}". Use MP3, M4A, AAC, WAV, FLAC, OGG, OPUS or WEBM.`, 415);
  if (!req.body) return bad('Empty upload');
  await fsp.mkdir(TMP_DIR, { recursive: true });
  const tmp = path.join(TMP_DIR, randomUUID() + ext);
  const hasher = createHash('sha256');
  let size = 0;
  try {
    await pipeline(
      Readable.fromWeb(req.body as unknown as import('node:stream/web').ReadableStream),
      async function* (src: AsyncIterable<Buffer>) { for await (const c of src) { hasher.update(c); size += c.length; yield c; } },
      fs.createWriteStream(tmp),
    );
  } catch { await fsp.rm(tmp, { force: true }); return bad('Upload interrupted', 499); }
  if (size === 0) { await fsp.rm(tmp, { force: true }); return bad('Empty file'); }

  const hash = hasher.digest('hex');
  const dup = await songByHash(hash);
  if (dup) { await fsp.rm(tmp, { force: true }); return json({ song: dup, duplicate: true }); }

  let meta;
  try {
    const { parseFile } = await import('music-metadata');
    meta = await parseFile(tmp, { duration: true });
  } catch { await fsp.rm(tmp, { force: true }); return bad('That file is not readable audio.', 415); }
  const duration = meta.format.duration ?? 0;
  if (!duration) { await fsp.rm(tmp, { force: true }); return bad('Could not read the length of that audio file.', 415); }

  const g = guess(name), c = meta.common;
  const title = (c.title || g.title).trim(), artist = (c.artist || c.albumartist || g.artist || 'Unknown artist').trim();
  const forced = CATALOG.find(e => e.id === url.searchParams.get('catalogId')) ?? null;
  const entry = forced ?? matchCatalog(title, artist);
  const langParam = url.searchParams.get('lang') as Lang | null;
  const lang = langParam && LANGS.includes(langParam) ? langParam : detectLang(title, artist, entry);

  const localRel = path.join(hash.slice(0, 2), hash + ext);
  const rel = hostedStorage ? `audio/${hash}${ext}` : localRel;
  if (hostedStorage) {
    try { await uploadObject(rel, tmp, MIME[ext] ?? 'audio/mpeg'); }
    catch (e) { await fsp.rm(tmp, { force: true }); return bad((e as Error).message, 502); }
  } else {
    const dir = path.join(AUDIO_DIR, hash.slice(0, 2));
    await fsp.mkdir(dir, { recursive: true });
    await fsp.rename(tmp, path.join(AUDIO_DIR, localRel)).catch(async () => { await fsp.copyFile(tmp, path.join(AUDIO_DIR, localRel)); await fsp.rm(tmp, { force: true }); });
  }

  let cover: string | null = null;
  const pic = c.picture?.[0];
  if (pic && COVER_EXT[pic.format.toLowerCase()]) {
    cover = `${hash}.${COVER_EXT[pic.format.toLowerCase()]}`;
    if (hostedStorage) {
      try { await uploadObject(`covers/${cover}`, pic.data, pic.format); }
      catch (e) {
        await fsp.rm(tmp, { force: true });
        await removeObject(rel).catch(() => undefined);
        return bad((e as Error).message, 502);
      }
    } else await fsp.writeFile(path.join(COVER_DIR, cover), pic.data);
  }
  await fsp.rm(tmp, { force: true });

  let song;
  try {
    song = await insertSong({
      id: randomUUID().slice(0, 12), title: forced ? forced.title : title, artist: forced ? forced.artist : artist,
      album: (forced ? forced.album : c.album || '').trim(), lang, genre: c.genre?.[0] ?? '', year: c.year ?? null, trackNo: c.track?.no ?? null,
      duration, mime: MIME[ext] ?? 'audio/mpeg', size, file: rel, cover, hash, catalogId: entry?.id ?? null,
    });
  } catch (e) {
    if (hostedStorage) {
      await removeObject(rel).catch(() => undefined);
      if (cover) await removeObject(`covers/${cover}`).catch(() => undefined);
    }
    return bad(`Could not save song metadata: ${(e as Error).message.slice(0, 300)}`, 502);
  }
  return json({ song, duplicate: false }, 201);
}
