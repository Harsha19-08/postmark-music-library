import fsp from 'node:fs/promises';

const url = process.env.SUPABASE_URL?.replace(/\/$/, '');
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const hostedStorage = Boolean(url && key);
const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'postmark-audio';

function objectUrl(objectPath: string) {
  if (!url || !key) throw new Error('Supabase Storage is not configured');
  return `${url}/storage/v1/object/${bucket}/${objectPath.split('/').map(encodeURIComponent).join('/')}`;
}

const headers = () => ({ apikey: key!, authorization: `Bearer ${key!}` });

export async function uploadObject(objectPath: string, file: string | Uint8Array, contentType: string) {
  const body = typeof file === 'string' ? await fsp.readFile(file) : Buffer.from(file);
  const response = await fetch(objectUrl(objectPath), {
    method: 'POST',
    headers: { ...headers(), 'content-type': contentType, 'x-upsert': 'true' },
    body,
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Supabase Storage upload failed (${response.status})${detail ? `: ${detail.slice(0, 300)}` : ''}`);
  }
}

export async function fetchObject(objectPath: string, requestHeaders?: HeadersInit) {
  return fetch(objectUrl(objectPath), { headers: { ...headers(), ...requestHeaders } });
}

export async function signedObjectUrl(objectPath: string, expiresIn = 3600) {
  if (!url || !key) throw new Error('Supabase Storage is not configured');
  const response = await fetch(`${url}/storage/v1/object/sign/${bucket}/${objectPath.split('/').map(encodeURIComponent).join('/')}`, {
    method: 'POST',
    headers: { ...headers(), 'content-type': 'application/json' },
    body: JSON.stringify({ expiresIn }),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Supabase signed URL failed (${response.status})${detail ? `: ${detail.slice(0, 300)}` : ''}`);
  }
  const data = await response.json() as { signedURL?: string };
  if (!data.signedURL) throw new Error('Supabase returned an empty signed URL');
  return data.signedURL.startsWith('http') ? data.signedURL : `${url}/storage/v1${data.signedURL}`;
}

export async function removeObject(objectPath: string) {
  const response = await fetch(objectUrl(objectPath), { method: 'DELETE', headers: headers() });
  if (!response.ok && response.status !== 404) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Supabase Storage delete failed (${response.status})${detail ? `: ${detail.slice(0, 300)}` : ''}`);
  }
}
