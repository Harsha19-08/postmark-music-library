import { AUTH_ON, COOKIE, SESSION_MAX_AGE, makeSession, passwordOk } from '@/lib/auth';
import { bad, json } from '@/lib/http';

export const dynamic = 'force-dynamic';
const tries = new Map<string, { n: number; t: number }>();

export async function POST(req: Request) {
  if (!AUTH_ON) return json({ ok: true });
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local', now = Date.now();
  const rec = tries.get(ip);
  if (rec && now - rec.t < 600_000 && rec.n >= 8) return bad('Too many attempts. Try again in a few minutes.', 429);
  const b = await req.json().catch(() => null) as { password?: unknown } | null;
  if (typeof b?.password !== 'string' || !(await passwordOk(b.password))) {
    tries.set(ip, { n: rec && now - rec.t < 600_000 ? rec.n + 1 : 1, t: rec && now - rec.t < 600_000 ? rec.t : now });
    return bad('Wrong password', 401);
  }
  tries.delete(ip);
  const secure = new URL(req.url).protocol === 'https:' || req.headers.get('x-forwarded-proto') === 'https';
  return json({ ok: true }, 200, { 'set-cookie': `${COOKIE}=${await makeSession()}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE}${secure ? '; Secure' : ''}` });
}
