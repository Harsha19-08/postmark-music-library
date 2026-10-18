import { addLink } from '@/lib/db';
import { bad, json } from '@/lib/http';
import { PROVIDER_NAMES, providerFor } from '@/lib/providers';

export const dynamic = 'force-dynamic';
export async function POST(req: Request) {
  const b = await req.json().catch(() => null) as { url?: unknown; title?: unknown; artist?: unknown } | null;
  const p = typeof b?.url === 'string' ? providerFor(b.url) : null;
  if (!p) return bad(`Supported links: ${PROVIDER_NAMES.join(', ')}`);
  const title = typeof b?.title === 'string' ? b.title.trim().slice(0, 200) : '';
  if (!title) return bad('Add a title for this link');
  const artist = typeof b?.artist === 'string' ? b.artist.trim().slice(0, 200) : '';
  return json({ link: await addLink({ title, artist, ...p }) }, 201);
}
