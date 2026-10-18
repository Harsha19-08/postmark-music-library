import { bumpPlay } from '@/lib/db';
import { json, type Ctx } from '@/lib/http';

export const dynamic = 'force-dynamic';
export async function POST(_: Request, { params }: Ctx) { await bumpPlay((await params).id); return json({ ok: true }); }
