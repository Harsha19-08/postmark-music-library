import { COOKIE } from '@/lib/auth';
import { json } from '@/lib/http';

export const dynamic = 'force-dynamic';
export async function POST() { return json({ ok: true }, 200, { 'set-cookie': `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0` }); }
