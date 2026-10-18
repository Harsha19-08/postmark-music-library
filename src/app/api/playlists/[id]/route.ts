import { deletePlaylist, playlistExists, renamePlaylist, reorderPlaylist } from '@/lib/db';
import { bad, json, type Ctx } from '@/lib/http';

export const dynamic = 'force-dynamic';
export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;
  if (!(await playlistExists(id))) return bad('Not found', 404);
  const b = await req.json().catch(() => null) as { name?: unknown; songIds?: unknown } | null;
  if (typeof b?.name === 'string' && b.name.trim()) await renamePlaylist(id, b.name.trim().slice(0, 80));
  if (Array.isArray(b?.songIds)) await reorderPlaylist(id, (b!.songIds as unknown[]).filter((x): x is string => typeof x === 'string'));
  return json({ ok: true });
}
export async function DELETE(_: Request, { params }: Ctx) { await deletePlaylist((await params).id); return json({ ok: true }); }
