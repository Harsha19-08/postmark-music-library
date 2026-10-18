export const json = (data: unknown, status = 200, headers?: HeadersInit) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers } });
export const bad = (msg: string, status = 400) => json({ error: msg }, status);
export type Ctx<T extends string = 'id'> = { params: Promise<Record<T, string>> };
