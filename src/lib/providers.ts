/** External music services Postmark will save links for. Links open in the service itself; audio is never copied. */
const PROVIDERS: [RegExp, string][] = [
  [/(^|\.)(youtube\.com|youtu\.be)$/i, 'YouTube'],
  [/(^|\.)spotify\.com$/i, 'Spotify'],
  [/(^|\.)music\.apple\.com$/i, 'Apple Music'],
  [/(^|\.)soundcloud\.com$/i, 'SoundCloud'],
  [/(^|\.)jiosaavn\.com$/i, 'JioSaavn'],
  [/(^|\.)gaana\.com$/i, 'Gaana'],
  [/(^|\.)wynk\.in$/i, 'Wynk'],
];
export const PROVIDER_NAMES = PROVIDERS.map(p => p[1]);
export function providerFor(raw: string): { url: string; provider: string } | null {
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    const hit = PROVIDERS.find(([re]) => re.test(u.hostname));
    return hit ? { url: u.href, provider: hit[1] } : null;
  } catch { return null; }
}
