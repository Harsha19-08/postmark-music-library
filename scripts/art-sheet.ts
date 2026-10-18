import { Resvg } from '@resvg/resvg-js';
import { writeFileSync } from 'node:fs';
import { coverSvg, STYLE_COUNT } from '../src/lib/art';

const seeds = process.argv.slice(2).length ? process.argv.slice(2) : ['Butta Bomma','Naatu Naatu','Srivalli','Tum Hi Ho','Kesariya','Blinding Lights','Shape of You','Levitating','Bohemian Rhapsody','Chaleya','Perfect','Starboy','Kal Ho Naa Ho','Believer','Oo Antava','Saami Saami','Channa Mereya','As It Was','Viva La Vida','Lose Yourself','Samajavaragamana','Kabira','Counting Stars','Pehle Bhi Main'];
const cols = 6, size = 300, gap = 24, rows = Math.ceil(seeds.length / cols);
const W = cols * size + (cols + 1) * gap, H = rows * size + (rows + 1) * gap;
let body = `<rect width="${W}" height="${H}" fill="#0b0b10"/>`;
seeds.forEach((s, i) => {
  const x = gap + (i % cols) * (size + gap), y = gap + Math.floor(i / cols) * (size + gap);
  const svg = coverSvg(s, 'k' + i).replace('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" shape-rendering="geometricPrecision">', `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 600 600">`);
  body += svg;
});
const out = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${body}</svg>`;
const png = new Resvg(out, { fitTo: { mode: 'width', value: W } }).render().asPng();
writeFileSync(process.env.OUT || 'art-sheet.png', png);
console.log('styles', STYLE_COUNT, 'covers', seeds.length, 'png bytes', png.length);
