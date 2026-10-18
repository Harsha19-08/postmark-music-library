import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { AUDIO_DIR } from '@/lib/config';
import { songRow } from '@/lib/db';
import type { Ctx } from '@/lib/http';
import { hostedStorage, signedObjectUrl } from '@/lib/storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Audio with HTTP Range support so seeking and iOS/Safari playback work. Files are content-addressed, so they cache forever. */
export async function GET(req: Request, { params }: Ctx) {
  const { id } = await params;
  const s = await songRow(id);
  if (!s) return new Response('Not found', { status: 404 });
  if (hostedStorage) {
    try {
      return Response.redirect(await signedObjectUrl(s.file), 307);
    } catch (e) {
      return new Response((e as Error).message, { status: 502 });
    }
  }
  const file = path.join(AUDIO_DIR, s.file);
  let st;
  try { st = await fsp.stat(file); } catch { return new Response('File missing', { status: 404 }); }
  const base = { 'content-type': s.mime, 'accept-ranges': 'bytes', etag: `"${s.hash}"`, 'cache-control': 'private, max-age=31536000, immutable' };
  const range = req.headers.get('range');
  if (range) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if (!m || (m[1] === '' && m[2] === '')) return new Response(null, { status: 416, headers: { 'content-range': `bytes */${st.size}` } });
    let start = m[1] === '' ? st.size - Number(m[2]) : Number(m[1]);
    let end = m[1] === '' || m[2] === '' ? st.size - 1 : Number(m[2]);
    start = Math.max(0, start); end = Math.min(end, st.size - 1);
    if (start > end || start >= st.size) return new Response(null, { status: 416, headers: { 'content-range': `bytes */${st.size}` } });
    const body = Readable.toWeb(fs.createReadStream(file, { start, end })) as unknown as ReadableStream;
    return new Response(body, { status: 206, headers: { ...base, 'content-range': `bytes ${start}-${end}/${st.size}`, 'content-length': String(end - start + 1) } });
  }
  if (req.headers.get('if-none-match') === `"${s.hash}"`) return new Response(null, { status: 304, headers: base });
  return new Response(Readable.toWeb(fs.createReadStream(file)) as unknown as ReadableStream, { status: 200, headers: { ...base, 'content-length': String(st.size) } });
}
