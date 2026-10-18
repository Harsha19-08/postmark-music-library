import fsp from 'node:fs/promises';
import path from 'node:path';
import { COVER_DIR } from '@/lib/config';
import { songRow } from '@/lib/db';
import type { Ctx } from '@/lib/http';
import { fetchObject, hostedStorage } from '@/lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const TYPES: Record<string, string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' };

export async function GET(req: Request, { params }: Ctx) {
  const { id } = await params;
  const s = await songRow(id);
  if (!s?.cover) return new Response('No cover', { status: 404 });
  const etag = `"${s.cover}"`;
  const headers = { 'content-type': TYPES[s.cover.split('.').pop()!] ?? 'image/jpeg', etag, 'cache-control': 'private, max-age=31536000, immutable' };
  if (req.headers.get('if-none-match') === etag) return new Response(null, { status: 304, headers });
  if (hostedStorage) {
    const remote = await fetchObject(`covers/${s.cover}`);
    if (!remote.ok) return new Response('Cover missing', { status: remote.status });
    return new Response(remote.body, { headers });
  }
  try { return new Response(new Uint8Array(await fsp.readFile(path.join(COVER_DIR, s.cover))), { headers }); }
  catch { return new Response('Cover missing', { status: 404 }); }
}
