import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createClient } from '@libsql/client';
import { parseBuffer } from 'music-metadata';
import { detectLang, matchCatalog } from '../src/lib/catalog';
import type { Lang } from '../src/lib/types';

type Env = Record<string, string>;
type StorageObject = { name: string; metadata?: { size?: number; mimetype?: string }; created_at?: string };

async function main() {
  const env: Env = {};
  for (const line of (await fs.readFile('.env.local', 'utf8')).split(/\r?\n/)) {
    const match = /^([^#=][^=]*)=(.*)$/.exec(line);
    if (match) env[match[1]] = match[2];
  }

  const supabaseUrl = env.SUPABASE_URL?.replace(/\/$/, '');
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = env.SUPABASE_STORAGE_BUCKET;
  if (!supabaseUrl || !serviceKey || !bucket) throw new Error('Missing Supabase environment configuration');
  if (!env.DATABASE_URL || !env.DATABASE_AUTH_TOKEN) throw new Error('Missing Turso environment configuration');

  const storageHeaders = { apikey: serviceKey, authorization: `Bearer ${serviceKey}` };
  const listUrl = `${supabaseUrl}/storage/v1/object/list/${encodeURIComponent(bucket)}`;

  async function list(prefix: string): Promise<StorageObject[]> {
  const response = await fetch(listUrl, {
    method: 'POST',
    headers: { ...storageHeaders, 'content-type': 'application/json' },
    body: JSON.stringify({ prefix, limit: 1000, offset: 0, sortBy: { column: 'name', order: 'asc' } }),
  });
  if (!response.ok) throw new Error(`Could not list Supabase objects (${response.status})`);
  return await response.json() as StorageObject[];
  }

  async function download(objectPath: string): Promise<Buffer> {
  const url = `${supabaseUrl}/storage/v1/object/${bucket}/${objectPath.split('/').map(encodeURIComponent).join('/')}`;
  const response = await fetch(url, { headers: storageHeaders });
  if (!response.ok) throw new Error(`Could not download ${objectPath} (${response.status})`);
  return Buffer.from(await response.arrayBuffer());
  }

  function filenameFallback(name: string) {
  const value = name.replace(/\.[a-z0-9]{2,5}$/i, '').replace(/_+/g, ' ').trim();
  const parts = value.split(/\s+[-–—]\s+/);
  return parts.length > 1 ? { title: parts.slice(1).join(' - '), artist: parts[0] } : { title: value || 'Untitled', artist: 'Unknown artist' };
  }

  const audio = (await list('audio')).filter(item => /\.(mp3|m4a|aac|wav|flac|ogg|oga|opus|webm|aiff|aif)$/i.test(item.name));
  const covers = new Set((await list('covers')).map(item => item.name.toLowerCase()));
  const db = createClient({ url: env.DATABASE_URL, authToken: env.DATABASE_AUTH_TOKEN });
  const existing = await db.execute('SELECT hash, file FROM songs');
  const known = new Set(existing.rows.flatMap(row => [String(row.hash), String(row.file)]));
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'postmark-import-'));
  let imported = 0;
  let skipped = 0;

try {
  for (const object of audio) {
    const hash = object.name.replace(/\.[^.]+$/, '');
    const file = `audio/${object.name}`;
    if (known.has(hash) || known.has(file)) {
      skipped++;
      continue;
    }

    const buffer = await download(file);
    const metadata = await parseBuffer(buffer, object.metadata?.mimetype || 'audio/mpeg', { duration: true });
    const fallback = filenameFallback(object.name);
    const common = metadata.common;
    const title = (common.title || fallback.title).trim();
    const artist = (common.artist || common.albumartist || fallback.artist || 'Unknown artist').trim();
    const catalog = matchCatalog(title, artist);
    const lang = detectLang(title, artist, catalog) as Lang;
    const coverName = [...covers].find(name => name.startsWith(`${hash.toLowerCase()}.`));
    const createdAt = object.created_at ? Date.parse(object.created_at) : Date.now();
    const id = randomUUID().slice(0, 12);
    await db.execute({
      sql: `INSERT INTO songs
        (id,title,artist,album,lang,genre,year,track_no,duration,mime,size,file,cover,hash,catalog_id,created_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      args: [
        id, catalog?.title || title, catalog?.artist || artist, catalog?.album || (common.album || '').trim(),
        lang, common.genre?.[0] || '', common.year ?? null, common.track?.no ?? null,
        metadata.format.duration || 0, object.metadata?.mimetype || 'audio/mpeg',
        object.metadata?.size || buffer.byteLength, file, coverName || null, hash, catalog?.id || null, createdAt,
      ],
    });
    known.add(hash);
    known.add(file);
    imported++;
    console.log(`Imported ${title} - ${artist}`);
  }
} finally {
  await fs.rm(tempDir, { recursive: true, force: true });
}

  console.log(`Migration complete: ${imported} imported, ${skipped} skipped.`);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
