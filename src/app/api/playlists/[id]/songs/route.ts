import { addToPlaylist, playlistExists, removeFromPlaylist } from '@/lib/db';
import { bad, json, type Ctx } from '@/lib/http';

export const dynamic = 'force-dynamic';
export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  if (!(await playlistExists(id))) return bad('Not found', 404);
  const b = await req.json().catch(() => null) as { songIds?: unknown } | null;
  const ids = Array.isArray(b?.songIds) ? (b!.songIds as unknown[]).filter((x): x is string => typeof x === 'string') : [];
  if (!ids.length) return bad('No songs given');
  await addToPlaylist(id, ids);
  return json({ ok: true });
}
export async function DELETE(req: Request, { params }: Ctx) {
  const songId = new URL(req.url).searchParams.get('songId');
  if (!songId) return bad('songId required');
  await removeFromPlaylist((await params).id, songId);
  return json({ ok: true });
}
