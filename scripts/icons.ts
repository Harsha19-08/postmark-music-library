import { Resvg } from '@resvg/resvg-js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { coverSvg } from '../src/lib/art';

function holes(x: number, y: number, w: number, h: number, r: number, step: number) {
  let s = '';
  const nx = Math.round(w / step), ny = Math.round(h / step), sx = w / nx, sy = h / ny;
  for (let i = 0; i <= nx; i++) { s += `<circle cx="${x + i * sx}" cy="${y}" r="${r}"/><circle cx="${x + i * sx}" cy="${y + h}" r="${r}"/>`; }
  for (let j = 1; j < ny; j++) { s += `<circle cx="${x}" cy="${y + j * sy}" r="${r}"/><circle cx="${x + w}" cy="${y + j * sy}" r="${r}"/>`; }
  return s;
}
function icon(size: number, scale: number, rounded: boolean) {
  const S = 512, w = 300 * scale, h = 340 * scale, x = (S - w) / 2, y = (S - h) / 2, pad = 26 * scale, art = w - pad * 2;
  const cover = coverSvg('Postmark|icon', 'ic').replace(/^<svg[^>]*>/, `<svg x="${x + pad}" y="${y + pad}" width="${art}" height="${art}" viewBox="0 0 600 600">`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${S} ${S}">
  <defs><mask id="m"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#fff"/><g fill="#000">${holes(x, y, w, h, 7 * scale, 22 * scale)}</g></mask></defs>
  <rect width="${S}" height="${S}" rx="${rounded ? 112 : 0}" fill="#09090d"/>
  <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#f2f1f7" mask="url(#m)"/>${cover}
  <rect x="${x + pad}" y="${y + pad + art + 16 * scale}" width="${art * 0.62}" height="${12 * scale}" rx="${6 * scale}" fill="#12121a"/>
  <rect x="${x + pad}" y="${y + pad + art + 36 * scale}" width="${art * 0.36}" height="${9 * scale}" rx="${4.5 * scale}" fill="#9a9bb0"/></svg>`;
}
mkdirSync('public/icons', { recursive: true });
const out = (name: string, svg: string, size: number) => writeFileSync(`public/icons/${name}`, new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng());
out('icon-512.png', icon(512, 1, true), 512);
out('icon-192.png', icon(192, 1, true), 192);
out('icon-maskable-512.png', icon(512, 0.8, false), 512);
out('apple-touch-icon.png', icon(180, 1, false), 180);
console.log('icons ok');
