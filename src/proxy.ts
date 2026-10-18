import { NextResponse, type NextRequest } from 'next/server';
import { AUTH_ON, COOKIE, validSession } from '@/lib/auth';

const OPEN = [/^\/login$/, /^\/api\/auth\//, /^\/sw\.js$/, /^\/manifest\.webmanifest$/, /^\/icons\//, /^\/favicon/];

export async function proxy(req: NextRequest) {
  if (!AUTH_ON) return NextResponse.next();
  const { pathname } = req.nextUrl;
  if (OPEN.some(r => r.test(pathname))) return NextResponse.next();
  if (await validSession(req.cookies.get(COOKIE)?.value)) return NextResponse.next();
  if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.search = '';
  return NextResponse.redirect(url);
}

export const config = { matcher: ['/((?!_next/static|_next/image).*)'] };
