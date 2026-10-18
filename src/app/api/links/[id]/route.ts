import { deleteLink } from '@/lib/db';
import { json, type Ctx } from '@/lib/http';

export const dynamic = 'force-dynamic';
export async function DELETE(_: Request, { params }: Ctx) { await deleteLink((await params).id); return json({ ok: true }); }
