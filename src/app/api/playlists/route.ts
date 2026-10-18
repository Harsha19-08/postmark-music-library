import { createPlaylist } from '@/lib/db';
import { bad, json } from '@/lib/http';

export const dynamic = 'force-dynamic';
export async function POST(req: Request) {
  const b = await req.json().catch(() => null) as { name?: unknown; songIds?: unknown } | null;
  const name = typeof b?.name === 'string' ? b.name.trim().slice(0, 80) : '';
  if (!name) return bad('Give the playlist a name');
  const ids = Array.isArray(b?.songIds) ? (b!.songIds as unknown[]).filter((x): x is string => typeof x === 'string') : [];
  return json({ playlist: await createPlaylist(name, ids) }, 201);
}
