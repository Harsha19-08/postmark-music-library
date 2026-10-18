import { PASSWORD, SECRET } from './config';

export const COOKIE = 'pm_session';
export const AUTH_ON = PASSWORD.length > 0;
const DAYS = 90;
const enc = new TextEncoder();

async function hmac(msg: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(msg));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
}
function same(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
export async function makeSession() {
  const exp = Date.now() + DAYS * 864e5;
  return `${exp}.${await hmac('pm:' + exp)}`;
}
export async function validSession(v?: string | null) {
  if (!AUTH_ON) return true;
  if (!v) return false;
  const [exp, sig] = v.split('.');
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  return same(sig, await hmac('pm:' + exp));
}
export async function passwordOk(input: string) {
  return same(await hmac('pw:' + input), await hmac('pw:' + PASSWORD));
}
export const SESSION_MAX_AGE = DAYS * 86400;
