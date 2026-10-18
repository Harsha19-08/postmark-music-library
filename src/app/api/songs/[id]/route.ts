import fsp from 'node:fs/promises';
import path from 'node:path';
import { AUDIO_DIR, COVER_DIR } from '@/lib/config';
import { deleteSong, songRow, updateSong } from '@/lib/db';
import { bad, json, type Ctx } from '@/lib/http';
import { LANGS, type Lang } from '@/lib/types';
import { hostedStorage, removeObject } from '@/lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : undefined);

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  const b = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!b) return bad('Invalid JSON');
  const patch: Parameters<typeof updateSong>[1] = {};
  const title = str(b.title); if (title) patch.title = title;
  const artist = str(b.artist); if (artist) patch.artist = artist;
  const album = str(b.album); if (album !== undefined) patch.album = album;
  const genre = str(b.genre); if (genre !== undefined) patch.genre = genre;
  if (typeof b.lang === 'string' && LANGS.includes(b.lang as Lang)) patch.lang = b.lang as Lang;
  if (b.year === null || (typeof b.year === 'number' && b.year > 1800 && b.year < 2200)) patch.year = b.year as number | null;
  const s = await updateSong(id, patch);
  return s ? json({ song: s }) : bad('Not found', 404);
}

export async function DELETE(_: Request, { params }: Ctx) {
  const { id } = await params;
  const s = await songRow(id);
  if (!s) return bad('Not found', 404);
  await deleteSong(id);
  if (hostedStorage) {
    await removeObject(s.file);
    if (s.cover) await removeObject(`covers/${s.cover}`);
  } else {
    await fsp.rm(path.join(AUDIO_DIR, s.file), { force: true });
    if (s.cover) await fsp.rm(path.join(COVER_DIR, s.cover), { force: true });
  }
  return json({ ok: true });
}
