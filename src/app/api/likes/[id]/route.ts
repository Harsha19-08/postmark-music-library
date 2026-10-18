import { setLike, songRow } from '@/lib/db';
import { bad, json, type Ctx } from '@/lib/http';

export const dynamic = 'force-dynamic';
export async function PUT(_: Request, { params }: Ctx) { const { id } = await params; if (!(await songRow(id))) return bad('Not found', 404); await setLike(id, true); return json({ ok: true }); }
export async function DELETE(_: Request, { params }: Ctx) { await setLike((await params).id, false); return json({ ok: true }); }
