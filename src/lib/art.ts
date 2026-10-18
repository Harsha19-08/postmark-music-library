/**
 * Postmark cover art: deterministic, crisp vector covers.
 * Pure function (string in, SVG string out) so it runs in the browser, on the server,
 * and in the scripts/art-sheet.ts preview. No blur, no raster scaling.
 */
export type Palette = { bg: string; a: string; b: string; c: string };

export const PALETTES: Palette[] = [
  { bg: '#0c0d1f', a: '#7d8bff', b: '#c8a8ff', c: '#f3eeff' }, // iris
  { bg: '#04191f', a: '#22bfd3', b: '#7ff0d2', c: '#e8fffb' }, // lagoon
  { bg: '#1b0919', a: '#ff6eb0', b: '#ffb6d9', c: '#fff1f8' }, // rose
  { bg: '#06150f', a: '#2fd596', b: '#b4ffe0', c: '#effff8' }, // mint
  { bg: '#071030', a: '#3b6bff', b: '#92b2ff', c: '#ecf1ff' }, // cobalt
  { bg: '#ebe6ff', a: '#6657ff', b: '#ff8cc6', c: '#16133a' }, // lilac paper
  { bg: '#e2f2ff', a: '#2d79ff', b: '#74d3ff', c: '#0b1932' }, // sky paper
  { bg: '#ffe7f1', a: '#ff5a9c', b: '#8d79ff', c: '#2a0e24' }, // blush paper
  { bg: '#e4f4e9', a: '#1da56e', b: '#74d6bd', c: '#0b2a1f' }, // sage paper
  { bg: '#111215', a: '#eceef6', b: '#8b91a8', c: '#4b516a' }, // graphite
  { bg: '#140a2e', a: '#9b5cff', b: '#ff7ad1', c: '#f6ecff' }, // ultraviolet
  { bg: '#0a1f2e', a: '#5ec8ff', b: '#a9f0ff', c: '#ffffff' }, // glacier
];

export function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const n1 = (v: number) => Math.round(v * 10) / 10;
function rgb(h: string) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
export function mix(c1: string, c2: string, t: number) {
  const A = rgb(c1), B = rgb(c2);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
const pick = <T,>(R: () => number, a: T[]) => a[Math.floor(R() * a.length)];

type Ctx = { R: () => number; P: Palette; id: string };
const stop = (o: number, c: string, op = 1) => `<stop offset="${o}" stop-color="${c}"${op < 1 ? ` stop-opacity="${op}"` : ''}/>`;
const lin = (id: string, x1: number, y1: number, x2: number, y2: number, stops: string, user = false) =>
  `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"${user ? ' gradientUnits="userSpaceOnUse"' : ''}>${stops}</linearGradient>`;

/* 1 · orbit: a glowing disc inside thin concentric rings */
function orbit({ R, P, id }: Ctx) {
  const cx = 210 + R() * 180, cy = 210 + R() * 180, r = 120 + R() * 60;
  let s = `<defs>${lin(id + 'g', 0, 0, 1, 1, stop(0, P.a) + stop(1, P.b))}</defs><rect width="600" height="600" fill="${P.bg}"/>`;
  for (let i = 1; i <= 7; i++) s += `<circle cx="${n1(cx)}" cy="${n1(cy)}" r="${n1(r + i * 44)}" fill="none" stroke="${P.c}" stroke-opacity="${(0.55 - i * 0.065).toFixed(2)}" stroke-width="${i % 2 ? 2.4 : 1.4}"/>`;
  s += `<circle cx="${n1(cx)}" cy="${n1(cy)}" r="${n1(r)}" fill="url(#${id}g)"/>`;
  s += `<circle cx="${n1(cx - r * 0.26)}" cy="${n1(cy - r * 0.3)}" r="${n1(r * 0.72)}" fill="${P.c}" fill-opacity="0.16"/>`;
  const k = 2 + Math.floor(R() * 3); let ang = R() * 6.28; const rr = r + k * 44;
  let sx = cx + Math.cos(ang) * rr, sy = cy + Math.sin(ang) * rr;
  if (sx < 30 || sx > 570 || sy < 30 || sy > 570) { ang += Math.PI; sx = cx + Math.cos(ang) * rr; sy = cy + Math.sin(ang) * rr; }
  s += `<circle cx="${n1(sx)}" cy="${n1(sy)}" r="${n1(13 + R() * 9)}" fill="${P.c}"/>`;
  return s;
}

/* 2 · waves: layered dunes under a low sun */
function waves({ R, P, id }: Ctx) {
  const n = 6 + Math.floor(R() * 3), ph = R() * 6, fr = 1 + R() * 1.4, am = 20 + R() * 28;
  let s = `<defs>${lin(id + 'g', 0, 0, 0, 1, stop(0, mix(P.bg, P.a, 0.3)) + stop(1, P.bg))}</defs><rect width="600" height="600" fill="url(#${id}g)"/>`;
  s += `<circle cx="${n1(120 + R() * 360)}" cy="${n1(130 + R() * 60)}" r="${n1(52 + R() * 20)}" fill="${P.c}"/>`;
  for (let i = 0; i < n; i++) {
    const y0 = 220 + i * (360 / n), col = mix(P.a, P.b, i / (n - 1));
    let top = '';
    for (let x = 0; x <= 600; x += 10) {
      const y = y0 + Math.sin((x / 600) * Math.PI * 2 * fr + ph + i * 0.55) * am + Math.sin((x / 600) * Math.PI * 4 + ph * 1.7 + i) * am * 0.32;
      top += `${x ? 'L' : 'M'}${x} ${n1(y)}`;
    }
    s += `<path d="${top}L600 600L0 600Z" fill="${mix(col, P.bg, 0.12 + (i / n) * 0.45)}"/><path d="${top}" fill="none" stroke="${P.c}" stroke-opacity="0.5" stroke-width="1.6"/>`;
  }
  return s;
}

/* 3 · bauhaus: 3x3 poster tiles */
function bauhaus({ R, P }: Ctx) {
  let s = `<rect width="600" height="600" fill="${P.bg}"/>`;
  const fills = [P.a, P.b, P.c], bgs = [P.bg, mix(P.bg, P.a, 0.2), mix(P.bg, P.b, 0.16)];
  for (let gy = 0; gy < 3; gy++) for (let gx = 0; gx < 3; gx++) {
    const x = gx * 200, y = gy * 200, bgc = pick(R, bgs), fg = pick(R, fills), fg2 = pick(R, fills.filter(f => f !== fg)), rot = Math.floor(R() * 4) * 90, t = Math.floor(R() * 6);
    s += `<rect x="${x}" y="${y}" width="200" height="200" fill="${bgc}"/><g transform="rotate(${rot} ${x + 100} ${y + 100})">`;
    if (t === 0) s += `<path d="M${x} ${y}h200a200 200 0 0 1-200 200z" fill="${fg}"/>`;
    else if (t === 1) s += `<path d="M${x} ${y + 200}a100 100 0 0 1 200 0z" fill="${fg}"/>`;
    else if (t === 2) s += `<circle cx="${x + 100}" cy="${y + 100}" r="78" fill="${fg}"/>`;
    else if (t === 3) s += `<rect x="${x + 30}" y="${y + 30}" width="140" height="140" fill="${fg}"/><circle cx="${x + 100}" cy="${y + 100}" r="46" fill="${fg2}"/>`;
    else if (t === 4) s += `<circle cx="${x + 100}" cy="${y + 100}" r="92" fill="${fg}"/><circle cx="${x + 100}" cy="${y + 100}" r="58" fill="${bgc}"/><circle cx="${x + 100}" cy="${y + 100}" r="26" fill="${fg2}"/>`;
    else s += `<path d="M${x} ${y}L${x + 200} ${y + 200}L${x} ${y + 200}z" fill="${fg}"/>`;
    s += `</g>`;
  }
  return s;
}

/* 4 · halftone: dots swell toward a focal point */
function halftone({ R, P, id }: Ctx) {
  const n = 20, cell = 30, fx = 100 + R() * 400, fy = 100 + R() * 400, spread = 380 + R() * 160, tw = R() * 6;
  let s = `<defs>${lin(id + 'g', 0, 0, 1, 1, stop(0, P.a) + stop(1, P.b))}</defs><rect width="600" height="600" fill="${P.bg}"/>`;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const px = x * cell + cell / 2, py = y * cell + cell / 2, d = Math.hypot(px - fx, py - fy) / spread;
    const v = Math.max(0, 1 - d) * (0.82 + 0.18 * Math.sin(x * 0.9 + y * 0.7 + tw)), r = 1.6 + v * 13.4;
    s += `<circle cx="${px}" cy="${py}" r="${n1(r)}" fill="url(#${id}g)"/>`;
  }
  s += `<circle cx="${n1(fx)}" cy="${n1(fy)}" r="${n1(9 + R() * 5)}" fill="${P.c}"/>`;
  return s;
}

/* 5 · mosaic: pixel field with glitch rows + ASCII strips (nod to the Branch stamps) */
function mosaic({ R, P }: Ctx) {
  const n = 20, cell = 30, ox = R() * 50, oy = R() * 50;
  const lat = (ix: number, iy: number) => rng(hash(`${ix},${iy},${ox | 0}`))();
  const sm = (t: number) => t * t * (3 - 2 * t);
  const noise = (x: number, y: number) => {
    const ix = Math.floor(x), iy = Math.floor(y), fx = sm(x - ix), fy = sm(y - iy);
    const a = lat(ix, iy), b = lat(ix + 1, iy), c = lat(ix, iy + 1), d = lat(ix + 1, iy + 1);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
  const ramp = [P.bg, mix(P.bg, P.a, 0.55), P.a, P.b, P.c];
  const rows: string[][] = [];
  for (let y = 0; y < n; y++) {
    const row: string[] = [];
    for (let x = 0; x < n; x++) {
      const v = noise(x * 0.2 + ox, y * 0.2 + oy) * 0.75 + noise(x * 0.5 + oy, y * 0.5 + ox) * 0.25;
      row.push(ramp[Math.min(4, Math.max(0, Math.floor((v - 0.3) * 7.4)))]);
    }
    rows.push(row);
  }
  for (let g = 0; g < 4; g++) {
    const y = Math.floor(R() * n), h = 1 + Math.floor(R() * 2), sh = 2 + Math.floor(R() * 6) * (R() < 0.5 ? -1 : 1);
    for (let k = 0; k < h && y + k < n; k++) rows[y + k] = rows[y + k].map((_, i, a) => a[((i + sh) % n + n) % n]);
  }
  let s = `<rect width="600" height="600" fill="${P.bg}"/>`;
  for (let y = 0; y < n; y++) {
    let x = 0;
    while (x < n) { let e = x; while (e + 1 < n && rows[y][e + 1] === rows[y][x]) e++; if (rows[y][x] !== P.bg) s += `<rect x="${x * cell}" y="${y * cell}" width="${(e - x + 1) * cell}" height="${cell}" fill="${rows[y][x]}"/>`; x = e + 1; }
  }
  const chars = 'HMX#S8/4_IO0$';
  for (let k = 0; k < 4; k++) {
    const y = 60 + Math.floor(R() * 17) * 30, x = Math.floor(R() * 14) * 30, len = 3 + Math.floor(R() * 8);
    let t = ''; for (let i = 0; i < len; i++) t += chars[Math.floor(R() * chars.length)];
    s += `<rect x="${x}" y="${y}" width="${len * 19 + 12}" height="30" fill="${P.bg}"/><text x="${x + 8}" y="${y + 22}" font-family="ui-monospace,Menlo,Consolas,monospace" font-size="24" font-weight="600" letter-spacing="1" fill="${P.c}">${t}</text>`;
  }
  return s;
}

/* 6 · arches: concentric arches on a ground line */
function arches({ R, P }: Ctx) {
  const n = 5 + Math.floor(R() * 2), base = 540, cx = 300, cols = [P.a, P.b, P.c, mix(P.a, P.bg, 0.45), mix(P.b, P.bg, 0.4), P.a];
  let s = `<rect width="600" height="600" fill="${P.bg}"/>`;
  const off = Math.floor(R() * 3);
  for (let i = 0; i < n; i++) {
    const w = 500 - i * (400 / n), rad = w / 2, top = base - rad - 40 - i * 6;
    s += `<path d="M${cx - rad} ${base}V${n1(top + rad)}A${n1(rad)} ${n1(rad)} 0 0 1 ${cx + rad} ${n1(top + rad)}V${base}Z" fill="${cols[(i + off) % cols.length]}"/>`;
  }
  s += `<rect x="40" y="${base}" width="520" height="3" fill="${P.c}" fill-opacity="0.7"/>`;
  s += `<circle cx="${n1(110 + R() * 380)}" cy="${n1(70 + R() * 40)}" r="${n1(16 + R() * 10)}" fill="${P.c}"/>`;
  return s;
}

/* 7 · ribbons: parallel flowing strokes */
function ribbons({ R, P, id }: Ctx) {
  const n = 9, gap = 62, y0 = 40 + R() * 60, d1 = (R() - 0.5) * 300, d2 = (R() - 0.5) * 300, d3 = (R() - 0.5) * 220;
  let s = `<defs>${lin(id + 'g', 0, 0, 600, 0, stop(0, P.a) + stop(0.55, P.b) + stop(1, P.c), true)}</defs><rect width="600" height="600" fill="${P.bg}"/>`;
  for (let i = 0; i < n; i++) {
    const y = y0 + i * gap;
    s += `<path d="M-30 ${n1(y)}C140 ${n1(y + d1)} 430 ${n1(y + d2)} 630 ${n1(y + d3)}" fill="none" stroke="url(#${id}g)" stroke-width="${i % 2 ? 22 : 36}" stroke-linecap="round" stroke-opacity="${i % 3 === 0 ? 1 : 0.8}"/>`;
  }
  return s;
}

/* 8 · rays: a sunrise fan */
function rays({ R, P }: Ctx) {
  const cx = 300, cy = 470 + R() * 40, n = 12 + Math.floor(R() * 5) * 2, a0 = Math.PI, step = Math.PI / n;
  let s = `<rect width="600" height="600" fill="${P.bg}"/>`;
  for (let i = 0; i < n; i += 1) {
    const a = a0 + i * step, b = a + step, L = 760;
    s += `<path d="M${cx} ${cy}L${n1(cx + Math.cos(a) * L)} ${n1(cy + Math.sin(a) * L)}L${n1(cx + Math.cos(b) * L)} ${n1(cy + Math.sin(b) * L)}Z" fill="${i % 2 ? P.a : mix(P.bg, P.b, 0.35)}"/>`;
  }
  s += `<circle cx="${cx}" cy="${cy}" r="${n1(150 + R() * 30)}" fill="${P.bg}"/><circle cx="${cx}" cy="${cy}" r="${n1(104 + R() * 20)}" fill="${P.c}"/>`;
  s += `<rect x="0" y="${cy}" width="600" height="${600 - cy}" fill="${P.bg}"/><rect x="0" y="${cy}" width="600" height="3" fill="${P.c}" fill-opacity="0.7"/>`;
  return s;
}

const STYLES = [orbit, waves, bauhaus, halftone, mosaic, arches, ribbons, rays];
export const STYLE_COUNT = STYLES.length;

/** Deterministic cover for a seed. `idp` namespaces gradient ids when several covers share one document. */
export function coverSvg(seed: string, idp = ''): string {
  const h = hash(seed), R = rng(h ^ 0x9e3779b9);
  const hh = hash(seed + '\u0000style');
  const P = PALETTES[(hh >>> 16) % PALETTES.length];
  const draw = STYLES[(hh >>> 6) % STYLES.length];
  const id = idp || 'a';
  const inner = draw({ R, P, id });
  const sheen = `<defs><linearGradient id="${id}sh" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.16"/><stop offset="0.45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.22"/></linearGradient></defs><rect width="600" height="600" fill="url(#${id}sh)"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" shape-rendering="geometricPrecision">${inner}${sheen}</svg>`;
}

const cache = new Map<string, string>();
/** data: URI for use in <img>. Cached per seed. */
export function coverUri(seed: string): string {
  let u = cache.get(seed);
  if (!u) { u = 'data:image/svg+xml;utf8,' + encodeURIComponent(coverSvg(seed)); cache.set(seed, u); }
  return u;
}
